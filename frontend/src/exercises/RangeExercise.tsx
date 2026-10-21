import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import type { ExerciseProps } from './Series'
import shared from './exercise.module.css'
import { useSpaceToggle } from './useDocumentKeyDown'
import { stopTone } from '../tone'

type Bounds = { readonly low: number; readonly high: number }

type Props<T> = ExerciseProps & {
  readonly instructions: ReactNode
  readonly sliderLabel: string
  readonly endLabels: readonly string[]
  readonly start: (target: T) => void
  readonly randomTarget: () => T
  // Where the target sits on the scale.
  readonly valueOf: (target: T) => number
  readonly initialCenter: number
  readonly centerMin: number
  readonly centerMax: number
  readonly bounds: (center: number) => Bounds
  // Where the box is drawn, when it differs from the displayed bounds.
  readonly edgesOf?: (center: number) => Bounds
  readonly toPosition: (value: number) => number
  readonly fromPosition: (position: number) => number
  // Arrow and Page keys.
  readonly movesOf: (center: number) => Record<string, number>
  readonly format: (value: number) => string
  readonly valueText: (bounds: Bounds) => string
  // Follows "You guessed right!" or "Missed!".
  readonly feedbackOf: (target: T) => string
}

const percent = (position: number) => `${position * 100}%`

// An exercise where a played target is located by sliding a box over a scale.
export default function RangeExercise<T>({
  isLastQuestion,
  isAutoPlay,
  onCheck,
  onNext,
  instructions,
  sliderLabel,
  endLabels,
  start,
  randomTarget,
  valueOf,
  initialCenter,
  centerMin,
  centerMax,
  bounds,
  edgesOf = bounds,
  toPosition,
  fromPosition,
  movesOf,
  format,
  valueText,
  feedbackOf,
}: Props<T>) {
  const [target, setTarget] = useState(randomTarget)
  const [center, setCenter] = useState(initialCenter)
  const [isPlaying, setIsPlaying] = useState(isAutoPlay)
  const [hasPlayed, setHasPlayed] = useState(isAutoPlay)
  const [isChecked, setIsChecked] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const selectorRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const dragOffset = useRef(0)

  const { low, high } = bounds(center)
  const value = valueOf(target)
  const isHit = low <= value && value <= high
  const clamp = (value: number) => Math.min(Math.max(value, centerMin), centerMax)

  const togglePlayback = () => {
    if (isPlaying) {
      stopTone()
    } else {
      start(target)
      setHasPlayed(true)
    }
    setIsPlaying(!isPlaying)
  }

  const check = () => {
    onCheck({ label: format(value), isHit })
    flushSync(() => setIsChecked(true))
    nextRef.current?.focus()
  }

  const reset = () => {
    stopTone()
    setIsPlaying(isAutoPlay)
    const newTarget = randomTarget()
    setTarget(newTarget)
    setCenter(initialCenter)
    setHasPlayed(isAutoPlay)
    setIsChecked(false)
    if (isAutoPlay) start(newTarget)
  }

  const next = () => {
    onNext()
    if (isLastQuestion) return
    flushSync(reset)
    selectorRef.current?.focus()
  }

  useSpaceToggle(togglePlayback)

  useEffect(() => stopTone, [])

  // Next plays from reset; the first question plays on mount.
  const autoPlay = useEffectEvent(() => {
    if (isAutoPlay) start(target)
  })

  useEffect(() => autoPlay(), [])

  useEffect(() => selectorRef.current?.focus(), [])

  const onSelectorKeyDown = (event: KeyboardEvent) => {
    if (isChecked) return
    const moved = { ...movesOf(center), Home: centerMin, End: centerMax }[event.key]
    if (moved !== undefined) {
      event.preventDefault()
      setCenter(clamp(moved))
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
    if (!isOnSelector) setCenter(clamp(fromPosition(position)))
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onTrackPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    setCenter(clamp(fromPosition(positionAt(event.clientX) - dragOffset.current)))
  }

  const edges = edgesOf(center)
  const lowPosition = toPosition(edges.low)
  const highPosition = toPosition(edges.high)
  const result = isChecked ? (isHit ? 'hit' : 'miss') : undefined

  return (
    <div className={shared.exercise}>
      <p className={shared.instructions}>{instructions}</p>

      <button type="button" className={shared.button} aria-keyshortcuts="Space" onClick={togglePlayback}>
        <svg className={shared.icon} viewBox="0 0 16 16" aria-hidden="true">
          {isPlaying ? <path d="M4 2h3v12H4zM9 2h3v12H9z" /> : <path d="M4 2l10 6-10 6z" />}
        </svg>
        {isPlaying ? 'Pause' : 'Play'}
      </button>

      <div className={shared.axis}>
        <div className={shared.endLabels} aria-hidden="true">
          {endLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div ref={trackRef} className={shared.track} onPointerDown={onTrackPointerDown} onPointerMove={onTrackPointerMove}>
          <div
            ref={selectorRef}
            role="slider"
            tabIndex={0}
            aria-label={sliderLabel}
            aria-valuemin={Math.round(centerMin)}
            aria-valuemax={Math.round(centerMax)}
            aria-valuenow={Math.round(center)}
            aria-valuetext={valueText({ low, high })}
            aria-disabled={isChecked}
            className={shared.selector}
            data-result={result}
            style={{ left: percent(lowPosition), width: percent(highPosition - lowPosition) }}
            onKeyDown={onSelectorKeyDown}
          />
          {isChecked && <div data-testid="target-marker" className={shared.marker} style={{ left: percent(toPosition(value)) }} />}
        </div>
        <div className={shared.boundLabels} aria-hidden="true">
          <span className={shared.lowLabel} style={{ right: percent(1 - lowPosition) }}>
            {format(low)}
          </span>
          <span className={shared.highLabel} style={{ left: percent(highPosition) }}>
            {format(high)}
          </span>
          {isChecked && (
            <span className={shared.markerLabel} style={{ left: percent(toPosition(value)) }}>
              {format(value)}
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
          {result === 'hit' && `You guessed right! ${feedbackOf(target)}`}
          {result === 'miss' && `Missed! ${feedbackOf(target)}`}
        </p>
      </div>
    </div>
  )
}
