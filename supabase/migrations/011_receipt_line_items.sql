-- Receipt line items: one transaction row per item, grouped by a shared
-- receipt_id. Adds an optional subcategory column for per-item taxonomy
-- (V1: food + bills only; other parents leave it null).
--
-- Backwards compatible: existing rows have receipt_id IS NULL and
-- continue to render as standalone entries. No data migration needed.

alter table public.transactions
  add column if not exists receipt_id uuid,
  add column if not exists subcategory text;

-- Partial index keeps the index small (most rows have receipt_id IS NULL).
-- Used by /money/track to group children by parent receipt and by the
-- per-receipt delete path.
create index if not exists idx_transactions_receipt_id
  on public.transactions(receipt_id)
  where receipt_id is not null;

-- Subcategory lookups for the breakdown widgets (Food + Bills donuts).
-- Partial index, since only food/bills rows ever set subcategory in V1.
create index if not exists idx_transactions_subcategory
  on public.transactions(user_id, subcategory)
  where subcategory is not null;
