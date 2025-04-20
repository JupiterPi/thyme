/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    APP_ROOT: string
    VITE_PUBLIC: string
  }
}

interface Window {
  ipc: typeof import("./main").PushIPC
}

type PullIPC = typeof import("./main").PullIPC