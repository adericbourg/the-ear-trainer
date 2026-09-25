import { describe, expect, it } from 'vitest'
import { hitsOf } from './scoring'

describe('scoring', () => {
  it('hitsOf_countsTheHits', () => {
    expect(hitsOf([])).toBe(0)
    expect(
      hitsOf([
        { label: 'a', isHit: true },
        { label: 'b', isHit: false },
        { label: 'c', isHit: true },
      ]),
    ).toBe(2)
  })
})
