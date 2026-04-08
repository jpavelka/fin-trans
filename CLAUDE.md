# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server (http://localhost:5173)
npm run build    # Production build → build/
npm run preview  # Preview production build
```

## Architecture

This is a SvelteKit single-page app for personal finance transaction management, backed entirely by Firebase (Firestore + Auth). There is no custom backend — all data logic runs in the browser.

### Environment

Firebase credentials are hardcoded in `src/lib/firebase.js`. CI deploys to GitHub Pages on push to `master` via `.github/workflows/github-pages-deploy.yml`.

### Data Flow

Firebase is the source of truth. `src/lib/dataService.js` owns all Firebase subscriptions:
- `initAuth()` is called once from the root layout — sets up the auth listener, the settings listener, and a real-time Firestore listener over the `months` collection
- The listener range expands whenever `minLoadMonth` is pushed earlier by the dashboard
- Transaction data is stored in Firestore as arrays in `months/{YYYY-MM}` documents
- Each transaction gets a `_rowIdx` assigned on load (its index in the stored array) used for targeted updates and deletes

**Stores** (`src/lib/stores.js`) replace React context. `currentUser` is `undefined` while auth resolves, `null` when signed out, and a Firebase user object when signed in.

### Routing

Routes use `/fin-trans` as the base path (configured in `svelte.config.js`) for GitHub Pages hosting at `jpavelka.github.io/fin-trans`:
- `/fin-trans/` → redirect to dashboard or login
- `/fin-trans/login` → Google sign-in
- `/fin-trans/dashboard` → main dashboard
- `/fin-trans/upload` → CSV upload and manual entry

`src/routes/+layout.js` sets `ssr = false` globally; all auth and Firestore work is client-side only.

### Key Files

**`src/lib/dataService.js`** — all Firebase reads/writes:
- `initAuth()` — sets up auth + Firestore listeners
- `saveTransactions(rows)` — appends uploaded rows to Firestore by month
- `updateTransaction(tx, updates)` — updates a single transaction in place; handles moving to a different month doc if the date changes
- `deleteTransaction(tx)` — removes a transaction by `_rowIdx`
- `savePendingUploads(rows)` / `loadPendingUploads()` — draft save to `pending/pending_uploads`

**`src/lib/utils/transactions.js`** — core data transformation: category mapping, meta-category assignment, tag parsing, amortization logic. Called at read time; adds `metaCategory`, `type`, `month`, `year` fields and makes `amount` always positive (`Math.abs`).

### Components (`src/lib/components/`)

- **`Selections.svelte`** — filter bar; dispatches `change` events with patches to `sel`
- **`Plot.svelte`** → `TrendPlot.svelte` / `SinglePeriodPlot.svelte` — Plotly rendered via dynamic `import('plotly.js-dist-min')` in `onMount`; `Plotly.react()` used for reactive updates; `TrendPlot` uses a `ResizeObserver` to handle narrow layouts
- **`Table.svelte`** — dashboard transaction table with: column resizing, sticky headers, per-column filters (date pickers, amount range, text with per-column regex toggle and autocomplete for category/metaCategory/account/tags), sorting, inline edit (pencil) and delete (trash) buttons per row
- **`EditTransactionModal.svelte`** — modal form for editing a transaction's base fields; dispatches `save` / `cancel`
- **`CategoryModal.svelte`**, **`TagModal.svelte`** — filter modals, dispatch `save` / `cancel`

### Routes

**`src/routes/dashboard/+page.svelte`** — main dashboard; owns filter selection state (`sel`), passes filtered transactions to `Plot` and `Table`, receives `filterChange` events from plots to seed `tableFilters`.

**`src/routes/upload/+page.svelte`** — CSV upload and manual transaction entry. Features:
- Drag-and-drop or file-picker CSV import (Empower format); dates normalized from MM/DD/YYYY to YYYY-MM-DD on load
- Manual entry via "+ Enter transactions by hand" button
- Spreadsheet-style keyboard navigation (arrow keys, Tab autocomplete for category, Enter, Escape, Ctrl+D to delete row, Ctrl+Z to undo)
- Transfer detection (same-day same-account groups summing to zero)
- Row combining, splitting, selection with shift-click
- Save as pending draft to Firestore; resume on next visit
- Save to Firestore with confirmation; warns on navigation with unsaved changes

### Pure Utilities (`src/lib/utils/`)

Direct ports with no Svelte dependencies:
- `transactions.js` — transaction transformation (see above)
- `plotUtils.js` — data aggregation for Plotly, currency/date formatting
- `utils.js` — general helpers (sorted unique arrays, time range generation)
