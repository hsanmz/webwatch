# WebWatch Design System

The visual contract for the WebWatch product. Every colour, radius, shadow, duration and
typeface in the app resolves through the tokens declared in [`src/styles.css`](src/styles.css).
That file is the source of truth. This document explains what the tokens mean, which component
owns which decision, and where the system deliberately deviates from the published baseline.

Scope: the web UI (landing page, public status page, documentation, auth screen and the
authenticated app). Server code, the Telegram message templates and the ingestion protocol are
out of scope.

---

## 1. Design read

> Reading this as: **an infrastructure console for developers who watch production systems**,
> in a **quiet, dense, instrument-like language**, dial **ENERGY 1 / RHYTHM 2 / MOTION 1**.

- **ENERGY 1.** The product is used while something is broken. The interface stays calm and
  readable: no gradients on surfaces, no glow, one accent colour.
- **RHYTHM 2.** The marketing pages vary their composition (fact row, spec sheet, two-track
  install, two-column pricing, FAQ). The app screens share one consistent structure (page
  header, stat row, list, detail) because operators scan them, they do not read them.
- **MOTION 1.** Hover and focus transitions only. The single exception is the global
  system-status indicator, which pulses to say "live". The pulse is supplementary: the label
  always states the status in words.

---

## 2. Colour

### 2.1 Palette

The raw palette is expressed in OKLCH so the lightness and chroma relationships survive a
future dark theme. Raw entries are never used directly in components.

| Group          | Tokens                                                                                                  | Role                                          |
| -------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Brand          | `--brand-950`, `--brand-900`, `--brand-800`, `--brand-700`, `--brand-600`, `--brand-500`, `--brand-100` | Product teal. The only accent in the system.  |
| Secondary teal | `--teal-700`, `--teal-600`, `--teal-100`                                                                | Focus ring, secondary chart series.           |
| Neutrals       | `--neutral-0` .. `--neutral-900`                                                                        | Canvas, surfaces, text, borders.              |
| Status         | `--success-700/100`, `--warning-700/100`, `--danger-700/100`, `--info-700/100`                          | Operational states and their tinted surfaces. |

### 2.2 Semantic roles

Components read semantic roles only. These are the variables a component is allowed to use.

| Role                                          | Maps to                                    | Utility                                                                                |
| --------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------- |
| `--color-bg`                                  | `--neutral-50`                             | `bg-background`                                                                        |
| `--color-surface`                             | `--neutral-0`                              | `bg-card`                                                                              |
| `--color-surface-muted`                       | `--neutral-100`                            | `bg-muted`                                                                             |
| `--color-text`                                | `--neutral-900`                            | `text-foreground`                                                                      |
| `--color-text-muted`                          | darkened `--neutral-500`                   | `text-muted-foreground`                                                                |
| `--color-text-subtle`                         | `--neutral-600`                            | `text-neutral-600` (the role variable is also read directly by charts and code blocks) |
| `--color-border`                              | `--neutral-200`                            | `border-border`                                                                        |
| `--color-border-strong`                       | `--neutral-300`                            | `border-input`                                                                         |
| `--color-primary`                             | `--brand-800`                              | `bg-primary`, `text-primary`                                                           |
| `--color-primary-hover`                       | `--brand-900`                              | `bg-primary-hover`                                                                     |
| `--color-primary-subtle`                      | `--brand-100`                              | `bg-primary-subtle`                                                                    |
| `--color-focus`                               | `--teal-700`                               | focus outline                                                                          |
| `--color-success` / `--color-success-surface` | `--success-700` / `--success-100`          | `text-success`, `bg-success-surface`                                                   |
| `--color-warning` / `--color-warning-surface` | darkened `--warning-700` / `--warning-100` | `text-warning`, `bg-warning-surface`                                                   |
| `--color-danger` / `--color-danger-surface`   | `--danger-700` / `--danger-100`            | `text-danger`, `bg-danger-surface`                                                     |
| `--color-info` / `--color-info-surface`       | `--info-700` / `--info-100`                | `text-info`, `bg-info-surface`                                                         |

### 2.3 Monitoring status roles

| Role         | Token                | Meaning                                                                 |
| ------------ | -------------------- | ----------------------------------------------------------------------- |
| `--up`       | `--success-700`      | The check succeeded.                                                    |
| `--down`     | `--danger-700`       | The check failed.                                                       |
| `--degraded` | `--color-warning`    | Reachable but slower than expected.                                     |
| `--paused`   | `--color-text-muted` | Monitoring is paused. Neutral, because a paused monitor is not a fault. |

### 2.4 Data visualisation roles

`--chart-1` (brand) through `--chart-5` (neutral) are the only colours a chart may use, in that
order. Charts never reach for a raw palette entry.

### 2.5 Code roles

`--code-plain`, `--code-punctuation`, `--code-keyword`, `--code-attribute`, `--code-string`.
They exist so that the shared `CodeBlock` component in `src/components/app/code-block.tsx`
can highlight snippets without hard-coding a dark-mode palette.

### 2.6 shadcn-compatible aliases

`--primary`, `--card`, `--border`, `--muted-foreground`, `--input`, `--ring`, `--destructive`,
`--surface`, `--foreground`, `--background`, `--popover`, `--secondary`, `--accent` and their
`-foreground` pairs are kept so the generated primitives in `src/components/ui/*` keep working.
They are aliases of the semantic roles above, never a second palette.

### 2.7 Documented deviations

| Deviation                                                             | Reason                                                                                                                                                                                            |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--primary` is `--brand-800`, not `--brand-700`                       | White on brand-700 measures 4.50:1, exactly on the AA line. The solid action colour steps one level darker for headroom (6.45:1). Brand-700 stays available for large text, borders and graphics. |
| `--color-text-muted` is `--neutral-500` darkened one step (`#5C6C85`) | Muted text has to pass AA on `--neutral-100` surfaces as well as on white.                                                                                                                        |
| `--color-warning` is `--warning-700` darkened one step (`#96600A`)    | Same reason: warning-700 on warning-100 measures 4.42:1.                                                                                                                                          |
| `--paused` is neutral, not amber                                      | Paused means "not being monitored", which is not a fault. Amber is reserved for degraded and expiring SSL.                                                                                        |

---

## 3. Typography

| Token            | Family        | Use                                                |
| ---------------- | ------------- | -------------------------------------------------- |
| `--font-sans`    | Inter         | Body copy, tables, form controls.                  |
| `--font-display` | Space Grotesk | Headings (`h1` to `h4` are set in the base layer). |
| `--font-mono`    | IBM Plex Mono | Code, identifiers, timestamps, metrics.            |

- Body copy is `--font-sans` at 16 px with a 1.55 line height.
- Monospace is reserved for content that is literally machine text: code, API keys, event
  types, status codes, durations. It is never used for a heading.
- Labels are sentence case. No uppercase, no wide tracking.
- Numbers, durations and timestamps use `tabular-nums` (the `tabular` utility or the `time`
  element) so columns stay aligned.

---

## 4. Radius, elevation, motion

### Radius

`--radius-xs` 4 px, `--radius-sm` 6 px, `--radius-md` 10 px, `--radius-lg` 14 px, `--radius-xl` 20 px,
plus `--radius-full`. Controls use `md`, cards use `lg`, large surfaces use `xl`. Nothing is
pill-shaped.

### Elevation

Only three shadows exist: `--shadow-sm`, `--shadow-md`, `--shadow-lg`. The `panel` utility uses
`--shadow-sm`. Dense screens separate regions with a border, not a shadow.

| Token         | Applied to                                        | Reason                                                                                                      |
| ------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `--shadow-sm` | `panel` surfaces, the `outline` toggle            | The lightest separation. It says "this sits on the canvas" without lifting the surface off the page.        |
| `--shadow-md` | Popovers, hover cards, select and dropdown panels | A floating panel needs to detach from the page behind it.                                                   |
| `--shadow-lg` | Dialogs, sheets, context menus, toasts            | A modal is a separate layer. It gets the strongest elevation so the dimmed backdrop never competes with it. |

Nothing else carries a shadow. Cards, badges, buttons and the sidebar are flat, because a dense
console that floats looks broken.

### Glass

`backdrop-blur` appears on exactly two things: the sticky header of the landing page and the
sticky header of the documentation page. Both are sticky bars that sit on top of scrolling text,
so the blur is what keeps the content underneath from fighting the bar for attention. The
documentation drawer overlay uses `backdrop-blur-sm` because it dims the page behind it, it is
not a navigation surface. No card, panel or dialog is blurred.

### Motion

`--motion-fast` 120 ms, `--motion-base` 180 ms, `--motion-slow` 240 ms, with
`--motion-ease: cubic-bezier(0.2, 0, 0, 1)`.

The `live-dot` utility is the only animation in the product. A global
`prefers-reduced-motion: reduce` block disables it and collapses every transition.

---

## 5. Layout

| Token                 | Value  | Utility         | Use                                 |
| --------------------- | ------ | --------------- | ----------------------------------- |
| `--container-reading` | 45 rem | `max-w-reading` | Body copy and prose.                |
| `--container-content` | 75 rem | `max-w-content` | Default page shell.                 |
| `--container-wide`    | 90 rem | `max-w-wide`    | Marketing pages and the docs shell. |

Breakpoints are Tailwind defaults. The only breakpoint with a structural change is `md`
(768 px), where the app sidebar and the documentation drawer switch between inline and
overlay.

---

## 6. Components

### 6.1 Primitives (`src/components/ui/*`)

shadcn/ui primitives, restyled to tokens. They keep the shadcn API.

| Primitive                                                                                                                       | Notes                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `button`                                                                                                                        | Variants `default`, `secondary`, `outline`, `ghost`, `destructive`, `link`. Focus ring is global, no variant overrides it.                        |
| `badge`                                                                                                                         | Variants `default`, `secondary`, `outline`, `destructive`, `success`, `warning`, `danger`, `info`, `neutral`. A badge always states a real state. |
| `card`                                                                                                                          | Uses the `panel` surface.                                                                                                                         |
| `input`, `textarea`, `label`, `select`, `checkbox`, `switch`, `radio-group`, `toggle`, `slider`                                 | Same surface, radius and focus behaviour.                                                                                                         |
| `table`                                                                                                                         | Dense. Rows are separated by borders, numeric cells stay tabular.                                                                                 |
| `alert`                                                                                                                         | Uses the status surfaces.                                                                                                                         |
| `dialog`, `sheet`, `popover`, `dropdown-menu`, `command`, `hover-card`, `context-menu`, `menubar`, `navigation-menu`, `tooltip` | Overlay surfaces.                                                                                                                                 |
| `skeleton`                                                                                                                      | The loading state shape.                                                                                                                          |
| `sonner`                                                                                                                        | Toasts.                                                                                                                                           |

### 6.2 App composites (`src/components/app/*`)

| Component                                                                         | Purpose                                                                                                  |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `BrandLockup`, `BrandMark`                                                        | The only place the brand mark is drawn. Lockup for marketing and auth, square glyph for the app sidebar. |
| `StatusBadge`                                                                     | Monitoring state of a site.                                                                              |
| `SystemStatusBadge`, `resolveSystemStatus`                                        | Health of WebWatch itself. Same tones, different vocabulary.                                             |
| `resolveMonitorStatus`                                                            | Maps `status` plus `is_active` to a state key.                                                           |
| `EmptyState`                                                                      | Explains what would appear here and offers the one action that fills it.                                 |
| `ErrorState`                                                                      | Explains the failure and offers a retry.                                                                 |
| `CodeBlock`                                                                       | Token-based syntax highlighting for snippets.                                                            |
| `PageHeader`, `StatCard`, `SiteCard`, `AppShell`, `AppSidebar`, `ProfileDropdown` | Screen furniture.                                                                                        |

### 6.3 Marketing composites (`src/components/marketing/*`)

`Capabilities` (the capability spec sheet), `StatusBoard` (honest sample statuses),
`TelegramAlerts` (a labelled example message).

### 6.4 Icons

An icon is chosen because it names the thing it sits next to, never because it is a familiar
glyph. `Radio` for the check interval, `MessageSquare` for the Telegram notification, `ShieldCheck`
for the retention guarantee, `ListChecks` for the setup steps, `BellRing` for alerting, `Lock` for
the token and the SDK. Nothing uses a sparkle, a bolt, a cube or a robot, and no decorative
glyph is added next to a heading that already says the same thing.

---

## 7. States

Every screen that displays data implements three states, in this order:

1. **Loading.** A `Skeleton` shaped like the content that is coming.
2. **Error.** `ErrorState` with the reason and a retry.
3. **Empty.** `EmptyState` with the reason and the action that fills it.

`src/routes/_authenticated/dashboard.tsx` is the reference implementation.

### Status vocabulary

The state is always spelled out in words. Colour reinforces the word, it never carries it.
The same wording is used on the dashboard, on the site detail page and on the public status
page.

| State                        | Label           | Tone    |
| ---------------------------- | --------------- | ------- |
| `up`                         | Operasional     | success |
| `degraded`                   | Terlambat       | warning |
| `down`                       | Tidak Tersedia  | danger  |
| `unknown`                    | Belum Dicek     | neutral |
| unrecognised value           | Tidak Diketahui | neutral |
| paused (`is_active = false`) | Dijeda          | neutral |

An unknown state is never green.

---

## 8. Accessibility

- **Focus.** One global mechanism: `:focus-visible { outline: 3px solid var(--color-focus) }`.
  No component removes the outline. The ring is 4.81:1 on the surface, above the 3:1 required
  for a focus indicator.
- **Touch targets.** A finger needs 44px, a mouse does not. Every control therefore declares a
  coarse-pointer size first and compacts under `pointer-fine`. The `Button` primitive is
  `h-11` (44px) on touch and `h-10`/`h-8` with a mouse, and the same rule applies to `input`,
  `select`, `toggle`, the dialog and sheet close buttons. The switch and the checkbox keep
  their small visual box and expand the tap area with an invisible pseudo-element, so the
  control still looks like a switch.
- **Contrast.** Text meets WCAG AA (4.5:1 normal, 3:1 large). Measured values are listed in
  the header comment of `src/styles.css`.
- **Keyboard.** Every interactive element is reachable and operable. Dialogs and sheets close
  with Escape. The documentation drawer is `inert` while it is closed on mobile, so its links
  are not focusable off screen.
- **Reduced motion.** The global `prefers-reduced-motion` block removes every animation and
  transition.
- **Language.** The document language is Indonesian (`lang="id"`). User-facing copy is
  Indonesian; code, comments and identifiers are English.

---

## 9. Working with the system

1. **Never hard-code a colour, a radius or a shadow.** If a needed value does not exist, add a
   token to `src/styles.css` first, then use it.
2. **Add tokens as semantic roles**, not as raw palette entries in a component. A new role
   needs a purpose written down in this document.
3. **Do not add a second accent.** The brand teal plus the four status tones are the whole
   palette. Neutrals do not count against the limit.
4. **State every number.** A statistic is shown only when it comes from a real source. Mock
   data is labelled as a mock (`contoh-*` hosts, "contoh tampilan"). A number that is true only
   for one configuration must say so, the way the landing page says the two-minute notification
   applies to the one-minute interval.
5. **Ship the three data states** with any new screen that fetches data.
6. **Do not remove the outline of a control to make it fit.** Widen the container instead.

---

## 10. Assets

| File                 | Use                                                |
| -------------------- | -------------------------------------------------- |
| `public/logo.png`    | Wide lockup. Landing page, auth screen, marketing. |
| `public/favicon.png` | Square "W" glyph. App sidebar, browser icon.       |

Filenames are part of the existing public contract and are not changed.
