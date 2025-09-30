/* eslint-disable @typescript-eslint/no-explicit-any */
import { app, BrowserWindow, ipcMain, shell, dialog } from "electron"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { TrayIcon } from "./trayIcon"
import { PersistentState } from "./persistentState"
import { BehaviorSubject, filter, Observable } from "rxjs"
import fs from "node:fs"
import { ipcPullChannels, ipcPushChannels } from "./ipcChannels"
import { pages, WindowManager } from "./windowManager"
import { makeKimaiIntegration } from "./kimai/kimaiIntegration"
import { actions } from "./schema"

export const __dirname = path.dirname(fileURLToPath(import.meta.url))
process.env.APP_ROOT = path.join(__dirname, "..")

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"]
export const isDev = VITE_DEV_SERVER_URL !== undefined
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron")
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist")

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST

const errors$ = new BehaviorSubject<string[]>([])
export function showGlobalError(msg: string, err: unknown) {
  console.error(err)
  errors$.next(errors$.getValue().concat([`${msg}: ${err}`]))
}

const userDataDir = isDev ? path.join(process.env.APP_ROOT, "dev-data") : app.getPath("userData")
if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true })
}

const persistentStateFile = path.join(userDataDir, "data.json")
const persistentState = (() => {
  try {
    return new PersistentState(persistentStateFile)
  } catch (e) {
    showGlobalError("Failed to load data.json", e)
    return null as unknown as PersistentState
  }
})()

const kimaiIntegration = makeKimaiIntegration(persistentState)

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
    (PullIPC[channel as keyof typeof PullIPC] as Observable<any>).subscribe(value => {
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
    state$: persistentState.getState(),
    toggleActive: () => persistentState.dispatch(actions.toggleActive()),
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

const timelineDay$ = new BehaviorSubject<string | null>(null)

export const PushIPC = {
  dispatch: persistentState.dispatch,
  openJSON: () => shell.showItemInFolder(persistentStateFile),
  exportCSV: async (type: "byDay" | "allEntries") => {
    const exportPath = await dialog.showSaveDialog({ title: "Export CSV", buttonLabel: "Export", filters: [{ name: "CSV", extensions: ["csv"] }] })
    if (!exportPath.canceled) {
      await persistentState.exportCSV(exportPath.filePath, type)
      shell.showItemInFolder(exportPath.filePath)
    }
  },
  setTimelineDay: (date: string) => timelineDay$.next(date),
  openPage: (page: "history" | "timeline" | "settings" | "selectKimaiActivityDialog") => windowManager.openOrShowPage(pages[page]),
  closePage: (pageId: string) => windowManager.closeWindow(pageId),
} satisfies { [key in typeof ipcPushChannels[number]]: (...args: any[]) => any }

export const PullIPC = {
  errors: errors$.asObservable(),
  state: persistentState.getState(),
  timelineDay: timelineDay$.pipe(filter(day => day !== null)),
  kimaiUsername: kimaiIntegration.username$,
  kimaiProjectsAndActivities: kimaiIntegration.projectsAndActivities$,
} satisfies { [key in typeof ipcPullChannels[number]]: Observable<any> }
