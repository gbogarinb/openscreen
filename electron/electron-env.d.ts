/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

interface ClickEvent {
  timestampMs: number;
  x: number;
  y: number;
  screenWidth: number;
  screenHeight: number;
  button: number;
}

interface RecordingMetadata {
  version: number;
  recordingStartMs: number;
  clicks: ClickEvent[];
  sourceId?: string;
  sourceName?: string;
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  electronAPI: {
    getSources: (opts: Electron.SourcesOptions) => Promise<ProcessedDesktopSource[]>
    switchToEditor: () => Promise<void>
    openSourceSelector: () => Promise<void>
    selectSource: (source: any) => Promise<any>
    getSelectedSource: () => Promise<any>
    storeRecordedVideo: (videoData: ArrayBuffer, fileName: string) => Promise<{ success: boolean; path?: string; message?: string }>
    getRecordedVideoPath: () => Promise<{ success: boolean; path?: string; message?: string }>
    setRecordingState: (recording: boolean) => Promise<void>
    onStopRecordingFromTray: (callback: () => void) => () => void
    openExternalUrl: (url: string) => Promise<{ success: boolean; error?: string }>
    saveExportedVideo: (videoData: ArrayBuffer, fileName: string) => Promise<{ success: boolean; path?: string; message?: string; cancelled?: boolean }>
    openVideoFilePicker: () => Promise<{ success: boolean; path?: string; cancelled?: boolean }>
    setCurrentVideoPath: (path: string) => Promise<{ success: boolean }>
    getCurrentVideoPath: () => Promise<{ success: boolean; path?: string }>
    clearCurrentVideoPath: () => Promise<{ success: boolean }>
    getPlatform: () => Promise<string>
    hudOverlayHide: () => void;
    hudOverlayClose: () => void;
    startClickTracking: (sourceId?: string, sourceName?: string) => Promise<{ success: boolean; error?: string }>
    stopClickTracking: () => Promise<{ success: boolean; metadata?: RecordingMetadata; error?: string }>
    storeRecordingMetadata: (metadata: RecordingMetadata, fileName: string) => Promise<{ success: boolean; path?: string; message?: string; error?: string }>
    loadRecordingMetadata: (videoPath: string) => Promise<{ success: boolean; metadata?: RecordingMetadata; path?: string; message?: string; error?: string }>
  }
}

interface ProcessedDesktopSource {
  id: string
  name: string
  display_id: string
  thumbnail: string | null
  appIcon: string | null
}
