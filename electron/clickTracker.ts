import { createRequire } from 'node:module';
import { screen } from 'electron';

// uiohook-napi is a CommonJS module that uses __dirname internally,
// so we need to use createRequire to import it in an ES module context
const require = createRequire(import.meta.url);

interface UIOHook {
  on(event: string, callback: (e: UiohookMouseEvent) => void): void;
  removeListener(event: string, callback: (e: UiohookMouseEvent) => void): void;
  start(): void;
  stop(): void;
}

const { uIOhook } = require('uiohook-napi') as { uIOhook: UIOHook };

interface UiohookMouseEvent {
  x: number;
  y: number;
  button: number;
}

export interface ClickEvent {
  timestampMs: number;
  x: number;
  y: number;
  screenWidth: number;
  screenHeight: number;
  button: number;
}

export interface RecordingMetadata {
  version: number;
  recordingStartMs: number;
  clicks: ClickEvent[];
  sourceId?: string;
  sourceName?: string;
}

let isTracking = false;
let recordingStartMs = 0;
let clicks: ClickEvent[] = [];
let sourceId: string | undefined;
let sourceName: string | undefined;

function handleMouseDown(event: UiohookMouseEvent) {
  if (!isTracking) return;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const clickEvent: ClickEvent = {
    timestampMs: Date.now() - recordingStartMs,
    x: event.x,
    y: event.y,
    screenWidth,
    screenHeight,
    button: event.button as number,
  };

  clicks.push(clickEvent);
}

export function startClickTracking(captureSourceId?: string, captureSourceName?: string): void {
  if (isTracking) {
    console.warn('Click tracking is already active');
    return;
  }

  try {
    clicks = [];
    recordingStartMs = Date.now();
    sourceId = captureSourceId;
    sourceName = captureSourceName;
    isTracking = true;

    uIOhook.on('mousedown', handleMouseDown);
    uIOhook.start();

    console.log('Click tracking started');
  } catch (error) {
    console.error('Failed to start click tracking:', error);
    isTracking = false;
  }
}

export function stopClickTracking(): RecordingMetadata {
  if (!isTracking) {
    console.warn('Click tracking is not active');
    return {
      version: 1,
      recordingStartMs: 0,
      clicks: [],
    };
  }

  try {
    uIOhook.stop();
    uIOhook.removeListener('mousedown', handleMouseDown);
  } catch (error) {
    console.error('Error stopping uiohook:', error);
  }

  isTracking = false;

  const metadata: RecordingMetadata = {
    version: 1,
    recordingStartMs,
    clicks: [...clicks],
    sourceId,
    sourceName,
  };

  // Reset state
  clicks = [];
  recordingStartMs = 0;
  sourceId = undefined;
  sourceName = undefined;

  console.log(`Click tracking stopped. Captured ${metadata.clicks.length} clicks.`);
  return metadata;
}

export function isClickTrackingActive(): boolean {
  return isTracking;
}
