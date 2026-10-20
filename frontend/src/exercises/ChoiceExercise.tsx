import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { isHarmonic, toFrequency } from './pitch/intervals/interval'
import { answerIndexOf, ANSWER_KEYS } from './answerKeys'
import type { ExerciseProps } from './Series'
import shared from './exercise.module.css'
import { playInterval, stopInterval } from '../tone'

type Props<Q, C> = ExerciseProps & {
  readonly instructions: ReactNode
  readonly groupLabel: string
  readonly randomQuestion: (previous?: Q) => Q
  readonly choicesOf: (question: Q) => readonly C[]
  readonly nameOf: (choice: C) => string
  readonly rightChoiceOf: (question: Q) => C
  readonly isHit?: (question: Q, choice: C) => boolean
  readonly recapOf: (question: Q) => string
  // Follows "You guessed right!" or "Missed!".
  readonly feedbackOf: (question: Q) => ReactNode
  // Rendered between the Play button and the answers.
  readonly extra?: (question: Q, isChecked: boolean) => ReactNode
  // Returns true when it handled the key.
  readonly onKeyDown?: (event: KeyboardEvent, isChecked: boolean) => boolean
  readonly onReset?: () => void
}

// An exercise where a played question (notes are MIDI numbers) is answered by picking one of a few buttons.
export default function ChoiceExercise<Q extends { readonly notes: readonly number[] }, C>({
  level,
  isLastQuestion,
  isAutoPlay,
  onCheck,
  onNext,
  instructions,
  groupLabel,
  randomQuestion,
  choicesOf,
  nameOf,
  rightChoiceOf,
  isHit = (question, choice) => choice === rightChoiceOf(question),
  recapOf,
  feedbackOf,
  extra,
  onKeyDown,
  onReset,
}: Props<Q, C>) {
  const [question, setQuestion] = useState(() => randomQuestion())
  const [picked, setPicked] = useState<C>()
  const [hasPlayed, setHasPlayed] = useState(isAutoPlay)
  const answersRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const isChecked = picked !== undefined
  const choices = choicesOf(question)
  const playQuestion = (played: Q) => playInterval(played.notes.map(toFrequency), isHarmonic(level))

  const play = () => {
    playQuestion(question)
    setHasPlayed(true)
  }

  const answer = (choice: C) => {
    if (!hasPlayed || isChecked) return
    onCheck({ label: recapOf(question), isHit: isHit(question, choice) })
    flushSync(() => setPicked(choice))
    nextRef.current?.focus()
  }

  const reset = () => {
    stopInterval()
    const newQuestion = randomQuestion(question)
    setQuestion(newQuestion)
    setPicked(undefined)
    onReset?.()
    setHasPlayed(isAutoPlay)
    if (isAutoPlay) playQuestion(newQuestion)
  }

  const focusFirstAnswer = () => answersRef.current?.querySelector('button')?.focus()

  const next = () => {
    onNext()
    if (isLastQuestion) return
    flushSync(reset)
    focusFirstAnswer()
  }

  // Digit keys answer by position.
  // Space plays, except on buttons and links where it keeps its native activation.
  // Answers are the exception: focus starts on them, so Space there would submit instead of play. Enter still answers.
  const onDocumentKeyDown = useEffectEvent((event: globalThis.KeyboardEvent) => {
    const index = answerIndexOf(event)
    if (index >= 0 && index < choices.length) {
      event.preventDefault()
      answer(choices[index]!)
      return
    }
    if (onKeyDown?.(event, isChecked)) return
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
    if (isAutoPlay) playQuestion(question)
  })

  useEffect(() => autoPlay(), [])

  useEffect(focusFirstAnswer, [])

  const rightChoice = rightChoiceOf(question)
  const result = isChecked ? (isHit(question, picked) ? 'hit' : 'miss') : undefined
  // The picked answer shows the result; on a miss, the right one is shown as a hit.
  const resultOf = (choice: C) => (choice === picked ? result : isChecked && choice === rightChoice ? 'hit' : undefined)

  return (
    <div className={shared.exercise}>
      <p className={shared.instructions}>{instructions}</p>

      <button type="button" className={shared.button} aria-keyshortcuts="Space" onClick={play}>
        <svg className={shared.icon} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 2l10 6-10 6z" />
        </svg>
        Play
      </button>

      {extra?.(question, isChecked)}

      <div ref={answersRef} role="group" aria-label={groupLabel} className={shared.group}>
        {choices.map((choice, i) => (
          <button
            key={nameOf(choice)}
            type="button"
            className={shared.button}
            aria-disabled={!hasPlayed || isChecked}
            aria-keyshortcuts={ANSWER_KEYS[i]}
            data-result={resultOf(choice)}
            onClick={() => answer(choice)}
          >
            <kbd className={shared.key} aria-hidden="true">
              {ANSWER_KEYS[i]}
            </kbd>
            {nameOf(choice)}
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
          {result && (
            <>
              {result === 'hit' ? 'You guessed right!' : 'Missed!'} {feedbackOf(question)}
            </>
          )}
        </p>
      </div>
    </div>
  )
}
