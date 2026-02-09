import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initDb } from './services/db'
import { registerIpcHandlers, setupAutoUpdater, shutdownAllServers, broadcastShutdownEvent } from './ipc'

let isAppQuitting = false

function createWindow(): void {
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

  mainWindow.on('close', (event) => {
    if (isAppQuitting) return
    event.preventDefault()
    void (async () => {
      await shutdownAllServers()
      isAppQuitting = true
      broadcastShutdownEvent({ status: 'quitting', message: '正在關閉應用程式...' })
      app.quit()
    })()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

registerIpcHandlers()

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.novainit.owlstarter')
  // console.log('userData:', app.getPath('userData'))

  setupAutoUpdater()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  initDb()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', (event) => {
  if (isAppQuitting) return
  event.preventDefault()
  void (async () => {
    await shutdownAllServers()
    isAppQuitting = true
    broadcastShutdownEvent({ status: 'quitting', message: '正在關閉應用程式...' })
    app.quit()
  })()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
