import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { join } from 'path'
import { mkdirSync } from 'fs'
import * as fs from 'fs'
import * as path from 'path'
import { createServer, deleteServer, listServers, updateServerJar, updateServerStatus, updateServerSettings } from './services/db'
import { downloadJar, getVersions } from './services/mcjarfiles'
const os = require('os')
const { spawn } = require('child_process')
const pidusage = require('pidusage')

type RunningServer = {
  proc: any
  outputLines: string[]
  players: Set<string>
}

const serverProcesses = new Map<number, RunningServer>()
const MAX_OUTPUT_LINES = 1000

const appendOutput = (serverId: number, chunk: string) => {
  const entry = serverProcesses.get(serverId)
  if (!entry) return
  const lines = chunk.split(/\r?\n/)
  for (const line of lines) {
    if (!line) continue
    entry.outputLines.push(line)
    if (entry.outputLines.length > MAX_OUTPUT_LINES) {
      entry.outputLines.shift()
    }
    const match = line.match(/\b([A-Za-z0-9_]{3,16})\b (joined the game|left the game|lost connection)/)
    if (match) {
      const player = match[1]
      const action = match[2]
      if (action === 'joined the game') {
        entry.players.add(player)
      } else {
        entry.players.delete(player)
      }
    }
  }
}

const getServerDir = (serverId: number) => join(app.getPath('userData'), 'servers', String(serverId))

const resolveServerPath = (serverId: number, targetPath: string) => {
  const base = getServerDir(serverId)
  const resolved = path.resolve(base, targetPath || '.')
  if (!resolved.startsWith(base)) {
    throw new Error('Invalid path')
  }
  return resolved
}

const sanitizePlayerName = (name: string) => {
  const trimmed = String(name || '').trim()
  if (!/^[A-Za-z0-9_]{3,16}$/.test(trimmed)) {
    throw new Error('玩家名稱格式不正確')
  }
  return trimmed
}

const readMembers = (serverId: number, file: string) => {
  const full = resolveServerPath(serverId, file)
  if (!fs.existsSync(full)) return []
  try {
    const raw = fs.readFileSync(full, 'utf-8')
    const data = JSON.parse(raw)
    if (Array.isArray(data)) return data
  } catch (error) {
    console.warn('Failed to parse member file:', file, error)
  }
  return []
}

const writeMembers = (serverId: number, file: string, list: any[]) => {
  const full = resolveServerPath(serverId, file)
  fs.writeFileSync(full, JSON.stringify(list, null, 2))
}

const parseProperties = (content: string) => {
  const map: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    map[key] = value
  }
  return map
}

let ipcRegistered = false
let shutdownInProgress = false

type ShutdownEvent = {
  status: 'checking' | 'stopping' | 'stopped' | 'quitting' | 'error'
  message?: string
  remaining?: number
}

export const broadcastShutdownEvent = (payload: ShutdownEvent) => {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('shutdown:event', payload)
  }
}

const stopServerProcess = async (serverId: number) => {
  const entry = serverProcesses.get(serverId)
  if (!entry) return
  try {
    entry.proc.stdin.write('stop\n')
  } catch (error) {
    entry.proc.kill('SIGTERM')
  }
  await new Promise(resolve => setTimeout(resolve, 2000))
  if (!entry.proc.killed) {
    entry.proc.kill('SIGTERM')
  }
  serverProcesses.delete(serverId)
  updateServerStatus(serverId, 'stopped')
}

export const shutdownAllServers = async () => {
  if (shutdownInProgress) return
  shutdownInProgress = true
  try {
    broadcastShutdownEvent({ status: 'checking', message: '伺服器狀態檢查中...' })
    const runningIds = Array.from(serverProcesses.keys())
    if (runningIds.length === 0) {
      broadcastShutdownEvent({ status: 'stopped', message: '沒有正在運行的伺服器' })
      return
    }
    broadcastShutdownEvent({ status: 'stopping', message: '關閉所有伺服器中...', remaining: runningIds.length })
    for (const serverId of runningIds) {
      await stopServerProcess(serverId)
      broadcastShutdownEvent({ status: 'stopping', message: '關閉所有伺服器中...', remaining: serverProcesses.size })
    }
    broadcastShutdownEvent({ status: 'stopped', message: '所有伺服器已關閉' })
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error)
    broadcastShutdownEvent({ status: 'error', message })
  } finally {
    shutdownInProgress = false
  }
}

type UpdateState = {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  message?: string
  version?: string
  releaseNotes?: string
  progress?: number
}

let updateState: UpdateState = { status: 'idle' }
let autoCheckEnabled = false
let autoDownloadEnabled = false
let autoCheckIntervalMs = 6 * 60 * 60 * 1000
let autoCheckTimer: NodeJS.Timeout | null = null
let isCheckingUpdate = false

const broadcastUpdateEvent = (payload: UpdateState) => {
  updateState = payload
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('updates:event', payload)
  }
}

const stopAutoCheck = () => {
  if (autoCheckTimer) {
    clearInterval(autoCheckTimer)
    autoCheckTimer = null
  }
}

const startAutoCheck = () => {
  stopAutoCheck()
  if (!autoCheckEnabled) return
  autoCheckTimer = setInterval(() => {
    void checkForUpdates()
  }, autoCheckIntervalMs)
}

const checkForUpdates = async () => {
  if (isCheckingUpdate) return updateState
  isCheckingUpdate = true
  try {
    broadcastUpdateEvent({ status: 'checking' })
    await autoUpdater.checkForUpdates()
    return updateState
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error)
    broadcastUpdateEvent({ status: 'error', message })
    return updateState
  } finally {
    isCheckingUpdate = false
  }
}

export const setupAutoUpdater = () => {
  autoUpdater.autoDownload = false
  autoUpdater.on('checking-for-update', () => {
    broadcastUpdateEvent({ status: 'checking' })
  })
  autoUpdater.on('update-available', (info) => {
    broadcastUpdateEvent({
      status: 'available',
      version: info?.version,
      releaseNotes: (Array.isArray(info?.releaseNotes) ? info?.releaseNotes?.[0]?.note : info?.releaseNotes) ?? undefined
    })
    if (autoDownloadEnabled) {
      void autoUpdater.downloadUpdate()
    }
  })
  autoUpdater.on('update-not-available', (info) => {
    broadcastUpdateEvent({
      status: 'not-available',
      version: info?.version
    })
  })
  autoUpdater.on('download-progress', (progress) => {
    broadcastUpdateEvent({
      status: 'downloading',
      progress: Math.round(progress?.percent ?? 0)
    })
  })
  autoUpdater.on('update-downloaded', (info) => {
    broadcastUpdateEvent({
      status: 'downloaded',
      version: info?.version,
      releaseNotes: (Array.isArray(info?.releaseNotes) ? info?.releaseNotes?.[0]?.note : info?.releaseNotes) ?? undefined,
      progress: 100
    })
  })
  autoUpdater.on('error', (error) => {
    const message = error instanceof Error ? error.message : String(error)
    broadcastUpdateEvent({ status: 'error', message })
  })
}

export const registerIpcHandlers = () => {
  if (ipcRegistered) return
  ipcRegistered = true

  ipcMain.handle('servers:start', async (_, { serverId }) => {
    await app.whenReady()
    const servers = listServers()
    const server = servers.find(s => s.id === serverId)
    if (!server || !server.jarPath) {
      throw new Error('找不到伺服器或 jar 檔案')
    }
    if (serverProcesses.has(serverId)) {
      return { success: true }
    }
    const serversDir = getServerDir(serverId)
    mkdirSync(serversDir, { recursive: true })
    try {
      const lockPath = join(serversDir, 'world', 'session.lock')
      if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath)
      }
    } catch (error) {
      console.warn('Failed to remove session.lock:', error)
    }
    fs.writeFileSync(join(serversDir, 'eula.txt'), 'eula=true')
    let settings: any = {}
    try {
      settings = server.settings ? JSON.parse(server.settings) : {}
    } catch {
      settings = {}
    }
    const motd = settings.motd || server.description || 'OwlStarter Server'
    const configPath = join(serversDir, 'server.properties')
    const existing: Record<string, string> = {}
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8')
      for (const line of raw.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const idx = trimmed.indexOf('=')
        if (idx === -1) continue
        const key = trimmed.slice(0, idx).trim()
        const value = trimmed.slice(idx + 1).trim()
        existing[key] = value
      }
    }
    
    const merged = {
      ...existing,
      'server-port': String(server.port),
      'max-players': String(server.maxPlayers),
      motd,
      'online-mode': String(settings.onlineMode !== undefined ? settings.onlineMode : (existing['online-mode'] ?? 'true') === 'true'),
      pvp: String(settings.pvp !== undefined ? settings.pvp : (existing.pvp ?? 'true') === 'true'),
      'white-list': String(settings.whitelist !== undefined ? settings.whitelist : (existing['white-list'] ?? 'true') === 'true'),
      gamemode: settings.gameMode ?? existing.gamemode ?? 'survival',
      difficulty: settings.difficulty ?? existing.difficulty ?? 'normal'
    }
    const props = Object.entries(merged)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')
    fs.writeFileSync(configPath, props)
    const javaArgs = ['-jar', server.jarPath, 'nogui']
    const javaProc = spawn('java', javaArgs, {
      cwd: serversDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: false
    })
    const entry: RunningServer = {
      proc: javaProc,
      outputLines: [],
      players: new Set<string>()
    }
    serverProcesses.set(serverId, entry)
    javaProc.stdout.on('data', (data: Buffer) => {
      const text = data.toString()
      appendOutput(serverId, text)
      // process.stdout.write(text)
    })
    javaProc.stderr.on('data', (data: Buffer) => {
      const text = data.toString()
      appendOutput(serverId, text)
      // process.stderr.write(text)
    })
    javaProc.on('exit', () => {
      serverProcesses.delete(serverId)
      updateServerStatus(serverId, 'stopped')
    })
    updateServerStatus(serverId, 'running')
    return { success: true }
  })

  ipcMain.handle('servers:stop', async (_, { serverId }) => {
    await app.whenReady()
    const entry = serverProcesses.get(serverId)
    if (!entry) {
      updateServerStatus(serverId, 'stopped')
      return { success: true }
    }
    try {
      entry.proc.stdin.write('stop\n')
    } catch (error) {
      entry.proc.kill('SIGTERM')
    }
    await new Promise(resolve => setTimeout(resolve, 2000))
    if (!entry.proc.killed) {
      entry.proc.kill('SIGTERM')
    }
    serverProcesses.delete(serverId)
    updateServerStatus(serverId, 'stopped')
    return { success: true }
  })

  ipcMain.handle('servers:kill', async (_, { serverId }) => {
    await app.whenReady()
    const entry = serverProcesses.get(serverId)
    if (!entry) {
      updateServerStatus(serverId, 'stopped')
      return { success: true }
    }
    try {
      entry.proc.kill(process.platform === 'win32' ? 'SIGTERM' : 'SIGKILL')
    } catch (error) {
      entry.proc.kill('SIGTERM')
    }
    serverProcesses.delete(serverId)
    updateServerStatus(serverId, 'stopped')
    return { success: true }
  })

  ipcMain.handle('servers:delete', async (_, { serverId }) => {
    await app.whenReady()
    const entry = serverProcesses.get(serverId)
    if (entry) {
      try {
        entry.proc.stdin.write('stop\n')
      } catch (error) {
        entry.proc.kill('SIGTERM')
      }
      await new Promise(resolve => setTimeout(resolve, 2000))
      if (!entry.proc.killed) {
        entry.proc.kill('SIGTERM')
      }
      serverProcesses.delete(serverId)
    }
    const serverDir = getServerDir(serverId)
    if (fs.existsSync(serverDir)) {
      fs.rmSync(serverDir, { recursive: true, force: true })
    }
    deleteServer(serverId)
    return { success: true }
  })

  ipcMain.handle('servers:list', () => listServers())
  ipcMain.handle('servers:get', (_, { serverId }) => listServers().find(s => s.id === serverId) ?? null)

  ipcMain.handle('server:terminal', async (_, { serverId, command }) => {
    await app.whenReady()
    if (!serverId) {
      return { output: '找不到伺服器' }
    }
    const entry = serverProcesses.get(serverId)
    if (!entry) {
      return { output: '伺服器尚未啟動' }
    }
    if (command) {
      entry.proc.stdin.write(`${command}\n`)
    }
    return { output: entry.outputLines.join('\n') }
  })

  ipcMain.handle('server:players', async (_, { serverId, action, player }) => {
    await app.whenReady()
    if (!serverId) {
      return { players: [], result: '找不到伺服器' }
    }
    const entry = serverProcesses.get(serverId)
    if (!entry) {
      return { players: [], result: '伺服器尚未啟動' }
    }
    if (action === 'list') {
      return { players: Array.from(entry.players) }
    } else if (action === 'kick') {
      entry.proc.stdin.write(`kick ${player}\n`)
      return { result: `已踢出玩家 ${player}` }
    } else if (action === 'ban') {
      entry.proc.stdin.write(`ban ${player}\n`)
      return { result: `已封禁玩家 ${player}` }
    }
    return { result: '未知操作' }
  })

  ipcMain.handle('server:config:get', async (_, { serverId }) => {
    await app.whenReady()
    const configPath = join(getServerDir(serverId), 'server.properties')
    if (!fs.existsSync(configPath)) {
      return { content: '' }
    }
    return { content: fs.readFileSync(configPath, 'utf-8') }
  })

  ipcMain.handle('server:config:update', async (_, { serverId, content }) => {
    await app.whenReady()
    const configPath = join(getServerDir(serverId), 'server.properties')
    fs.writeFileSync(configPath, content ?? '')
    const map = parseProperties(content ?? '')
    const settings = {
      motd: map.motd ?? 'OwlStarter Server',
      onlineMode: map['online-mode'] ? map['online-mode'] === 'true' : true,
      pvp: map.pvp ? map.pvp === 'true' : true,
      whitelist: map['white-list'] ? map['white-list'] === 'true' : true,
      gameMode: map.gamemode ?? 'survival',
      difficulty: map.difficulty ?? 'normal'
    }
    updateServerSettings(Number(serverId), settings)
    return { success: true }
  })

  ipcMain.handle('servers:files:list', async (_, { serverId, dir }) => {
    await app.whenReady()
    const targetDir = resolveServerPath(serverId, dir || '.')
    const entries = fs.readdirSync(targetDir, { withFileTypes: true })
    return entries.map((entry) => ({
      name: entry.name,
      type: entry.isDirectory() ? 'dir' : 'file',
      path: path.relative(getServerDir(serverId), path.join(targetDir, entry.name))
    }))
  })
  ipcMain.handle('servers:files:read', async (_, { serverId, filePath }) => {
    await app.whenReady()
    const resolved = resolveServerPath(serverId, filePath)
    const ext = path.extname(resolved).toLowerCase()
    const blocked = new Set(['.jar', '.png', '.jpg', '.jpeg', '.gif', '.zip', '.gz', '.xz', '.rar', '.7z', '.pdf', '.exe', '.dll'])
    if (blocked.has(ext)) {
      throw new Error('此檔案為二進位格式，禁止以文字方式讀取。')
    }
    const stat = fs.statSync(resolved)
    if (stat.size > 1024 * 1024) {
      throw new Error('檔案過大，請使用外部工具開啟。')
    }
    const content = fs.readFileSync(resolved, 'utf-8')
    return { content }
  })
  ipcMain.handle('servers:files:write', async (_, { serverId, filePath, content }) => {
    await app.whenReady()
    const resolved = resolveServerPath(serverId, filePath)
    fs.writeFileSync(resolved, content ?? '')
    return { success: true }
  })
  ipcMain.handle('servers:files:delete', async (_, { serverId, filePath }) => {
    await app.whenReady()
    const resolved = resolveServerPath(serverId, filePath)
    const stat = fs.statSync(resolved)
    if (stat.isDirectory()) {
      fs.rmSync(resolved, { recursive: true, force: true })
    } else {
      fs.unlinkSync(resolved)
    }
    return { success: true }
  })
  ipcMain.handle('servers:files:mkdir', async (_, { serverId, dir }) => {
    await app.whenReady()
    const resolved = resolveServerPath(serverId, dir)
    fs.mkdirSync(resolved, { recursive: true })
    return { success: true }
  })
  ipcMain.handle('servers:files:open', async (_, { serverId, dir }) => {
    await app.whenReady()
    const resolved = resolveServerPath(serverId, dir || '.')
    await shell.openPath(resolved)
    return { success: true }
  })

  ipcMain.handle('servers:usage', async (_, { serverId }) => {
    await app.whenReady()
    const entry = serverProcesses.get(serverId)
    if (!entry?.proc?.pid) {
      return { running: false }
    }
    const stats = await pidusage(entry.proc.pid)
    const totalMem = os.totalmem()
    return {
      running: true,
      cpu: stats.cpu,
      memory: stats.memory,
      memoryPercent: totalMem ? (stats.memory / totalMem) * 100 : 0
    }
  })

  ipcMain.handle('network:info', async () => {
    const nets = os.networkInterfaces()
    const addresses: string[] = []
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          addresses.push(net.address)
        }
      }
    }
    return { addresses }
  })

  ipcMain.handle('servers:members:list', async (_, { serverId, type }) => {
    await app.whenReady()
    const fileMap: Record<string, string> = {
      whitelist: 'whitelist.json',
      ops: 'ops.json',
      banned: 'banned-players.json'
    }
    const file = fileMap[type]
    if (!file) throw new Error('Unknown member type')
    const list = readMembers(serverId, file)
    const names = list.map((item: any) => item?.name).filter(Boolean)
    return { members: names }
  })

  ipcMain.handle('servers:members:add', async (_, { serverId, type, name }) => {
    await app.whenReady()
    const player = sanitizePlayerName(name)
    const fileMap: Record<string, string> = {
      whitelist: 'whitelist.json',
      ops: 'ops.json',
      banned: 'banned-players.json'
    }
    const file = fileMap[type]
    if (!file) throw new Error('Unknown member type')
    const list = readMembers(serverId, file)
    if (list.some((item: any) => item?.name === player)) {
      return { success: true }
    }
    if (type === 'whitelist') {
      list.push({ uuid: '', name: player })
    } else if (type === 'ops') {
      list.push({ uuid: '', name: player, level: 4, bypassesPlayerLimit: false })
    } else if (type === 'banned') {
      list.push({
        uuid: '',
        name: player,
        created: new Date().toISOString(),
        source: 'OwlStarter',
        expires: 'forever',
        reason: 'Banned by OwlStarter'
      })
    }
    writeMembers(serverId, file, list)
    return { success: true }
  })

  ipcMain.handle('servers:members:remove', async (_, { serverId, type, name }) => {
    await app.whenReady()
    const player = sanitizePlayerName(name)
    const fileMap: Record<string, string> = {
      whitelist: 'whitelist.json',
      ops: 'ops.json',
      banned: 'banned-players.json'
    }
    const file = fileMap[type]
    if (!file) throw new Error('Unknown member type')
    const list = readMembers(serverId, file)
    const next = list.filter((item: any) => item?.name !== player)
    writeMembers(serverId, file, next)
    return { success: true }
  })

  ipcMain.handle('updates:state', () => updateState)
  ipcMain.handle('updates:check', async () => {
    await app.whenReady()
    return checkForUpdates()
  })
  ipcMain.handle('updates:download', async () => {
    await app.whenReady()
    try {
      broadcastUpdateEvent({ status: 'downloading', progress: updateState.progress ?? 0 })
      await autoUpdater.downloadUpdate()
      return updateState
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error)
      broadcastUpdateEvent({ status: 'error', message })
      return updateState
    }
  })
  ipcMain.handle('updates:install', async () => {
    await app.whenReady()
    autoUpdater.quitAndInstall()
    return { success: true }
  })
  ipcMain.handle('updates:set-auto', async (_, payload) => {
    autoCheckEnabled = Boolean(payload?.autoCheck)
    autoDownloadEnabled = Boolean(payload?.autoDownload)
    if (typeof payload?.intervalMs === 'number' && payload.intervalMs > 60_000) {
      autoCheckIntervalMs = payload.intervalMs
    }
    startAutoCheck()
    return {
      autoCheck: autoCheckEnabled,
      autoDownload: autoDownloadEnabled,
      intervalMs: autoCheckIntervalMs
    }
  })

  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.minimize()
    return { success: true }
  })
  ipcMain.handle('window:toggle-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return { success: false }
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
    return { success: true, maximized: win.isMaximized() }
  })
  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.close()
    return { success: true }
  })
  ipcMain.handle('window:is-maximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return { maximized: win?.isMaximized() ?? false }
  })

  ipcMain.handle('get-system-info', () => {
    return {
      platform: os.platform(),
      cpu: os.cpus(),
      totalMem: os.totalmem(),
      freeMem: os.freemem()
    }
  })

  ipcMain.handle('get-resource-usage', () => {
    const cpus = os.cpus()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const cpuUsage =
      cpus.reduce((acc, cpu) => {
        const total = (Object.values(cpu.times) as number[]).reduce((a, b) => a + b, 0)
        const idle = cpu.times.idle
        return acc + ((total - idle) / total) * 100
      }, 0) / cpus.length
    return {
      cpu: {
        usage: cpuUsage,
        model: cpus[0].model,
        cores: cpus.length
      },
      memory: {
        total: totalMem,
        used: totalMem - freeMem,
        free: freeMem
      }
    }
  })

  ipcMain.handle('servers:create', async (_, payload) => {
    const {
      name,
      type,
      variant,
      version,
      platform,
      port,
      maxPlayers,
      description,
      settings
    } = payload

    const server = createServer({
      name,
      type,
      variant,
      version,
      platform,
      port,
      maxPlayers,
      description,
      settings
    })

    try {
      const serversDir = join(app.getPath('userData'), 'servers', String(server.id))
      mkdirSync(serversDir, { recursive: true })
      const jarPath = join(serversDir, 'server.jar')
      const jarSource = await downloadJar(
        {
          type,
          variant,
          version,
          platform
        },
        jarPath
      )
      return updateServerJar(server.id, jarPath, jarSource)
    } catch (error) {
      updateServerStatus(server.id, 'error')
      throw error
    }
  })

  ipcMain.handle('mcjarfiles:get-versions', async (_, payload) => {
    const { type, variant, platform } = payload
    return getVersions(type, variant, platform)
  })

  ipcMain.on('ping', () => console.log('pong'))
}
