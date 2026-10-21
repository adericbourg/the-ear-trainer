import { inversionsOf, randomQuestion, recapLabel, solutionOf } from './inversion'
import { INVERSION_NAMES } from '../chord-types/chord'
import { playNotes } from '../../pitch/intervals/interval'
import ChoiceExercise from '../../ChoiceExercise'
import type { ExerciseProps } from '../../Series'

export default function ChordInversions(props: ExerciseProps) {
  const { level } = props
  return (
    <ChoiceExercise
      {...props}
      instructions={
        <>
          Click Play to hear the chord.
          <br />
          Then click the note it has in the bass, or press its key.
        </>
      }
      groupLabel="Inversion"
      play={playNotes(level)}
      randomQuestion={() => randomQuestion(level)}
      choicesOf={() => inversionsOf(level)}
      nameOf={(label) => label}
      rightChoiceOf={(question) => INVERSION_NAMES[question.inversion]!}
      recapOf={recapLabel}
      feedbackOf={(question) => (
        <>
          It was the {solutionOf(question.inversion)}.
          <br />
          {question.label}
        </>
      )}
      extra={({ chord: { name } }) => level === 'beginner' && <p>It is {/^[aeiou]/.test(name) ? 'an' : 'a'} {name} chord.</p>}
    />
  )
}
