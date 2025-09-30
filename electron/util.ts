import dateFormat from "dateformat";
import { PathLike } from "node:fs";
import fs from "node:fs/promises"

export function exists(path: PathLike) {
    return new Promise<boolean>(resolve => {
        fs.stat(path).then(() => resolve(true)).catch(() => resolve(false))
    })
}

// used with JSON.parse
export const parseDateReviver = (_: any, value: any) => {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ? new Date(value) : value
}

export function getDuration(a: Date, b: Date) {
    const duration = a.getTime() > b.getTime() ? 0 : b.getTime() - a.getTime()
    const hours = Math.floor(duration / 1000 / 60 / 60)
    const minutes = Math.floor((duration / 1000 / 60) % 60)
    const seconds = Math.floor((duration / 1000) % 60)
    return { hours, minutes, seconds }
}

export function pad2(num: number) {
    return num < 10 ? `0${num}` : `${num}`
}

export function midnight(baseTime: Date, addOneDay: boolean) {
    const midnight = new Date(baseTime)
    midnight.setHours(0, 0, 0, 0)
    addOneDay && midnight.setTime(midnight.getTime() + 24*60*60*1000)
    return midnight
}

export function formatOnlyDate(date: Date) {
  return `${dateFormat(date, "DDDD") /* (e.g. "today") */}, ${date.toLocaleDateString()}`
}

// https://stackoverflow.com/a/7616484/13164753
export function generateHash(str: string) {
    let hash = 0
    for (const char of str) {
      hash = (hash << 5) - hash + char.charCodeAt(0)
      hash |= 0
    }
    return hash
}