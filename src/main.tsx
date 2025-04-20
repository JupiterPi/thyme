import React, { useEffect } from "react"
import ReactDOM from "react-dom/client"
import "./ipc"
import "./index.css"
import { Home } from "./Home"
import ipc from "./ipc"
import { nullState, State } from "../electron/types"

export const StateContext = React.createContext<State>(nullState)

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)

function Root() {
  const [state, setState] = React.useState<State>(nullState)
  useEffect(() => {
    const subscription = ipc.state.subscribe(state => {
      setState(state)
    })
    return () => subscription.unsubscribe()
  }, [])

  return <>
    {/* draggable title bar */}
    <div className="absolute top-0 left-0 w-full h-7 bg-green-400 flex justify-end items-center">
      <div className="draggable flex-1 h-full"></div>
      <div className="text-[10px] text-green-600 bg-green-500 hover:bg-red-400 hover:text-red-600 size-4 rounded-full flex justify-center items-center mr-1.5" onClick={() => window.ipc.hide()}>&#10006;</div>
    </div>
    <div className="mt-7"></div>

    <main className="p-5 flex flex-col items-center gap-5">
      <StateContext.Provider value={state}>
        <Home startTime={new Date()} />
      </StateContext.Provider>
    </main>
  </>
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    window.ipc.quit()
  }
})