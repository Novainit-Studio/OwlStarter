import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  listServers: () => ipcRenderer.invoke('servers:list'),
  createServer: (payload: any) => ipcRenderer.invoke('servers:create', payload),
  getJarVersions: (payload: any) => ipcRenderer.invoke('mcjarfiles:get-versions', payload),
  getServer: (serverId: number) => ipcRenderer.invoke('servers:get', { serverId }),
  startServer: (serverId: number) => ipcRenderer.invoke('servers:start', { serverId }),
  stopServer: (serverId: number) => ipcRenderer.invoke('servers:stop', { serverId }),
  killServer: (serverId: number) => ipcRenderer.invoke('servers:kill', { serverId }),
  deleteServer: (serverId: number) => ipcRenderer.invoke('servers:delete', { serverId }),
  getServerTerminal: (serverId: number, command?: string | null) =>
    ipcRenderer.invoke('server:terminal', { serverId, command: command ?? null }),
  getServerPlayers: (serverId: number) =>
    ipcRenderer.invoke('server:players', { serverId, action: 'list' }),
  getServerUsage: (serverId: number) =>
    ipcRenderer.invoke('servers:usage', { serverId }),
  playerAction: (serverId: number, action: 'kick' | 'ban', player: string) =>
    ipcRenderer.invoke('server:players', { serverId, action, player }),
  getServerConfig: (serverId: number) =>
    ipcRenderer.invoke('server:config:get', { serverId }),
  updateServerConfig: (serverId: number, content: string) =>
    ipcRenderer.invoke('server:config:update', { serverId, content }),
  listServerFiles: (serverId: number, dir?: string) =>
    ipcRenderer.invoke('servers:files:list', { serverId, dir }),
  readServerFile: (serverId: number, filePath: string) =>
    ipcRenderer.invoke('servers:files:read', { serverId, filePath }),
  writeServerFile: (serverId: number, filePath: string, content: string) =>
    ipcRenderer.invoke('servers:files:write', { serverId, filePath, content }),
  deleteServerFile: (serverId: number, filePath: string) =>
    ipcRenderer.invoke('servers:files:delete', { serverId, filePath }),
  mkdirServerFile: (serverId: number, dir: string) =>
    ipcRenderer.invoke('servers:files:mkdir', { serverId, dir }),
  openServerFolder: (serverId: number, dir?: string) =>
    ipcRenderer.invoke('servers:files:open', { serverId, dir }),
  getNetworkInfo: () => ipcRenderer.invoke('network:info'),
  listMembers: (serverId: number, type: 'whitelist' | 'ops' | 'banned') =>
    ipcRenderer.invoke('servers:members:list', { serverId, type }),
  addMember: (serverId: number, type: 'whitelist' | 'ops' | 'banned', name: string) =>
    ipcRenderer.invoke('servers:members:add', { serverId, type, name }),
  removeMember: (serverId: number, type: 'whitelist' | 'ops' | 'banned', name: string) =>
    ipcRenderer.invoke('servers:members:remove', { serverId, type, name }),
  getUpdateState: () => ipcRenderer.invoke('updates:state'),
  checkForUpdates: () => ipcRenderer.invoke('updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('updates:download'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  setAutoUpdate: (payload: { autoCheck: boolean; autoDownload: boolean; intervalMs?: number }) =>
    ipcRenderer.invoke('updates:set-auto', payload),
  onUpdateEvent: (callback: (payload: any) => void) => {
    const handler = (_: any, payload: any) => callback(payload)
    ipcRenderer.on('updates:event', handler)
    return () => ipcRenderer.removeListener('updates:event', handler)
  },
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:toggle-maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onWindowEvent: (callback: (payload: any) => void) => {
    const handler = (_: any, payload: any) => callback(payload)
    ipcRenderer.on('window:event', handler)
    return () => ipcRenderer.removeListener('window:event', handler)
  },
  onShutdownEvent: (callback: (payload: any) => void) => {
    const handler = (_: any, payload: any) => callback(payload)
    ipcRenderer.on('shutdown:event', handler)
    return () => ipcRenderer.removeListener('shutdown:event', handler)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)

    contextBridge.exposeInMainWorld('os', {
      ipcRenderer: {
        getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
        getResourceUsage: () => ipcRenderer.invoke('get-resource-usage'),
      }
    });
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.os = os
}
