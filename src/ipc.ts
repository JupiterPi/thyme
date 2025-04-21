// @ts-nocheck

import { Observable } from "rxjs"

let ipc = {}
Object.keys(window.ipc).forEach((key) => {
    if (key.startsWith("listen__")) {
        const channel = key.slice("listen__".length)
        ipc[channel] = new Observable((subscriber) => {
            window.ipc[("listen__" + channel)]((event, value) => {
                subscriber.next(value)
            })
            window.ipc[("startListening__" + channel)]()
        })
    } else {
        ipc[key] = window.ipc[key]
    }
})

export default ipc as IPC as const