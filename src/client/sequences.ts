/** Pure timing helpers for manifest-defined scene animation sequences. */

import type { PetTrackDef } from '../registry.ts'
import type { PetAnimation } from '../state.ts'

export interface SequenceFrame {
  animation: PetAnimation
  frameIndex: number
}

/**
 * Precomputed timeline for one looping sequence: the per-item duration table
 * is built once instead of per query. The sprite frame loop asks once per
 * frame change, where the per-call map/reduce is pure waste.
 */
export interface SequenceTimeline {
  frameAt(elapsedMs: number): SequenceFrame
  /**
   * Milliseconds from `elapsedMs` until the frame it lands on ends. The sprite
   * loop sleeps for exactly this long instead of polling at the screen refresh
   * rate (issue #17); the floor of 1 ms keeps a zero-length frame from turning
   * into a busy timer.
   */
  remainingAt(elapsedMs: number): number
}

/** One sequence position, with the residual offset inside its own frame. */
interface SequencePoint {
  animation: PetAnimation
  track: PetTrackDef
  frameIndex: number
  offsetInFrame: number
}

/** Build a {@link SequenceTimeline} over one manifest sequence. */
export function createSequenceTimeline(
  sequence: readonly PetAnimation[],
  tracks: Record<PetAnimation, PetTrackDef>,
): SequenceTimeline {
  const itemDurations = sequence.map(animation => tracks[animation].durations.reduce((sum, value) => sum + value, 0))
  const sequenceDuration = itemDurations.reduce((sum, value) => sum + value, 0)
  // One traversal serves both queries: frameAt needs the index it lands on and
  // remainingAt needs how far into that frame it is, so resolving them
  // separately would walk the same tables twice for one loop tick.
  const locate = (elapsedMs: number): SequencePoint => {
    let offset = sequenceDuration > 0 ? Math.max(0, elapsedMs) % sequenceDuration : 0
    let itemIndex = 0
    while (itemIndex < sequence.length - 1 && offset >= itemDurations[itemIndex]!) {
      offset -= itemDurations[itemIndex]!
      itemIndex += 1
    }
    const animation = sequence[itemIndex]!
    const track = tracks[animation]
    let frameIndex = 0
    while (frameIndex < track.frames.length - 1 && offset >= track.durations[frameIndex]!) {
      offset -= track.durations[frameIndex]!
      frameIndex += 1
    }
    return { animation, track, frameIndex, offsetInFrame: offset }
  }
  return {
    frameAt(elapsedMs: number): SequenceFrame {
      const point = locate(elapsedMs)
      return { animation: point.animation, frameIndex: point.frameIndex }
    },
    remainingAt(elapsedMs: number): number {
      const point = locate(elapsedMs)
      return Math.max(1, (point.track.durations[point.frameIndex] ?? 0) - point.offsetInFrame)
    },
  }
}

/** Resolve the active track and frame after elapsed milliseconds of a looping sequence. */
export function sequenceFrameAt(
  sequence: readonly PetAnimation[],
  tracks: Record<PetAnimation, PetTrackDef>,
  elapsedMs: number,
): SequenceFrame {
  return createSequenceTimeline(sequence, tracks).frameAt(elapsedMs)
}
