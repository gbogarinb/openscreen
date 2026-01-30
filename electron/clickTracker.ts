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

export interface CursorPosition {
  timestampMs: number;
  x: number;
  y: number;
  screenWidth: number;
  screenHeight: number;
}

export interface RecordingMetadata {
  version: number;
  recordingStartMs: number;
  clicks: ClickEvent[];
  cursorPositions?: CursorPosition[];
  sourceId?: string;
  sourceName?: string;
}

let isTracking = false;
let recordingStartMs = 0;
let clicks: ClickEvent[] = [];
let cursorPositions: CursorPosition[] = [];
let sourceId: string | undefined;
let sourceName: string | undefined;
let lastCursorPosition: { x: number; y: number } | null = null;
let cursorTrackingInterval: ReturnType<typeof setInterval> | null = null;

// Track cursor position every ~33ms (~30fps) to balance data size and smoothness
const CURSOR_TRACKING_INTERVAL_MS = 33;

function handleMouseDown(event: UiohookMouseEvent) {
  if (!isTracking) return;

  // Get the display where the click occurred (handles multi-monitor setups)
  const clickDisplay = screen.getDisplayNearestPoint({ x: event.x, y: event.y });
  const { bounds } = clickDisplay;

  // Convert absolute coordinates to coordinates relative to the display's origin
  // This is necessary because uiohook provides global coordinates, but we need
  // coordinates relative to the recorded display
  const relativeX = event.x - bounds.x;
  const relativeY = event.y - bounds.y;

  const clickEvent: ClickEvent = {
    timestampMs: Date.now() - recordingStartMs,
    x: relativeX,
    y: relativeY,
    screenWidth: bounds.width,
    screenHeight: bounds.height,
    button: event.button as number,
  };

  clicks.push(clickEvent);
}

function handleMouseMove(event: UiohookMouseEvent) {
  if (!isTracking) return;
  // Just update the last known position - actual recording happens in the interval
  lastCursorPosition = { x: event.x, y: event.y };
}

function recordCursorPosition() {
  if (!isTracking || !lastCursorPosition) return;

  const cursorDisplay = screen.getDisplayNearestPoint(lastCursorPosition);
  const { bounds } = cursorDisplay;

  const relativeX = lastCursorPosition.x - bounds.x;
  const relativeY = lastCursorPosition.y - bounds.y;

  const position: CursorPosition = {
    timestampMs: Date.now() - recordingStartMs,
    x: relativeX,
    y: relativeY,
    screenWidth: bounds.width,
    screenHeight: bounds.height,
  };

  cursorPositions.push(position);
}

export function startClickTracking(captureSourceId?: string, captureSourceName?: string): void {
  if (isTracking) {
    console.warn('Click tracking is already active');
    return;
  }

  try {
    clicks = [];
    cursorPositions = [];
    lastCursorPosition = null;
    recordingStartMs = Date.now();
    sourceId = captureSourceId;
    sourceName = captureSourceName;
    isTracking = true;

    uIOhook.on('mousedown', handleMouseDown);
    uIOhook.on('mousemove', handleMouseMove);
    uIOhook.start();

    // Start interval to record cursor positions at regular intervals
    cursorTrackingInterval = setInterval(recordCursorPosition, CURSOR_TRACKING_INTERVAL_MS);

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
      cursorPositions: [],
    };
  }

  // Stop the cursor tracking interval
  if (cursorTrackingInterval) {
    clearInterval(cursorTrackingInterval);
    cursorTrackingInterval = null;
  }

  try {
    uIOhook.stop();
    uIOhook.removeListener('mousedown', handleMouseDown);
    uIOhook.removeListener('mousemove', handleMouseMove);
  } catch (error) {
    console.error('Error stopping uiohook:', error);
  }

  isTracking = false;

  const metadata: RecordingMetadata = {
    version: 1,
    recordingStartMs,
    clicks: [...clicks],
    cursorPositions: [...cursorPositions],
    sourceId,
    sourceName,
  };

  // Reset state
  clicks = [];
  cursorPositions = [];
  lastCursorPosition = null;
  recordingStartMs = 0;
  sourceId = undefined;
  sourceName = undefined;

  console.log(`Click tracking stopped. Captured ${metadata.clicks.length} clicks and ${metadata.cursorPositions?.length || 0} cursor positions.`);
  return metadata;
}

export function isClickTrackingActive(): boolean {
  return isTracking;
}
