import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { createServer, deleteServer, initDb, listServers, updateServerJar, updateServerStatus } from './services/db'
import { downloadJar, getVersions } from './services/mcjarfiles'
const os = require('os')
const { spawn } = require('child_process')

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

let ipcRegistered = false

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

const registerIpcHandlers = () => {
  if (ipcRegistered) return
  ipcRegistered = true

  // 啟動伺服器
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
    // 寫 eula.txt
    const fs = require('fs')
    fs.writeFileSync(join(serversDir, 'eula.txt'), 'eula=true')
    // 寫 server.properties
    const props = [
      `server-port=${server.port}`,
      `max-players=${server.maxPlayers}`,
      `motd=${server.description ?? 'OwlStarter Server'}`
      // 可根據 server.settings 增加更多配置
    ].join('\n')
    fs.writeFileSync(join(serversDir, 'server.properties'), props)
    // 實際啟動 server.jar
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
      process.stdout.write(text)
    })
    javaProc.stderr.on('data', (data: Buffer) => {
      const text = data.toString()
      appendOutput(serverId, text)
      process.stderr.write(text)
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
    const fs = require('fs')
    const serverDir = getServerDir(serverId)
    if (fs.existsSync(serverDir)) {
      fs.rmSync(serverDir, { recursive: true, force: true })
    }
    deleteServer(serverId)
    return { success: true }
  })

  ipcMain.handle('servers:list', () => {
    return listServers()
  })

  ipcMain.handle('servers:get', (_, { serverId }) => {
    const servers = listServers()
    return servers.find(s => s.id === serverId) ?? null
  })

  // 遊戲伺服器終端機映射
  ipcMain.handle('server:terminal', async (_, { serverId, command }) => {
    await app.whenReady()
    // command 可為 null，表示只取最新輸出
    // 回傳 { output: string }
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

  // 玩家管理接口
  ipcMain.handle('server:players', async (_, { serverId, action, player }) => {
    await app.whenReady()
    // action: 'list' | 'kick' | 'ban'
    // player: 玩家名稱（僅 kick/ban 時需）
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
    const fs = require('fs')
    const configPath = join(getServerDir(serverId), 'server.properties')
    if (!fs.existsSync(configPath)) {
      return { content: '' }
    }
    return { content: fs.readFileSync(configPath, 'utf-8') }
  })

  ipcMain.handle('server:config:update', async (_, { serverId, content }) => {
    await app.whenReady()
    const fs = require('fs')
    const configPath = join(getServerDir(serverId), 'server.properties')
    fs.writeFileSync(configPath, content ?? '')
    return { success: true }
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Updates
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

  // Window controls
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
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  mainWindow.maximize()
  if (process.platform === 'darwin') {
    mainWindow.setWindowButtonVisibility(false)
  }

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:event', { type: 'maximized', value: true })
  })
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:event', { type: 'maximized', value: false })
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
registerIpcHandlers()

app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.novainit.owlstarter')
  console.log('userData:', app.getPath('userData'))

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

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  initDb()

  ipcMain.handle('get-system-info', () => {
    return {
      platform: os.platform(), // 'darwin', 'win32', 'linux'
      cpu: os.cpus(),
      totalMem: os.totalmem(),
      freeMem: os.freemem()
    }
  })

  ipcMain.handle('get-resource-usage', () => {
    const cpus = os.cpus()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()

    // Calculate CPU usage
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

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
