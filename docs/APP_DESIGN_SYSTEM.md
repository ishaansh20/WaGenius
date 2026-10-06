# Wagenius app design system (company app pages)

The reference implementation is `FRONTEND/src/pages/Dashboard/DashboardPage.jsx`. Every page should look like it belongs next to it: calm, premium and highly readable, for non-technical shop owners.

Out of scope: the public home page (`pages/Home`, `components/home`) and the super-admin pages (`pages/Platform`, `PlatformLayout`).

## Hard rules
1. **Presentation only.** Do not change API calls, state, effects, handlers, props, routes, permissions/role checks, plan gates, socket logic, validation or conditional logic. Every button, input, modal, filter and flow that exists today must still exist and work. Restructuring JSX and classNames is fine. Moving markup into small presentational sub-components in the same file is fine.
2. **Three colours only:**
   - **Brand green** (`brand-*`): primary actions, the active/selected state, positive/success, links, small highlights. The main button is `bg-brand-900` (deep forest) and hover `bg-brand-800`. Accent text/icons use `text-brand-600` / `text-brand-700`. Tints are `bg-brand-50` / `bg-brand-100`.
   - **Neutrals**: text `text-ink` (headings, values), `text-ink-muted` (secondary), `text-ink-subtle` (only for placeholders and disabled text). Surfaces are `bg-surface` (white cards) on `bg-canvas` (page). Borders are `border-line`, or `border-line-strong` for inputs.
   - **Red** (`text-danger`, `bg-danger-soft`): only for errors, failed states and destructive actions.
   - Amber (`text-warning`, `bg-warning-soft`) is allowed only for genuine warnings or pending states. Blue (`text-info`, `bg-info-soft`) is allowed only for "in progress / scheduled" status.
   - **Remove** violet, indigo, purple, pink, fuchsia, sky, cyan, teal, orange, rose, lime and yellow, and any rainbow or gradient decoration. Charts use brand green, plus red for failed and `#c3cad1` for neutral/pending.
3. **Readability floor:** nothing below 12px. Body and table text 14–15px. Secondary text 13–14px in `text-ink-muted`, never lighter. Do not use `text-slate-300/400` for real text.
4. **No AI-template look:** no tiny uppercase letter-spaced eyebrows (`uppercase tracking-widest text-[10px]`), no glassmorphism or backdrop blur on content, no glow shadows, no animated pings, no gradient text, and no emoji used as decoration. Sentence case everywhere.
5. Don't touch `components/ui/*`, `components/layout/*`, `index.css`, `App.jsx`, the stores, services or hooks. If you need a new shared piece, build it locally in your file.

## Type scale (font is Geist, already global)
| Use | Classes |
|---|---|
| Page title (h1) | `text-[28px] sm:text-[30px] font-semibold tracking-[-0.025em] text-ink` |
| Page subtitle | `mt-1.5 text-[15px] text-ink-muted` |
| Card/section title (h2) | `text-[17px] font-semibold text-ink` + optional `mt-1 text-[14px] text-ink-muted` description |
| Body / table cell | `text-[14px]`–`text-[15px] text-ink` |
| Labels | `text-[13px] font-medium text-ink` (form labels) or `text-[13px] text-ink-muted` (meta) |
| Big numbers | `text-[28px]–[32px] font-semibold tracking-[-0.02em] tabular-nums` |

## Shared components (import from `../../components/ui`)
`Button` (variants: primary, secondary, ghost, danger, danger-ghost; sizes sm/md/lg/icon), `Card` + `CardHeader`, `Badge` + `StatusPill` (status → tone mapping), `Input` / `Select` / `Textarea` / `Field` (label + help + error), `PageHeader`, `EmptyState`, `StatCard`, `Tabs` (segmented), `Modal` (portal, Esc to close), `Skeleton`, `Table`. Use them where they fit. Keep existing behaviour when swapping a hand-rolled element for one of these, including `type="submit"`, disabled and loading states, refs and onChange.

## Layout patterns
- **Page:** `DashboardLayout` → header row (h1 + subtitle on the left; primary action(s) on the right, primary = `Button` default variant) → `space-y-5` stack of `Card`s.
- **Cards:** `rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)] p-5 sm:p-6` (that's `Card`).
- **Tables:** header row `bg-[#f6f7f6] text-[13px] font-medium text-ink-muted`, rows `text-[14px]`, `divide-y divide-line`, row hover `hover:bg-canvas`, comfortable `py-3.5 px-4`.
- **Filters / toolbars:** a single row; search input with icon (h-10, `rounded-lg border-line-strong`); segmented tabs like the Dashboard `PeriodPicker` (active `bg-brand-900 text-white`).
- **Empty states:** `bg-canvas` rounded box, an icon in a white circle, a 15px semibold title, a 14px muted sentence and one clear action button.
- **Forms:** labels above inputs, 44px (`h-11`) inputs, `rounded-lg`/`rounded-xl`, focus ring brand, help text 13px muted, errors 13px `text-danger`.
- **Modals:** white `rounded-2xl`, title 18px semibold, body 14–15px, footer with right-aligned actions (secondary then primary).
- **Status badges:** use `StatusPill` (it handles completed/processing/scheduled/failed/draft/approved/pending/rejected and more).
- **Radius:** cards 16px, inputs and buttons 8–12px, pills full. **Spacing:** generous; never cram.

## Copy
Plain words for shop owners: "Create campaign" not "Initialize broadcast", "Contacts" not "Audience entities". Buttons say exactly what happens. Error text explains what to do. Keep every piece of information the page shows today; you may reword labels for clarity, but don't drop data.

## Verification each agent must do
- `npx eslint <your files>` from `FRONTEND/` must pass with no new errors.
- Don't run `vite build` or start dev servers; the lead does that.
- Re-read your diff: every handler, state variable, API call and conditional from the original must still be present and wired.
