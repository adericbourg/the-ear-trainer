import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { flushSync } from 'react-dom'
import {
  ARROW_STEP,
  bounds,
  centerMaxOf,
  centerMinOf,
  clampCenter,
  formatPan,
  INITIAL_CENTER,
  isHit,
  PAGE_STEP,
  randomTarget,
  toPan,
  toPosition,
} from './pan'
import type { ExerciseProps } from '../../Series'
import shared from '../../exercise.module.css'
import { startNoise, stopTone } from '../../../tone'

const percent = (position: number) => `${position * 100}%`

export default function Panning({ level, isLastQuestion, onCheck, onNext }: ExerciseProps) {
  const [target, setTarget] = useState(randomTarget)
  const [center, setCenter] = useState(INITIAL_CENTER)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasPlayed, setHasPlayed] = useState(false)
  const [isChecked, setIsChecked] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const selectorRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const dragOffset = useRef(0)

  const { low, high } = bounds(level, center)

  const togglePlayback = () => {
    if (isPlaying) {
      stopTone()
    } else {
      startNoise(target)
      setHasPlayed(true)
    }
    setIsPlaying(!isPlaying)
  }

  const check = () => {
    onCheck({ label: formatPan(target), isHit: isHit(level, target, center) })
    flushSync(() => setIsChecked(true))
    nextRef.current?.focus()
  }

  const reset = () => {
    stopTone()
    setIsPlaying(false)
    setTarget(randomTarget())
    setCenter(INITIAL_CENTER)
    setHasPlayed(false)
    setIsChecked(false)
  }

  const next = () => {
    onNext()
    if (isLastQuestion) return
    flushSync(reset)
    selectorRef.current?.focus()
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

  useEffect(() => stopTone, [])

  useEffect(() => selectorRef.current?.focus(), [])

  const onSelectorKeyDown = (event: KeyboardEvent) => {
    if (isChecked) return
    const moves: Record<string, number> = {
      ArrowLeft: center - ARROW_STEP,
      ArrowDown: center - ARROW_STEP,
      ArrowRight: center + ARROW_STEP,
      ArrowUp: center + ARROW_STEP,
      PageDown: center - PAGE_STEP,
      PageUp: center + PAGE_STEP,
      Home: centerMinOf(level),
      End: centerMaxOf(level),
    }
    const moved = moves[event.key]
    if (moved !== undefined) {
      event.preventDefault()
      setCenter(clampCenter(level, moved))
    } else if (event.key === 'Enter' && hasPlayed) {
      check()
    }
  }

  const positionAt = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect()
    return (clientX - rect.left) / rect.width
  }

  // Dragging the box keeps the grab point under the pointer; clicking the track centers the box there.
  const onTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isChecked) return
    const position = positionAt(event.clientX)
    const isOnSelector = event.target === selectorRef.current
    dragOffset.current = isOnSelector ? position - toPosition(center) : 0
    if (!isOnSelector) setCenter(clampCenter(level, toPan(position)))
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onTrackPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    setCenter(clampCenter(level, toPan(positionAt(event.clientX) - dragOffset.current)))
  }

  const lowPosition = toPosition(low)
  const highPosition = toPosition(high)
  const result = isChecked ? (isHit(level, target, center) ? 'hit' : 'miss') : undefined

  return (
    <div className={shared.exercise}>
      <p className={shared.instructions}>
        Put on headphones: with speakers, both ears hear both channels and the room blurs the position.
        <br />
        Click Play to hear a sound somewhere between left and right.
        <br />
        Then slide the box to where you hear it.
        <br />
        When you are sure of yourself, click Check.
      </p>

      <button type="button" className={shared.button} aria-keyshortcuts="Space" onClick={togglePlayback}>
        <svg className={shared.icon} viewBox="0 0 16 16" aria-hidden="true">
          {isPlaying ? (
            <path d="M4 2h3v12H4zM9 2h3v12H9z" />
          ) : (
            <path d="M4 2l10 6-10 6z" />
          )}
        </svg>
        {isPlaying ? 'Pause' : 'Play'}
      </button>

      <div className={shared.axis}>
        <div className={shared.endLabels} aria-hidden="true">
          <span>L</span>
          <span>C</span>
          <span>R</span>
        </div>
        <div
          ref={trackRef}
          className={shared.track}
          onPointerDown={onTrackPointerDown}
          onPointerMove={onTrackPointerMove}
        >
          <div
            ref={selectorRef}
            role="slider"
            tabIndex={0}
            aria-label="Pan guess"
            aria-valuemin={centerMinOf(level)}
            aria-valuemax={centerMaxOf(level)}
            aria-valuenow={center}
            aria-valuetext={`${formatPan(low)} to ${formatPan(high)}`}
            aria-disabled={isChecked}
            className={shared.selector}
            data-result={result}
            style={{ left: percent(lowPosition), width: percent(highPosition - lowPosition) }}
            onKeyDown={onSelectorKeyDown}
          />
          {isChecked && (
            <div
              data-testid="target-marker"
              className={shared.marker}
              style={{ left: percent(toPosition(target)) }}
            />
          )}
        </div>
        <div className={shared.boundLabels} aria-hidden="true">
          <span className={shared.lowLabel} style={{ right: percent(1 - lowPosition) }}>
            {formatPan(low)}
          </span>
          <span className={shared.highLabel} style={{ left: percent(highPosition) }}>
            {formatPan(high)}
          </span>
          {isChecked && (
            <span className={shared.markerLabel} style={{ left: percent(toPosition(target)) }}>
              {formatPan(target)}
            </span>
          )}
        </div>
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
          {result === 'hit' && `You guessed right! The sound was panned ${formatPan(target)}.`}
          {result === 'miss' && `Missed! The sound was panned ${formatPan(target)}.`}
        </p>
      </div>
    </div>
  )
}
