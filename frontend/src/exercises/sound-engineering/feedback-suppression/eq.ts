import { randomItem, type Level } from '../../pitch/intervals/interval'
import { roundTo2Digits } from '../frequency-identification/frequency'

// Channel strip of a small console: sweepable low cut, low and high shelves, semi-parametric mid.
export type Eq = {
  readonly lowCut: number
  readonly low: number
  readonly midFrequency: number
  readonly mid: number
  readonly high: number
}

export const GAIN_MIN = -15
export const GAIN_MAX = 15
export const LOW_CUT_MIN = 20
export const LOW_CUT_MAX = 400
export const MID_FREQUENCY_MIN = 100
export const MID_FREQUENCY_MAX = 8000
const LOW_SHELF_FREQUENCY = 80
const HIGH_SHELF_FREQUENCY = 8000
const MID_Q = 1
// Web Audio takes the Q of high-pass filters in dB: this one is Butterworth (Q = 1/√2).
const BUTTERWORTH_Q_DB = 20 * Math.log10(Math.SQRT1_2)
const SAMPLE_RATE = 48000

export const FLAT_EQ: Eq = { lowCut: LOW_CUT_MIN, low: 0, midFrequency: 1000, mid: 0, high: 0 }

type Filter ={ readonly type: 'highpass' | 'lowshelf' | 'peaking' | 'highshelf'; readonly frequency: number; readonly gain: number; readonly Q: number }

// Shared by the audio graph and the scoring, so what is heard is what is scored.
export const filtersOf = (eq: Eq): readonly Filter[] => [
  { type: 'highpass', frequency: eq.lowCut, gain: 0, Q: BUTTERWORTH_Q_DB },
  { type: 'lowshelf', frequency: LOW_SHELF_FREQUENCY, gain: eq.low, Q: 1 },
  { type: 'peaking', frequency: eq.midFrequency, gain: eq.mid, Q: MID_Q },
  { type: 'highshelf', frequency: HIGH_SHELF_FREQUENCY, gain: eq.high, Q: 1 },
]

// Biquad coefficients [b0, b1, b2, a0, a1, a2] as the Web Audio spec defines them (RBJ Audio EQ Cookbook, shelf slope 1).
function coefficientsOf({ type, frequency, gain, Q }: Filter) {
  const w0 = (2 * Math.PI * frequency) / SAMPLE_RATE
  const cos = Math.cos(w0)
  const sin = Math.sin(w0)
  const a = 10 ** (gain / 40)
  switch (type) {
    case 'highpass': {
      const alpha = sin / (2 * 10 ** (Q / 20))
      return [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2, 1 + alpha, -2 * cos, 1 - alpha]
    }
    case 'peaking': {
      const alpha = sin / (2 * Q)
      return [1 + alpha * a, -2 * cos, 1 - alpha * a, 1 + alpha / a, -2 * cos, 1 - alpha / a]
    }
    case 'lowshelf': {
      const k = 2 * Math.sqrt(a) * (sin / 2) * Math.SQRT2
      return [
        a * (a + 1 - (a - 1) * cos + k),
        2 * a * (a - 1 - (a + 1) * cos),
        a * (a + 1 - (a - 1) * cos - k),
        a + 1 + (a - 1) * cos + k,
        -2 * (a - 1 + (a + 1) * cos),
        a + 1 + (a - 1) * cos - k,
      ]
    }
    case 'highshelf': {
      const k = 2 * Math.sqrt(a) * (sin / 2) * Math.SQRT2
      return [
        a * (a + 1 + (a - 1) * cos + k),
        -2 * a * (a - 1 + (a + 1) * cos),
        a * (a + 1 + (a - 1) * cos - k),
        a + 1 - (a - 1) * cos + k,
        2 * (a - 1 - (a + 1) * cos),
        a + 1 - (a - 1) * cos - k,
      ]
    }
  }
}

// |c0 + c1·z⁻¹ + c2·z⁻²| on the unit circle.
const magnitude = (c0: number, c1: number, c2: number, w: number) =>
  Math.hypot(c0 + c1 * Math.cos(w) + c2 * Math.cos(2 * w), c1 * Math.sin(w) + c2 * Math.sin(2 * w))

export function eqGainDb(eq: Eq, frequency: number) {
  const w = (2 * Math.PI * frequency) / SAMPLE_RATE
  return filtersOf(eq).reduce((sum, filter) => {
    const [b0, b1, b2, a0, a1, a2] = coefficientsOf(filter) as [number, number, number, number, number, number]
    return sum + 20 * Math.log10(magnitude(b0, b1, b2, w) / magnitude(a0, a1, a2, w))
  }, 0)
}

// Loop gain above unity at a feedback frequency: it stops ringing once the EQ cuts at least this much there.
const MARGIN_DB = 6

export const isSuppressed = (eq: Eq, frequency: number) => eqGainDb(eq, frequency) <= -MARGIN_DB + 1e-9

// Amplitude: 1 with a flat EQ, raised by a boost, down to 0 once suppressed.
export function feedbackLevel(eq: Eq, frequency: number) {
  const gain = eqGainDb(eq, frequency)
  if (gain >= 0) return 10 ** (gain / 20)
  return isSuppressed(eq, frequency) ? 0 : (MARGIN_DB + gain) / MARGIN_DB
}

export const BANDS = {
  low: { min: 60, max: 150 },
  mid: { min: 250, max: 4000 },
  high: { min: 8000, max: 12000 },
} as const
type Band = (typeof BANDS)[keyof typeof BANDS]

const randomIn = ({ min, max }: Band) => roundTo2Digits(min * (max / min) ** Math.random())

const ALL_BANDS = [BANDS.low, BANDS.mid, BANDS.high]

function bandsOf(level: Level): readonly Band[] {
  switch (level) {
    case 'beginner':
      return [BANDS.mid]
    case 'intermediate':
      return [randomItem(ALL_BANDS)]
    case 'advanced': {
      const skipped = randomItem(ALL_BANDS)
      return ALL_BANDS.filter((band) => band !== skipped)
    }
    case 'expert':
      return ALL_BANDS
  }
}

// One feedback per band, in increasing frequency.
export const randomFeedbacks = (level: Level) => bandsOf(level).map(randomIn)

const DAMAGE_POINTS = 64
const DAMAGE_MIN = 100
const DAMAGE_MAX = 15000

// Mean cut over the range that matters to a voice or a mix, on a log scale: boosts don't count, they don't damage the sound.
// Starts at 100 Hz: a low cut below that is routine, not damage.
export function damageDb(eq: Eq) {
  let sum = 0
  for (let i = 0; i < DAMAGE_POINTS; i++) {
    const frequency = DAMAGE_MIN * (DAMAGE_MAX / DAMAGE_MIN) ** (i / (DAMAGE_POINTS - 1))
    sum += Math.max(0, -eqGainDb(eq, frequency))
  }
  return sum / DAMAGE_POINTS
}

// ponytail: limits tuned on a careful fix of every band (see eq.test.ts), adjust by ear if they feel too strict or lax.
const DAMAGE_LIMIT: Partial<Record<Level, number>> = { advanced: 6.5, expert: 5.5 }

export const isOverCut = (level: Level, eq: Eq) => damageDb(eq) > (DAMAGE_LIMIT[level] ?? Infinity)

export const isHit = (level: Level, feedbacks: readonly number[], eq: Eq) =>
  feedbacks.every((frequency) => isSuppressed(eq, frequency)) && !isOverCut(level, eq)

export const formatFrequency = (frequency: number) =>
  frequency < 1000 ? `${roundTo2Digits(frequency)} Hz` : `${roundTo2Digits(frequency) / 1000} kHz`
