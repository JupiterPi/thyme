import React from "react"
import ReactDOM from "react-dom/client"
import "./index.css"
import { Home } from "./Home"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>

    {/* draggable title bar */}
    <div className="absolute top-0 left-0 w-full h-7 bg-green-400 flex justify-end items-center">
      <div className="draggable flex-1 h-full"></div>
      <div className="text-[10px] text-green-600 bg-green-500 hover:bg-red-400 hover:text-red-600 size-4 rounded-full flex justify-center items-center mr-1.5" onClick={() => window.ipc.hide()}>&#10006;</div>
    </div>
    <div className="mt-7"></div>

    <main className="p-5 flex flex-col items-center gap-5">
      <Home startTime={new Date()} />
    </main>
    
  </React.StrictMode>,
)

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    window.ipc.quit()
  }
})