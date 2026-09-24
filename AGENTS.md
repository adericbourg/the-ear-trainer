# AGENTS.md

Durable conventions for this repository. Keep it up to date when a convention changes.

## Stack
- Frontend only, in `frontend/`: React 19, TypeScript (strict), Vite, react-router (declarative mode).
- Tests: Vitest + Testing Library (jsdom). Lint: oxlint. CI runs lint, test and build (`.github/workflows/frontend.yml`).

## Routing
- `/`: home page.
- `/:categoryId/:exerciseId`: exercise page. Redirects to `/` when the pair is not in the registry.
- Any other route redirects to `/`.
- `BrowserRouter` is set in `main.tsx`; `App` only declares routes, so tests wrap it in a `MemoryRouter`.

## Styling
- Plain CSS: global tokens in `src/index.css` (`:root` custom properties), component styles in CSS modules (`*.module.css`).
- No styling dependency.
- Palette: menu `--menu-bg` #1b1f2a / `--menu-bg-raised` #262c3b, text `--menu-fg` #f1f3f7, single accent `--accent` amber #f5b841, content white with `--content-fg` #1b1f2a. Every text/background pair is ≥ 4.5:1.

## Accessibility
- Target WCAG 2.2 AA.
- Menu uses the disclosure pattern (button + `aria-expanded` + `aria-controls`, Escape closes and returns focus). The current exercise uses `aria-current="page"` (from `NavLink`).
- Below 768px the categories collapse behind a "Menu" burger button.

## Registering an exercise
1. Add its category to `categories` in `frontend/src/exercises.ts` if it doesn't exist (`{ id, name }`).
2. Add `{ id, name, categoryId }` to `exercises`.
3. Categories show up in the menu only when they have at least one exercise.
4. Ids are used in the URL (`/<categoryId>/<exerciseId>`): use kebab-case.
