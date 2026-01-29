# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenScreen is a free, open-source screen recording desktop app with built-in video editing. It's an Electron + React + TypeScript application that lets users record their screen, add zoom effects, annotations, and export to MP4 or GIF.

## Common Commands

```bash
npm run dev          # Start development server with hot reload
npm run build        # Full production build (tsc + vite + electron-builder)
npm run build:mac    # Build macOS DMG installer
npm run build:win    # Build Windows NSIS installer
npm run build:linux  # Build Linux AppImage
npm run lint         # ESLint with zero warnings enforced
npm test             # Run tests once (Vitest)
npm run test:watch   # Run tests in watch mode
```

## Architecture

### Multi-Window Design
The app uses three window types, all served from the same React app with routing via `?windowType=` URL parameter:
- **HUD Overlay** (`hud`): Frameless, transparent recording controls overlay
- **Source Selector** (`sourceSelector`): Modal for choosing recording source
- **Editor** (`editor`): Main video editing interface

Window routing happens in `src/App.tsx`.

### Key Directories
- `electron/` - Main process: window management, IPC handlers, click tracking
- `src/components/video-editor/` - Editor UI and state management
- `src/lib/exporter/` - Video/GIF export pipeline using WebCodecs API
- `src/hooks/useScreenRecorder.ts` - Recording logic with MediaRecorder

### Rendering Pipeline
- **Recording**: MediaRecorder captures WebM, stored in `~/userData/recordings/`
- **Playback/Preview**: PixiJS canvas with GPU-accelerated effects (zoom, blur, shadows)
- **Export**: WebCodecs decodes frames → PixiJS renders with effects → mp4box muxes to MP4

### IPC Communication
Preload script (`electron/preload.ts`) exposes `window.electronAPI` for renderer-main communication. Handlers are in `electron/ipc/handlers.ts`.

## Key Files

| File | Purpose |
|------|---------|
| `src/components/video-editor/VideoEditor.tsx` | Main state orchestrator for editing |
| `src/components/video-editor/VideoPlayback.tsx` | PixiJS canvas rendering |
| `src/lib/exporter/videoExporter.ts` | MP4 export engine |
| `src/lib/exporter/gifExporter.ts` | GIF export using gif.js |
| `src/lib/autozoom.ts` | Auto-generate zoom regions from click metadata |
| `src/hooks/useScreenRecorder.ts` | Recording state and MediaRecorder setup |
| `electron/main.ts` | Window creation, tray, app lifecycle |
| `electron/clickTracker.ts` | Mouse event tracking for autozoom |

## TypeScript Path Alias

The `@` alias maps to `/src` (configured in tsconfig.json and vite.config.ts):
```typescript
import { something } from '@/components/ui/button'
```

## Build Output

- `/dist` - Built React app
- `/dist-electron` - Built Electron main/preload scripts
