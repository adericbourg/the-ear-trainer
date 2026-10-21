import {
  ARROW_STEP,
  bounds,
  centerMaxOf,
  centerMinOf,
  F_MAX,
  F_MIN,
  halfSpanOf,
  INITIAL_CENTER,
  nudge,
  PAGE_STEP,
  randomTarget,
  toFrequency,
  toPosition,
} from './frequency'
import RangeExercise from '../../RangeExercise'
import type { ExerciseProps } from '../../Series'
import { startTone } from '../../../tone'

export default function FrequencyIdentification(props: ExerciseProps) {
  const { level } = props
  return (
    <RangeExercise
      {...props}
      instructions={
        <>
          Click Play to hear a sound of a given frequency.
          <br />
          Then slide the box to what you think is the frequency of that sound.
          <br />
          When you are sure of yourself, click Check.
        </>
      }
      sliderLabel="Frequency guess"
      endLabels={[`${F_MIN}Hz`, `${F_MAX}Hz`]}
      start={startTone}
      randomTarget={randomTarget}
      valueOf={(frequency) => frequency}
      initialCenter={INITIAL_CENTER}
      centerMin={centerMinOf(level)}
      centerMax={centerMaxOf(level)}
      bounds={(center) => bounds(level, center)}
      // Drawn at the exact edges: the displayed bounds are rounded.
      edgesOf={(center) => ({ low: center / halfSpanOf(level), high: center * halfSpanOf(level) })}
      toPosition={toPosition}
      fromPosition={toFrequency}
      movesOf={(center) => ({
        ArrowLeft: nudge(level, center, 1 / ARROW_STEP),
        ArrowDown: nudge(level, center, 1 / ARROW_STEP),
        ArrowRight: nudge(level, center, ARROW_STEP),
        ArrowUp: nudge(level, center, ARROW_STEP),
        PageDown: center / PAGE_STEP,
        PageUp: center * PAGE_STEP,
      })}
      format={(frequency) => `${frequency}Hz`}
      valueText={({ low, high }) => `${low} Hz to ${high} Hz`}
      feedbackOf={(target) => `The actual frequency was ${target}Hz.`}
    />
  )
}
