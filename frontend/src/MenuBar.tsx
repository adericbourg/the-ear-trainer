import { useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { Link, NavLink } from 'react-router'
import type { Category, Exercise } from './exercises'
import styles from './MenuBar.module.css'

type Props = { categories: Category[]; exercises: Exercise[] }

export default function MenuBar({ categories, exercises }: Props) {
  const [isBurgerOpen, setIsBurgerOpen] = useState(false)
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null)

  const closeAll = () => {
    setIsBurgerOpen(false)
    setOpenCategoryId(null)
  }

  const visibleCategories = categories
    .map((category) => ({ category, items: exercises.filter((e) => e.categoryId === category.id) }))
    .filter(({ items }) => items.length > 0)

  return (
    <header className={styles.bar}>
      <Link to="/" className={styles.title} onClick={closeAll}>
        The Ear Trainer
      </Link>
      <nav aria-label="Exercises" className={styles.nav}>
        <button
          type="button"
          className={styles.burger}
          aria-expanded={isBurgerOpen}
          aria-controls="menu-categories"
          onClick={() => setIsBurgerOpen(!isBurgerOpen)}
        >
          Menu
        </button>
        <ul id="menu-categories" className={styles.categories} data-open={isBurgerOpen}>
          {visibleCategories.map(({ category, items }) => {
            const isOpen = openCategoryId === category.id
            const submenuId = `submenu-${category.id}`
            // Hover only for real mouse pointers: on touch, the synthetic enter would open the submenu right before the click toggles it closed.
            const onHover = (open: boolean) => (event: PointerEvent) => {
              if (event.pointerType === 'mouse') setOpenCategoryId(open ? category.id : null)
            }
            const onKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
              if (event.key === 'Escape' && isOpen) {
                setOpenCategoryId(null)
                event.currentTarget.querySelector('button')?.focus()
              }
            }
            const onBlur = (event: FocusEvent<HTMLLIElement>) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setOpenCategoryId(null)
            }
            return (
              <li
                key={category.id}
                className={styles.category}
                onPointerEnter={onHover(true)}
                onPointerLeave={onHover(false)}
                onKeyDown={onKeyDown}
                onBlur={onBlur}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={submenuId}
                  onClick={() => setOpenCategoryId(isOpen ? null : category.id)}
                >
                  {category.name}
                </button>
                {isOpen && (
                  <ul id={submenuId} className={styles.submenu}>
                    {items.map((exercise) => (
                      <li key={exercise.id}>
                        <NavLink to={`/${category.id}/${exercise.id}`} onClick={closeAll}>
                          {exercise.name}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}
