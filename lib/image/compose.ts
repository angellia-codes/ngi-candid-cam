import { BRACKET, COLORS, OUT, PHOTO, TEXT } from '@/lib/image/frameLayout';
import { applyColorMatrix, type Filter } from '@/lib/image/filters';

export type ComposeInput = { photo: CanvasImageSource; filter: Filter; shotLabel: string; stamp: string };

let grainTile: HTMLCanvasElement | null = null;

function getGrainTile(): HTMLCanvasElement {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 90;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

function renderPhoto(input: ComposeInput): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = PHOTO.width;
  c.height = PHOTO.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(input.photo, 0, 0, PHOTO.width, PHOTO.height);
  if (input.filter.id !== 'original') {
    const img = ctx.getImageData(0, 0, PHOTO.width, PHOTO.height);
    applyColorMatrix(img.data, input.filter.matrix);
    ctx.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat')!;
  ctx.fillRect(0, 0, PHOTO.width, PHOTO.height);
  ctx.restore();
  return c;
}

function drawBrackets(ctx: CanvasRenderingContext2D) {
  const l = PHOTO.x + BRACKET.inset;
  const t = PHOTO.y + BRACKET.inset;
  const r = PHOTO.x + PHOTO.width - BRACKET.inset;
  const b = PHOTO.y + PHOTO.height - BRACKET.inset;
  const a = BRACKET.arm;
  ctx.strokeStyle = COLORS.overlay;
  ctx.lineWidth = BRACKET.stroke;
  ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(l, t + a); ctx.lineTo(l, t); ctx.lineTo(l + a, t);
  ctx.moveTo(r - a, t); ctx.lineTo(r, t); ctx.lineTo(r, t + a);
  ctx.moveTo(l, b - a); ctx.lineTo(l, b); ctx.lineTo(l + a, b);
  ctx.moveTo(r - a, b); ctx.lineTo(r, b); ctx.lineTo(r, b - a);
  ctx.stroke();
}

function drawBattery(ctx: CanvasRenderingContext2D) {
  const { x, y, width: w, height: h } = TEXT.battery;
  ctx.strokeStyle = COLORS.overlay;
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = COLORS.overlay;
  ctx.fillRect(x + w + 2, y + h / 2 - 6, 5, 12);
  ctx.fillStyle = COLORS.green;
  const barW = (w - 16) / 3;
  for (let i = 0; i < 3; i++) ctx.fillRect(x + 4 + i * (barW + 4), y + 6, barW, h - 12);
}

function drawBolt(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const pts: [number, number][] = [[6, 2], [22, 2], [12, 24], [26, 24], [8, 54], [14, 30], [2, 30]];
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(x + px, y + py) : ctx.lineTo(x + px, y + py)));
  ctx.closePath();
  ctx.stroke();
}

function drawOverlay(ctx: CanvasRenderingContext2D, input: ComposeInput, liveText: boolean) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.textBaseline = 'alphabetic';

  drawBrackets(ctx);
  drawBattery(ctx);

  ctx.font = TEXT.nf26.font;
  ctx.fillStyle = COLORS.overlay;
  ctx.textAlign = 'left';
  ctx.fillText(TEXT.nf26.text, TEXT.nf26.x, TEXT.nf26.y);

  // The bolt sits left of the full shot label, even while the label is still typing in.
  ctx.font = TEXT.shot.font;
  const shotWidth = ctx.measureText(input.shotLabel).width;
  drawBolt(ctx, TEXT.shot.rightX - shotWidth - TEXT.bolt.gap - TEXT.bolt.width, TEXT.shot.y - TEXT.bolt.height + 10);

  ctx.font = TEXT.hashtag.font;
  ctx.fillStyle = COLORS.gold;
  ctx.textAlign = 'right';
  ctx.fillText(TEXT.hashtag.text, TEXT.hashtag.rightX, TEXT.hashtag.y);
  ctx.restore();

  if (liveText) drawLiveText(ctx, input);
}

/**
 * Draws the per-photo text: shot counter (top right) and capture time (bottom left).
 * `shown` limits how many characters of each are drawn, for the reveal's typing effect.
 */
export function drawLiveText(
  ctx: CanvasRenderingContext2D,
  input: Pick<ComposeInput, 'shotLabel' | 'stamp'>,
  shown: { shot: number; stamp: number } = { shot: input.shotLabel.length, stamp: input.stamp.length },
): void {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  ctx.font = TEXT.shot.font;
  ctx.fillStyle = COLORS.overlay;
  const shotLeft = TEXT.shot.rightX - ctx.measureText(input.shotLabel).width;
  ctx.fillText(input.shotLabel.slice(0, shown.shot), shotLeft, TEXT.shot.y);

  ctx.font = TEXT.stamp.font;
  ctx.fillStyle = COLORS.green;
  ctx.fillText(input.stamp.slice(0, shown.stamp), TEXT.stamp.x, TEXT.stamp.y);
  ctx.restore();
}

function drawBand(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = TEXT.title.font;
  ctx.fillStyle = COLORS.ink;
  ctx.fillText(TEXT.title.text, TEXT.title.x, TEXT.title.y);

  ctx.font = TEXT.year.font;
  ctx.fillStyle = COLORS.pink;
  ctx.fillText(TEXT.year.text, TEXT.year.x, TEXT.year.y);
  const yearWidth = ctx.measureText(TEXT.year.text).width;

  ctx.font = TEXT.date.font;
  ctx.fillStyle = COLORS.ink;
  ctx.fillText(TEXT.date.text, TEXT.year.x + yearWidth + TEXT.date.gap, TEXT.date.y);
  ctx.restore();
}

export type ComposeOptions = { liveText?: boolean };

/**
 * Draws the full 1320×1920 framed photo. `input.photo` must be 1200×1600 (see captureFrame).
 * `liveText: false` leaves out the shot counter and capture time, so Preview can type them in.
 */
export function composeFrame(canvas: HTMLCanvasElement, input: ComposeInput, opts: ComposeOptions = {}): void {
  canvas.width = OUT.width;
  canvas.height = OUT.height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = COLORS.card;
  ctx.fillRect(0, 0, OUT.width, OUT.height);

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(PHOTO.x, PHOTO.y, PHOTO.width, PHOTO.height, PHOTO.radius);
  ctx.clip();
  ctx.drawImage(renderPhoto(input), PHOTO.x, PHOTO.y);
  ctx.restore();

  const half = PHOTO.border / 2;
  ctx.save();
  ctx.lineWidth = PHOTO.border;
  ctx.strokeStyle = COLORS.gold;
  ctx.beginPath();
  ctx.roundRect(PHOTO.x + half, PHOTO.y + half, PHOTO.width - PHOTO.border, PHOTO.height - PHOTO.border, PHOTO.radius - half);
  ctx.stroke();
  ctx.restore();

  drawOverlay(ctx, input, opts.liveText ?? true);
  drawBand(ctx);
}
