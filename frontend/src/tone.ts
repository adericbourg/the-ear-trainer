const GAIN = 0.2
// Fades avoid audible clicks when starting or stopping the oscillator.
const FADE_SECONDS = 0.02

// A-weighting (IEC 61672) in dB: how much less sensitive the ear is at a frequency.
function aWeighting(frequency: number) {
  const f2 = frequency ** 2
  const ra = (12194 ** 2 * f2 ** 2) / ((f2 + 20.6 ** 2) * Math.sqrt((f2 + 107.7 ** 2) * (f2 + 737.9 ** 2)) * (f2 + 12194 ** 2))
  return 20 * Math.log10(ra)
}

// Compensates the ear's sensitivity so all frequencies sound about as loud as 1 kHz at GAIN; capped to avoid clipping.
// ponytail: A-weighting approximates the 40-phon contour only, interpolate ISO 226 contours if this proves too coarse.
export const gainFor = (frequency: number) => Math.min(1, GAIN * 10 ** ((aWeighting(1000) - aWeighting(frequency)) / 20))

let context: AudioContext | undefined
let playing: { oscillator: OscillatorNode; gain: GainNode } | undefined

export function startTone(frequency: number) {
  stopTone()
  // Created lazily: browsers only allow audio after a user gesture.
  context ??= new AudioContext()
  const now = context.currentTime
  const oscillator = new OscillatorNode(context, { frequency })
  const gain = new GainNode(context, { gain: 0 })
  oscillator.connect(gain).connect(context.destination)
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(gainFor(frequency),now + FADE_SECONDS)
  oscillator.start(now)
  playing = { oscillator, gain }
}

export function stopTone() {
  if (!context || !playing) return
  const now = context.currentTime
  const { oscillator, gain } = playing
  gain.gain.cancelScheduledValues(now)
  gain.gain.setValueAtTime(gain.gain.value, now)
  gain.gain.linearRampToValueAtTime(0, now + FADE_SECONDS)
  oscillator.stop(now + FADE_SECONDS)
  playing = undefined
}
