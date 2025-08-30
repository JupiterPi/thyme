import { useContext, useState } from "react"
import { StateContext } from "./main"
import ipc from "./ipc"
import { nullState } from "../electron/types"
import { useEphemeralState, useObservable } from "./util"
import classNames from "classnames"

export default function KimaiSection() {
    const state = useContext(StateContext)

    const [openSetupDialog, setOpenSetupDialog] = useState(false)

    if (state.kimai === undefined) {
        if (openSetupDialog) {
            return <KimaiSetupDialog />
        } else {
            return <button className="_button" onClick={() => setOpenSetupDialog(true)}>Enable Kimai integration</button>
        }
    } else {
        return <Kimai />
    }
}

export function KimaiSetupDialog() {
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
                /// todo
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

    return <>
        <p>Open your Kimai web app and navigate to <i>User &gt; API Access</i> to create an API token.</p>
        <div className="flex flex-col gap-2 w-full _container !bg-green-200">
            <div className="flex gap-2 items-center">
                URL: <input placeholder="e. g. https://demo.kimai.org" className="_input !bg-green-300 flex-1" value={url} onChange={e => setUrl(e.target.value)}></input>
            </div>
            <div className="flex gap-2 items-center">
                <span className="text-nowrap">API Token:</span> <input placeholder="e. g. 6d71a0a35f67aef6758bed0e8" className="_input !bg-green-300 flex-1 w-0" value={authToken} onChange={e => setAuthToken(e.target.value)}></input>
            </div>
            <div className="flex gap-3 items-center">
                <button className="_button" disabled={url.length === 0 || authToken.length === 0} onClick={connect}>Connect</button>
                <div className={classNames("text-green-700", { "text-red-600": connectStatus.error })}>{connectStatus.message}</div>
            </div>
        </div>
    </>
}

export function Kimai() {
    const state = useContext(StateContext)

    const kimaiUsername = useObservable(ipc.kimaiUsername) ?? "..."
    const kimaiHostname = state.kimai?.url.replace(/https?:\/\//, "").replace(/\/$/, "") ?? "..."

    const [confirmingDisconnect, setConfirmingDisconnect] = useEphemeralState(false, 1000)
    const disableKimai = () => {
        if (!confirmingDisconnect) {
            setConfirmingDisconnect(true)
            return
        } else {
            ipc.setKimai(nullState.kimai)
            ipc.closePage("kimai")
        }
    }

    return (
        <div className="flex flex-col gap-3 items-start w-full">
            {/* connected */}
            <div className="flex gap-3 items-center _container !bg-green-200 w-full !rounded-xl">
                <div className="bg-green-500 size-4 rounded-full mx-0.5"></div>
                <div className="-my-1">
                    Connected as
                    <span className="font-semibold"> {kimaiUsername} </span>
                    <br></br>
                    <span>at </span>
                    <a className="font-semibold underline decoration-2 decoration-green-400 hover:decoration-green-500" href={state.kimai?.url} target="_blank">{kimaiHostname}</a>
                </div>
            </div>
            <div className="flex gap-2 flex-wrap w-full">
                {/* todo: implement force sync */}
                {/* <button className="_button">Force sync</button> */}
                <button className="_button" onClick={disableKimai}>{confirmingDisconnect ? "Confirm" : "Disable"}</button>
            </div>
        </div>
    )
}