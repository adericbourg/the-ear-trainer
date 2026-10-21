import { feedbackLevel, filtersOf, type Eq } from './exercises/sound-engineering/feedback-suppression/eq'

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

function fadingIn(audio: AudioContext, value: number) {
  const gain = new GainNode(audio, { gain: 0 })
  gain.gain.setValueAtTime(0, audio.currentTime)
  gain.gain.linearRampToValueAtTime(value, audio.currentTime + FADE_SECONDS)
  return gain
}

function fadeOut(audio: AudioContext, gain: GainNode, sources: readonly AudioScheduledSourceNode[]) {
  const now = audio.currentTime
  gain.gain.cancelScheduledValues(now)
  gain.gain.setValueAtTime(gain.gain.value, now)
  gain.gain.linearRampToValueAtTime(0, now + FADE_SECONDS)
  for (const source of sources) source.stop(now + FADE_SECONDS)
}

let playing: { source: AudioScheduledSourceNode; gain: GainNode } | undefined

export function startTone(frequency: number) {
  stopTone()
  // Created lazily: browsers only allow audio after a user gesture.
  context ??= new AudioContext()
  const oscillator = new OscillatorNode(context, { frequency })
  const gain = fadingIn(context, gainFor(frequency))
  oscillator.connect(gain).connect(context.destination)
  oscillator.start()
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

const PULSE_SECONDS = 0.25

// A sine burst then as much silence, to loop. The burst fades in and out to avoid clicks.
function pulses(audio: AudioContext, frequency: number) {
  const { sampleRate } = audio
  const buffer = new AudioBuffer({ length: Math.round(2 * PULSE_SECONDS * sampleRate), sampleRate })
  const data = buffer.getChannelData(0)
  const pulseLength = Math.round(PULSE_SECONDS * sampleRate)
  const fadeLength = FADE_SECONDS * sampleRate
  for (let i = 0; i < pulseLength; i++) {
    data[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * Math.min(1, i / fadeLength, (pulseLength - i) / fadeLength)
  }
  return buffer
}

const NOTE_GAIN = 0.4
const NOTE_ATTACK_SECONDS = 0.005
// Notes ring into the next one instead of stopping dry.
const NOTE_DECAY_SECONDS = 3
const MELODIC_DELAY_SECONDS = 0.8
// Piano-like timbre: the fundamental plus 6 harmonics of decreasing amplitude.
const HARMONICS = [0, 1, 0.5, 0.3, 0.2, 0.12, 0.08, 0.05]

let notes: { oscillator: OscillatorNode; gain: GainNode }[] = []

function playNote(audio: BaseAudioContext, output: AudioNode, frequency: number, start: number, peak: number) {
  // A PeriodicWave belongs to its context: notes are also rendered offline.
  const periodicWave = new PeriodicWave(audio, { real: new Float32Array(HARMONICS.length), imag: new Float32Array(HARMONICS) })
  const oscillator = new OscillatorNode(audio, { frequency, periodicWave })
  const gain = new GainNode(audio, { gain: 0 })
  oscillator.connect(gain).connect(output)
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(peak, start + NOTE_ATTACK_SECONDS)
  // Exponential ramps can't reach 0: decay to an inaudible level instead.
  gain.gain.exponentialRampToValueAtTime(0.0001, start + NOTE_DECAY_SECONDS)
  oscillator.start(start)
  oscillator.stop(start + NOTE_DECAY_SECONDS)
  return { oscillator, gain }
}

// Melodic intervals play one note after the other; harmonic ones play them together, each at half gain to avoid clipping.
export function playInterval(frequencies: readonly number[], isHarmonic: boolean) {
  stopInterval()
  const audio = (context ??= new AudioContext())
  const peak = isHarmonic ? NOTE_GAIN / 2 : NOTE_GAIN
  notes = frequencies.map((frequency, i) => playNote(audio, audio.destination, frequency, audio.currentTime + (isHarmonic ? 0 : i * MELODIC_DELAY_SECONDS), peak))
}

const CHORD_SECONDS = 1
const ARPEGGIO_SECONDS = 0.3
// 4-note chords: a quarter of the melodic gain per note.
const CHORD_NOTE_GAIN = NOTE_GAIN / 4

// The cue is arpeggiated, then the chords follow one after the other after a beat of silence.
export function playChords(cue: readonly number[], chords: readonly (readonly number[])[]) {
  stopInterval()
  const audio = (context ??= new AudioContext())
  const cueNotes = cue.map((frequency, i) => playNote(audio, audio.destination, frequency, audio.currentTime + i * ARPEGGIO_SECONDS, CHORD_NOTE_GAIN))
  const start = audio.currentTime + (cue.length - 1) * ARPEGGIO_SECONDS + 2 * CHORD_SECONDS
  notes = [
    ...cueNotes,
    ...chords.flatMap((frequencies, i) =>
      frequencies.map((frequency) => playNote(audio, audio.destination, frequency, start + i * CHORD_SECONDS, CHORD_NOTE_GAIN)),
    ),
  ]
}

// The chords one after the other, in mono, with one more beat for the last one to ring before the loop restarts.
function renderChords(audio: AudioContext, chords: readonly (readonly number[])[]) {
  const offline = new OfflineAudioContext({ length: Math.round((chords.length + 1) * CHORD_SECONDS * audio.sampleRate), sampleRate: audio.sampleRate })
  chords.forEach((frequencies, i) => {
    for (const frequency of frequencies) playNote(offline, offline.destination, frequency, i * CHORD_SECONDS, CHORD_NOTE_GAIN)
  })
  return offline.startRendering()
}

export function stopInterval() {
  if (!context) return
  for (const { oscillator, gain } of notes) fadeOut(context, gain, [oscillator])
  notes = []
}

const SAMPLE_GAIN = 0.3
// Time constant of the feedback level changes: it rings down instead of stopping dead.
const FEEDBACK_SECONDS = 0.15
const EQ_SECONDS = 0.01
const samples = new Map<string, Promise<AudioBuffer>>()
let mix:
  | {
      source: AudioBufferSourceNode
      filters: BiquadFilterNode[]
      feedbacks: { frequency: number; oscillator: OscillatorNode; gain: GainNode }[]
      output: GainNode
    }
  | undefined
let mixEq: Eq | undefined
// Bumped by every start and stop: a sample that finishes loading after them is not played.
let mixRequest = 0

// Feedback tones don't go through the EQ: their level is the loop gain the EQ leaves them, as in a real feedback loop.
// A third of the tone gain leaves headroom for boosts, capped so a boost stays loud but bearable.
// ponytail: levels set by reasoning, not by ear: tune these two against the samples.
const FEEDBACK_GAIN_RATIO = 1 / 3
const FEEDBACK_GAIN_MAX = 0.8
const feedbackGainOf = (eq: Eq, frequency: number) =>
  Math.min(FEEDBACK_GAIN_MAX, gainFor(frequency) * FEEDBACK_GAIN_RATIO * feedbackLevel(eq, frequency))

function loadSample(audio: AudioContext, url: string) {
  let sample = samples.get(url)
  if (!sample) {
    sample = fetch(url)
      .then((response) => response.arrayBuffer())
      .then((data) => audio.decodeAudioData(data))
    samples.set(url, sample)
    // A failed load is retried on the next start.
    sample.catch(() => samples.delete(url))
  }
  return sample
}

export async function startMix(url: string, feedbackFrequencies: readonly number[], eq: Eq) {
  stopMix()
  mixEq = eq
  const request = mixRequest
  const audio = (context ??= new AudioContext())
  const buffer = await loadSample(audio, url)
  if (request !== mixRequest) return
  // The EQ may have moved while the sample was loading.
  const latestEq = mixEq ?? eq
  const now = audio.currentTime
  const output = fadingIn(audio, 1)
  output.connect(audio.destination)
  const source = new AudioBufferSourceNode(audio, { buffer, loop: true })
  const filters = filtersOf(latestEq).map((filter) => new BiquadFilterNode(audio, filter))
  filters.reduce<AudioNode>((previous, filter) => previous.connect(filter), source.connect(new GainNode(audio, { gain: SAMPLE_GAIN }))).connect(output)
  source.start(now)
  const feedbacks = feedbackFrequencies.map((frequency) => {
    const oscillator = new OscillatorNode(audio, { frequency })
    const gain = new GainNode(audio, { gain: feedbackGainOf(latestEq, frequency) })
    oscillator.connect(gain).connect(output)
    oscillator.start(now)
    return { frequency, oscillator, gain }
  })
  mix = { source, filters, feedbacks, output }
}

export function setMixEq(eq: Eq) {
  mixEq = eq
  if (!context || !mix) return
  const now = context.currentTime
  filtersOf(eq).forEach(({ frequency, gain }, i) => {
    mix!.filters[i]!.frequency.setTargetAtTime(frequency, now, EQ_SECONDS)
    mix!.filters[i]!.gain.setTargetAtTime(gain, now, EQ_SECONDS)
  })
  for (const { frequency, gain } of mix.feedbacks) gain.gain.setTargetAtTime(feedbackGainOf(eq, frequency), now, FEEDBACK_SECONDS)
}

export function stopMix() {
  mixRequest++
  if (!context || !mix) return
  const { source, feedbacks, output } = mix
  fadeOut(context, output, [source, ...feedbacks.map(({ oscillator }) => oscillator)])
  mix = undefined
}

// Mono sounds, to be panned.
export type PanSound =
  | { readonly kind: 'noise' }
  | { readonly kind: 'tone'; readonly frequency: number }
  | { readonly kind: 'pulses'; readonly frequency: number }
  | { readonly kind: 'chords'; readonly chords: readonly (readonly number[])[] }
  | { readonly kind: 'sample'; readonly url: string }

async function sourceOf(audio: AudioContext, sound: PanSound): Promise<{ source: AudioScheduledSourceNode; gain: number }> {
  const looping = (buffer: AudioBuffer) => new AudioBufferSourceNode(audio, { buffer, loop: true })
  switch (sound.kind) {
    case 'noise':
      return { source: looping((noise ??= pinkNoise(audio))), gain: NOISE_GAIN }
    case 'tone':
      return { source: new OscillatorNode(audio, { frequency: sound.frequency }), gain: gainFor(sound.frequency) }
    case 'pulses':
      return { source: looping(pulses(audio, sound.frequency)), gain: gainFor(sound.frequency) }
    case 'chords':
      // The note gains are rendered in.
      return { source: looping(await renderChords(audio, sound.chords)), gain: 1 }
    case 'sample':
      return { source: looping(await loadSample(audio, sound.url)), gain: SAMPLE_GAIN }
  }
}

// Bumped by every stop: a sound that finishes loading or rendering after it is not played.
let pannedRequest = 0

// StereoPannerNode applies an equal-power law, so loudness is not a cue to the position.
export async function startPanned(sound: PanSound, pan: number) {
  stopTone()
  const request = pannedRequest
  const audio = (context ??= new AudioContext())
  const { source, gain: level } = await sourceOf(audio, sound)
  if (request !== pannedRequest) return
  const gain = fadingIn(audio, level)
  source.connect(gain).connect(new StereoPannerNode(audio, { pan: pan / 100 })).connect(audio.destination)
  source.start()
  playing = { source, gain }
}

export function stopTone() {
  pannedRequest++
  if (!context || !playing) return
  fadeOut(context, playing.gain, [playing.source])
  playing = undefined
}
