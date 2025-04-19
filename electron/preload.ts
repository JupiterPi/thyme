import { ipcRenderer, contextBridge } from "electron"
import { ipcChannels } from "./ipcChannels"

contextBridge.exposeInMainWorld("ipc", (() => {
  let api: {[key: string]: () => Promise<any>} = {}
  ipcChannels.forEach(channel => {
    const key = channel as keyof typeof api
    api[key] = (...args) => ipcRenderer.invoke(channel, ...args)
  })
  return api
})())