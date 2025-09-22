import React from "react"
import ReactDOM from "react-dom/client"
import "./ipc"
import "./index.css"
import { Dashboard } from "./Dashboard"
import { History } from "./History"
import ipc from "./ipc"
import { defaultState, State } from "../electron/types"
import logo from "./assets/icon.svg"
import { Settings } from "./Settings"
import { isDev } from "./buildInfo"
import { Timeline } from "./Timeline"
import { useObservable } from "./util"

const pageId = window.location.search.startsWith("?pageId=") ? window.location.search.slice("?pageId=".length) : ""

const pages: { id: string, title?: string, component: JSX.Element }[] = [
  { id: "dashboard", title: undefined, component: <Dashboard /> },
  { id: "history", title: "History", component: <History /> },
  { id: "timeline", title: "Timeline", component: <Timeline /> },
  { id: "settings", title: "Settings", component: <Settings /> },
]
const page = pages.find(page => page.id === (pageId.length > 0 ? pageId : "dashboard")) ?? { id: "", title: undefined, component: <div className="text-red-500">page not found</div> }

export const StateContext = React.createContext<State>(defaultState)

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)

function Root() {
  const errors = useObservable(ipc.errors) ?? []
  const state = useObservable(ipc.state) ?? defaultState

  return <>
    {/* draggable title bar */}
    <div className="absolute top-0 left-0 w-full h-7 bg-green-400 flex justify-end items-center">
      <div className="draggable flex-1 h-full flex">
        <div className="w-4"></div>
        <div className="flex-1 flex justify-center items-center text-sm">
          <img src={logo} className="size-4 bg-white rounded-full p-[1.5px] flex justify-center items-center mr-1" />
          {page.title !== undefined ? `Thyme | ${page.title}` : "Thyme"} {isDev && "(dev)"}
        </div>
      </div>
      <div className="text-[10px] text-green-600 bg-green-500 hover:bg-red-400 hover:text-red-600 size-4 rounded-full flex justify-center items-center mr-1.5" onClick={() => ipc.closePage(pageId)}>&#10006;</div>
    </div>
    <div className="mt-7"></div>

    <main>
      <StateContext.Provider value={state}>
        <div className="p-5 flex flex-col items-center gap-5 w-full absolute top-7 bottom-0 overflow-y-auto">
          {errors.length === 0 && page.component}
          {errors.length > 0 && <div className="text-red-500">{errors.map((err, i) => <div key={i}>{err}</div>)}</div>}
        </div>
      </StateContext.Provider>
    </main>
  </>
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    console.log("close", pageId)
    ipc.closePage(pageId)
  }
})
