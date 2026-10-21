import { choicesOf, randomQuestion, targetLabel } from './chord'
import ChoiceExercise from '../../ChoiceExercise'
import type { ExerciseProps } from '../../Series'

export default function ChordTypes(props: ExerciseProps) {
  const { level } = props
  return (
    <ChoiceExercise
      {...props}
      instructions={
        <>
          Click Play to hear the chord.
          <br />
          Then click its type, or press its key.
        </>
      }
      groupLabel="Chord type"
      // The choices are drawn with the question, so they don't change on re-render.
      randomQuestion={() => {
        const question = randomQuestion(level)
        return { ...question, choices: choicesOf(level, question.chord) }
      }}
      choicesOf={(question) => question.choices}
      nameOf={(chord) => chord.name}
      rightChoiceOf={(question) => question.chord}
      recapOf={(question) => targetLabel(level, question)}
      feedbackOf={(question) => (
        <>
          It was {/^[aeiou]/.test(question.chord.name) ? 'an' : 'a'} {targetLabel(level, question)}.
          <br />
          {question.label}
        </>
      )}
    />
  )
}
