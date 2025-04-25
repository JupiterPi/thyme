import path from "path"
import { Menu, nativeImage, Tray } from "electron"
import { Observable } from "rxjs"
import { getDuration, pad2 } from "./util"

export class TrayIcon {
  private tray: Tray
  private readonly activeTrayIcon: Electron.NativeImage
  private readonly inactiveTrayIcon: Electron.NativeImage
  
  private _isActive = false
  private _activeStartTime: Date | null = null

  constructor({ vitePublicDirectory, activeStartTime$, toggleActive, toggleOpen, openDashboard, quit }: {
    vitePublicDirectory: string,
    activeStartTime$: Observable<Date | null>,
    toggleActive: () => void,
    toggleOpen: () => void,
    openDashboard: () => void,
    quit: () => void,
  }) {
    this.activeTrayIcon = nativeImage.createFromPath(path.join(vitePublicDirectory, "tray_icon_active.png"))
    this.inactiveTrayIcon = nativeImage.createFromPath(path.join(vitePublicDirectory, "tray_icon_inactive.png"))

    this.tray = new Tray(this.inactiveTrayIcon)
    this.updateIsActiveIndicator(false)

    activeStartTime$.subscribe(activeStartTime => {
      this._activeStartTime = activeStartTime
      const isActive = activeStartTime !== null
      this._isActive = isActive
      this.updateIsActiveIndicator(isActive)
    })

    // handle clicks
    let executeSingleClickTimeout: NodeJS.Timeout | undefined = undefined
    const cancelSingleClick = () => {
      if (executeSingleClickTimeout) {
        clearTimeout(executeSingleClickTimeout)
        executeSingleClickTimeout = undefined
        this.updateIsActiveIndicator(this._isActive)
      }
    }
    this.tray.on("double-click", () => {
      cancelSingleClick()
      toggleOpen()
    })
    this.tray.on("click", () => {
      cancelSingleClick()
      // toggle isActive
      this.updateIsActiveIndicator(!this._isActive)
      executeSingleClickTimeout = setTimeout(() => {
        clearTimeout(executeSingleClickTimeout)
        toggleActive()
      }, 300)
    })

    // context menu
    const contextMenu = Menu.buildFromTemplate([
      { label: "Open", type: "normal", click: () => openDashboard() },
      { label: "Toggle", type: "normal", click: () => toggleActive() },
      { label: "Quit", type: "normal", click: () => quit() },
    ])
    this.tray.setContextMenu(contextMenu)

    // update duration in tooltip
    setInterval(() => {
      if (this._isActive) this.updateTooltip()
    }, 30 * 1000)
  }

  private isActiveIndicator = false
  private updateIsActiveIndicator(isActive: boolean) {
    if (isActive !== this.isActiveIndicator) {
      this.tray.setImage(isActive ? this.activeTrayIcon : this.inactiveTrayIcon)
      this.updateTooltip()
    }
    this.isActiveIndicator = isActive
  }

  private updateTooltip() {
    if (this._isActive) {
      const duration = getDuration(this._activeStartTime!, new Date())
      this.tray.setToolTip(`Thyme: ${pad2(duration.hours)}:${pad2(duration.minutes)}h`)
    } else {
      this.tray.setToolTip("Thyme")
    }
  }
}