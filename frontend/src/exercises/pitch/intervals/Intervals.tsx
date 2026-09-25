import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { flushSync } from 'react-dom'
import {
  answerName,
  isExpert,
  isHarmonic,
  randomQuestion,
  simpleOf,
  stopName,
  stopsOf,
  targetName,
  toFrequency,
  type Level,
} from './interval'
import type { ExerciseProps } from '../../Series'
import shared from '../../exercise.module.css'
import styles from './Intervals.module.css'
import { playInterval, stopInterval } from '../../../tone'

const OCTAVE_LABELS = ['+0', '+1 octave', '+2 octaves']
const middleStopOf = (level: Level) => Math.floor((stopsOf(level).length - 1) / 2)

export default function Intervals({ level, isLastQuestion, onCheck, onNext }: ExerciseProps) {
  const [question, setQuestion] = useState(() => randomQuestion(level))
  const [stopIndex, setStopIndex] = useState(() => middleStopOf(level))
  const [octaves, setOctaves] = useState(0)
  const [hasPlayed, setHasPlayed] = useState(false)
  const [isChecked, setIsChecked] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const selectorRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const stops = stopsOf(level)
  const stop = stops[stopIndex]!
  const answer = stop + 12 * octaves

  const play = () => {
    playInterval(question.notes.map(toFrequency), isHarmonic(level))
    setHasPlayed(true)
  }

  const check = () => {
    onCheck({ label: targetName(question.semitones), isHit: answer === question.semitones })
    flushSync(() => setIsChecked(true))
    nextRef.current?.focus()
  }

  const reset = () => {
    stopInterval()
    setQuestion(randomQuestion(level, question.semitones))
    setStopIndex(middleStopOf(level))
    setOctaves(0)
    setHasPlayed(false)
    setIsChecked(false)
  }

  const next = () => {
    onNext()
    if (isLastQuestion) return
    flushSync(reset)
    selectorRef.current?.focus()
  }

  const moveTo = (index: number) => {
    setStopIndex(Math.min(Math.max(index, 0), stops.length - 1))
  }

  // Space plays, except on buttons and links where it keeps its native activation.
  const onDocumentKeyDown = useEffectEvent((event: globalThis.KeyboardEvent) => {
    if (event.key !== ' ' || event.repeat) return
    if (event.target instanceof Element && event.target.closest('button, a')) return
    event.preventDefault()
    play()
  })

  useEffect(() => {
    document.addEventListener('keydown', onDocumentKeyDown)
    return () => document.removeEventListener('keydown', onDocumentKeyDown)
  }, [])

  useEffect(() => stopInterval, [])

  useEffect(() => selectorRef.current?.focus(), [])

  const onSelectorKeyDown = (event: KeyboardEvent) => {
    if (isChecked) return
    const moves: Record<string, number> = {
      ArrowLeft: stopIndex - 1,
      ArrowDown: stopIndex - 1,
      ArrowRight: stopIndex + 1,
      ArrowUp: stopIndex + 1,
      Home: 0,
      End: stops.length - 1,
    }
    const moved = moves[event.key]
    if (moved !== undefined) {
      event.preventDefault()
      moveTo(moved)
    } else if (event.key === 'Enter' && hasPlayed) {
      check()
    }
  }

  const stopAt = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect()
    return Math.round(((clientX - rect.left) / rect.width) * (stops.length - 1))
  }

  const onTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isChecked) return
    moveTo(stopAt(event.clientX))
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onTrackPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    moveTo(stopAt(event.clientX))
  }

  const percent = (index: number) => `${(index / (stops.length - 1)) * 100}%`
  const result = isChecked ? (answer === question.semitones ? 'hit' : 'miss') : undefined

  return (
    <div className={shared.exercise}>
      <p className={shared.instructions}>
        Click Play to hear the interval.
        <br />
        Then slide the box to what you think is the interval.
        <br />
        {isExpert(level) && (
          <>
            Use the octave buttons if the interval is wider than an octave.
            <br />
          </>
        )}
        When you are sure of yourself, click Check.
      </p>

      <button type="button" className={shared.button} aria-keyshortcuts="Space" onClick={play}>
        <svg className={shared.icon} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 2l10 6-10 6z" />
        </svg>
        Play
      </button>

      <div className={shared.axis}>
        <div className={shared.endLabels} aria-hidden="true">
          <span>{stopName(stops[0]!)}</span>
          <span>{stopName(stops.at(-1)!)}</span>
        </div>
        <div ref={trackRef} className={shared.track} onPointerDown={onTrackPointerDown} onPointerMove={onTrackPointerMove}>
          <div
            ref={selectorRef}
            role="slider"
            tabIndex={0}
            aria-label="Interval guess"
            aria-valuemin={1}
            aria-valuemax={stops.length}
            aria-valuenow={stopIndex + 1}
            aria-valuetext={answerName(stop, octaves)}
            aria-disabled={isChecked}
            className={`${shared.selector} ${styles.box}`}
            data-result={result}
            style={{ left: percent(stopIndex) }}
            onKeyDown={onSelectorKeyDown}
          />
          {isChecked && (
            <div
              data-testid="target-marker"
              className={shared.marker}
              style={{ left: percent(stops.indexOf(simpleOf(question.semitones))) }}
            />
          )}
        </div>
        <div className={styles.stopLabel} aria-hidden="true">
          <span style={{ left: percent(stopIndex) }}>{stopName(stop)}</span>
        </div>
      </div>

      {isExpert(level) && (
        <div role="group" aria-label="Octaves" className={styles.group}>
          {OCTAVE_LABELS.map((label, i) => (
            <button
              key={label}
              type="button"
              className={`${shared.button} ${styles.toggle}`}
              aria-pressed={octaves === i}
              disabled={isChecked}
              onClick={() => setOctaves(i)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

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
          {result === 'hit' && `You guessed right! It was a ${targetName(question.semitones)}.`}
          {result === 'miss' && `Missed! It was a ${targetName(question.semitones)}.`}
        </p>
      </div>
    </div>
  )
}
