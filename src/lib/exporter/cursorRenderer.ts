import type { CursorPosition } from '@/components/video-editor/types';

interface CursorRenderConfig {
  cursorPositions: CursorPosition[];
  canvasWidth: number;
  canvasHeight: number;
  currentTimeMs: number;
}

/**
 * Render cursor at the interpolated position on a Canvas 2D context.
 * This is used during export to render cursors onto the final frame.
 */
export function renderCursor(
  ctx: CanvasRenderingContext2D,
  config: CursorRenderConfig
): void {
  const { cursorPositions, canvasWidth, canvasHeight, currentTimeMs } = config;

  if (cursorPositions.length === 0) {
    return;
  }

  // Find the cursor position at the current time by interpolating between recorded positions
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
    return; // No valid position
  }

  // Scale to canvas dimensions
  const x = normalizedX * canvasWidth;
  const y = normalizedY * canvasHeight;

  drawCursor(ctx, x, y, 1, 1);
}

/**
 * Draw a pointer cursor at the given position with scale and opacity.
 */
function drawCursor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  opacity: number
): void {
  ctx.save();

  // Apply transform
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Set global alpha for fade
  ctx.globalAlpha = opacity;

  // Create cursor path (classic pointer cursor)
  // Path data scaled to ~24px size, origin at top-left tip
  const cursorPath = new Path2D();
  cursorPath.moveTo(0, 0);
  cursorPath.lineTo(0, 17.59);
  cursorPath.lineTo(4.86, 12.73);
  cursorPath.lineTo(12.08, 12.73);
  cursorPath.lineTo(0, 0);
  cursorPath.closePath();

  // Draw shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  // Fill with black
  ctx.fillStyle = 'black';
  ctx.fill(cursorPath);

  // Remove shadow for stroke
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Stroke with white
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(cursorPath);

  ctx.restore();
}
