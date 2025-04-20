import { app, BrowserWindow, ipcMain } from "electron"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { TrayIcon } from "./trayIcon"
import { PersistentState } from "./persistentState"
import { first, map, Observable } from "rxjs"
import fs from "node:fs"
import { ipcPullChannels, ipcPushChannels } from "./ipcChannels"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
process.env.APP_ROOT = path.join(__dirname, "..")

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"]
export const isDev = VITE_DEV_SERVER_URL !== undefined
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron")
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist")

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST

const userDataDir = isDev ? path.join(process.env.APP_ROOT, "dev-data") : app.getPath("userData")
if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true })
}

const persistentState = new PersistentState(path.join(userDataDir, "data.json"))

let window: BrowserWindow | null
let shouldQuit = false
const quit = async () => {
  shouldQuit = true
  await persistentState.forceWrite()
  app.quit()
}

function createWindow() {
  window = new BrowserWindow({
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
    width: 250,
    height: 330,
    resizable: isDev,
    maximizable: false,
  })

  if (isDev) {
    window.loadURL(VITE_DEV_SERVER_URL!)
  } else {
    window.loadFile(path.join(RENDERER_DIST, "index.html"))
  }

  window.on("close", (event) => {
    if (!shouldQuit) {
      event.preventDefault()
      window?.hide()
    }
  })
}

app.on("activate", () => {
  // for macOS
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()

  // setup IPC handlers
  Object.keys(PushIPC).forEach((key) => {
    ipcMain.handle(key, () => PushIPC[key as keyof typeof PushIPC]())
  })
  Object.keys(PullIPC).forEach((channel) => {
    let lastValue: any
    PullIPC[channel as keyof typeof PullIPC].subscribe(value => {
      lastValue = value
      window?.webContents.send(("listen__" + channel), value)
    })
    ipcMain.handle(("startListening__" + channel), () => {
      if (lastValue !== undefined) {
        window?.webContents.send(("listen__" + channel), lastValue)
      }
    })
  })

  // tray icon
  new TrayIcon({
    vitePublicDirectory: process.env.VITE_PUBLIC,
    isActive: persistentState.getActiveStartTime().pipe(map(activeStartTime => activeStartTime !== null)),
    toggleActive: () => toggleActive(),
    isWindowVisible: () => window?.isVisible() ?? false,
    setWindowVisible: (visible) => visible ? window?.show() : window?.hide(),
    quit,
  })
})

function toggleActive() {
  persistentState.getActiveStartTime().pipe(first()).subscribe(activeStartTime => {
    if (activeStartTime === null) {
      persistentState.setActiveStartTime(new Date())
    } else {
      persistentState.setActiveStartTime(null)
      persistentState.addTimeEntry(activeStartTime, new Date())
    }
  })
}

export const PushIPC = {
  toggleActive: () => toggleActive(),
  hide: () => window?.hide(),
  quit: () => quit(),
} satisfies { [key in typeof ipcPushChannels[number]]: () => any }

export const PullIPC = {
  state: persistentState.getState(),
} satisfies { [key in typeof ipcPullChannels[number]]: Observable<any> }
