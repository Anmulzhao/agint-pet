import { describe, expect, it } from 'vitest'
import type { PetCell } from '../registry.ts'
import { framePosition, scaledCellSize, trimTrack } from './spritesheet.ts'

/** The built-in hatch-pet cell (192 x 208). */
const CELL: PetCell = { width: 192, height: 208 }

/** The whale-girl display: `display.size` 160 over a 208px-tall cell. */
const SCALE = 160 / CELL.height

describe('scaledCellSize (issue #17)', () => {
  it('rounds the scaled cell so a fractional sprite scale stays on whole pixels', () => {
    // 192 * 160/208 = 147.69px and 208 * 160/208 = 160px before rounding.
    expect(scaledCellSize(CELL, SCALE)).toEqual({ width: 148, height: 160 })
  })

  it('agrees with the sprite box the component renders for the same scale', () => {
    // The element is sized from the same helper, so a cell of the scaled atlas
    // and the box that shows it are the same rectangle instead of drifting by
    // a fraction of a pixel per frame.
    const scaled = scaledCellSize(CELL, SCALE)
    expect(Math.round(CELL.width * SCALE)).toBe(scaled.width)
    expect(Math.round(CELL.height * SCALE)).toBe(scaled.height)
  })

  it('floors a collapsed cell at one pixel instead of rendering nothing', () => {
    expect(scaledCellSize(CELL, 0.001)).toEqual({ width: 1, height: 1 })
  })
})

describe('framePosition (issue #17)', () => {
  it('places every column on an exact multiple of the scaled cell width', () => {
    const scaled = scaledCellSize(CELL, SCALE)
    for (let col = 0; col < 8; col += 1) {
      const pos = framePosition(CELL, 0, col, SCALE)
      expect(pos.x).toBe(-col * scaled.width)
      expect(Number.isInteger(pos.x)).toBe(true)
      // Row 0 is the top of the atlas; the offset is -0, which is still whole.
      expect(Math.abs(pos.y)).toBe(0)
    }
  })

  it('places every row on an exact multiple of the scaled cell height', () => {
    const scaled = scaledCellSize(CELL, SCALE)
    for (let row = 0; row < 9; row += 1) {
      const pos = framePosition(CELL, row, 0, SCALE)
      expect(pos.y).toBe(-row * scaled.height)
      expect(Number.isInteger(pos.y)).toBe(true)
      expect(Math.abs(pos.x)).toBe(0)
    }
  })

  it('never returns a fractional offset at a scale that does not divide the cell', () => {
    // 120/208 leaves 110.77px cells: the old formula returned -110.77px per
    // column, which is what forced the compositor to resample the atlas.
    const scale = 120 / CELL.height
    const scaled = scaledCellSize(CELL, scale)
    expect(scaled).toEqual({ width: 111, height: 120 })
    expect(framePosition(CELL, 5, 7, scale)).toEqual({ x: -7 * 111, y: -5 * 120 })
  })

  it('keeps the raw atlas grid when no scale is applied', () => {
    expect(framePosition(CELL, 3, 5)).toEqual({ x: -5 * CELL.width, y: -3 * CELL.height })
  })
})

describe('trimTrack', () => {
  it('trims to the smaller of the track table and the row frame count', () => {
    const track = { frames: [0, 1, 2, 3, 4, 5], durations: [1, 2, 3, 4, 5, 6], loop: true }
    expect(trimTrack(track, 4)).toEqual({
      frames: [0, 1, 2, 3],
      durations: [1, 2, 3, 4],
      loop: true,
    })
  })

  it('degrades a row with no detected frames to the first frame', () => {
    const track = { frames: [0, 1], durations: [10, 20], loop: false, fallback: 'idle' as const }
    expect(trimTrack(track, 0)).toEqual({ frames: [0], durations: [10], loop: false, fallback: 'idle' })
  })
})
