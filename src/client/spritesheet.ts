/**
 * Spritesheet geometry helpers — parameterized by the pet definition the
 * host serves over '/api/pet/pets', so the browser half renders any registry
 * entry without per-pet code. The per-track tables (frames, durations, loop,
 * fallback) also come from the registry; these helpers only place frames,
 * guard track lengths, and map the fixed 9-row animation contract.
 * @module @linxin666/dsh-pet/client/spritesheet
 */

import { rowOf, type PetAnimation } from '../state.ts'
import type { PetCell, PetTrackDef } from '../registry.ts'

/** Animation track shape the frame loop consumes. */
export type TrackDef = PetTrackDef

/** Row index of one animation track (the fixed 9-row contract). */
export function rowOfTrack(animation: PetAnimation): number {
  // The table itself lives in state.ts (rowOf) — the single source of truth.
  return rowOf(animation)
}

/**
 * Integer size of one cell after `scale`, in device-independent px.
 *
 * Rounding happens here, once, so the rendered atlas grid is integral end to
 * end (issue #17): `background-size` is this size times the column/row count
 * and every frame offset is an exact multiple of it. A fractional cell size
 * leaves each frame on a sub-pixel boundary — 192px cells at `display.size`
 * 160 scale to 147.69px — and the compositor then has to resample the whole
 * scaled atlas on every frame change instead of translating an already-scaled
 * bitmap by whole pixels. The pet advances a frame every 300-700 ms, so that
 * resample was running continuously for a background surface the size of the
 * sprite. A floor of 1px keeps a legally tiny display.size from collapsing the
 * cell to zero and rendering nothing.
 */
export function scaledCellSize(cell: PetCell, scale: number): { width: number; height: number } {
  return {
    width: Math.max(1, Math.round(cell.width * scale)),
    height: Math.max(1, Math.round(cell.height * scale)),
  }
}

/**
 * Background-position (px) of one frame cell within the scaled atlas.
 * The background image is scaled by `scale` (element size ÷ cell size), and
 * background-position offsets are applied in SCALED coordinates — using raw
 * atlas coordinates here would drift each frame by the scale factor and
 * render torn/overlapping frames. The scaled cell is quantized by
 * {@link scaledCellSize}, so the offset of frame N is exactly N whole cells:
 * the atlas is snapped to the pixel grid and a frame change is a plain
 * translate of the scaled bitmap.
 */
export function framePosition(cell: PetCell, row: number, col: number, scale = 1): { x: number; y: number } {
  const scaled = scaledCellSize(cell, scale)
  return { x: -col * scaled.width, y: -row * scaled.height }
}

/**
 * Trim a track to the actual frame count of its row (the manifest's per-row
 * counts are authoritative; this is a last-line guard against a definition
 * whose row count disagrees with its track table). A row with 0 detected
 * frames degrades to the first frame so the pet never renders blank.
 */
export function trimTrack(track: TrackDef, frameCount: number): TrackDef {
  const n = Math.max(1, Math.min(frameCount, track.frames.length, track.durations.length))
  return {
    frames: track.frames.slice(0, n),
    durations: track.durations.slice(0, n),
    loop: track.loop,
    ...(track.fallback === undefined ? {} : { fallback: track.fallback }),
  }
}
