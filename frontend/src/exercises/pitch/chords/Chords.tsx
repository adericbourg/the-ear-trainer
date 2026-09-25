import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent } from 'react'
import { flushSync } from 'react-dom'
import { isExpert, isHarmonic, toFrequency } from '../intervals/interval'
import {
  extensionsOf,
  feedback,
  INVERSIONS,
  inversionCountOf,
  randomQuestion,
  targetLabel,
  triadsOf,
  type Extension,
  type Triad,
} from './chord'
import type { ExerciseProps } from '../../Series'
import shared from '../../exercise.module.css'
import { playInterval, stopInterval } from '../../../tone'

type ChoicesProps<T extends string | number> = {
  legend: string
  name: string
  options: readonly { value: T; label: string; isDisabled?: boolean }[]
  value: T | undefined
  onChange: (value: T) => void
  isDisabled?: boolean
}

// Radio group: Tab reaches the checked option, arrow keys move within the group.
function Choices<T extends string | number>({ legend, name, options, value, onChange, isDisabled = false }: ChoicesProps<T>) {
  return (
    <fieldset className={shared.choices} disabled={isDisabled}>
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className={shared.choice}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            disabled={option.isDisabled ?? false}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  )
}

export default function Chords({ level, isLastQuestion, isAutoPlay, onCheck, onNext }: ExerciseProps) {
  const [question, setQuestion] = useState(() => randomQuestion(level))
  const [triad, setTriad] = useState<Triad>()
  const [extension, setExtension] = useState<Extension>('none')
  const [inversion, setInversion] = useState(0)
  const [hasPlayed, setHasPlayed] = useState(isAutoPlay)
  const [isChecked, setIsChecked] = useState(false)
  const answersRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const extensions = extensionsOf(level)
  const inversionCount = inversionCountOf(triad, extension)
  // When the triad is the whole answer, clicking it submits: no Check button.
  const isOneClick = extensions.length === 1 && !isExpert(level)

  const play = () => {
    playInterval(question.notes.map(toFrequency), isHarmonic(level))
    setHasPlayed(true)
  }

  const check = (answeredTriad: Triad) => {
    onCheck({ label: targetLabel(level, question), isHit: feedback(level, question, { triad: answeredTriad, extension, inversion }).isHit })
    flushSync(() => {
      setTriad(answeredTriad)
      setIsChecked(true)
    })
    nextRef.current?.focus()
  }

  const reset = () => {
    stopInterval()
    const newQuestion = randomQuestion(level)
    setQuestion(newQuestion)
    setTriad(undefined)
    setExtension('none')
    setInversion(0)
    setHasPlayed(isAutoPlay)
    setIsChecked(false)
    if (isAutoPlay) playInterval(newQuestion.notes.map(toFrequency), isHarmonic(level))
  }

  const focusFirstAnswer = () => answersRef.current?.querySelector<HTMLElement>('input, button')?.focus()

  const next = () => {
    onNext()
    if (isLastQuestion) return
    flushSync(reset)
    focusFirstAnswer()
  }

  // Falls back to root position when the picked inversion doesn't exist for the new chord.
  const changeChord = (newTriad: Triad | undefined, newExtension: Extension) => {
    setTriad(newTriad)
    setExtension(newExtension)
    setInversion((current) => (current < inversionCountOf(newTriad, newExtension) ? current : 0))
  }

  // Space plays, except on buttons and links where it keeps its native activation.
  // Triad buttons are the exception: focus starts on them, so Space there would submit instead of play. Enter still answers.
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

  const isCheckable = hasPlayed && triad !== undefined

  const onAnswerKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && isCheckable && !isChecked) check(triad)
  }

  const result = isChecked && triad ? feedback(level, question, { triad, extension, inversion }) : undefined
  // The picked triad shows the result; on a miss, the right one is shown as a hit.
  const resultOf = (value: Triad) => (!isChecked ? undefined : value === question.chord.triad ? 'hit' : value === triad ? 'miss' : undefined)

  return (
    <div className={shared.exercise}>
      <p className={shared.instructions}>
        Click Play to hear the chord.
        <br />
        Then {isOneClick ? 'click' : 'pick'} its triad{extensions.length > 1 && ', extension'}
        {isExpert(level) && ' and inversion'}.
        {!isOneClick && (
          <>
            <br />
            When you are sure of yourself, click Check.
          </>
        )}
      </p>

      <button type="button" className={shared.button} aria-keyshortcuts="Space" onClick={play}>
        <svg className={shared.icon} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 2l10 6-10 6z" />
        </svg>
        Play
      </button>

      <div ref={answersRef} className={shared.exercise} onKeyDown={onAnswerKeyDown}>
        {isOneClick ? (
          <div role="group" aria-label="Triad" className={shared.group}>
            {triadsOf(level).map((value) => (
              <button
                key={value}
                type="button"
                className={shared.button}
                aria-disabled={!hasPlayed || isChecked}
                data-result={resultOf(value)}
                onClick={() => hasPlayed && !isChecked && check(value)}
              >
                {value}
              </button>
            ))}
          </div>
        ) : (
          <Choices
            legend="Triad"
            name="triad"
            options={triadsOf(level).map((value) => ({ value, label: value }))}
            value={triad}
            onChange={(value) => changeChord(value, extension)}
            isDisabled={isChecked}
          />
        )}
        {extensions.length > 1 && (
          <Choices
            legend="Extension"
            name="extension"
            options={extensions.map((value) => ({ value, label: value }))}
            value={extension}
            onChange={(value) => changeChord(triad, value)}
            isDisabled={isChecked}
          />
        )}
        {isExpert(level) && (
          <Choices
            legend="Inversion"
            name="inversion"
            options={INVERSIONS.map((label, value) => ({ value, label, isDisabled: value >= inversionCount }))}
            value={inversion}
            onChange={setInversion}
            isDisabled={isChecked || inversionCount === 1}
          />
        )}
      </div>

      <div className={shared.result}>
        {isChecked ? (
          <button ref={nextRef} type="button" className={shared.button} data-result={result?.isHit ? 'hit' : 'miss'} onClick={next}>
            {isLastQuestion ? 'See score' : 'Next'}
          </button>
        ) : (
          !isOneClick && (
            <button type="button" className={shared.button} disabled={!isCheckable} onClick={() => check(triad!)}>
              Check
            </button>
          )
        )}
        <p aria-live="polite">
          {result && (
            <>
              {result.text}
              <br />
              {question.label}
            </>
          )}
        </p>
      </div>
    </div>
  )
}
