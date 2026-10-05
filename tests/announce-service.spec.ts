import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { MAX_ANNOUNCEMENTS } from '../src/announce.ts'
import { PetService } from '../src/service.ts'
import { loadPetRegistry } from '../src/registry.ts'

/**
 * Service-level tests for the announcement bubble (dsh-usage linkage):
 * announce() stores the payload in the publisher's own slot, view() exposes
 * the fresh ones and drops them once their TTLs pass. Rendering itself is
 * covered by the client bundle; parseAnnouncement's bounds live in
 * announce.spec.ts.
 */

const WEBP_BYTES = Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])

let dir: string
let service: PetService

const BALANCE_PAYLOAD = {
  source: 'dsh-usage',
  kind: 'balance' as const,
  title: 'DeepSeek',
  amount: '¥110.00',
  tone: 'ok' as const,
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'dsh-pet-announce-'))
  const assets = join(dir, 'assets', 'whale')
  mkdirSync(assets, { recursive: true })
  writeFileSync(join(assets, 'pet.json'), JSON.stringify({
    id: 'whale-girl', displayName: '鲸鱼娘', spritesheetPath: 'spritesheet.webp',
  }), 'utf8')
  writeFileSync(join(assets, 'spritesheet.webp'), WEBP_BYTES)

  const ctx = new Context()
  const registry = loadPetRegistry({ packageRoot: dir, petsDir: '', dshPetsDir: '' })
  service = new PetService(ctx, { persistDir: join(dir, 'home'), registry })
})

afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
})

const viewAnnouncement = async () => (await service.state()).announcement

describe('PetService.announce + view TTL', () => {
  it('stores a valid announcement and exposes it in the state view', async () => {
    expect(service.announce(BALANCE_PAYLOAD)).toEqual({ ok: true })
    expect(await viewAnnouncement()).toMatchObject({ source: 'dsh-usage', kind: 'balance', title: 'DeepSeek' })
  })

  it('keeps the last announcement of one publisher and drops malformed ones', async () => {
    expect(service.announce({ kind: 'balance', title: 'missing source' })).toEqual({ ok: false })
    expect(await viewAnnouncement()).toMatchObject({ title: 'DeepSeek' })

    expect(service.announce({ ...BALANCE_PAYLOAD, title: 'Kimi', amount: '$5.00' })).toEqual({ ok: true })
    expect(await viewAnnouncement()).toMatchObject({ title: 'Kimi', amount: '$5.00' })
  })

  it('stops exposing the announcement once its ttl has passed', async () => {
    expect(service.announce({ ...BALANCE_PAYLOAD, ttlMs: 1000 })).toEqual({ ok: true })
    expect(await viewAnnouncement()).toBeDefined()

    await sleep(1100)
    expect(await viewAnnouncement()).toBeUndefined()
  })
})

/**
 * Several publishers on one pet (issue #1812). The contract used to hold a
 * single slot, so the second announcing plugin displaced the first; `source` is
 * the slot key now. Each case builds its own service so the slot table starts
 * empty and the story reads without inheriting another case's publishers.
 */
describe('PetService.announce with several publishers', () => {
  /** A pet holding no announcement yet, so each case owns its own slot table. */
  function idle(name: string): PetService {
    return new PetService(new Context(), {
      persistDir: join(dir, 'home-' + name),
      registry: service.registrySnapshot(),
    })
  }

  const QUOTA_PAYLOAD = {
    source: 'dsh-pet-quota',
    kind: 'cost' as const,
    title: 'DeepSeek',
    amount: '今日 1.2M tokens',
    tone: 'ok' as const,
  }
  const NOTICE_PAYLOAD = {
    source: 'dsh-pet-notices',
    kind: 'plan' as const,
    title: 'Codex',
    percent: 42,
    tone: 'warn' as const,
  }

  const sourcesOf = async (pet: PetService) => (await pet.state()).announcements?.map(entry => entry.source)

  it('serves both publishers at once instead of one displacing the other', async () => {
    const pet = idle('pair')

    expect(pet.announce(QUOTA_PAYLOAD)).toEqual({ ok: true })
    expect(pet.announce(NOTICE_PAYLOAD)).toEqual({ ok: true })

    // The reported defect: two publishers shared one slot, so the second
    // announcement erased the first.
    expect(await sourcesOf(pet)).toEqual(['dsh-pet-quota', 'dsh-pet-notices'])
    // Both bubble facts are on the wire, not just a winner.
    expect((await pet.state()).announcements).toEqual([
      expect.objectContaining({ source: 'dsh-pet-quota', amount: '今日 1.2M tokens' }),
      expect.objectContaining({ source: 'dsh-pet-notices', percent: 42 }),
    ])
  })

  it('keeps the singular field pointing at the freshest entry for older browser halves', async () => {
    const pet = idle('compat')

    pet.announce(NOTICE_PAYLOAD)
    await sleep(5)
    pet.announce(QUOTA_PAYLOAD)

    // A rolling upgrade must never blank a publisher: a browser half that only
    // knows the singular field still renders one bubble, the freshest one.
    expect((await pet.state()).announcement?.source).toBe('dsh-pet-quota')
  })

  it('gives each publisher its own ttl', async () => {
    const pet = idle('ttls')
    pet.announce(NOTICE_PAYLOAD)
    pet.announce({ ...QUOTA_PAYLOAD, ttlMs: 1000 })

    await sleep(1100)

    // Only the lapsed publisher's slot empties; the other keeps its entry.
    expect(await sourcesOf(pet)).toEqual(['dsh-pet-notices'])
  })

  it('updates a publisher in place instead of reordering the stack', async () => {
    const pet = idle('in-place')
    pet.announce(QUOTA_PAYLOAD)
    pet.announce(NOTICE_PAYLOAD)

    pet.announce({ ...QUOTA_PAYLOAD, amount: '今日 2.4M tokens' })

    // A repeating publisher refreshes its own bubble where it already sits, so
    // two publishers on different cadences never make the stack flicker.
    expect((await pet.state()).announcements?.map(entry => [entry.source, entry.amount])).toEqual([
      ['dsh-pet-quota', '今日 2.4M tokens'],
      ['dsh-pet-notices', undefined],
    ])
  })

  it('bounds the stack and yields the slot of the publisher silent longest', async () => {
    const pet = idle('bounded')
    for (const source of ['alpha', 'beta', 'gamma', 'delta']) {
      pet.announce({ ...QUOTA_PAYLOAD, source })
      // Announcements on separate milliseconds, so "silent longest" has one
      // unambiguous answer instead of a tie between same-instant publishers.
      await sleep(5)
    }
    expect(await sourcesOf(pet)).toEqual(['alpha', 'beta', 'gamma', 'delta'])

    // The publisher that just refreshed is the freshest, so the slot a fifth
    // publisher takes belongs to the one that has been silent longest.
    pet.announce({ ...QUOTA_PAYLOAD, source: 'alpha' })
    expect(pet.announce({ ...QUOTA_PAYLOAD, source: 'epsilon' })).toEqual({ ok: true })

    // Beta (silent longest) gave up its slot; alpha keeps the row it already
    // occupied even though it is the freshest, and epsilon appends.
    expect(await sourcesOf(pet)).toEqual(['alpha', 'gamma', 'delta', 'epsilon'])
  })

  it('never drops an arriving publisher because the table is full', async () => {
    const pet = idle('full')
    for (const source of ['alpha', 'beta', 'gamma', 'delta']) {
      pet.announce({ ...QUOTA_PAYLOAD, source })
    }
    expect(pet.announce({ ...QUOTA_PAYLOAD, source: 'epsilon' })).toEqual({ ok: true })

    // Five publishers announced into a four-slot table: the pet keeps four and
    // a live publisher gave up its slot, rather than refusing the newcomer.
    expect((await pet.state()).announcements).toHaveLength(MAX_ANNOUNCEMENTS)
    expect(await sourcesOf(pet)).toContain('epsilon')
  })

  it('frees the slot a lapsed publisher was holding', async () => {
    const pet = idle('recycled')
    for (const source of ['alpha', 'beta', 'gamma']) {
      pet.announce({ ...QUOTA_PAYLOAD, source })
    }
    expect(pet.announce({ ...QUOTA_PAYLOAD, source: 'delta', ttlMs: 1000 })).toEqual({ ok: true })
    expect(await sourcesOf(pet)).toHaveLength(MAX_ANNOUNCEMENTS)

    await sleep(1100)

    // The lapsed publisher's slot is gone, so the table has room again and the
    // long-lived publishers are untouched.
    expect(await sourcesOf(pet)).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('serves no announcements slice when nothing is published', async () => {
    // Absent, not an empty array: a pet with no publisher serves exactly what it
    // served before the upgrade.
    expect((await idle('silent').state()).announcements).toBeUndefined()
  })
})
