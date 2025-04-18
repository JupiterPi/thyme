import { app, BrowserWindow, ipcMain } from "electron"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
process.env.APP_ROOT = path.join(__dirname, "..")

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"]
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron")
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist")

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST

let window: BrowserWindow | null

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
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
    window = null
  }
})

app.on("activate", () => {
  // for macOS
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()
  ipcMain.handle("test", ipcHandler.test)
})

const ipcHandler: IPC = {
  test: async () => {
    console.log("test")
    return "test"
  },
}