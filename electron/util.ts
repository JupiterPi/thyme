import { PathLike } from "node:fs";
import fs from "node:fs/promises"

export function exists(path: PathLike) {
    return new Promise<boolean>(resolve => {
        fs.stat(path).then(() => resolve(true)).catch(() => resolve(false))
    })
}