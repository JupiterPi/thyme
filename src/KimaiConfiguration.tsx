import { useContext, useEffect, useState } from "react"
import { StateContext } from "./main"
import ipc from "./ipc"
import classNames from "classnames"

export default function KimaiConfiguration() {
    const state = useContext(StateContext)

    const enabled = state.kimai?.enabled
    const toggleEnabled = () => ipc.setKimai({ ...state.kimai, enabled: !state.kimai?.enabled })

    const [url, setUrl] = useState("")
    useEffect(() => {
        setUrl(state.kimai.connection?.url ?? "")
    }, [state.kimai.connection?.url])
    const [authToken, setAuthToken] = useState("")
    useEffect(() => {
        setAuthToken(state.kimai.connection?.authToken ?? "")
    }, [state.kimai.connection?.authToken])

    const [connectStatus, setConnectStatus] = useState({ error: false, message: "" })
    const connect = async () => {
        if (url.length === 0) {
            setConnectStatus({ error: true, message: "URL is required" })
            return
        }
        if (authToken.length === 0) {
            setConnectStatus({ error: true, message: "Auth token is required" })
            return
        }
        setConnectStatus({ error: false, message: "Connecting..." })
        try {
            const response = await fetch((url.endsWith("/") ? url.slice(0, -1) : url) + "/api/ping", {
                headers: {
                    "Authorization": "Bearer " + authToken,
                },
            })
            if (response.ok) {
                setConnectStatus({ error: false, message: "Connected successfully!" })
                ipc.setKimai({ ...state.kimai, connection: { url, authToken } })
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
    const disconnect = () => {
        ipc.setKimai({ ...state.kimai, connection: undefined })
        setUrl("")
        setAuthToken("")
    }

    return <>
        <div className="flex flex-col gap-3 w-full">

            {/* enable/disable */}
            <div className="flex justify-center">
                <button className="_button" onClick={toggleEnabled}>{state.kimai?.enabled ? "Disable" : "Enable"} Kimai extension</button>
            </div>

            <div className="flex gap-2 items-center">
                URL: <input disabled={!enabled} className="_input flex-1" value={url} onChange={e => setUrl(e.target.value)}></input>
            </div>
            <div className="flex gap-2 items-center">
                API Token: <input disabled={!enabled} className="_input flex-1" value={authToken} onChange={e => setAuthToken(e.target.value)}></input>
            </div>
            <div className="flex gap-2 items-center">
                <button disabled={!enabled} className="_button" onClick={connect}>Connect</button>
                <button disabled={!enabled} className="_button" onClick={disconnect}>Disconnect</button>
            </div>
            <div className={classNames("text-green-600 font-medium -mt-1", { "text-red-600": connectStatus.error })}>{connectStatus.message}</div>

        </div>
    </>
}
