import { useState } from 'react'
import { isExpert, randomQuestion, simpleOf, stopName, stopsOf, targetName, type Question } from './interval'
import ChoiceExercise from '../../ChoiceExercise'
import type { ExerciseProps } from '../../Series'
import shared from '../../exercise.module.css'
import styles from './Intervals.module.css'

const OCTAVE_LABELS = ['+0', '+1 octave', '+2 octaves']

export default function Intervals(props: ExerciseProps) {
  const { level } = props
  const [octaves, setOctaves] = useState(0)

  return (
    <ChoiceExercise
      {...props}
      instructions={
        <>
          Click Play to hear the interval.
          <br />
          {isExpert(level) && (
            <>
              Pick the octave first (or press O) if the interval is wider than an octave.
              <br />
            </>
          )}
          Then click the interval you hear, or press its key.
        </>
      }
      groupLabel="Interval"
      randomQuestion={(previous?: Question) => randomQuestion(level, previous?.semitones)}
      choicesOf={() => stopsOf(level)}
      nameOf={stopName}
      rightChoiceOf={(question) => simpleOf(question.semitones)}
      isHit={(question, stop) => stop + 12 * octaves === question.semitones}
      recapOf={(question) => targetName(question.semitones)}
      feedbackOf={(question) => `It was a ${targetName(question.semitones)}.`}
      extra={(_, isChecked) =>
        isExpert(level) && (
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
        )
      }
      onKeyDown={(event, isChecked) => {
        if (event.code !== 'KeyO' || !isExpert(level) || isChecked) return false
        setOctaves((octaves + 1) % OCTAVE_LABELS.length)
        return true
      }}
      onReset={() => setOctaves(0)}
    />
  )
}
