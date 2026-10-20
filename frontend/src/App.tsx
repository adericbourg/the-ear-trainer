import { Navigate, Route, Routes, useParams } from 'react-router'
import Home from './Home'
import MenuBar from './MenuBar'
import Series from './exercises/Series'
import { categories, exercises } from './exercises'

function ExercisePage() {
  const { categoryId, exerciseId } = useParams()
  const exercise = exercises.find((e) => e.categoryId === categoryId && e.id === exerciseId)
  if (!exercise) return <Navigate to="/" replace />
  return <Series key={exercise.id} exerciseName={exercise.name} Exercise={exercise.component} />
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
