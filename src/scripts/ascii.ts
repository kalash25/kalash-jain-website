/* ------------------------------------------------------------------
   ASCII portrait renderer, shared by the boot intro and the hero's
   "view source" hover. Turns an <img> into a grid of characters on a
   <canvas>, optionally revealing only part of the grid (for the
   assemble animation).
------------------------------------------------------------------- */

export type AsciiGrid = {
  cols: number;
  rows: number;
  chars: string[];
  lums: number[];
  focus: number[]; // 1 at the face, fading to 0 at the edges (a soft vignette)
  order: number[]; // random reveal order, so characters "assemble" in a scatter
};

export const RAMP = ' .:-=+*#%@';

/**
 * Character for a (0–1) luminance. On a dark background bright pixels get dense
 * characters; on a light background it's flipped, so dark pixels get the ink.
 */
export function charFor(lum: number, invert = false, focus = 1) {
  // light mode: ink thins toward the edges so the face, not the backdrop, carries the drawing
  const v = invert ? (1 - lum) * focus : lum;
  return RAMP[Math.min(RAMP.length - 1, Math.floor(Math.pow(v, 0.9) * RAMP.length))];
}

/**
 * Sample the image into a character grid that cover-fits a box of the given aspect ratio.
 * Pass an ImageBitmap for responsive (<picture>/srcset) images: their naturalWidth is
 * density-corrected and doesn't match the real pixels drawImage reads.
 */
export function buildGrid(img: HTMLImageElement | ImageBitmap, boxW: number, boxH: number, cols = 56): AsciiGrid {
  const iw = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const ih = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  // a box with no layout yet (e.g. a background tab) would give a NaN grid: use a sane default
  if (!(boxW > 0 && boxH > 0)) {
    boxW = 320;
    boxH = 400;
  }
  const cw = boxW / cols;
  const ch = cw * 1.7; // monospace cells are taller than wide
  const rows = Math.max(1, Math.floor(boxH / ch));
  const off = document.createElement('canvas');
  off.width = cols;
  off.height = rows;
  const o = off.getContext('2d', { willReadFrequently: true })!;

  const ar = iw / ih;
  const gar = (cols * cw) / (rows * ch);
  let sw = iw;
  let sh = ih;
  let sx = 0;
  let sy = 0;
  if (ar > gar) {
    sw = sh * gar;
    sx = (iw - sw) / 2;
  } else {
    sh = sw / gar;
    sy = (ih - sh) * 0.3; // bias toward the face, like object-position 30%
  }
  o.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows);
  const data = o.getImageData(0, 0, cols, rows).data;

  // Raw luminance, then stretch the contrast (5th–98th percentile → 0–1) so dark
  // photos still read clearly as characters
  const raw: number[] = [];
  for (let i = 0; i < cols * rows; i++) {
    const p = i * 4;
    raw.push((0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]) / 255);
  }
  const sorted = [...raw].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.05)];
  const hi = sorted[Math.floor(sorted.length * 0.98)];
  const span = Math.max(0.05, hi - lo);

  const chars: string[] = [];
  const lums: number[] = [];
  const focus: number[] = [];
  raw.forEach((r, i) => {
    const lum = Math.min(1, Math.max(0, (r - lo) / span));
    lums.push(lum);
    chars.push(charFor(lum));
    const dx = ((i % cols) / cols - 0.5) / 0.5;
    const dy = (Math.floor(i / cols) / rows - 0.4) / 0.62;
    focus.push(Math.max(0, Math.min(1, 1.35 - Math.pow(dx * dx + dy * dy, 0.9) * 1.25)));
  });
  const order = chars.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { cols, rows, chars, lums, focus, order };
}

/** Size a canvas to its CSS box at device pixel ratio; returns the 2D context. */
export function fitCanvas(canvas: HTMLCanvasElement) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(r.width * dpr));
  canvas.height = Math.max(1, Math.round(r.height * dpr));
  return canvas.getContext('2d')!;
}

/**
 * Draw the grid. `progress` (0–1) reveals that fraction of characters in
 * the grid's random order. Colour comes from `hue`-tinted lightness.
 */
export function drawGrid(
  canvas: HTMLCanvasElement,
  grid: AsciiGrid,
  {
    progress = 1,
    bg = '#000',
    color = '#9f8cff',
    invert = false,
    font = '"Geist Mono Variable", ui-monospace, monospace',
  } = {},
) {
  const ctx = canvas.getContext('2d')!;
  const cw = canvas.width / grid.cols;
  const ch = canvas.height / grid.rows;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${Math.min(ch, cw * 1.7) * 0.9}px ${font}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  const shown = Math.floor(grid.order.length * Math.max(0, Math.min(1, progress)));
  for (let k = 0; k < shown; k++) {
    const i = grid.order[k];
    const c = invert ? charFor(grid.lums[i], true, grid.focus[i]) : grid.chars[i];
    if (c === ' ') continue;
    const weight = invert ? (1 - grid.lums[i]) * grid.focus[i] : grid.lums[i];
    ctx.globalAlpha = 0.25 + weight * 0.75;
    ctx.fillText(c, (i % grid.cols) * cw, Math.floor(i / grid.cols) * ch);
  }
  ctx.globalAlpha = 1;
}
