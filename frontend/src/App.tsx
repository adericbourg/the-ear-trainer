import { Navigate, Route, Routes, useParams } from 'react-router'
import MenuBar from './MenuBar'
import { categories, exercises } from './exercises'

function Home() {
  return <h1>Welcome</h1>
}

function ExercisePage() {
  const { categoryId, exerciseId } = useParams()
  const exercise = exercises.find((e) => e.categoryId === categoryId && e.id === exerciseId)
  if (!exercise) return <Navigate to="/" replace />
  return <h1>{exercise.name}</h1>
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
