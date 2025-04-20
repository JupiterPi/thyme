import { ipcRenderer, contextBridge } from "electron"
import { ipcPullChannels, ipcPushChannels } from "./ipcChannels"

contextBridge.exposeInMainWorld("ipc", (() => {
  let api: {[key: string]: any} = {}
  ipcPushChannels.forEach(channel => {
    const key = channel as keyof typeof api
    api[key] = (...args: any[]) => ipcRenderer.invoke(channel, ...args)
  })
  ipcPullChannels.forEach(channel => {
    const key = ("pull__" + channel) as keyof typeof api
    api[key] = (callback: (event: any, value: any) => void) => ipcRenderer.on(channel, callback)
  })
  return api
})())