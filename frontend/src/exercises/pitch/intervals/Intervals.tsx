import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { isExpert, isHarmonic, randomQuestion, simpleOf, stopName, stopsOf, targetName, toFrequency } from './interval'
import { answerIndexOf, ANSWER_KEYS } from '../../answerKeys'
import type { ExerciseProps } from '../../Series'
import shared from '../../exercise.module.css'
import styles from './Intervals.module.css'
import { playInterval, stopInterval } from '../../../tone'

const OCTAVE_LABELS = ['+0', '+1 octave', '+2 octaves']

export default function Intervals({ level, isLastQuestion, isAutoPlay, onCheck, onNext }: ExerciseProps) {
  const [question, setQuestion] = useState(() => randomQuestion(level))
  const [pickedStop, setPickedStop] = useState<number>()
  const [octaves, setOctaves] = useState(0)
  const [hasPlayed, setHasPlayed] = useState(isAutoPlay)
  const answersRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const isChecked = pickedStop !== undefined

  const play = () => {
    playInterval(question.notes.map(toFrequency), isHarmonic(level))
    setHasPlayed(true)
  }

  const answer = (stop: number) => {
    if (!hasPlayed || isChecked) return
    onCheck({ label: targetName(question.semitones), isHit: stop + 12 * octaves === question.semitones })
    flushSync(() => setPickedStop(stop))
    nextRef.current?.focus()
  }

  const reset = () => {
    stopInterval()
    const newQuestion = randomQuestion(level, question.semitones)
    setQuestion(newQuestion)
    setPickedStop(undefined)
    setOctaves(0)
    setHasPlayed(isAutoPlay)
    if (isAutoPlay) playInterval(newQuestion.notes.map(toFrequency), isHarmonic(level))
  }

  const focusFirstAnswer = () => answersRef.current?.querySelector('button')?.focus()

  const next = () => {
    onNext()
    if (isLastQuestion) return
    flushSync(reset)
    focusFirstAnswer()
  }

  // Space plays, except on buttons and links where it keeps its native activation.
  // Answers are the exception: focus starts on them, so Space there would submit instead of play. Enter still answers.
  // Digit keys answer by position.
  const onDocumentKeyDown = useEffectEvent((event: globalThis.KeyboardEvent) => {
    const choice = stopsOf(level)[answerIndexOf(event)]
    if (choice !== undefined) {
      event.preventDefault()
      answer(choice)
      return
    }
    if (event.code === 'KeyO' && isExpert(level) && !isChecked) {
      setOctaves((octaves + 1) % OCTAVE_LABELS.length)
      return
    }
    if (event.key !== ' ' || event.repeat) return
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest('button, a') && !answersRef.current?.contains(target)) return
    event.preventDefault()
    play()
  })

  useEffect(() => {
    document.addEventListener('keydown', onDocumentKeyDown)
    return () => document.removeEventListener('keydown', onDocumentKeyDown)
  }, [])

  useEffect(() => stopInterval, [])

  // Next plays from reset; the first question plays on mount.
  const autoPlay = useEffectEvent(() => {
    if (isAutoPlay) playInterval(question.notes.map(toFrequency), isHarmonic(level))
  })

  useEffect(() => autoPlay(), [])

  useEffect(focusFirstAnswer, [])

  const result = isChecked ? (pickedStop + 12 * octaves === question.semitones ? 'hit' : 'miss') : undefined
  // The picked answer shows the result; on a miss, the right one is shown as a hit.
  const resultOf = (stop: number) => (stop === pickedStop ? result : isChecked && stop === simpleOf(question.semitones) ? 'hit' : undefined)

  return (
    <div className={shared.exercise}>
      <p className={shared.instructions}>
        Click Play to hear the interval.
        <br />
        {isExpert(level) && (
          <>
            Pick the octave first (or press O) if the interval is wider than an octave.
            <br />
          </>
        )}
        Then click the interval you hear, or press its key.
      </p>

      <button type="button" className={shared.button} aria-keyshortcuts="Space" onClick={play}>
        <svg className={shared.icon} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 2l10 6-10 6z" />
        </svg>
        Play
      </button>

      {isExpert(level) && (
        <div role="group" aria-label="Octaves" className={shared.group}>
          {OCTAVE_LABELS.map((label, i) => (
            <button
              key={label}
              type="button"
              className={`${shared.button} ${styles.toggle}`}
              aria-pressed={octaves === i}
              aria-keyshortcuts="O"
              disabled={isChecked}
              onClick={() => setOctaves(i)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div ref={answersRef} role="group" aria-label="Interval" className={shared.group}>
        {stopsOf(level).map((stop, i) => (
          <button
            key={stop}
            type="button"
            className={shared.button}
            aria-disabled={!hasPlayed || isChecked}
            aria-keyshortcuts={ANSWER_KEYS[i]}
            data-result={resultOf(stop)}
            onClick={() => answer(stop)}
          >
            <kbd className={shared.key} aria-hidden="true">
              {ANSWER_KEYS[i]}
            </kbd>
            {stopName(stop)}
          </button>
        ))}
      </div>

      <div className={shared.result}>
        {isChecked && (
          <button ref={nextRef} type="button" className={shared.button} data-result={result} onClick={next}>
            {isLastQuestion ? 'See score' : 'Next'}
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
