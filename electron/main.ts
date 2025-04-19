import { app, BrowserWindow, ipcMain } from "electron"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { AppState } from "./appState"
import { TrayIcon } from "./trayIcon"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
process.env.APP_ROOT = path.join(__dirname, "..")

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"]
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron")
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist")

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST

const appState = new AppState()

let window: BrowserWindow | null
let shouldQuit = false

function createWindow() {
  window = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  })

  if (VITE_DEV_SERVER_URL) {
    window.loadURL(VITE_DEV_SERVER_URL)
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
  ipcMain.handle("test", ipcHandler.test)

  new TrayIcon(
    process.env.VITE_PUBLIC, appState,
    () => window?.isVisible() ?? false,
    (visible) => visible ? window?.show() : window?.hide(),
    () => { shouldQuit = true; app.quit() },
  )
})

const ipcHandler: IPC = {
  test: async () => {
    console.log("test")
    return "test"
  },
}