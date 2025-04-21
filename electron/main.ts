import { app, BrowserWindow, ipcMain } from "electron"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { TrayIcon } from "./trayIcon"
import { PersistentState } from "./persistentState"
import { first, map, Observable } from "rxjs"
import fs from "node:fs"
import { ipcPullChannels, ipcPushChannels } from "./ipcChannels"
import { pages, WindowManager } from "./windowManager"

export const __dirname = path.dirname(fileURLToPath(import.meta.url))
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

const windowManager = new WindowManager()

app.on("activate", () => {
  // for macOS
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager.openOrShowPage(pages.dashboard)
  }
})

app.whenReady().then(() => {
  windowManager.openOrShowPage(pages.dashboard)

  // setup IPC handlers
  Object.keys(PushIPC).forEach((key) => {
    ipcMain.handle(key, (_: any, ...args: any[]) => (PushIPC[key as keyof typeof PushIPC] as (...args: any[]) => any)(...args))
  })
  Object.keys(PullIPC).forEach((channel) => {
    let lastValue: any
    PullIPC[channel as keyof typeof PullIPC].subscribe(value => {
      lastValue = value
      windowManager.sendAll(("listen__" + channel), value)
    })
    ipcMain.handle(("startListening__" + channel), () => {
      if (lastValue !== undefined) {
        windowManager.sendAll(("listen__" + channel), lastValue)
      }
    })
  })

  // tray icon
  new TrayIcon({
    vitePublicDirectory: process.env.VITE_PUBLIC,
    isActive: persistentState.getActiveStartTime().pipe(map(activeStartTime => activeStartTime !== null)),
    toggleActive: () => toggleActive(),
    toggleOpen: () => {
      const window = windowManager.findWindow(pages.dashboard)
      if (window?.isVisible()) {
        windowManager.hideAll()
      } else {
        windowManager.openOrShowPage(pages.dashboard)
        windowManager.showAll()
      }
    },
    openDashboard: () => windowManager.openOrShowPage(pages.dashboard),
    quit: () => windowManager.closeAll(true),
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
  closeDashboard: () => windowManager.closeWindow(pages.dashboard),
  openHistory: () => windowManager.openOrShowPage(pages.history),
  closePage: (pageId: string) => windowManager.closeWindow(pageId),
} satisfies { [key in typeof ipcPushChannels[number]]: (...args: any[]) => any }

export const PullIPC = {
  state: persistentState.getState(),
} satisfies { [key in typeof ipcPullChannels[number]]: Observable<any> }
