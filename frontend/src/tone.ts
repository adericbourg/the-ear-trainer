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
let playing: { source: AudioScheduledSourceNode; gain: GainNode } | undefined

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
  playing = { source: oscillator, gain }
}

const NOISE_GAIN = 0.2
const NOISE_SECONDS = 2
let noise: AudioBuffer | undefined

// Pink noise (Paul Kellet's economy filter over white noise), peak-normalized.
function pinkNoise(audio: AudioContext) {
  const buffer = new AudioBuffer({ length: NOISE_SECONDS * audio.sampleRate, sampleRate: audio.sampleRate })
  const data = buffer.getChannelData(0)
  let b0 = 0
  let b1 = 0
  let b2 = 0
  let peak = 0
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    b0 = 0.99765 * b0 + white * 0.099046
    b1 = 0.963 * b1 + white * 0.2965164
    b2 = 0.57 * b2 + white * 1.0526913
    const sample = b0 + b1 + b2 + white * 0.1848
    data[i] = sample
    peak = Math.max(peak, Math.abs(sample))
  }
  for (let i = 0; i < data.length; i++) data[i]! /= peak
  return buffer
}

// StereoPannerNode applies an equal-power law, so loudness is not a cue to the position.
export function startNoise(pan: number) {
  stopTone()
  context ??= new AudioContext()
  const now = context.currentTime
  const source = new AudioBufferSourceNode(context, { buffer: (noise ??= pinkNoise(context)), loop: true })
  const gain = new GainNode(context, { gain: 0 })
  source.connect(gain).connect(new StereoPannerNode(context, { pan: pan / 100 })).connect(context.destination)
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(NOISE_GAIN, now + FADE_SECONDS)
  source.start(now)
  playing = { source, gain }
}

const NOTE_GAIN = 0.4
const NOTE_ATTACK_SECONDS = 0.005
const NOTE_DECAY_SECONDS = 1.5
const MELODIC_DELAY_SECONDS = 0.8
// Piano-like timbre: the fundamental plus 6 harmonics of decreasing amplitude.
const HARMONICS = [0, 1, 0.5, 0.3, 0.2, 0.12, 0.08, 0.05]

let wave: PeriodicWave | undefined
let notes: { oscillator: OscillatorNode; gain: GainNode }[] = []

// Melodic intervals play one note after the other; harmonic ones play them together, each at half gain to avoid clipping.
export function playInterval(frequencies: readonly number[], isHarmonic: boolean) {
  stopInterval()
  const audio = (context ??= new AudioContext())
  const periodicWave = (wave ??= new PeriodicWave(audio, { real: new Float32Array(HARMONICS.length), imag: new Float32Array(HARMONICS) }))
  const peak = isHarmonic ? NOTE_GAIN / 2 : NOTE_GAIN
  notes = frequencies.map((frequency, i) => {
    const start = audio.currentTime + (isHarmonic ? 0 : i * MELODIC_DELAY_SECONDS)
    const oscillator = new OscillatorNode(audio, { frequency, periodicWave })
    const gain = new GainNode(audio, { gain: 0 })
    oscillator.connect(gain).connect(audio.destination)
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(peak, start + NOTE_ATTACK_SECONDS)
    // Exponential ramps can't reach 0: decay to an inaudible level instead.
    gain.gain.exponentialRampToValueAtTime(0.0001, start + NOTE_DECAY_SECONDS)
    oscillator.start(start)
    oscillator.stop(start + NOTE_DECAY_SECONDS)
    return { oscillator, gain }
  })
}

export function stopInterval() {
  if (!context) return
  const now = context.currentTime
  for (const { oscillator, gain } of notes) {
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(0, now + FADE_SECONDS)
    oscillator.stop(now + FADE_SECONDS)
  }
  notes = []
}

export function stopTone() {
  if (!context || !playing) return
  const now = context.currentTime
  const { source, gain } = playing
  gain.gain.cancelScheduledValues(now)
  gain.gain.setValueAtTime(gain.gain.value, now)
  gain.gain.linearRampToValueAtTime(0, now + FADE_SECONDS)
  source.stop(now + FADE_SECONDS)
  playing = undefined
}
