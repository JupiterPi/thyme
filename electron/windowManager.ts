import path from "path"
import { BrowserWindow } from "electron"
import { __dirname, isDev, RENDERER_DIST, VITE_DEV_SERVER_URL } from "./main"

export type Page = { id: string, width: number, height: number }
export const pages: Record<string, Page> = {
  dashboard: { id: "", width: 250, height: 375 },
  history: { id: "history", width: 460, height: 500 },
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
            resizable: true,
            maximizable: false,
        })
        this.windows.push({ page, window })

        if (isDev) {
            window.loadURL(VITE_DEV_SERVER_URL! + "#" + page.id)
        } else {
            window.loadFile(path.join(RENDERER_DIST, "index.html") + "#" + page.id)
        }
    
        window.on("close", (event) => {
            if (page.id === "" && !this.shouldQuit) {
                event.preventDefault()
                window?.hide()
            }
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

    public sendAll(channel: string, ...args: any[]) {
        for (const { window } of this.windows) {
            window.webContents.send(channel, ...args)
        }
    }
}