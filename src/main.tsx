import React from "react"
import ReactDOM from "react-dom/client"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div className="p-5">
      <h1 className="text-xl">Hello from Thyme!</h1>
      <p>Lorem ipsum dolor sit amet</p>
      <button onClick={() => window.ipc.test()} className="border-1 p-1">Test</button>
    </div>
  </React.StrictMode>,
)
