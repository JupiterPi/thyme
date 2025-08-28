import { useContext, useState } from "react"
import { StateContext } from "./main"
import classNames from "classnames"
import ipc from "./ipc"
import { isEnabled } from "../electron/types"

export default function Kimai() {
    return <div className="flex flex-col gap-3 w-full">

        {/* buttons: Open Kimai, How It Works */}
        <div className="flex gap-2">
            <button className="_button" onClick={() => {} /* todo: implement Open Kimai button */}>Open Kimai</button>
            <button className="_button" onClick={() => {} /* todo: implement How It Works button */}>How It Works</button>
        </div>

        <KimaiConnectionDialog />

        <div className="my-1 flex justify-center"><div className="h-0 w-full mx-2 border-t-1 border-green-400"></div></div>

        <div className="flex justify-center">Entries here... (WIP)</div>

    </div>
}

function KimaiConnectionDialog() {
    const state = useContext(StateContext)

    const [edit, setEdit] = useState(false)
    const showEditDialog = edit || !isEnabled(state.kimai)

    return <div className="_container bg-green-200!">
        {showEditDialog
            ? <KimaiConnectionDialogEditable close={() => setEdit(false)} />
            : <div className="flex flex-col gap-2 items-start">
                {/* connected */}
                <div className="flex gap-2 items-center">
                    <div className="bg-green-500 size-4 rounded-full"></div>
                    <div>Connected to <span className="font-medium">{state.kimai.connection!.url}</span></div>
                </div>
                <button className="_button" onClick={() => setEdit(true)}>Change Connection</button>
            </div>
        }
    </div>
}

function KimaiConnectionDialogEditable({ close: close }: { close: () => void }) {
    const state = useContext(StateContext)

    const isInitialSetup = !isEnabled(state.kimai)

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
                ipc.setKimai({ ...state.kimai, connection: { url, authToken } })
                close()
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

    const disableKimai = () => {
        ipc.setKimai({ ...state.kimai, connection: undefined })
        ipc.closePage("kimai")
    }

    return <div className="flex flex-col gap-2 w-full">
        <div className="flex gap-2 items-center">
            URL: <input className="_input !bg-green-300 flex-1" value={url} onChange={e => setUrl(e.target.value)}></input>
        </div>
        <div className="flex gap-2 items-center">
            API Token: <input className="_input !bg-green-300 flex-1" value={authToken} onChange={e => setAuthToken(e.target.value)}></input>
        </div>
        <div className="flex gap-3 items-center">
            <button className="_button" disabled={url.length === 0 || authToken.length === 0} onClick={connect}>Connect</button>
            {!isInitialSetup && <button className="_button" onClick={close}>Cancel</button>}
            <div className={classNames("text-green-700", { "text-red-600": connectStatus.error })}>{connectStatus.message}</div>
        </div>
        {!isInitialSetup && <div><button className="_button !bg-red-300 hover:!bg-red-400 !border-red-600" onClick={disableKimai}>Disable Kimai</button></div>}
    </div>
}