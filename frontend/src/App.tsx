import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router'
import Chords from './exercises/chords/Chords'
import FrequencyIdentification from './exercises/frequency-identification/FrequencyIdentification'
import Intervals from './exercises/intervals/Intervals'
import Panning from './exercises/panning/Panning'
import MenuBar from './MenuBar'
import { categories, ExerciseId, exercises } from './exercises'

const exercisePages = new Map<ExerciseId, () => ReactNode>([
  [ExerciseId('frequency-identification'), () => <FrequencyIdentification />],
  [ExerciseId('intervals'), () => <Intervals />],
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
  return (
    <>
      <h1>{exercise.name}</h1>
      {exercisePages.get(exercise.id)?.()}
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
