import path from "path"
import { Menu, nativeImage, Tray } from "electron"
import { Observable } from "rxjs"

export class TrayIcon {
  private tray: Tray
  private readonly activeTrayIcon: Electron.NativeImage
  private readonly inactiveTrayIcon: Electron.NativeImage
  
  private _isActive = false

  constructor({ vitePublicDirectory, isActive, toggleActive, toggleOpen, openDashboard, quit }: {
    vitePublicDirectory: string,
    isActive: Observable<boolean>,
    toggleActive: () => void,
    toggleOpen: () => void,
    openDashboard: () => void,
    quit: () => void,
  }) {
    this.activeTrayIcon = nativeImage.createFromPath(path.join(vitePublicDirectory, "tray_icon_active.png"))
    this.inactiveTrayIcon = nativeImage.createFromPath(path.join(vitePublicDirectory, "tray_icon_inactive.png"))

    this.tray = new Tray(this.inactiveTrayIcon)
    this.updateIsActiveIndicator(false)

    isActive.subscribe(isActive => {
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
  }

  private isActiveIndicator = false
  private updateIsActiveIndicator(isActive: boolean) {
    if (isActive !== this.isActiveIndicator) {
      this.tray.setToolTip(`Thyme (${isActive ? "active" : "inactive"})`)
      this.tray.setImage(isActive ? this.activeTrayIcon : this.inactiveTrayIcon)
    }
    this.isActiveIndicator = isActive
  }
}