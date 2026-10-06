# WAGENIUS — UI Redesign Plan

Roadmap: **Phase A – Redesign (page by page)** → **Phase B – Fix underlying issues** → **Phase C – Enhancements**.

Ground rules for every page:
- Presentation only. No API calls, routes, permissions, socket events or business logic change during Phase A. Every button/flow that works today must still work after.
- Before: screenshot the current page. After: screenshot again, click through every action, `vite build` passes.
- One page per step, reviewed and approved before moving to the next.
- When a page file is over ~500 lines, split it into section components as part of its redesign.

---

## Step 0 — Design foundation ✅ done (2026-10-06)

Built: fonts loaded in `index.html`; tokens in `src/index.css` (`@theme`, with `emerald-*` remapped to the brand greens); components in `src/components/ui/`; new sidebar (`SidebarPanel`, `navConfig`, `store/uiStore.js`, collapsible, shared by desktop and mobile). Deliberately left out for now: a desktop top bar, because each page still renders its own title until it is redesigned. WhatsApp status now sits in the sidebar instead.

### Typography (Brevo-style)
Brevo uses **Tomato Grotesk** for headings and **Inter** for body text. Tomato Grotesk is a commercial font licensed by Brevo, so we can't copy their files.

| Role | Font | Notes |
|---|---|---|
| Headings, numbers, buttons | **General Sans** (Fontshare, free for commercial use) | Closest free match to Tomato Grotesk: friendly, geometric, rounded. Self-hosted `.woff2` in `src/assets/fonts`. |
| Body, tables, forms | **Inter** | Same as Brevo. |
| Alternative | Buy a Tomato Grotesk license | Swap a single CSS variable later. |

Type scale: 48 / 36 / 28 / 22 / 18 / 16 / 14 / 12. Headings weight 600, body 400, line height 1.5 for body and 1.2 for headings.

### Colour tokens
A WhatsApp-native green palette, in the same calm spirit as Brevo but with its own identity:

- `--brand-900` #0B3B2E deep forest (headings, primary buttons, sidebar)
- `--brand-600` #128C5E primary actions
- `--brand-100` #DDF5E8 mint tints, selected states
- `--accent` #C8F169 lime highlight, used sparingly (home page, badges)
- `--bg` #FAFAF7 warm off-white · `--surface` #FFFFFF · `--border` #E6E8E3
- `--text` #1B1B1B · `--muted` #5F6B66
- Status colours: success, warning, danger, info. One shade each, used the same way everywhere.

Remove the current glass/blur/gradient mix (`.app-card`, translucent surfaces) because that is where most of the "randomness" comes from.

### Shared components (`src/components/ui/`)
Button (primary, secondary, ghost, danger; sm/md/lg) · Input / Select / Textarea with label + help + error · Card · Badge / StatusPill · PageHeader (title, subtitle, actions) · Tabs · Table (sticky header, empty state, loading skeleton) · Modal / Drawer · EmptyState (illustration + one clear action) · StatCard · Toast styling · Skeleton.

### App shell
- Left sidebar: logo, grouped navigation (**Engage**: Inbox · Contacts; **Grow**: Campaigns · Templates; **Insights**: Dashboard; **Account**: Billing · Settings), plan usage card, user menu at the bottom.
- Top bar: page title / breadcrumb, WhatsApp connection status chip, help, profile.
- Consistent 24px/32px page padding, max content width, mobile drawer navigation.
- Same shell (different nav) for the Platform admin area.

**Done when:** fonts load, tokens live in `index.css` (`@theme` for Tailwind 4), components exist, shell wraps all company pages, and every existing page still works inside it.

---

## Step 1 — Home page (new, public, `/`) ✅ done (2026-10-06)

Built in `src/pages/Home/HomePage.jsx` + `src/components/home/`. No photos yet: the visuals are code-built product mockups (inbox, WhatsApp phone, campaign card) and SVG illustrations. Pricing reads live from `/api/plans`, falling back to the seed plans. Replace the mockups with real screenshots once Steps 5–10 are done.
Currently `/` only redirects. New behaviour: logged-out visitors see the landing page and logged-in users still go to their dashboard.

Sections:
1. **Nav:** logo, Features, Pricing, Log in, *Start free trial*.
2. **Hero:** headline (e.g. "Sell more on WhatsApp — without the chaos"), sub-copy for shop owners, two CTAs, and a **real product screenshot** (Inbox + campaign card) in a phone/browser frame on a mint background.
3. **Trust strip:** "Official WhatsApp Business API", "Meta Tech Provider" (only if true), number of messages sent.
4. **Feature blocks** (alternating image/text): Shared Inbox with AI replies · Bulk Campaigns · Approved Templates · Contacts & Groups · Analytics.
5. **How it works:** 3 steps (Connect WhatsApp, Import contacts, Send campaign).
6. **Pricing teaser:** pulls from the existing plans, links to `/pricing`.
7. **FAQ** (accordion).
8. **Final CTA band** (forest green) + footer (Privacy, Data deletion, contact).

Images: real screenshots of our own redesigned pages (captured after Steps 5–9; placeholders until then), simple SVG illustrations/icons, and optional photos you supply (shop owners, products). No copied Brevo imagery.

## Step 2 — Login & Signup
Split layout: form on the left, brand panel with product image and one testimonial or benefit list on the right. Clear errors, password show/hide, "Forgot password?" placeholder, and a signup flow that clearly says what happens next (trial → pricing → connect WhatsApp). Platform login gets the same design with an "Admin" label.

## Step 3 — Pricing / Billing
Plan cards with one highlighted "Most popular" plan, a monthly/annual toggle (if supported), a feature comparison table, a trial status banner, Meta conversation pricing explained in plain language, and current usage bars.

## Step 4 — WhatsApp onboarding
A stepper (Connect → Verify number → Add payment method → Done), each step with a short explanation and illustration, clear status for every Meta step, and friendly recovery messages instead of raw errors.

## App-wide readability pass ✅ done (2026-10-06)
Every app page now uses the **Geist** UI font. The home page keeps General Sans + Inter through the `.marketing` scope. Small text has a minimum of 12px (538 tiny sizes raised across 52 files), Tailwind's `text-xs` and `text-sm` are slightly larger, and the light greys (`slate-300` to `slate-700`) are darker for contrast. The sidebar is now light with dark labels.

## Step 5 — Dashboard ✅ rebuilt (2026-10-06, done ahead of order at the user's request)
Greeting + "what needs your attention" (unread chats, campaigns running, templates pending). KPI row (StatCard), one main chart (messages sent/delivered/read), recent campaigns, a quick-actions panel, and an empty-state checklist for new accounts.

## Step 6 — Inbox
Three panes: conversation list (search, filters as tabs: All / Mine / Unassigned / AI) · chat (WhatsApp-like bubbles, date separators, template quick-insert, 24h window indicator) · contact side panel (details, tags, groups, assignment, AI toggle). Clear unread, assigned and escalated states.

## Step 7 — Contacts
PageHeader with Import / Add actions, a toolbar (search, filters, group selector), a clean table with avatars and status, a bulk actions bar, a Groups side panel, and redesigned Import / Add / Create-group modals (drag-and-drop CSV, column mapping preview).

## Step 8 — Create Campaign
A 4-step wizard: Audience (CSV or group) → Template + variables → Schedule → Review with live WhatsApp preview and cost estimate. Split the 956-line `CampaignUpload.jsx` into step components.

## Step 9 — Campaign History & Analytics
History: table with status pills, progress bars and filters. Analytics: header summary, delivery funnel (sent → delivered → read → replied), timeline chart, failed-recipients table with retry. Split the 1,204-line `CampaignAnalyticsPage.jsx`.

## Step 10 — Templates (list, create, approved, approvals queue)
One Templates area with tabs (All · Drafts · Approved · Pending approval), template cards with a WhatsApp preview, and a create/edit page with the form on the left and a live phone preview on the right. AI-draft as a clear secondary action.

## Step 11 — Settings
A left sub-navigation (Profile · Team & Roles · WhatsApp connection · Pricing config · Notifications), each section as a Card with a save bar.

## Step 12 — Legal pages & 404
Readable long-form layout (max width ~720px, table of contents), a friendly 404 with an illustration and links home.

## Steps 2–12 ✅ done (2026-10-06)
All company app pages have been redesigned to `docs/APP_DESIGN_SYSTEM.md`: Login, Signup, Billing/Pricing, Onboarding, Inbox, Contacts, Create campaign, Campaign history and analytics, Templates (all screens), Settings and Team, Legal and 404. The palette is brand green plus neutrals, with red for errors only. Presentation only: logic diffed against HEAD by each agent and lint-clean. The build passes, and all routes render without runtime errors.

## Step 13 — Platform admin (13 pages)
Apply the shell + shared components: dashboard, companies list/detail (split the 1,102-line file into tabs), users, campaigns, templates, WhatsApp, analytics, audit logs, subscriptions, plans, settings. Lower visual polish, high consistency.

---

## Phase B — Underlying issues (after the redesign)
In priority order (details in the code analysis):
1. Per-company socket rooms (cross-company data leak).
2. Remove env WhatsApp credential fallback for companies.
3. Per-company AI prompt (not hardcoded to Nuform Social).
4. Role check + payment on plan change / end-trial.
5. Verify WABA ownership on manual connect; unique wabaId/phoneNumberId.
6. Protect `/uploads`, restrict upload extensions.
7. Token revocation on refresh; remove token console logs.
8. Scope `cleanTestData.js` to a company.
9. Frontend: socket token refresh, `useSessionExpiry` races, send-retry, failed-send reporting.
10. Campaign stuck "processing", CSV import errors, contact names, webhook dedupe, seed overwriting plans, PlatformConfig unused, audit log never written.
11. Cleanup: dead code, the stray `install` dependency, the tunnel host in `vite.config.js`, the missing zip script.

## Phase C — Enhancements
To be scoped after Phase B (e.g. dark mode, notifications, campaign A/B, contact segments by behaviour, tests).
