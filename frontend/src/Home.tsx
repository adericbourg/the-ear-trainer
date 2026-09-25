import { Link } from 'react-router'
import type { Category, Exercise } from './exercises'
import styles from './Home.module.css'

type Props = { categories: readonly Category[]; exercises: readonly Exercise[] }

export default function Home({ categories, exercises }: Props) {
  const visibleCategories = categories
    .map((category) => ({ category, items: exercises.filter((e) => e.categoryId === category.id) }))
    .filter(({ items }) => items.length > 0)

  return (
    <>
      <h1>The Ear Trainer</h1>
      {visibleCategories.map(({ category, items }) => (
        <section key={category.id} aria-labelledby={`category-${category.id}`}>
          <h2 id={`category-${category.id}`}>{category.name}</h2>
          <ul className={styles.cards}>
            {items.map((exercise) => (
              <li key={exercise.id} className={styles.card}>
                <h3>{exercise.name}</h3>
                <p>{exercise.description}</p>
                <Link
                  to={`/${category.id}/${exercise.id}`}
                  className={styles.play}
                  aria-label={`Play ${exercise.name}`}
                >
                  Play!
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
