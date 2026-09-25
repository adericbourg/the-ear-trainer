import type { ComponentType, ReactNode } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router'
import Chords from './exercises/pitch/chords/Chords'
import FrequencyIdentification from './exercises/sound-engineering/frequency-identification/FrequencyIdentification'
import Intervals from './exercises/pitch/intervals/Intervals'
import Panning from './exercises/sound-engineering/panning/Panning'
import MenuBar from './MenuBar'
import Series, { type ExerciseProps } from './exercises/Series'
import { categories, ExerciseId, exercises } from './exercises'

const exercisePages = new Map<ExerciseId, ComponentType<ExerciseProps>>([[ExerciseId('intervals'), Intervals]])

// ponytail: temporary, until every exercise goes through Series.
const legacyPages = new Map<ExerciseId, () => ReactNode>([
  [ExerciseId('frequency-identification'), () => <FrequencyIdentification />],
  [ExerciseId('chords'), () => <Chords />],
  [ExerciseId('panning'), () => <Panning />],
])

function Home() {
  return <h1>Welcome</h1>
}

function ExercisePage() {
  const { categoryId, exerciseId } = useParams()
  const exercise = exercises.find((e) => e.categoryId === categoryId && e.id === exerciseId)
  if (!exercise) return <Navigate to="/" replace />
  const Exercise = exercisePages.get(exercise.id)
  if (Exercise) return <Series key={exercise.id} exerciseName={exercise.name} Exercise={Exercise} />
  return (
    <>
      <h1>{exercise.name}</h1>
      {legacyPages.get(exercise.id)?.()}
    </>
  )
}

function App() {
  return (
    <>
      <MenuBar categories={categories} exercises={exercises} />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/:categoryId/:exerciseId" element={<ExercisePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}

export default App
