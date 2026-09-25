import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { isHarmonic, toFrequency, type Level } from '../intervals/interval'
import { choicesOf, randomQuestion, targetLabel, type Chord } from './chord'
import { answerIndexOf, ANSWER_KEYS } from '../../answerKeys'
import type { ExerciseProps } from '../../Series'
import shared from '../../exercise.module.css'
import { playInterval, stopInterval } from '../../../tone'

// The choices are drawn with the question, so they don't change on re-render.
const randomRound = (level: Level) => {
  const question = randomQuestion(level)
  return { question, choices: choicesOf(level, question.chord) }
}

export default function ChordTypes({ level, isLastQuestion, isAutoPlay, onCheck, onNext }: ExerciseProps) {
  const [{ question, choices }, setRound] = useState(() => randomRound(level))
  const [pickedChord, setPickedChord] = useState<Chord>()
  const [hasPlayed, setHasPlayed] = useState(isAutoPlay)
  const answersRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const isChecked = pickedChord !== undefined

  const play = () => {
    playInterval(question.notes.map(toFrequency), isHarmonic(level))
    setHasPlayed(true)
  }

  const answer = (chord: Chord) => {
    if (!hasPlayed || isChecked) return
    onCheck({ label: targetLabel(level, question), isHit: chord === question.chord })
    flushSync(() => setPickedChord(chord))
    nextRef.current?.focus()
  }

  const reset = () => {
    stopInterval()
    const newRound = randomRound(level)
    setRound(newRound)
    setPickedChord(undefined)
    setHasPlayed(isAutoPlay)
    if (isAutoPlay) playInterval(newRound.question.notes.map(toFrequency), isHarmonic(level))
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
    const choice = choices[answerIndexOf(event)]
    if (choice !== undefined) {
      event.preventDefault()
      answer(choice)
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

  const result = isChecked ? (pickedChord === question.chord ? 'hit' : 'miss') : undefined
  // The picked answer shows the result; on a miss, the right one is shown as a hit.
  const resultOf = (chord: Chord) => (chord === pickedChord ? result : isChecked && chord === question.chord ? 'hit' : undefined)
  const article = /^[aeiou]/.test(question.chord.name) ? 'an' : 'a'

  return (
    <div className={shared.exercise}>
      <p className={shared.instructions}>
        Click Play to hear the chord.
        <br />
        Then click its type, or press its key.
      </p>

      <button type="button" className={shared.button} aria-keyshortcuts="Space" onClick={play}>
        <svg className={shared.icon} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 2l10 6-10 6z" />
        </svg>
        Play
      </button>

      <div ref={answersRef} role="group" aria-label="Chord type" className={shared.group}>
        {choices.map((chord, i) => (
          <button
            key={chord.name}
            type="button"
            className={shared.button}
            aria-disabled={!hasPlayed || isChecked}
            aria-keyshortcuts={ANSWER_KEYS[i]}
            data-result={resultOf(chord)}
            onClick={() => answer(chord)}
          >
            <kbd className={shared.key} aria-hidden="true">
              {ANSWER_KEYS[i]}
            </kbd>
            {chord.name}
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
              {result === 'hit' ? 'You guessed right!' : 'Missed!'} It was {article} {targetLabel(level, question)}.
              <br />
              {question.label}
            </>
          )}
        </p>
      </div>
    </div>
  )
}
