import { ARROW_STEP, bounds, centerMaxOf, centerMinOf, clampCenter, formatPan, INITIAL_CENTER, isHit, PAGE_STEP, randomTarget, toPan, toPosition } from './pan'
import RangeExercise from '../../RangeExercise'
import type { ExerciseProps } from '../../Series'
import { startNoise } from '../../../tone'

export default function Panning(props: ExerciseProps) {
  const { level } = props
  return (
    <RangeExercise
      {...props}
      instructions={
        <>
          Put on headphones: with speakers, both ears hear both channels and the room blurs the position.
          <br />
          Click Play to hear a sound somewhere between left and right.
          <br />
          Then slide the box to where you hear it.
          <br />
          When you are sure of yourself, click Check.
        </>
      }
      sliderLabel="Pan guess"
      endLabels={['L', 'C', 'R']}
      start={startNoise}
      randomTarget={randomTarget}
      initialCenter={INITIAL_CENTER}
      centerMin={centerMinOf(level)}
      centerMax={centerMaxOf(level)}
      clamp={(center) => clampCenter(level, center)}
      bounds={(center) => bounds(level, center)}
      isHit={(target, center) => isHit(level, target, center)}
      toPosition={toPosition}
      fromPosition={toPan}
      movesOf={(center) => ({
        ArrowLeft: center - ARROW_STEP,
        ArrowDown: center - ARROW_STEP,
        ArrowRight: center + ARROW_STEP,
        ArrowUp: center + ARROW_STEP,
        PageDown: center - PAGE_STEP,
        PageUp: center + PAGE_STEP,
      })}
      format={formatPan}
      valueText={({ low, high }) => `${formatPan(low)} to ${formatPan(high)}`}
      feedbackOf={(target) => `The sound was panned ${formatPan(target)}.`}
    />
  )
}
