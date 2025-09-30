import { useContext, useEffect, useState } from "react"
import { version } from "./buildInfo"
import { getLatestVersion } from "./updates"
import ipc from "./ipc";
import { actions } from "../electron/schema";
import { StateContext } from "./main";
import KimaiSection from "./kimai";

export function Settings() {
    const [latestVersion, setLatestVersion] = useState<string | undefined>(undefined);
    useEffect(() => {
        getLatestVersion().then(version => setLatestVersion(version)).catch(e => console.error(e))
    }, [])

    return (
        <div className="w-full flex flex-col items-start gap-3 text-green-900 font-medium p-1 leading-5">

            {/* Info section */}
            <h2 className="text-xl font-semibold mb-1">Info</h2>
            <p>Thyme {version}</p>
            <div className="_container py-2! bg-green-200!">
                {latestVersion === undefined
                    ? <p>Checking for updates...</p>
                    : latestVersion === version
                    ? <p>Up to date.</p>
                    : <p>A new version is available: <a href="https://github.com/JupiterPi/thyme/releases/latest" target="_blank" className="text-green-500">{latestVersion}</a></p>
                }
            </div>
            <p>Visit the project on GitHub: <br /> <a href="https://github.com/JupiterPi/thyme" target="_blank" className="text-green-500">JupiterPi/thyme</a></p>
            <p>Made with ❤️ by <a href="https://jupiterpi.de" target="_blank" className="text-green-500">JupiterPi</a></p>

            {/* Kimai section */}
            <h2 className="text-xl font-semibold mb-1 mt-4">Kimai</h2>
            <UseActivitiesWithoutKimaiCheckbox />
            <KimaiSection />

            {/* todo: add manual? */}

        </div>
    )
}

function UseActivitiesWithoutKimaiCheckbox() {
    const state = useContext(StateContext)
    return (
        <div className="flex gap-2 items-center">
            <input type="checkbox" id="dontUseActivitiesWithoutKimai"
                checked={state.dontUseActivitiesWithoutKimai}
                onChange={e => ipc.dispatch(actions.setDontUseActivitiesWithoutKimai(e.target.checked))}
                className="_checkbox"
            />
            <label htmlFor="dontUseActivitiesWithoutKimai" className="">Don't use activities without Kimai</label>
        </div>
    )
}