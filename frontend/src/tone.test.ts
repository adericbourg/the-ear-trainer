import { describe, expect, it } from 'vitest'
import { gainFor } from './tone'

describe('tone', () => {
  it('gainFor_of1kHz_returnsBaseGain', () => {
    expect(gainFor(1000)).toBeCloseTo(0.2)
  })

  it('gainFor_ofLowAndHighFrequencies_boostsAndCapsAtOne', () => {
    // Given frequencies the ear hears less (100 Hz, 15 kHz) or more (3 kHz) than 1 kHz
    // When computing their gain
    // Then quiet-sounding ones are boosted, capped at 1, and loud-sounding ones attenuated
    expect(gainFor(100)).toBe(1)
    expect(gainFor(15000)).toBeGreaterThan(0.2)
    expect(gainFor(3000)).toBeLessThan(0.2)
  })
})
