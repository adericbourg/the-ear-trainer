const GAIN = 0.2
// Fades avoid audible clicks when starting or stopping the oscillator.
const FADE_SECONDS = 0.02

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
  gain.gain.linearRampToValueAtTime(GAIN, now + FADE_SECONDS)
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
