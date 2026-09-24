import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { flushSync } from 'react-dom'
import {
  ARROW_STEP,
  bounds,
  CENTER_MAX,
  CENTER_MIN,
  clampCenter,
  F_MAX,
  F_MIN,
  HALF_SPAN,
  INITIAL_CENTER,
  isHit,
  nudge,
  PAGE_STEP,
  randomTarget,
  toFrequency,
  toPosition,
} from './frequency'
import styles from './FrequencyIdentification.module.css'
import { startTone, stopTone } from './tone'

const percent = (position: number) => `${position * 100}%`

export default function FrequencyIdentification() {
  const [target, setTarget] = useState(randomTarget)
  const [center, setCenter] = useState(INITIAL_CENTER)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasPlayed, setHasPlayed] = useState(false)
  const [isChecked, setIsChecked] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const selectorRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const dragOffset = useRef(0)

  const { low, high } = bounds(center)

  const togglePlayback = () => {
    if (isPlaying) {
      stopTone()
    } else {
      startTone(target)
      setHasPlayed(true)
    }
    setIsPlaying(!isPlaying)
  }

  const check = () => {
    flushSync(() => setIsChecked(true))
    nextRef.current?.focus()
  }

  const next = () => {
    stopTone()
    flushSync(() => {
      setIsPlaying(false)
      setTarget(randomTarget())
      setCenter(INITIAL_CENTER)
      setHasPlayed(false)
      setIsChecked(false)
    })
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

  const onSelectorKeyDown = (event: KeyboardEvent) => {
    if (isChecked) return
    const moves: Record<string, number> = {
      ArrowLeft: nudge(center, 1 / ARROW_STEP),
      ArrowDown: nudge(center, 1 / ARROW_STEP),
      ArrowRight: nudge(center, ARROW_STEP),
      ArrowUp: nudge(center, ARROW_STEP),
      PageDown: center / PAGE_STEP,
      PageUp: center * PAGE_STEP,
      Home: CENTER_MIN,
      End: CENTER_MAX,
    }
    const moved = moves[event.key]
    if (moved !== undefined) {
      event.preventDefault()
      setCenter(clampCenter(moved))
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
    if (!isOnSelector) setCenter(clampCenter(toFrequency(position)))
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onTrackPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    setCenter(clampCenter(toFrequency(positionAt(event.clientX) - dragOffset.current)))
  }

  const lowPosition = toPosition(center / HALF_SPAN)
  const highPosition = toPosition(center * HALF_SPAN)
  const result = isChecked ? (isHit(target, center) ? 'hit' : 'miss') : undefined

  return (
    <div className={styles.exercise}>
      <p className={styles.instructions}>
        Click Play to hear a sound of a given frequency.
        <br />
        Then slide the box to what you think is the frequency of that sound.
        <br />
        When you are sure of yourself, click Check.
      </p>

      <button type="button" className={styles.button} aria-keyshortcuts="Space" onClick={togglePlayback}>
        <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true">
          {isPlaying ? (
            <path d="M4 2h3v12H4zM9 2h3v12H9z" />
          ) : (
            <path d="M4 2l10 6-10 6z" />
          )}
        </svg>
        {isPlaying ? 'Pause' : 'Play'}
      </button>

      <div className={styles.axis}>
        <div className={styles.endLabels} aria-hidden="true">
          <span>{F_MIN}Hz</span>
          <span>{F_MAX}Hz</span>
        </div>
        <div
          ref={trackRef}
          className={styles.track}
          onPointerDown={onTrackPointerDown}
          onPointerMove={onTrackPointerMove}
        >
          <div
            ref={selectorRef}
            role="slider"
            tabIndex={0}
            aria-label="Frequency guess"
            aria-valuemin={Math.round(CENTER_MIN)}
            aria-valuemax={Math.round(CENTER_MAX)}
            aria-valuenow={Math.round(center)}
            aria-valuetext={`${low} Hz to ${high} Hz`}
            aria-disabled={isChecked}
            className={styles.selector}
            data-result={result}
            style={{ left: percent(lowPosition), width: percent(highPosition - lowPosition) }}
            onKeyDown={onSelectorKeyDown}
          />
          {isChecked && (
            <div
              data-testid="target-marker"
              className={styles.marker}
              style={{ left: percent(toPosition(target)) }}
            />
          )}
        </div>
        <div className={styles.boundLabels} aria-hidden="true">
          <span className={styles.lowLabel} style={{ right: percent(1 - lowPosition) }}>
            {low}Hz
          </span>
          <span className={styles.highLabel} style={{ left: percent(highPosition) }}>
            {high}Hz
          </span>
          {isChecked && (
            <span className={styles.markerLabel} style={{ left: percent(toPosition(target)) }}>
              {target}Hz
            </span>
          )}
        </div>
      </div>

      <div className={styles.result}>
        {isChecked ? (
          <button ref={nextRef} type="button" className={styles.button} data-result={result} onClick={next}>
            Next
          </button>
        ) : (
          <button type="button" className={styles.button} disabled={!hasPlayed} onClick={check}>
            Check
          </button>
        )}
        <p aria-live="polite">
          {result === 'hit' && `You guessed right! The actual frequency was ${target}Hz.`}
          {result === 'miss' && `Missed! The actual frequency was ${target}Hz.`}
        </p>
      </div>
    </div>
  )
}
