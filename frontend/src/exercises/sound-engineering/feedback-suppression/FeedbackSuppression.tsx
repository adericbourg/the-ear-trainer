import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  FLAT_EQ,
  formatFrequency,
  GAIN_MAX,
  GAIN_MIN,
  isHit,
  isOverCut,
  isSuppressed,
  LOW_CUT_MAX,
  LOW_CUT_MIN,
  MID_FREQUENCY_MAX,
  MID_FREQUENCY_MIN,
  randomFeedbacks,
  type Eq,
} from './eq'
import type { ExerciseProps } from '../../Series'
import shared from '../../exercise.module.css'
import styles from './FeedbackSuppression.module.css'
import bandUrl from './band.mp3'
import vocalsUrl from './vocals.mp3'
import { setMixEq, startMix, stopMix } from '../../../tone'

const SAMPLES = [vocalsUrl, bandUrl]
const randomSample = () => SAMPLES[Math.floor(Math.random() * SAMPLES.length)]!

type Control = { readonly key: keyof Eq; readonly label: string; readonly min: number; readonly max: number; readonly isFrequency: boolean }

// In the order of a console channel strip, top to bottom.
const CONTROLS: readonly Control[] = [
  { key: 'high', label: 'High', min: GAIN_MIN, max: GAIN_MAX, isFrequency: false },
  { key: 'midFrequency', label: 'Mid freq', min: MID_FREQUENCY_MIN, max: MID_FREQUENCY_MAX, isFrequency: true },
  { key: 'mid', label: 'Mid', min: GAIN_MIN, max: GAIN_MAX, isFrequency: false },
  { key: 'low', label: 'Low', min: GAIN_MIN, max: GAIN_MAX, isFrequency: false },
  { key: 'lowCut', label: 'Low cut', min: LOW_CUT_MIN, max: LOW_CUT_MAX, isFrequency: true },
]
const BEGINNER_CONTROLS: readonly (keyof Eq)[] = ['midFrequency', 'mid']

// Frequency sliders are logarithmic, like the frequency knobs of a console.
const FREQUENCY_STEPS = 100
const toStep = ({ min, max }: Control, frequency: number) => Math.round((FREQUENCY_STEPS * Math.log(frequency / min)) / Math.log(max / min))
const fromStep = ({ min, max }: Control, step: number) => min * (max / min) ** (step / FREQUENCY_STEPS)

const formatGain = (gain: number) => (gain > 0 ? `+${gain} dB` : gain < 0 ? `−${-gain} dB` : '0 dB')

function formatValue(control: Control, value: number) {
  if (!control.isFrequency) return formatGain(value)
  return control.key === 'lowCut' && value === LOW_CUT_MIN ? 'Off' : formatFrequency(value)
}

const listOf = (frequencies: readonly number[]) => frequencies.map(formatFrequency).join(', ')

export default function FeedbackSuppression({ level, isLastQuestion, isAutoPlay, onCheck, onNext }: ExerciseProps) {
  const [feedbacks, setFeedbacks] = useState(() => randomFeedbacks(level))
  const [sample, setSample] = useState(randomSample)
  const [eq, setEq] = useState(FLAT_EQ)
  const [isPlaying, setIsPlaying] = useState(isAutoPlay)
  const [hasPlayed, setHasPlayed] = useState(isAutoPlay)
  const [hasLoadError, setHasLoadError] = useState(false)
  const [isChecked, setIsChecked] = useState(false)
  const controlsRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const controls = level === 'beginner' ? CONTROLS.filter(({ key }) => BEGINNER_CONTROLS.includes(key)) : CONTROLS

  const play = (url: string, frequencies: readonly number[], playedEq: Eq) => {
    startMix(url, frequencies, playedEq).catch(() => {
      setIsPlaying(false)
      setHasLoadError(true)
    })
  }

  const togglePlayback = () => {
    if (isPlaying) {
      stopMix()
    } else {
      setHasLoadError(false)
      play(sample, feedbacks, eq)
      setHasPlayed(true)
    }
    setIsPlaying(!isPlaying)
  }

  const change = (key: keyof Eq, value: number) => {
    const newEq = { ...eq, [key]: value }
    setEq(newEq)
    setMixEq(newEq)
  }

  const focusFirstControl = () => controlsRef.current?.querySelector('input')?.focus()

  const check = () => {
    onCheck({ label: listOf(feedbacks), isHit: isHit(level, feedbacks, eq) })
    flushSync(() => setIsChecked(true))
    nextRef.current?.focus()
  }

  const reset = () => {
    stopMix()
    setIsPlaying(isAutoPlay)
    const newFeedbacks = randomFeedbacks(level)
    setFeedbacks(newFeedbacks)
    const newSample = randomSample()
    setSample(newSample)
    setEq(FLAT_EQ)
    setHasPlayed(isAutoPlay)
    setHasLoadError(false)
    setIsChecked(false)
    if (isAutoPlay) play(newSample, newFeedbacks, FLAT_EQ)
  }

  const next = () => {
    onNext()
    if (isLastQuestion) return
    flushSync(reset)
    focusFirstControl()
  }

  // Space toggles playback, except on buttons and links where it keeps its native activation.
  const onDocumentKeyDown = useEffectEvent((event: globalThis.KeyboardEvent) => {
    if (event.key !== ' ' || event.repeat) return
    if (event.target instanceof Element && event.target.closest('button, a')) return
    event.preventDefault()
    togglePlayback()
  })

  useEffect(() => {
    document.addEventListener('keydown', onDocumentKeyDown)
    return () => document.removeEventListener('keydown', onDocumentKeyDown)
  }, [])

  useEffect(() => stopMix, [])

  // Next plays from reset; the first question plays on mount.
  const autoPlay = useEffectEvent(() => {
    if (isAutoPlay) play(sample, feedbacks, eq)
  })

  useEffect(() => autoPlay(), [])

  useEffect(focusFirstControl, [])

  const ringing = feedbacks.filter((frequency) => !isSuppressed(eq, frequency))
  const isTooMuchCut = isOverCut(level, eq)
  const result = isChecked ? (isHit(level, feedbacks, eq) ? 'hit' : 'miss') : undefined

  return (
    <div className={shared.exercise}>
      <p className={shared.instructions}>
        Click Play to hear a sample with feedback ringing over it.
        <br />
        Then use the EQ to make the feedback disappear{level === 'advanced' || level === 'expert' ? ', without cutting more than needed' : ''}.
        <br />
        When the feedback is gone, click Check.
      </p>

      <button type="button" className={shared.button} aria-keyshortcuts="Space" onClick={togglePlayback}>
        <svg className={shared.icon} viewBox="0 0 16 16" aria-hidden="true">
          {isPlaying ? <path d="M4 2h3v12H4zM9 2h3v12H9z" /> : <path d="M4 2l10 6-10 6z" />}
        </svg>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      {hasLoadError && <p role="alert">The sample could not be loaded. Check your connection and click Play again.</p>}

      <div ref={controlsRef} className={styles.strip}>
        {controls.map((control) => {
          const value = eq[control.key]
          const text = formatValue(control, value)
          return (
            <label key={control.key} className={styles.control}>
              <span>{control.label}</span>
              <input
                type="range"
                min={control.isFrequency ? 0 : control.min}
                max={control.isFrequency ? FREQUENCY_STEPS : control.max}
                value={control.isFrequency ? toStep(control, value) : value}
                aria-valuetext={text}
                disabled={isChecked}
                onChange={(event) => {
                  const step = Number(event.target.value)
                  change(control.key, control.isFrequency ? fromStep(control, step) : step)
                }}
              />
              <span aria-hidden="true">{text}</span>
            </label>
          )
        })}
      </div>

      <div className={shared.result}>
        {isChecked ? (
          <button ref={nextRef} type="button" className={shared.button} data-result={result} onClick={next}>
            {isLastQuestion ? 'See score' : 'Next'}
          </button>
        ) : (
          <button type="button" className={shared.button} disabled={!hasPlayed} onClick={check}>
            Check
          </button>
        )}
        <p aria-live="polite">
          {result === 'hit' && `Feedback suppressed! It rang at ${listOf(feedbacks)}.`}
          {result === 'miss' && `Missed! Feedback rang at ${listOf(feedbacks)}.`}
          {result === 'miss' && ringing.length > 0 && ` Still ringing: ${listOf(ringing)}.`}
          {result === 'miss' && isTooMuchCut && ' Too much cut: the sound is damaged.'}
        </p>
      </div>
    </div>
  )
}
