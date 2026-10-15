import { coverCrop } from '@/lib/camera/crop';
import { PHOTO } from '@/lib/image/frameLayout';

/**
 * Grabs the current video frame as a 1200×1600 canvas.
 * The raw frame is never mirrored (only the on-screen preview is), so text in the photo reads correctly.
 */
export function captureFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO.width;
  canvas.height = PHOTO.height;
  const ctx = canvas.getContext('2d')!;
  const { sx, sy, sw, sh } = coverCrop(video.videoWidth, video.videoHeight, PHOTO.width / PHOTO.height);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, PHOTO.width, PHOTO.height);
  return canvas;
}
