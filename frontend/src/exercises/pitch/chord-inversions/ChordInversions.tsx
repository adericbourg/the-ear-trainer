import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { isHarmonic, toFrequency } from '../intervals/interval'
import { inversionsOf, randomQuestion, recapLabel, solutionOf } from './inversion'
import type { ExerciseProps } from '../../Series'
import shared from '../../exercise.module.css'
import { playInterval, stopInterval } from '../../../tone'

export default function ChordInversions({ level, isLastQuestion, isAutoPlay, onCheck, onNext }: ExerciseProps) {
  const [question, setQuestion] = useState(() => randomQuestion(level))
  const [pickedInversion, setPickedInversion] = useState<number>()
  const [hasPlayed, setHasPlayed] = useState(isAutoPlay)
  const answersRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const isChecked = pickedInversion !== undefined

  const play = () => {
    playInterval(question.notes.map(toFrequency), isHarmonic(level))
    setHasPlayed(true)
  }

  const answer = (inversion: number) => {
    if (!hasPlayed || isChecked) return
    onCheck({ label: recapLabel(question), isHit: inversion === question.inversion })
    flushSync(() => setPickedInversion(inversion))
    nextRef.current?.focus()
  }

  const reset = () => {
    stopInterval()
    const newQuestion = randomQuestion(level)
    setQuestion(newQuestion)
    setPickedInversion(undefined)
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
  const onDocumentKeyDown = useEffectEvent((event: globalThis.KeyboardEvent) => {
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

  const result = isChecked ? (pickedInversion === question.inversion ? 'hit' : 'miss') : undefined
  // The picked answer shows the result; on a miss, the right one is shown as a hit.
  const resultOf = (inversion: number) =>
    inversion === pickedInversion ? result : isChecked && inversion === question.inversion ? 'hit' : undefined
  const { name } = question.chord

  return (
    <div className={shared.exercise}>
      <p className={shared.instructions}>
        Click Play to hear the chord.
        <br />
        Then click the note it has in the bass.
      </p>

      <button type="button" className={shared.button} aria-keyshortcuts="Space" onClick={play}>
        <svg className={shared.icon} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 2l10 6-10 6z" />
        </svg>
        Play
      </button>

      {level === 'beginner' && <p>It is {/^[aeiou]/.test(name) ? 'an' : 'a'} {name} chord.</p>}

      <div ref={answersRef} role="group" aria-label="Inversion" className={shared.group}>
        {inversionsOf(level).map((label, inversion) => (
          <button
            key={label}
            type="button"
            className={shared.button}
            aria-disabled={!hasPlayed || isChecked}
            data-result={resultOf(inversion)}
            onClick={() => answer(inversion)}
          >
            {label}
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
              {result === 'hit' ? 'You guessed right!' : 'Missed!'} It was the {solutionOf(question.inversion)}.
              <br />
              {question.label}
            </>
          )}
        </p>
      </div>
    </div>
  )
}
