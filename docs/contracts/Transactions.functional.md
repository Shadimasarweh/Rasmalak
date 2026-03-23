# Transactions Page — Functional Contract

## 1. Page Authority and Purpose

The Transactions page is the single source of truth for user financial activity.

It exists only to:

- Record transactions
- Display transactions
- Allow controlled mutation of transactions

It is not a dashboard, educational surface, or advisory interface.

---

## 2. Data Source and Ownership

All values rendered on this page must derive exclusively from persisted transaction records.

The page must not:

- Use placeholder values
- Infer financial data from profiles, goals, or heuristics
- Cache derived values independently of the transaction dataset

If the dataset is empty, the page must represent emptiness truthfully.

---

## 3. Required Transaction Model

Each transaction must include:

- Unique identifier
- Signed numeric amount
- Currency (ISO 4217)
- Date (ISO 8601)
- Type: `income` | `expense` | `transfer`
- Category (nullable)
- Optional metadata

No field may be silently fabricated or defaulted to imply meaning.

---

## 4. Create and Delete Authority

The system must support full CRUD for transactions, with the following guarantees:

### Creation:

- A user can add an income or expense
- The transaction is persisted
- The transaction appears immediately in the Transactions list
- All summaries and charts update deterministically

### Deletion:

- A user can delete any visible transaction
- Deletion requires explicit confirmation
- After deletion, the transaction is removed from the source dataset
- All derived values are recalculated synchronously

There is no soft delete, archive, or shadow state.

---

## 5. Empty State Rules

When zero transactions exist:

- No charts are rendered
- No summaries implying trends are shown
- Language remains neutral and descriptive

### Allowed:

- Explanation of page purpose
- One primary action to add a transaction

### Disallowed:

- Educational prompts
- Suggestions
- Historical or predictive language

---

## 6. Partial Data Behavior

With limited or incomplete transactions:

- Calculations remain exact
- Visualizations scale down without exaggeration
- No trends, comparisons, or insights are implied

A single transaction never justifies directional indicators or analysis.

---

## 7. Calculations and Summaries

### Allowed calculations:

- Total income
- Total expenses
- Net balance

### Rules:

- Recomputed on every mutation
- Based solely on visible transactions
- Never estimated or smoothed

### Disallowed:

- Forecasts
- Averages over implied periods
- Behavioral insights

---

## 8. Charts and Visualizations

Charts are conditional.

### Rules:

- No charts when zero transactions exist
- Charts must reflect the same dataset as the list
- Localization affects labels, numerals, dates, and direction

### Arabic requirements:

- RTL layout
- Correct numeric formatting
- Semantic direction consistency (not visual mirroring only)

---

## 9. Localization Integrity

### Language switching affects:

- Text
- Numerals
- Date formatting
- Currency placement

### Language switching must never affect:

- Stored values
- Calculations
- Sorting logic

Any mismatch is a functional defect.

---

## 10. Allowed User Actions

### Permitted actions:

- Add transaction
- Delete transaction
- View transaction details
- Filter and sort

### Not permitted:

- Goal management
- Budget editing
- Education or guidance flows
- Cross-page logic

---

## 11. Failure Handling

On error or missing data:

- Show less, not more
- Prefer absence over approximation
- Never fabricate financial meaning

Truthfulness overrides completeness.

---

## 12. Enforcement Rule

Any feature or UI element that violates this contract:

- Must be removed
- Must be relocated to another module
- Must not be patched locally

**No exceptions.**
