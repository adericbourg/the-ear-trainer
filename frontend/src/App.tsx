import type { ComponentType } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router'
import ChordInversions from './exercises/pitch/chord-inversions/ChordInversions'
import ChordTypes from './exercises/pitch/chord-types/ChordTypes'
import FrequencyIdentification from './exercises/sound-engineering/frequency-identification/FrequencyIdentification'
import Intervals from './exercises/pitch/intervals/Intervals'
import Panning from './exercises/sound-engineering/panning/Panning'
import Home from './Home'
import MenuBar from './MenuBar'
import Series, { type ExerciseProps } from './exercises/Series'
import { categories, ExerciseId, exercises } from './exercises'

const exercisePages = new Map<ExerciseId, ComponentType<ExerciseProps>>([
  [ExerciseId('intervals'), Intervals],
  [ExerciseId('chord-types'), ChordTypes],
  [ExerciseId('chord-inversions'), ChordInversions],
  [ExerciseId('frequency-identification'), FrequencyIdentification],
  [ExerciseId('panning'), Panning],
])

function ExercisePage() {
  const { categoryId, exerciseId } = useParams()
  const exercise = exercises.find((e) => e.categoryId === categoryId && e.id === exerciseId)
  const Exercise = exercise && exercisePages.get(exercise.id)
  if (!Exercise) return <Navigate to="/" replace />
  return <Series key={exercise.id} exerciseName={exercise.name} Exercise={Exercise} />
}

function App() {
  return (
    <>
      <MenuBar categories={categories} exercises={exercises} />
      <main>
        <Routes>
          <Route path="/" element={<Home categories={categories} exercises={exercises} />} />
          <Route path="/:categoryId/:exerciseId" element={<ExercisePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}

export default App
