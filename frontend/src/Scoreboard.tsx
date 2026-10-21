import { useId, useRef, useState, type ChangeEvent } from 'react'
import { exercises } from './exercises'
import { LEVELS } from './exercises/pitch/intervals/interval'
import { SERIES_LENGTH } from './exercises/scoring'
import {
  clearScores,
  highestMastered,
  isStorageAvailable,
  loadScores,
  localDate,
  mergeScores,
  mostPracticed,
  parseScores,
  saveScores,
  streaks,
  type DailyScore,
} from './scores'
import shared from './exercises/exercise.module.css'
import styles from './Scoreboard.module.css'

const exerciseName = (id: DailyScore['exerciseId']) => exercises.find((e) => e.id === id)!.name
const levelName = (level: DailyScore['level']) => LEVELS.find((l) => l.level === level)!.name
const exerciseIndex = (s: DailyScore) => exercises.findIndex((e) => e.id === s.exerciseId)
const levelIndex = (s: DailyScore) => LEVELS.findIndex((l) => l.level === s.level)
const days = (count: number) => `${count} ${count === 1 ? 'day' : 'days'}`
const dayCount = (scores: readonly DailyScore[]) => new Set(scores.map((s) => s.date)).size
const dayFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' })
const formatDay = (date: string) => {
  const [year, month, day] = date.split('-').map(Number)
  return dayFormat.format(new Date(year!, month! - 1, day))
}

export default function Scoreboard() {
  const [scores, setScores] = useState(loadScores)
  const [importError, setImportError] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<readonly DailyScore[] | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const dialogTitleId = useId()
  const [isAvailable] = useState(isStorageAvailable)

  const [today] = useState(() => localDate(new Date()))
  const streak = streaks(scores, today)
  const maybeMostPracticed = mostPracticed(scores, today.slice(0, 7))
  const sorted = scores.toSorted(
    (a, b) => b.date.localeCompare(a.date) || exerciseIndex(a) - exerciseIndex(b) || levelIndex(a) - levelIndex(b),
  )
  const dates = [...new Set(sorted.map((s) => s.date))]

  const clear = () => {
    if (!window.confirm('Delete all your scores from this browser? This cannot be undone.')) return
    clearScores()
    setScores([])
  }

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    let imported: readonly DailyScore[] | undefined
    try {
      imported = parseScores(JSON.parse(await file.text()))
    } catch {
      imported = undefined
    }
    if (!imported) {
      setImportError("This file isn't a scores export.")
      return
    }
    setImportError(null)
    if (scores.length === 0) {
      apply(imported)
      return
    }
    setPendingImport(imported)
    dialogRef.current?.showModal()
  }

  const apply = (newScores: readonly DailyScore[]) => {
    saveScores(newScores)
    setScores(newScores)
    dialogRef.current?.close()
  }

  return (
    <>
      <h1>Scores</h1>
      <p className={styles.notice}>
        Your scores stay in this browser. We don't collect any data: nothing is sent to a server. They're not shared
        between devices or browsers, and they're lost if you clear this site's data. Use Export to keep a copy.
      </p>
      {!isAvailable && <p role="alert">Scores can't be saved in this browser.</p>}

      <div className={shared.result}>
        {scores.length > 0 && (
          <a
            className={`${shared.button} ${styles.export}`}
            href={`data:application/json,${encodeURIComponent(JSON.stringify(scores))}`}
            download={`ear-trainer-scores-${today}.json`}
          >
            Export
          </a>
        )}
        <button type="button" className={shared.button} onClick={() => importRef.current?.click()}>
          Import
        </button>
        <input ref={importRef} type="file" accept="application/json,.json" aria-label="Import scores file" hidden onChange={importFile} />
        {scores.length > 0 && (
          <button type="button" className={shared.button} onClick={clear}>
            Clear my scores
          </button>
        )}
      </div>
      {importError && <p role="alert">{importError}</p>}
      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={dialogTitleId} onClose={() => setPendingImport(null)}>
        {pendingImport && (
          <>
            <h2 id={dialogTitleId}>Import scores</h2>
            <p>
              This file has scores from {days(dayCount(pendingImport))}. You already have scores from{' '}
              {days(dayCount(scores))}.
            </p>
            <div className={shared.result}>
              <button type="button" className={shared.button} onClick={() => apply(mergeScores(scores, pendingImport))}>
                Merge
              </button>
              <button type="button" className={shared.button} onClick={() => apply(pendingImport)}>
                Replace
              </button>
              <button type="button" className={shared.button} onClick={() => dialogRef.current?.close()}>
                Cancel
              </button>
            </div>
          </>
        )}
      </dialog>

      {scores.length === 0 ? (
        <p>No scores yet. Complete a scored series to see it here.</p>
      ) : (
        <>
          <h2>Stats</h2>
          <dl className={styles.stats}>
            <div>
              <dt>Day streak</dt>
              <dd>
                {days(streak.current)} (longest: {streak.longest})
              </dd>
            </div>
            <div>
              <dt>Most practiced this month</dt>
              <dd>
                {maybeMostPracticed
                  ? `${exerciseName(maybeMostPracticed.exerciseId)} (${maybeMostPracticed.seriesCount} series)`
                  : '–'}
              </dd>
            </div>
          </dl>
          <table className={styles.mastered}>
            <caption>Highest level mastered</caption>
            <thead>
              <tr>
                <th scope="col">Exercise</th>
                <th scope="col">Level ({SERIES_LENGTH - 1}/{SERIES_LENGTH} or better)</th>
              </tr>
            </thead>
            <tbody>
              {exercises.map(({ id, name }) => {
                const maybeLevel = highestMastered(scores, id)
                return (
                  <tr key={id}>
                    <th scope="row">{name}</th>
                    <td>{maybeLevel ? levelName(maybeLevel) : '–'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <h2>History</h2>
          {dates.map((date) => (
            <section key={date} aria-labelledby={`day-${date}`}>
              <h3 id={`day-${date}`}>
                <time dateTime={date}>{formatDay(date)}</time>
              </h3>
              <ul className={styles.day}>
                {sorted.filter((s) => s.date === date).map((s) => (
                  <li key={`${s.exerciseId}-${s.level}`}>
                    <span>{exerciseName(s.exerciseId)}</span>
                    <span>
                      {s.bestHits}/{SERIES_LENGTH}
                    </span>
                    <span className={styles.badge}>{levelName(s.level)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </>
  )
}
