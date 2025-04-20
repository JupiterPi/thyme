import { PathLike } from "node:fs";
import fs from "node:fs/promises"

export function exists(path: PathLike) {
    return new Promise<boolean>(resolve => {
        fs.stat(path).then(() => resolve(true)).catch(() => resolve(false))
    })
}

export const parseDateReviver = (_: any, value: any) => {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ? new Date(value) : value
}