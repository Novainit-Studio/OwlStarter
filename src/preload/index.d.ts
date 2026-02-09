import { ElectronAPI } from '@electron-toolkit/preload'

export type McJarType = 'vanilla' | 'servers' | 'modded' | 'bedrock' | 'proxies'
export type McJarPlatform = 'windows' | 'linux'

export type ServerRecord = {
  id: number
  name: string
  type: string
  variant: string
  version: string
  platform?: string | null
  port: number
  maxPlayers: number
  description?: string | null
  status: string
  jarPath?: string | null
  jarSource?: string | null
  settings?: string | null
  createdAt: string
  updatedAt: string
}

export type CreateServerPayload = {
  name: string
  type: McJarType
  variant: string
  version: string
  platform?: McJarPlatform
  port: number
  maxPlayers: number
  description?: string
  settings?: string
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      listServers: () => Promise<ServerRecord[]>
      createServer: (payload: CreateServerPayload) => Promise<ServerRecord>
      getJarVersions: (payload: { type: McJarType; variant: string; platform?: McJarPlatform }) => Promise<string[]>
      getServer: (serverId: number) => Promise<ServerRecord | null>
      startServer: (serverId: number) => Promise<{ success: boolean }>
      stopServer: (serverId: number) => Promise<{ success: boolean }>
      deleteServer: (serverId: number) => Promise<{ success: boolean }>
      getServerTerminal: (serverId: number, command?: string | null) => Promise<{ output: string }>
      getServerPlayers: (serverId: number) => Promise<{ players: string[] }>
      playerAction: (serverId: number, action: 'kick' | 'ban', player: string) => Promise<{ result: string }>
      getServerConfig: (serverId: number) => Promise<{ content: string }>
      updateServerConfig: (serverId: number, content: string) => Promise<{ success: boolean }>
      getUpdateState: () => Promise<{
        status: string
        message?: string
        version?: string
        releaseNotes?: string
        progress?: number
      }>
      checkForUpdates: () => Promise<any>
      downloadUpdate: () => Promise<any>
      installUpdate: () => Promise<{ success: boolean }>
      setAutoUpdate: (payload: { autoCheck: boolean; autoDownload: boolean; intervalMs?: number }) => Promise<{
        autoCheck: boolean
        autoDownload: boolean
        intervalMs: number
      }>
      onUpdateEvent: (callback: (payload: any) => void) => () => void
      minimizeWindow: () => Promise<{ success: boolean }>
      toggleMaximizeWindow: () => Promise<{ success: boolean; maximized?: boolean }>
      closeWindow: () => Promise<{ success: boolean }>
      isWindowMaximized: () => Promise<{ maximized: boolean }>
      onWindowEvent: (callback: (payload: any) => void) => () => void
    },
    os: any
  }
}
