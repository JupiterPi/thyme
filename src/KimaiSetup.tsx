import { useContext, useState } from "react"
import { StateContext } from "./main"
import classNames from "classnames"
import ipc from "./ipc"

export default function KimaiSetup() {
    const state = useContext(StateContext)

    const [url, setUrl] = useState("")
    const [authToken, setAuthToken] = useState("")

    const [connectStatus, setConnectStatus] = useState({ error: false, message: "" })
    const connect = async () => {
        setConnectStatus({ error: false, message: "Connecting..." })
        try {
            const response = await fetch((url.endsWith("/") ? url.slice(0, -1) : url) + "/api/ping", {
                headers: {
                    "Authorization": "Bearer " + authToken,
                },
            })
            if (response.ok) {
                setConnectStatus({ error: false, message: "Connected successfully!" })
                ipc.setKimai({ url, authToken, cutoff: new Date(), uploadedEntries: [] }) // todo: more elegant?
                ipc.closePage("kimaiSetup")
                ipc.openPage("kimai")
            } else {
                if (response.status === 401) {
                    setConnectStatus({ error: true, message: "Invalid authentication" })
                } else {
                    setConnectStatus({ error: true, message: `Connection failed: ${response.status} ${response.statusText} ${await response.text()}` })
                }
            }
        } catch (error) {
            setConnectStatus({ error: true, message: `Connection failed: ${error}` })
        }
    }

    if (state.kimai !== undefined) return <div className="text-red font-semibold">The Kimai integration is already connected!</div>

    return <div className="flex flex-col gap-2 w-full">
        <div className="flex gap-2 items-center">
            URL: <input className="_input !bg-green-200 flex-1" value={url} onChange={e => setUrl(e.target.value)}></input>
        </div>
        <div className="flex gap-2 items-center">
            API Token: <input className="_input !bg-green-200 flex-1" value={authToken} onChange={e => setAuthToken(e.target.value)}></input>
        </div>
        <div className="flex gap-3 items-center">
            <button className="_button" disabled={url.length === 0 || authToken.length === 0} onClick={connect}>Connect</button>
            <div className={classNames("text-green-700", { "text-red-600": connectStatus.error })}>{connectStatus.message}</div>
        </div>
    </div>
}