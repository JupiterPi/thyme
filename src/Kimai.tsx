import { useContext } from "react"
import { StateContext } from "./main"
import ipc from "./ipc"
import { nullState } from "../electron/types"
import { useEphemeralState, useObservable } from "./util"

export default function Kimai() {
    const state = useContext(StateContext)
    console.log(state.kimai)

    const kimaiUsername = useObservable(ipc.kimaiUsername) ?? "..."
    const kimaiHostname = state.kimai?.url.replace(/https?:\/\//, "").replace(/\/$/, "") ?? "..."

    const openKimai = () => {
        if (state.kimai !== undefined) window.open(state.kimai?.url, "_blank")
    }

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
            <div className="flex gap-2 items-center _container !bg-green-200 w-full">
                <div className="bg-green-500 size-4 rounded-full"></div>
                <div>
                    Connected as
                    <span className="font-medium"> {kimaiUsername} </span>
                    at
                    <span className="font-medium"> {kimaiHostname}</span>
                </div>
            </div>
            <div className="flex gap-2 w-full">
                <button className="_button" onClick={openKimai}>Open Kimai</button>
                <button className="_button">Force sync (TODO)</button>
                <div className="flex-1"></div>
                <button className="_button" onClick={disableKimai}>{confirmingDisconnect ? "Confirm" : "Disconnect"}</button>
            </div>
        </div>
    )
}