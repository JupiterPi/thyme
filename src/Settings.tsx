import { useEffect, useState } from "react";
import { version } from "./buildInfo";
import { getLatestVersion } from "./updates";

export function Settings() {
    const [latestVersion, setLatestVersion] = useState<string | undefined>(undefined);
    useEffect(() => {
        getLatestVersion().then(version => setLatestVersion(version))
    }, [])

    return (
        <div className="w-full h-full flex flex-col items-start gap-3 text-green-900 font-medium p-1 leading-5">
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
        </div>
    )
}