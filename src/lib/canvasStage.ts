/** Plate grey, matching the studio background sampled from the frames. */
export const PLATE = '#cdd3d6'

const MAX_DPR = 2

/**
 * Sizes a canvas backing store to its CSS box at the device pixel ratio.
 * Returns the CSS-pixel box so callers can do their fit maths in CSS units.
 */
export function sizeCanvas(canvas: HTMLCanvasElement): { w: number; h: number } {
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  const bw = Math.round(w * dpr)
  const bh = Math.round(h * dpr)

  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw
    canvas.height = bh
  }
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { w, h }
}

export type FitMode = 'cover' | 'contain'

/**
 * Draws `img` into a `w`x`h` box, centred, at its own aspect ratio.
 * `cover` fills the box and crops; `contain` fits inside and letterboxes onto
 * the plate colour, which is what portrait viewports get so the 16:9 plate
 * isn't cropped down to a sliver of bodywork.
 */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  mode: FitMode = 'cover',
): void {
  ctx.fillStyle = PLATE
  ctx.fillRect(0, 0, w, h)

  const iw = img.naturalWidth
  const ih = img.naturalHeight
  if (!iw || !ih) return

  const scale = mode === 'cover' ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih)
  const dw = iw * scale
  const dh = ih * scale
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
}

/**
 * Nearest already-loaded frame to `i`. A lazily-loaded scene can be scrolled
 * into before every frame has arrived; showing the closest neighbour is far
 * better than flashing an empty plate.
 */
export function nearestLoaded(frames: HTMLImageElement[], i: number): HTMLImageElement | undefined {
  if (frames[i]?.naturalWidth) return frames[i]
  for (let d = 1; d < frames.length; d++) {
    if (frames[i - d]?.naturalWidth) return frames[i - d]
    if (frames[i + d]?.naturalWidth) return frames[i + d]
  }
  return undefined
}
