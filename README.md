# Invoice Processor

Create, track and print invoices and receipts in multiple currencies. Data is stored in the browser (localStorage). There is no backend yet, and the persistence layer is built so one can be added without touching the UI.

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Zod · Vitest + Testing Library + axe-core

> This Next.js version differs from older releases. Read the relevant guide in `node_modules/next/dist/docs/` before changing routing, caching or data code (see `AGENTS.md`).

## Commands

| Command             | What it does                                                    |
| ------------------- | --------------------------------------------------------------- |
| `npm run dev`       | Dev server on port 3000. Restart it after upgrading `next`.     |
| `npm run typecheck` | `tsc --noEmit`                                                  |
| `npm run lint`      | ESLint                                                          |
| `npm test`          | Vitest: unit, jsdom component, integration and axe a11y tests   |
| `npm run check`     | typecheck, lint and tests                                       |
| `npm run build`     | Production build                                                |

## Routes

| Route                | Purpose                                                      |
| -------------------- | ------------------------------------------------------------ |
| `/`                  | Dashboard: totals, status, insights, recent activity         |
| `/invoices`          | Search, filter (status, currency), sort, change status, delete |
| `/invoices/new`      | Create an invoice or receipt with a live preview             |
| `/invoices/[id]`     | The document: print / save as PDF, mark paid, edit, delete   |
| `/invoices/[id]/edit`| Edit an existing document                                    |
| `/converter`         | Currency converter (Frankfurter API)                         |

## Architecture

Feature-oriented. Invoice code lives in `features/invoices/`, shared UI in `components/`, routes in `app/` stay thin.

```
app/                      Routes, layout, template (page transition), globals.css (design tokens)
components/
  shell/                  App shell: sidebar, mobile drawer, top bar, nav
  ui/                     Design system: Button, Field/Input/Select/Textarea, Card,
                          StatusBadge, ConfirmDialog, Toast, Skeleton, EmptyState, PageHeader
features/invoices/
  schema.ts               Zod schema: the single source of truth for an invoice
  types.ts                Types derived from the schema
  lib/
    money.ts              Integer money maths, currency exponents, parsing, formatting
    calculations.ts       The only place totals are computed
    form-state.ts         Form text -> domain model, field-level errors, live totals
    validation.ts         Schema-backed validation with readable messages
    status.ts             Effective status (overdue is derived from dates)
    summary.ts            Dashboard figures, derived from real data only
    list.ts               Filtering and sorting
    analytics.ts, dates.ts, currencies.ts
  repository/             Persistence interface + localStorage implementation + migration
  hooks/                  useInvoices / useInvoice / useToday / useInvoiceForm
  components/             dashboard/, list/, form/, invoice-document, invoice-form, detail view
features/exchange-rates/  Currency converter
```

### Rules the code relies on

- **Money is integers.** Every amount is an integer in the currency's minor unit (cents, yen, fils). `BigInt` is used for intermediate products so no financial value passes through floating point. Decimal places come from `getCurrencyExponent` (JPY = 0, USD = 2, KWD = 3).
- **Rounding:** half away from zero, applied once per derived value: each line total, the discount, the tax.
- **Order of operations:** `subtotal = Σ round(qty × price)`, then discount (percent, or fixed capped at the subtotal), then `tax = round((subtotal − discount) × rate)`.
- **Precision limits:** quantity ≤ 3 decimals, percentages ≤ 2 decimals. Enforced by the schema.
- **One place for totals.** `getInvoiceTotals(invoice)` for saved invoices; `calculatePreviewTotals` for unvalidated form input. Do not recompute totals in components.
- **Currencies are never summed.** Dashboard figures and amount sorting are per currency.
- **Validate at the boundary.** The repository validates every write and every read. Components never touch `localStorage`.
- **Nothing is invented.** The dashboard shows only what the stored documents support; with no data it shows an empty state.

### Persistence

`InvoiceRepository` is async so a database-backed implementation can replace the localStorage one. Swap it in `repository/index.ts`; no component imports a concrete repository.

The localStorage implementation:

- stores `{ version: 2, invoices, quarantine }` under `currency-invoice-processor:invoices:v2`;
- **migrates** the original bare-array format on first read without modifying it, so the old data remains as a backup. Amounts for non-two-decimal currencies (e.g. JPY) are rescaled;
- **quarantines** records that fail validation instead of dropping them, preserves them across later writes, and reports the count (shown to the user as a notice);
- copies unparseable data to `…:corrupt-backup` before starting empty, and never overwrites an existing backup;
- allocates document numbers (`INV-MMDDYYYY-001`, `REC-…`) inside `create`, from the highest saved sequence and a counter, so numbers are not reused after a delete;
- stamps `createdAt` / `updatedAt` (absent on records from before this existed; they are not invented);
- surfaces storage failures (quota, blocked storage) as `InvoiceRepositoryError` with a presentable message and leaves previous data untouched.

Document numbers and type are immutable after creation. A receipt has no separate due date: it is dated on its payment date.

## Design system

Tokens live in `app/globals.css` (`@theme`): neutral surfaces (`canvas`, `surface`, `sunken`), ink (`ink`, `ink-muted`, `ink-faint`), lines, one accent, status colours, radii, shadows and motion. Components use these names, never raw colours. The UI is light-only.

- Status is always text plus a dot, never colour alone.
- Every control is a `Field`: label, hint and error are wired with `aria-describedby`; errors are alerts. Errors show once a field is left, and for all fields after a failed save, which also focuses the first invalid field.
- Native `<dialog>` for modals and the mobile drawer (focus trap, Escape, inert background).
- The invoice document sizes by its container (`@container`), so one component serves the live preview, the full page and print.
- Motion is short and respects `prefers-reduced-motion`.
- Layout: sidebar from `lg`; a drawer below. Lists are a table from `md` and cards on phones. The form and live preview sit side by side from `xl`, and share the screen via Edit / Preview tabs below that.

## Testing

Business logic is tested as plain functions; the repository against an in-memory storage double; components with Testing Library against the real repository; accessibility with axe-core (WCAG 2.1 A/AA) over the rendered form, list, dashboard, document, converter and dialog. A guard test proves the axe harness fails on a known violation. Component tests opt in to jsdom with `// @vitest-environment jsdom`.

## Known limitations

- Data lives in one browser: no accounts, sync or export.
- Two tabs writing at the same instant can interleave; writes are synchronous within a tab but there is no cross-tab lock.
- axe cannot check colour contrast without real layout, and no one has yet looked at the rendered UI in a browser as part of this work. Contrast, visual polish and the responsive layouts have **not** been visually verified; do that on real devices.
- Print / PDF uses the browser's print dialog ("Save as PDF"); there is no server-side PDF generation.
- Status changes from the list set the stored status; "overdue" for an unpaid invoice past its due date is derived from today's date.
- Dark mode is not supported.
- Dev tooling has known `npm audit` advisories (Vitest's `tinypool`); fixing them needs a major Vitest upgrade. Production dependencies audit clean.
