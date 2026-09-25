import { useId, useRef, useState, type ComponentType } from 'react'
import { flushSync } from 'react-dom'
import { LEVELS, type Level } from './pitch/intervals/interval'
import { hitsOf, SERIES_LENGTH, type Answer } from './scoring'
import shared from './exercise.module.css'

export type ExerciseProps = {
  readonly level: Level
  readonly isLastQuestion: boolean
  // Plays each new question without waiting for the Play button.
  readonly isAutoPlay: boolean
  readonly onCheck: (answer: Answer) => void
  readonly onNext: () => void
}

type Props = { readonly exerciseName: string; readonly Exercise: ComponentType<ExerciseProps> }
type Phase = 'setup' | 'practice' | 'series' | 'finished'

const levelName = (level: Level) => LEVELS.find((l) => l.level === level)!.name
const doNothing = () => {}

export default function Series({ exerciseName, Exercise }: Props) {
  const [phase, setPhase] = useState<Phase>('setup')
  const [level, setLevel] = useState<Level>('beginner')
  const [isAutoPlay, setIsAutoPlay] = useState(false)
  const [answers, setAnswers] = useState<readonly Answer[]>([])
  // Moves on Next, not on Check: the feedback of a question shows under its own number.
  const [questionNumber, setQuestionNumber] = useState(1)
  const levelsRef = useRef<HTMLFieldSetElement>(null)
  const resultsRef = useRef<HTMLHeadingElement>(null)
  const scoreId = useId()

  const start = (newPhase: 'practice' | 'series') => {
    setAnswers([])
    setQuestionNumber(1)
    setPhase(newPhase)
  }

  const backToSetup = () => {
    flushSync(() => setPhase('setup'))
    levelsRef.current?.querySelector<HTMLInputElement>('input:checked')?.focus()
  }

  const onNext = () => {
    if (questionNumber < SERIES_LENGTH) {
      setQuestionNumber(questionNumber + 1)
      return
    }
    flushSync(() => setPhase('finished'))
    resultsRef.current?.focus()
  }

  const isSeries = phase === 'series'
  const isScored = isSeries || phase === 'finished'
  const hits = hitsOf(answers)

  return (
    <>
      <div className={shared.titleRow}>
        <h1>{exerciseName}</h1>
        {isScored && (
          <p id={scoreId} className={shared.score}>
            Score: {answers.length === 0 ? '–' : `${hits}/${answers.length}`}
          </p>
        )}
      </div>

      {phase === 'setup' && (
        <div className={shared.exercise}>
          <fieldset ref={levelsRef} className={shared.choices}>
            <legend>Level</legend>
            {LEVELS.map(({ level: value, name }) => (
              <label key={value} className={shared.choice}>
                <input type="radio" name="level" value={value} checked={level === value} onChange={() => setLevel(value)} />
                {name}
              </label>
            ))}
          </fieldset>
          <label>
            <input type="checkbox" checked={isAutoPlay} onChange={(event) => setIsAutoPlay(event.target.checked)} /> Auto-play
          </label>
          <div className={shared.result}>
            <button type="button" className={shared.button} onClick={() => start('practice')}>
              Free practice
            </button>
            <button type="button" className={shared.button} onClick={() => start('series')}>
              Scored series
            </button>
          </div>
          <p className={shared.instructions}>A scored series has {SERIES_LENGTH} questions.</p>
        </div>
      )}

      {(phase === 'practice' || phase === 'series') && (
        <div className={shared.exercise}>
          <div className={shared.result}>
            {isSeries && <p>Question {questionNumber} of {SERIES_LENGTH}</p>}
            <p>Level: {levelName(level)}</p>
            <button type="button" className={shared.button} onClick={backToSetup}>
              {isSeries ? 'Abandon series' : 'Stop'}
            </button>
          </div>
          <Exercise
            level={level}
            isLastQuestion={isSeries && questionNumber === SERIES_LENGTH}
            isAutoPlay={isAutoPlay}
            onCheck={isSeries ? (answer) => setAnswers((previous) => [...previous, answer]) : doNothing}
            onNext={isSeries ? onNext : doNothing}
          />
        </div>
      )}

      {phase === 'finished' && (
        <div className={shared.exercise}>
          <h2 ref={resultsRef} tabIndex={-1} aria-describedby={scoreId}>
            Results
          </h2>
          <ol className={shared.recap}>
            {answers.map(({ label, isHit }, i) => (
              <li key={i}>
                <span className={shared.recapIcon} data-result={isHit ? 'hit' : 'miss'} aria-hidden="true">
                  {isHit ? '✓' : '✗'}
                </span>{' '}
                {label} — {isHit ? 'passed' : 'failed'}
              </li>
            ))}
          </ol>
          <button type="button" className={shared.button} onClick={backToSetup}>
            New series
          </button>
        </div>
      )}
    </>
  )
}
