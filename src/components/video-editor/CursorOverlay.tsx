import { useMemo } from "react";
import { CursorSvg } from "./CursorSvg";
import type { CursorPosition } from "./types";

interface VideoBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CursorOverlayProps {
  cursorPositions: CursorPosition[];
  currentTimeMs: number;
  videoBounds: VideoBounds;
  offsetX?: number;
  offsetY?: number;
}

export function CursorOverlay({
  cursorPositions,
  currentTimeMs,
  videoBounds,
  offsetX = 0,
  offsetY = 0,
}: CursorOverlayProps) {
  // Find the cursor position at the current time by interpolating between recorded positions
  const cursorState = useMemo(() => {
    if (cursorPositions.length === 0) return null;

    // Find the two positions surrounding the current time
    let beforeIndex = -1;
    let afterIndex = -1;

    for (let i = 0; i < cursorPositions.length; i++) {
      if (cursorPositions[i].timestampMs <= currentTimeMs) {
        beforeIndex = i;
      } else {
        afterIndex = i;
        break;
      }
    }

    let normalizedX: number;
    let normalizedY: number;

    // If we're before all positions, use the first one
    if (beforeIndex === -1 && afterIndex !== -1) {
      const pos = cursorPositions[afterIndex];
      normalizedX = pos.x / pos.screenWidth;
      normalizedY = pos.y / pos.screenHeight;
    }
    // If we're after all positions, use the last one
    else if (beforeIndex !== -1 && afterIndex === -1) {
      const pos = cursorPositions[beforeIndex];
      normalizedX = pos.x / pos.screenWidth;
      normalizedY = pos.y / pos.screenHeight;
    }
    // If we have both, interpolate
    else if (beforeIndex !== -1 && afterIndex !== -1) {
      const before = cursorPositions[beforeIndex];
      const after = cursorPositions[afterIndex];

      const timeDiff = after.timestampMs - before.timestampMs;
      const t = timeDiff > 0 ? (currentTimeMs - before.timestampMs) / timeDiff : 0;

      const beforeNormX = before.x / before.screenWidth;
      const beforeNormY = before.y / before.screenHeight;
      const afterNormX = after.x / after.screenWidth;
      const afterNormY = after.y / after.screenHeight;

      normalizedX = beforeNormX + (afterNormX - beforeNormX) * t;
      normalizedY = beforeNormY + (afterNormY - beforeNormY) * t;
    } else {
      return null;
    }

    return { normalizedX, normalizedY };
  }, [cursorPositions, currentTimeMs]);

  if (!cursorState || videoBounds.width === 0 || videoBounds.height === 0) {
    return null;
  }

  // Map normalized coordinates to the actual video bounds within the container
  // videoBounds.x/y is the offset where the video content starts
  // videoBounds.width/height is the size of the video content area
  const x = videoBounds.x + cursorState.normalizedX * videoBounds.width;
  const y = videoBounds.y + cursorState.normalizedY * videoBounds.height;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        transform: `translate(${offsetX}px, ${offsetY}px)`,
        zIndex: 9999,
      }}
    >
      <CursorSvg size={24} />
    </div>
  );
}
