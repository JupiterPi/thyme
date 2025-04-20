import { ipcRenderer, contextBridge } from "electron"
import { ipcPullChannels, ipcPushChannels } from "./ipcChannels"

contextBridge.exposeInMainWorld("ipc", (() => {
  let ipc: {[key: string]: any} = {}
  ipcPushChannels.forEach(channel => {
    ipc[channel] = (...args: any[]) => ipcRenderer.invoke(channel, ...args)
  })
  ipcPullChannels.forEach(channel => {
    ipc[("listen__" + channel)] = (callback: (event: any, value: any) => void) => ipcRenderer.on(("listen__" + channel), callback)
    ipc[("startListening__" + channel)] = () => {
      ipcRenderer.invoke("startListening__" + channel)
    }
  })
  return ipc
})())