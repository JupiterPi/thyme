import path from "path"
import { Menu, nativeImage, Tray } from "electron"
import { AppState } from "./appState"

export class TrayIcon {
  private tray: Tray
  private readonly activeTrayIcon: Electron.NativeImage
  private readonly inactiveTrayIcon: Electron.NativeImage
  
  private isActive = false

  constructor(
    private vitePublicDirectory: string,
    private appState: AppState,
    private isWindowVisible: () => boolean,
    private setWindowVisible: (visible: boolean) => void,
    private quit: () => void,
  ) {
    this.activeTrayIcon = nativeImage.createFromPath(path.join(this.vitePublicDirectory, "tray_icon_active.png"))
    this.inactiveTrayIcon = nativeImage.createFromPath(path.join(this.vitePublicDirectory, "tray_icon_inactive.png"))

    this.tray = new Tray(this.inactiveTrayIcon)
    this.updateIsActiveIndicator(false)

    this.appState.getActive().subscribe(isActive => {
      this.isActive = isActive
      this.updateIsActiveIndicator(isActive)
    })

    // handle clicks
    let executeSingleClickTimeout: NodeJS.Timeout | undefined = undefined
    const cancelSingleClick = () => {
      if (executeSingleClickTimeout) {
        clearTimeout(executeSingleClickTimeout)
        executeSingleClickTimeout = undefined
        this.updateIsActiveIndicator(this.isActive)
      }
    }
    this.tray.on("double-click", () => {
      cancelSingleClick()
      this.setWindowVisible(!this.isWindowVisible())
    })
    this.tray.on("click", () => {
      cancelSingleClick()
      // toggle isActive
      this.updateIsActiveIndicator(!this.isActive)
      executeSingleClickTimeout = setTimeout(() => {
        clearTimeout(executeSingleClickTimeout)
        this.appState.toggleActive()
      }, 300)
    })

    // context menu
    const contextMenu = Menu.buildFromTemplate([
      { label: "Open", type: "normal", click: () => this.setWindowVisible(true) },
      { label: "Toggle", type: "normal", click: () => this.appState.toggleActive() },
      { label: "Quit", type: "normal", click: () => this.quit() },
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