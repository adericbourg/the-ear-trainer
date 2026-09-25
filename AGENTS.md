# AGENTS.md

Durable conventions for this repository. Keep it up to date when a convention changes.

## Stack
- Frontend only, in `frontend/`: React 19, TypeScript (strict), Vite, react-router (declarative mode).
- Tests: Vitest + Testing Library (jsdom). Lint: oxlint. CI runs lint, test and build (`.github/workflows/frontend.yml`).

## Typing
- Strict TypeScript plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`.
- Identifiers are branded types (`CategoryId`, `ExerciseId` in `src/exercises.ts`), never plain `string`. Build them with their same-named function (`CategoryId('pitch')`) only in the registry and tests.
- External input (URL params) is never cast to an id: it is resolved by looking it up in the registry.
- Compile-time guards use `// @ts-expect-error` (checked by `tsc -b` in `npm run build`).

## Routing
- `/`: home page.
- `/:categoryId/:exerciseId`: exercise page. Redirects to `/` when the pair is not in the registry.
- Any other route redirects to `/`.
- `BrowserRouter` is set in `main.tsx`; `App` only declares routes, so tests wrap it in a `MemoryRouter`.

## Styling
- Plain CSS: global tokens in `src/index.css` (`:root` custom properties), component styles in CSS modules (`*.module.css`).
- Exercise layout, buttons, segmented radio choices (`choices`/`choice`) and slider (track, selector, hit/miss result, marker) are shared in `src/exercises/exercise.module.css`; an exercise module only adds what is specific to it.
- No styling dependency.
- Palette: menu `--menu-bg` #1b1f2a / `--menu-bg-raised` #262c3b, text `--menu-fg` #f1f3f7, single accent `--accent` amber #f5b841, content white with `--content-fg` #1b1f2a. Every text/background pair is ≥ 4.5:1.

## Accessibility
- Target WCAG 2.2 AA.
- Menu uses the disclosure pattern (button + `aria-expanded` + `aria-controls`, Escape closes and returns focus). The current exercise uses `aria-current="page"` (from `NavLink`).
- Below 768px the categories collapse behind a "Menu" burger button.

## Registering an exercise
1. Add its category to `categories` in `frontend/src/exercises.ts` if it doesn't exist (`{ id: CategoryId('...'), name }`).
2. Add `{ id: ExerciseId('...'), name, categoryId: CategoryId('...') }` to `exercises`.
3. Put its component, test, styles and any exercise-specific logic in `frontend/src/exercises/<exercise-id>/` (kebab-case, matching its `ExerciseId`). Don't name a module like the component with only a case difference (`intervals.ts` next to `Intervals.tsx`): on case-insensitive file systems `./Intervals` resolves to the `.ts` file.
4. Its component takes `ExerciseProps` (`frontend/src/exercises/Series.tsx`) and only renders the question UI, for the given `level` (no level picker). On Check it reports `{ label, isHit }` through `onCheck` (label: the target, as in its feedback text); its Next button calls `onNext` and reads "See score" when `isLastQuestion` (then it doesn't start a new question). On mount it focuses its first answer control.
5. Map its id to its component in `exercisePages` (`frontend/src/App.tsx`). `Series` renders it below the exercise name heading and owns the level choice, the mode (free practice or scored series of `SERIES_LENGTH` questions), progress, score and results.
6. Categories show up in the menu only when they have at least one exercise.
7. Ids are used in the URL (`/<categoryId>/<exerciseId>`): use kebab-case.
