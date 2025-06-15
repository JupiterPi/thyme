import path from "path"
import { BrowserWindow, shell } from "electron"
import { __dirname, isDev, RENDERER_DIST, VITE_DEV_SERVER_URL } from "./main"
import url from "url"

export type Page = { id: string, width: number, height: number }
export const pages: Record<string, Page> = {
  dashboard: { id: "", width: 250, height: 425 },
  history: { id: "history", width: 500, height: 600 },
  timeline: { id: "timeline", width: 500, height: 800 },
  settings: { id: "settings", width: 300, height: 350 },
}

export class WindowManager {
    private windows: { page: Page, window: BrowserWindow }[] = []
    private shouldQuit = false

    public openOrShowPage(page: Page) {
        const existingWindow = this.findWindow(page)
        if (existingWindow) {
            existingWindow.show()
            return
        }

        const window = new BrowserWindow({
            titleBarStyle: "hidden",
            webPreferences: {
                preload: path.join(__dirname, "preload.mjs"),
            },
            width: page.width,
            height: page.height,
            resizable: isDev,
            maximizable: false,
        })
        this.windows.push({ page, window })

        const pageQueryStr = page.id === "" ? "" : `?pageId=${page.id}`
        if (isDev) {
            window.loadURL(VITE_DEV_SERVER_URL! + pageQueryStr)
        } else {
            window.loadURL(url.pathToFileURL(path.join(RENDERER_DIST, "index.html")) + pageQueryStr)
        }
    
        window.on("close", (event) => {
            if (page.id === "" && !this.shouldQuit) {
                event.preventDefault()
                window?.hide()
            }
        })

        window.webContents.setWindowOpenHandler((details) => {
            shell.openExternal(details.url)
            return { action: "deny" }
        })
    }

    public findWindow(page: Page | string) {
        const pageId = typeof page === "string" ? page : page.id
        return this.windows.find(({ page }) => page.id === pageId)?.window
    }

    public closeWindow(page: Page | string) {
        const pageId = typeof page === "string" ? page : page.id
        const window = this.findWindow(pageId)
        window?.close()
        if (pageId !== "") {
            this.windows = this.windows.filter(({ page }) => page.id !== pageId)
        }
    }

    public hideAll() {
        this.windows.forEach(({ window }) => {
            window.hide()
        })
    }

    public showAll() {
        this.windows.forEach(({ window }) => {
            window.show()
        })
    }

    public closeAll(quit = false) {
        this.shouldQuit = quit
        this.windows.forEach(({ page }) => {
            this.closeWindow(page)
        })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public sendAll(channel: string, ...args: any[]) {
        for (const { window } of this.windows) {
            window.webContents.send(channel, ...args)
        }
    }
}