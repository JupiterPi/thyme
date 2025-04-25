import { BehaviorSubject, filter, first } from "rxjs"

let latestVersion$: BehaviorSubject<string | undefined> | undefined = undefined
export async function getLatestVersion() {
    if (latestVersion$ === undefined) {
        latestVersion$ = new BehaviorSubject<string | undefined>(undefined)
        const response = await fetch("https://api.github.com/repos/JupiterPi/thyme/releases/latest")
        latestVersion$.next((await response.json()).tag_name)
        return await getLatestVersion()
    }
    return new Promise<string>(resolve => {
        latestVersion$!.pipe(filter(v => v !== undefined), first()).subscribe(resolve)
    })
}