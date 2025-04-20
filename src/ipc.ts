// @ts-nocheck

import { Observable } from "rxjs"

let ipc = {}
Object.keys(window.ipc).forEach((key) => {
    if (key.startsWith("pull__")) {
        ipc[key.slice("pull__".length)] = new Observable((subscriber) => {
            window.ipc[key]((event, value) => {
                subscriber.next(value)
            })
        })
    }
})

export default ipc as PullIPC as const