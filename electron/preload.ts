import { ipcRenderer, contextBridge } from "electron"

contextBridge.exposeInMainWorld("ipc", {
  test: () => ipcRenderer.invoke("test"),
})
