/**
 * jyn-loli (鲸鱼娘·萝莉) pet manifest + on-disk frames guard: 10 frames2d tracks
 * (720 frames) — a breathing idle, the four idle-director mini-actions (a head
 * scratch, a whale plush hug, a lollipop lick, and one beat taken from the
 * reference video: she sways on the spot and waves), the three work tracks
 * (work: the loop the host holds while the work mode ticks, in which she gets
 * stuck into an enormous bowl of rice; work-success / work-fail: the two one-shot
 * results the tick plays, each exactly resultMs long) and the rest pair (rest:
 * she yawns and lies down, played once; resting: the breathing lying loop it
 * settles into). Every standing frame is one MiniMax-H3 generation anchored on
 * the same illustration as both the first and the last frame, so each track opens
 * and closes on the idle pose and the tracks cut into each other without a jump;
 * the rest pair is carved out of one such generation (the lying-down clip), which
 * is why rest's last frame and resting's first frame are the same frame.
 *
 * The ten tracks share one 764x1172 cell, derived from the union of all ten
 * sources, so the pet keeps one display size across the idle loop, the randomly
 * interleaved actions, the work loop and the rest loop. Only the height of that
 * cell matters (the host scales by frame height, so extra width is free): the
 * dance track swings her hair out to the left edge of the canvas, which is why
 * the cell is wider than the six-track build — but the height never moved (the
 * work trio in particular leaves the union's height and right edge untouched), so
 * every track still renders at 100% of the character size the pet has always had.
 * The package is pure content: no host or client code changes alongside it.
 */
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parsePetManifest } from '../src/manifest-v2.ts'
import { loadPetRegistry, petEntryView, petPackageRoot } from '../src/registry.ts'
import { imageDimensions } from '../src/image-dimensions.ts'

const JYN_LOLI_DIR = join(petPackageRoot(import.meta.url), 'assets', 'jyn-loli')

/** Frames shipped per track; the manifest omits explicit lists and the host lists the directory. */
const TRACK_FRAMES: Readonly<Record<string, number>> = {
  idle: 72, 'scratch-head': 72, 'whale-pillow': 72, lollipop: 72, 'dance-sway': 72,
  work: 72, 'work-success': 72, 'work-fail': 72, rest: 72, resting: 72,
}

/** The idle-director mini-actions: each plays once and settles back into idle. */
const ACTS = ['scratch-head', 'whale-pillow', 'lollipop', 'dance-sway'] as const

/** Cadence every frame encodes in its file name. */
const FRAME_MS = 40

/** Webp frames actually shipped for one track, in filename order. */
const frameFiles = (track: string): string[] =>
  readdirSync(join(JYN_LOLI_DIR, 'thumb', track)).filter(f => f.endsWith('.webp')).sort()

/**
 * Track length in ms as the host resolves it: the filename-encoded duration
 * suffix wins over the manifest's defaultFrameMs, so read the frames rather
 * than assuming the declared cadence held.
 */
const trackDurationMs = (track: string): number =>
  frameFiles(track).reduce((sum, file) => {
    const suffix = file.replace(/\.webp$/, '').split('_').pop()
    return sum + Number(suffix)
  }, 0)

describe('jyn-loli pet manifest', () => {
  const parsed = JSON.parse(readFileSync(join(JYN_LOLI_DIR, 'pet.json'), 'utf8'))
  const res = parsePetManifest(parsed, 'jyn-loli-assets')

  it('user gets a manifest that parses clean (fail-closed)', () => {
    // Given the shipped jyn-loli manifest; when it is parsed; then it is
    // accepted with no error diagnostic.
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.diagnostics.filter(d => d.level === 'error')).toEqual([])
    }
  })

  it('declares no top-level field the released contract would reject', () => {
    // Given the shipped manifest; when its top level is read; then it carries only
    // fields every released dsh-pet knows.
    //
    // This is not hygiene. Released 0.4.6 fail-closes on an unknown top-level
    // field, and that one error poisons its parser-wide hasErrors flag, so EVERY
    // frames2d track parse then returns undefined: the track table comes out empty
    // and the pet is refused outright — it installs but never appears in the pet
    // list. The field that bit was the author-side bounce-physics declaration (an
    // unmerged addition to this repository's own manifest-v2), so the manifest
    // stays on the released vocabulary. Asserted against the raw JSON keys rather
    // than a typed field, because the field is not in this branch's types at all.
    expect(res.ok).toBe(true)
    expect(Object.keys(parsed).sort()).toEqual([
      'author', 'description', 'displayName', 'frames2d', 'gameplay',
      'id', 'license', 'petManifestVersion', 'renderer', 'version',
    ])
  })

  it('appears in the registry as a pet the user can pick', () => {
    // Given the shipped assets; when the plugin's own loader scans them and the
    // browser view is built; then the entry resolves with every track, so the
    // pet is selectable and its actions are reachable. This is the hop the
    // settings list reads.
    const registry = loadPetRegistry({ packageRoot: petPackageRoot(import.meta.url), petsDir: '', dshPetsDir: '' })
    const entry = registry.byId('jyn-loli')
    expect(entry).toBeDefined()
    const view = petEntryView(entry!)
    expect(view.frames2d!.tracks.rest).toBeDefined()
    expect(view.frames2d!.tracks.resting).toBeDefined()
    expect(view.gameplay?.sleep?.state).toBe('rest')
    expect(view.frames2d!.tracks.work).toBeDefined()
    expect(view.gameplay?.work?.state).toBe('work')
  })

  it('user sees the ten declared tracks at the 40ms default cadence', () => {
    // Given the parsed manifest; when its track table is read; then every
    // track exists under one thumbnail directory and none overrides the
    // cadence, so the durations stay in the file names.
    if (!res.ok) throw new Error('manifest rejected')
    const frames2d = res.manifest.frames2d!
    expect(Object.keys(frames2d.tracks).sort()).toEqual(Object.keys(TRACK_FRAMES).sort())
    expect(frames2d.dir).toBe('thumb')
    expect(frames2d.defaultFrameMs).toBe(FRAME_MS)
    for (const [name, row] of Object.entries<Record<string, unknown>>(parsed.frames2d.tracks)) {
      for (const key of Object.keys(row)) expect(['loop', 'fallback'], name).toContain(key)
    }
  })

  it('user sees every activity phase fall through to the idle loop', () => {
    // Given the parsed phases table; when it is read; then only idle is mapped
    // and every other phase (the mini-actions, work and rest alike) inherits it.
    if (!res.ok) throw new Error('manifest rejected')
    const frames2d = res.manifest.frames2d!
    expect(frames2d.phases).toEqual({ idle: 'idle' })
    expect(Object.keys(TRACK_FRAMES)).toContain(frames2d.phases.idle)
  })

  it('user sees the four mini-actions settle back into idle', () => {
    // Given the parsed tracks; when loop and fallback are read; then the
    // scratch, the plush hug and the lollipop all replay from the idle loop.
    if (!res.ok) throw new Error('manifest rejected')
    const tracks = res.manifest.frames2d!.tracks
    for (const name of ACTS) {
      expect(tracks[name]!.loop, name).toBe(false)
      expect(tracks[name]!.fallback, name).toBe('idle')
    }
    // The idle loop keeps running: it is held for as long as nothing else plays.
    expect(tracks.idle!.loop ?? true).toBe(true)
    expect(tracks.idle!.fallback).toBeUndefined()
  })

  it('user gets a randomly interleaved mini-action that can always be rolled', () => {
    // Given the parsed idle director; when its act table is read; then all
    // every declared track is reachable and every act carries a weight, so
    // the roll can never starve an action.
    if (!res.ok) throw new Error('manifest rejected')
    const director = res.manifest.gameplay?.idleDirector
    if (!director) throw new Error('idle director missing')
    expect(director.acts.map(act => act.track).sort()).toEqual([...ACTS].sort())
    for (const act of director.acts) {
      expect(act.weight, act.track).toBeGreaterThan(0)
      expect(res.manifest.frames2d!.tracks[act.track], act.track).toBeDefined()
    }
    expect(director.intervalMs).toBeGreaterThan(0)
    // The host rolls the idle weight against the acts; a zero idle weight would
    // make every tick an act, and maxMiss 0 would force one after every miss.
    expect(director.idleWeight).toBeGreaterThan(0)
    expect(director.maxMiss).toBeGreaterThan(0)
  })

  it('ships the frames every track declares, all sharing one cell size', () => {
    // Given the frames on disk; when each track directory is listed; then the
    // counts match the manifest's tracks and every frame uses one cell, so the
    // pet does not resize when an action cuts in.
    const cells = new Set<string>()
    for (const [track, expected] of Object.entries(TRACK_FRAMES)) {
      const files = frameFiles(track)
      expect(files.length, track).toBe(expected)
      for (const file of files) {
        const dim = imageDimensions(readFileSync(join(JYN_LOLI_DIR, 'thumb', track, file)))
        expect(dim, track + '/' + file).toBeDefined()
        cells.add(dim!.width + 'x' + dim!.height)
      }
    }
    expect([...cells]).toEqual(['764x1172'])
  })

  it('encodes each frame duration in the file name', () => {
    // Given the shipped frame names; when the duration suffix is read; then the
    // host resolves the declared cadence without a manifest frameMs list.
    for (const track of Object.keys(TRACK_FRAMES)) {
      const files = frameFiles(track)
      expect(files.every(f => f.endsWith('_' + FRAME_MS + '.webp')), track).toBe(true)
    }
  })

  it('user sees each track run the same three-second beat', () => {
    // Given the shipped frames; when their durations are summed; then the idle
    // loop, the four actions and the rest pair all last the same 2880ms, which
    // is the source clip's own period (73 frames at 24fps, first == last frame).
    for (const track of Object.keys(TRACK_FRAMES)) {
      expect(trackDurationMs(track), track).toBe(2880)
    }
  })

  it('sends the rest state into the resting loop and holds it there', () => {
    // Given the parsed rest pair; when loop and fallback are read; then rest is
    // played once and settles into the resting loop, which itself never falls
    // back — the same shape the maid pet uses for its own sleep -> sleeping pair.
    if (!res.ok) throw new Error('manifest rejected')
    const tracks = res.manifest.frames2d!.tracks
    expect(tracks.rest!.loop).toBe(false)
    expect(tracks.rest!.fallback).toBe('resting')
    expect(tracks.resting!.loop ?? true).toBe(true)
    expect(tracks.resting!.fallback).toBeUndefined()
  })

  it('sends the work mode into the work loop and holds it there', () => {
    // Given the parsed work block; when its three states are read; then the loop
    // the host holds while the mode ticks is the work track, and the two outcomes
    // it plays on each tick fall back into that same loop. Both result tracks are
    // exactly resultMs long, so a result finishes right as the host presses the
    // work loop back under it — the same seam argument the rest pair rests on.
    if (!res.ok) throw new Error('manifest rejected')
    const tracks = res.manifest.frames2d!.tracks
    const work = res.manifest.gameplay?.work
    if (!work) throw new Error('work mode missing')
    expect(work.state).toBe('work')
    expect(work.successState).toBe('work-success')
    expect(work.failState).toBe('work-fail')
    expect(tracks[work.state]!.loop ?? true).toBe(true)
    expect(tracks[work.state]!.fallback).toBeUndefined()
    for (const name of [work.successState, work.failState]) {
      expect(tracks[name]!.loop, name).toBe(false)
      expect(tracks[name]!.fallback, name).toBe('work')
    }
    if (!work.resultMs) throw new Error('work resultMs missing')
    expect(work.resultMs).toEqual({ success: 3000, fail: 3000 })
    // Every track in this package runs the same 2880ms beat (72 frames at 40ms),
    // so a result track is 120ms SHORTER than the 3000ms window the host holds
    // its state for. It does not loop, so the host simply holds its last frame
    // for that remainder — and the last frame is the same anchored idle pose the
    // work loop opens on, so pressing the loop back under it cannot jump. What
    // must hold is that a result is never cut off mid-move: it has to fit inside
    // the window. (The maid pet's own work pair matches its resultMs exactly, at
    // 25 frames x 120ms; this package keeps one cadence across all ten tracks
    // instead, and eats the difference as a static tail.)
    const beat = trackDurationMs(work.successState)
    expect(beat).toBe(2880)
    expect(trackDurationMs(work.failState)).toBe(beat)
    expect(beat).toBeLessThan(work.resultMs.success)
    expect(beat).toBeLessThan(work.resultMs.fail)
  })

  it('lets a plain click still reach a stat though the shy tracks never shipped', () => {
    // Given the shipped gameplay block; when its touch block is read; then a
    // click still moves a stat. This is the subtle one: `clickBoost` is only
    // legal INSIDE `touch` (a top-level gameplay.clickBoost is rejected as an
    // unknown field), so an earlier build that gated the whole touch block on
    // the three shy tracks silently dropped the click boost with it — the host
    // answered a tap with 'no-touch' and she was the only frames2d pet in the
    // set whose clicks fed nothing. A touch branch's `state` is optional (the
    // doro pet ships zones with no state at all), so the fix is to drop the
    // dangling state references, not the block.
    if (!res.ok) throw new Error('manifest rejected')
    const tracks = res.manifest.frames2d!.tracks
    for (const shy of ['shy-head', 'shy-body', 'shy-legs']) {
      expect(tracks[shy], shy).toBeUndefined()
    }
    const touch = res.manifest.gameplay?.touch
    if (!touch) throw new Error('touch block missing: the host would answer no-touch')
    expect(touch.zones.length).toBeGreaterThan(0)
    const boost = touch.clickBoost
    if (!boost) throw new Error('clickBoost missing')
    // The boost may only name a stat the same block declares.
    expect(res.manifest.gameplay!.stats?.[boost.stat], boost.stat).toBeDefined()
    expect(boost.min).toBeGreaterThanOrEqual(0)
    expect(boost.min).toBeLessThanOrEqual(boost.max)
    // The zones survive, but no branch may point at a track this package lacks.
    for (const zone of touch.zones) {
      expect(zone.branches.length, zone.name).toBeGreaterThan(0)
      expect(zone.y0, zone.name).toBeLessThan(zone.y1)
      for (const branch of zone.branches) {
        expect(branch.state, zone.name).toBeUndefined()
      }
    }
  })

  it('restores a declared stat while the rest state is held', () => {
    // Given the shipped gameplay block; when its sleep mode is read; then the
    // state it holds is the rest entry track (the maid pet's own sleep state,
    // bound to the rest animation its skins call *-rest) and it restores a
    // declared stat on the maid pet's cadence: 4 energy every 30 seconds.
    if (!res.ok) throw new Error('manifest rejected')
    const gameplay = res.manifest.gameplay
    if (!gameplay) throw new Error('gameplay missing')
    const sleep = gameplay.sleep
    if (!sleep) throw new Error('sleep mode missing')
    expect(sleep.state).toBe('rest')
    expect(res.manifest.frames2d!.tracks[sleep.state], sleep.state).toBeDefined()
    expect(sleep.restore).toEqual({ stat: 'energy', amount: 4, intervalMs: 30000 })
    // The restore rule may only name a stat the same block declares.
    expect(gameplay.stats?.[sleep.restore.stat]).toBeDefined()
  })

  it('names a declared track everywhere gameplay refers to one', () => {
    // Given the whole gameplay block; when every state-bearing reference is
    // collected; then each one names a track this manifest also declares —
    // a dangling reference is what makes the host refuse the pet (or silently
    // drop the feature) at load time.
    if (!res.ok) throw new Error('manifest rejected')
    const tracks = res.manifest.frames2d!.tracks
    const gameplay = res.manifest.gameplay
    if (!gameplay) throw new Error('gameplay missing')
    const refs = [
      ...(gameplay.idleDirector?.acts ?? []).map(act => act.track),
      ...(gameplay.work
        ? [gameplay.work.state, gameplay.work.successState, gameplay.work.failState]
        : []),
      ...(gameplay.sleep ? [gameplay.sleep.state] : []),
      // Touch zone branches may name a track to play on hit; a dangling one is
      // exactly the reference that kept this whole block out of the manifest
      // (see the click-boost test above).
      ...(gameplay.touch?.zones ?? []).flatMap(zone =>
        zone.branches.flatMap(branch => (branch.state === undefined ? [] : [branch.state]))),
    ]
    expect(refs.length).toBeGreaterThan(0)
    for (const ref of refs) expect(tracks[ref], ref).toBeDefined()
  })

  it('keeps the hit box inside the sprite box and not degenerate', () => {
    // Given the parsed hit box; when its corners are read; then it hugs the
    // shared cell (the character fills it, so a narrower box would miss her at
    // the extremes of the actions).
    if (!res.ok) throw new Error('manifest rejected')
    const box = res.manifest.gameplay?.hitBox
    if (!box) throw new Error('hit box missing')
    expect(box.x0).toBeLessThan(box.x1)
    expect(box.y0).toBeLessThan(box.y1)
    expect(box.x0).toBeGreaterThanOrEqual(0)
    expect(box.y0).toBeGreaterThanOrEqual(0)
    expect(box.x1).toBeLessThanOrEqual(1)
    expect(box.y1).toBeLessThanOrEqual(1)
  })
})
/**
 * Minimal GIF89a reader — block walk plus an LZW decoder. The previews are the
 * one group of assets in this package that a header-only reader cannot check:
 * the question they exist to answer is "is this GIF really transparent, or is a
 * checkerboard baked into opaque pixels?", and a checkerboard GIF and a
 * transparent GIF have identical headers, frame counts and cadences. Only the
 * decoded index raster distinguishes them. No dependency is added for it: the
 * decoder below reads the same raster the browser will.
 */
interface GifFrame {
  /** Index raster as decoded, one byte per pixel, row-major. */
  indices: Uint8Array
  /** The colour index this frame declares transparent, or -1. */
  transparentIndex: number
  /** Frame delay in milliseconds (GIF stores hundredths of a second). */
  delayMs: number
}

function lzwDecode(minCodeSize: number, data: Buffer, pixelCount: number): Uint8Array {
  const clearCode = 1 << minCodeSize
  const eoiCode = clearCode + 1
  const out: number[] = []
  let prefix: number[] = []
  let dict: number[][] = []
  let codeSize = minCodeSize + 1
  let bit = 0
  const reset = (): void => {
    dict = []
    for (let i = 0; i < clearCode; i++) dict.push([i])
    dict.push([], [])
    codeSize = minCodeSize + 1
  }
  reset()
  while (out.length < pixelCount) {
    let code = 0
    for (let i = 0; i < codeSize; i++) {
      const byte = data[bit >> 3]
      if (byte === undefined) return Uint8Array.from(out)
      code |= ((byte >> (bit & 7)) & 1) << i
      bit++
    }
    if (code === clearCode) { reset(); prefix = []; continue }
    if (code === eoiCode) break
    let entry: number[]
    if (code < dict.length && dict[code]!.length) entry = dict[code]!
    else if (prefix.length) entry = [...prefix, prefix[0]!]
    else break
    out.push(...entry)
    if (prefix.length) dict.push([...prefix, entry[0]!])
    prefix = entry
    if (dict.length === (1 << codeSize) && codeSize < 12) codeSize++
  }
  return Uint8Array.from(out.slice(0, pixelCount))
}

function readGif(buf: Buffer): { width: number; height: number; frames: GifFrame[] } {
  if (buf.toString('ascii', 0, 6) !== 'GIF89a') throw new Error('not a GIF89a')
  const width = buf.readUInt16LE(6)
  const height = buf.readUInt16LE(8)
  const screenPacked = buf[10]!
  let p = 13
  if (screenPacked & 0x80) p += 3 * (1 << ((screenPacked & 0x07) + 1))
  const frames: GifFrame[] = []
  let transparentIndex = -1
  let delayMs = 0
  while (p < buf.length) {
    const marker = buf[p]!
    if (marker === 0x3b) break
    if (marker === 0x21) {
      const label = buf[p + 1]!
      p += 2
      if (label === 0xf9) {
        const size = buf[p]!
        const packed = buf[p + 1]!
        delayMs = buf.readUInt16LE(p + 2) * 10
        transparentIndex = (packed & 0x01) ? buf[p + 4]! : -1
        p += size + 1
      }
      while (buf[p] !== 0) p += buf[p]! + 1 // extension sub-blocks end with 0
      p += 1
      continue
    }
    if (marker !== 0x2c) throw new Error('unexpected GIF block 0x' + marker.toString(16))
    const left = buf.readUInt16LE(p + 1)
    const top = buf.readUInt16LE(p + 3)
    const fw = buf.readUInt16LE(p + 5)
    const fh = buf.readUInt16LE(p + 7)
    const packed = buf[p + 9]!
    p += 10
    if (packed & 0x80) p += 3 * (1 << ((packed & 0x07) + 1))
    const minCodeSize = buf[p]!
    p += 1
    const chunks: Buffer[] = []
    while (buf[p] !== 0) {
      const n = buf[p]!
      chunks.push(buf.subarray(p + 1, p + 1 + n))
      p += n + 1
    }
    p += 1
    const indices = lzwDecode(minCodeSize, Buffer.concat(chunks), fw * fh)
    // Re-place the frame inside the logical screen so callers see one grid.
    const grid = new Uint8Array(width * height).fill(0xff)
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const src = y * fw + x
        if (src < indices.length) grid[(top + y) * width + left + x] = indices[src]!
      }
    }
    frames.push({ indices: grid, transparentIndex, delayMs })
  }
  return { width, height, frames }
}

describe('jyn-loli preview GIFs', () => {
  const previewDir = join(JYN_LOLI_DIR, 'previews')
  const previewFiles = readdirSync(previewDir).filter(f => f.endsWith('.gif')).sort()

  it('ships one preview per track and nothing else', () => {
    // Given the committed preview directory; when it is listed; then it holds
    // exactly the ten track GIFs, named after their tracks.
    expect(previewFiles).toEqual(Object.keys(TRACK_FRAMES).map(t => t + '.gif').sort())
  })

  it('renders every preview from the committed frames at the same cadence', () => {
    // Given a preview GIF; when its screen size, frame count and delays are read;
    // then it is the shipped frame sequence scaled to the preview long side and
    // running on the frame's own 40ms — the review-time animation and the runtime
    // animation are the same pixels on the same clock.
    const cell = imageDimensions(readFileSync(join(JYN_LOLI_DIR, 'thumb', 'idle', 'f_000_40.webp')))!
    const longSide = Math.max(cell.width, cell.height)
    for (const file of previewFiles) {
      const track = file.replace(/\.gif$/, '')
      const gif = readGif(readFileSync(join(previewDir, file)))
      expect(gif.frames.length, file).toBe(TRACK_FRAMES[track])
      expect(Math.max(gif.width, gif.height), file).toBe(320)
      expect(gif.width, file).toBe(Math.round(cell.width * 320 / longSide))
      expect(gif.height, file).toBe(Math.round(cell.height * 320 / longSide))
      for (const frame of gif.frames) expect(frame.delayMs, file).toBe(FRAME_MS)
    }
  })

  it('keeps every preview background transparent instead of baking a checkerboard', () => {
    // Given a preview GIF; when its frames are decoded; then every frame declares
    // a transparent index, the canvas corner is that index (the character never
    // reaches it), and most of the canvas is transparent. An earlier build fed
    // each frame through petkit's checkerboard pre-composite before quantising,
    // so every pixel came out opaque and the corner read (239,237,240) against
    // (213,213,221) — a preview that showed a background the sprite never has.
    // A checkerboard GIF and a transparent GIF differ in nothing else, which is
    // why this guard decodes rather than sniffs headers.
    for (const file of previewFiles) {
      const gif = readGif(readFileSync(join(previewDir, file)))
      for (const frame of gif.frames) {
        expect(frame.transparentIndex, file).toBeGreaterThanOrEqual(0)
        expect(frame.indices[0], file + ' top-left pixel').toBe(frame.transparentIndex)
        let transparent = 0
        for (const index of frame.indices) if (index === frame.transparentIndex) transparent++
        expect(transparent / frame.indices.length, file).toBeGreaterThan(0.2)
      }
    }
  })
})
