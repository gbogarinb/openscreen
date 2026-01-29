import { v4 as uuidv4 } from 'uuid';
import type {
  ClickEvent,
  RecordingMetadata,
  AutozoomSettings,
  ZoomRegion,
  ZoomFocus,
  ZoomDepth,
} from '@/components/video-editor/types';
import { DEFAULT_AUTOZOOM_SETTINGS } from '@/components/video-editor/types';

export function screenToNormalizedFocus(
  x: number,
  y: number,
  screenWidth: number,
  screenHeight: number
): ZoomFocus {
  return {
    cx: Math.max(0, Math.min(1, x / screenWidth)),
    cy: Math.max(0, Math.min(1, y / screenHeight)),
  };
}

interface MergedClick {
  timestampMs: number;
  x: number;
  y: number;
  screenWidth: number;
  screenHeight: number;
  clickCount: number;
}

function mergeNearbyClicks(
  clicks: ClickEvent[],
  mergeThreshold: number,
  ignoreRightClicks: boolean
): MergedClick[] {
  // Filter right-clicks if needed (button 2 is typically right-click)
  let filtered = clicks;
  if (ignoreRightClicks) {
    filtered = clicks.filter(click => click.button !== 2);
  }

  if (filtered.length === 0) return [];

  // Sort by timestamp
  const sorted = [...filtered].sort((a, b) => a.timestampMs - b.timestampMs);

  const merged: MergedClick[] = [];
  let currentGroup: ClickEvent[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const click = sorted[i];
    const lastClick = currentGroup[currentGroup.length - 1];

    if (click.timestampMs - lastClick.timestampMs <= mergeThreshold) {
      currentGroup.push(click);
    } else {
      // Finalize current group
      const avgX = currentGroup.reduce((sum, c) => sum + c.x, 0) / currentGroup.length;
      const avgY = currentGroup.reduce((sum, c) => sum + c.y, 0) / currentGroup.length;
      merged.push({
        timestampMs: currentGroup[0].timestampMs,
        x: Math.round(avgX),
        y: Math.round(avgY),
        screenWidth: currentGroup[0].screenWidth,
        screenHeight: currentGroup[0].screenHeight,
        clickCount: currentGroup.length,
      });
      currentGroup = [click];
    }
  }

  // Don't forget the last group
  if (currentGroup.length > 0) {
    const avgX = currentGroup.reduce((sum, c) => sum + c.x, 0) / currentGroup.length;
    const avgY = currentGroup.reduce((sum, c) => sum + c.y, 0) / currentGroup.length;
    merged.push({
      timestampMs: currentGroup[0].timestampMs,
      x: Math.round(avgX),
      y: Math.round(avgY),
      screenWidth: currentGroup[0].screenWidth,
      screenHeight: currentGroup[0].screenHeight,
      clickCount: currentGroup.length,
    });
  }

  return merged;
}

function doesOverlap(
  startMs: number,
  endMs: number,
  existingRegions: ZoomRegion[]
): boolean {
  return existingRegions.some(
    region => !(endMs <= region.startMs || startMs >= region.endMs)
  );
}

export function generateZoomRegionsFromClicks(
  metadata: RecordingMetadata,
  videoDurationMs: number,
  existingRegions: ZoomRegion[],
  settings: AutozoomSettings = DEFAULT_AUTOZOOM_SETTINGS
): ZoomRegion[] {
  const { leadTime, holdTime, zoomDuration, defaultDepth, mergeThreshold, ignoreRightClicks } = settings;

  // Calculate fadeout time (half of total zoom duration minus lead and hold)
  const fadeoutTime = Math.max(0, (zoomDuration - leadTime - holdTime) / 2);

  const mergedClicks = mergeNearbyClicks(metadata.clicks, mergeThreshold, ignoreRightClicks);
  const newRegions: ZoomRegion[] = [];

  for (const click of mergedClicks) {
    // Calculate zoom timing
    const startMs = Math.max(0, click.timestampMs - leadTime);
    const endMs = Math.min(videoDurationMs, click.timestampMs + holdTime + fadeoutTime);

    // Skip if duration too short
    if (endMs - startMs < 100) continue;

    // Skip if overlaps with existing regions
    if (doesOverlap(startMs, endMs, existingRegions)) continue;

    // Skip if overlaps with newly created regions
    if (doesOverlap(startMs, endMs, newRegions)) continue;

    const focus = screenToNormalizedFocus(
      click.x,
      click.y,
      click.screenWidth,
      click.screenHeight
    );

    newRegions.push({
      id: `zoom-auto-${uuidv4()}`,
      startMs: Math.round(startMs),
      endMs: Math.round(endMs),
      depth: defaultDepth as ZoomDepth,
      focus,
    });
  }

  return newRegions;
}

export async function loadRecordingMetadata(
  videoPath: string
): Promise<RecordingMetadata | null> {
  try {
    const result = await window.electronAPI.loadRecordingMetadata(videoPath);
    if (result.success && result.metadata) {
      return result.metadata;
    }
    return null;
  } catch (error) {
    console.error('Failed to load recording metadata:', error);
    return null;
  }
}
