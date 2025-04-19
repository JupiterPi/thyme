import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from "electron"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
process.env.APP_ROOT = path.join(__dirname, "..")

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"]
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron")
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist")

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST

let window: BrowserWindow | null
let tray: Tray | null = null

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
    event.preventDefault()
    window?.hide()
  })
}

app.on("activate", () => {
  // for macOS
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

let isActive = false

const activeTrayIcon = nativeImage.createFromPath(path.join(process.env.VITE_PUBLIC, "tray_icon_active.png"))
const inactiveTrayIcon = nativeImage.createFromPath(path.join(process.env.VITE_PUBLIC, "tray_icon_inactive.png"))

function setActive() {
  isActive = true
  tray?.setToolTip("Thyme (active)")
  tray?.setImage(activeTrayIcon)
}

function setInactive() {
  isActive = false
  tray?.setToolTip("Thyme (inactive)")
  tray?.setImage(inactiveTrayIcon)
}

app.whenReady().then(() => {
  createWindow()
  ipcMain.handle("test", ipcHandler.test)

  // tray icon
  tray = new Tray(inactiveTrayIcon)
  tray.setTitle("Thyme")
  setInactive()
  let toggleActiveTimer: NodeJS.Timeout | null = null
  tray.on("click", () => {
    toggleActiveTimer = setTimeout(() => isActive ? setInactive() : setActive(), 200)
  })
  tray.on("double-click", () => {
    if (toggleActiveTimer) clearTimeout(toggleActiveTimer)
    window?.isVisible() ? window?.hide() : window?.show()
  })
  const contextMenu = Menu.buildFromTemplate([
    { label: "Open Thyme", type: "normal", click: () => window ? window.show() : createWindow() },
    { label: "Toggle", type: "normal", click: () => isActive ? setInactive() : setActive() },
  ])
  tray.setContextMenu(contextMenu)
})

const ipcHandler: IPC = {
  test: async () => {
    console.log("test")
    return "test"
  },
}