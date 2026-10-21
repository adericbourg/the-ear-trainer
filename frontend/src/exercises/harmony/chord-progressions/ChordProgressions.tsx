import { choicesOf, randomQuestion } from './progression'
import { toFrequency } from '../../pitch/intervals/interval'
import ChoiceExercise from '../../ChoiceExercise'
import type { ExerciseProps } from '../../Series'
import { playChords } from '../../../tone'

export default function ChordProgressions(props: ExerciseProps) {
  const { level } = props
  return (
    <ChoiceExercise
      {...props}
      instructions={
        <>
          Click Play to hear the tonic, which sets the key, then the progression.
          <br />
          Then click the progression, or press its key.
        </>
      }
      groupLabel="Progression"
      play={(question) => playChords(question.chords.map((chord) => chord.map(toFrequency)))}
      // The choices are drawn with the question, so they don't change on re-render.
      randomQuestion={() => {
        const question = randomQuestion(level)
        return { ...question, choices: choicesOf(level, question.progression) }
      }}
      choicesOf={(question) => question.choices}
      nameOf={(progression) => progression.name}
      rightChoiceOf={(question) => question.progression}
      recapOf={(question) => question.progression.name}
      feedbackOf={({ progression: { name, note }, key }) => (
        <>
          It was {name}, in {key}.
          {note && (
            <>
              <br />
              {note}
            </>
          )}
        </>
      )}
    />
  )
}
