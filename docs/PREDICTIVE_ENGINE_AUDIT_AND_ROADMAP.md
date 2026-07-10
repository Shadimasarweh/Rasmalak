# Predictive Budgeting & Behaviour Analysis — Audit and Roadmap

> **Status 2026-07-10:** Phase 1 (items 1–5) shipped and LIVE since
> 2026-07-08. Phase 2 implemented on `feature/predictive-phase2` (dark):
> items 6–7 were already live via B1; item 8 (Hijri/Ramadan seasonality)
> and item 9 (cold-start priors) landed with this branch, plus the
> unlocked individual surfaces (C2, B2, B4) and AI-context wiring.
> Phase 3 (items 10–13) remains.

**Date:** 2026-07-02 · **Scope:** `src/ai/*`, `src/lib/autoBudget.ts`, `src/lib/healthScore.ts`, supporting stores/migrations
**Verdict:** The current system is a well-architected *deterministic heuristics* layer. It is transparent, currency-compliant, and cheap — but nothing in it is genuinely predictive or behavioural yet. The scaffolding (memory schema, deterministic-feeds-AI pipeline, audit logging) is unusually good and gives us a fast path to a real predictive engine.

---

## Part 1 — What exists today

### 1.1 Forecasting / projection

| Capability | Location | Algorithm | Assessment |
|---|---|---|---|
| Auto-budget suggestions | `src/lib/autoBudget.ts` | `max(3-mo mean × 1.05, last month)`, rounded up to 5; confidence = count of months with data (1/2/3) | Sound baseline, but flat mean — no weighting, no seasonality, missing months count as 0 |
| End-of-month balance projection | `src/ai/context.ts:245` | Linear run-rate: `(MTD expenses / days elapsed) × days remaining` | Naive. Ignores recurring bills, payday timing, weekday shape. Wildly wrong early in month |
| Goal completion estimate | `src/lib/goals/funding.ts` | Linear extrapolation of contribution pace | No uncertainty, no risk probability |
| AI budget refinement | `src/ai/autoBudget/refineWithAI.ts` | LLM adjusts deterministic suggestions | Correct pattern (math first, LLM refines) |

### 1.2 Anomaly / pattern detection

| Capability | Location | Algorithm | Assessment |
|---|---|---|---|
| Unusual spending | `src/ai/context.ts:152` | Current month vs **last month only**, flag if >30% higher | n=1 baseline. Also compares a *partial* current month to a *full* previous month → systematically under-flags early in the month, over-alerts late |
| Category spike alerts | `src/ai/alerts.ts` | Deviation >50% → medium, >100% → high | Inherits the n=1 problem |
| Recurring detection | `src/ai/deterministic/billAnalysis.ts` + `isRecurring` flag | Count distinct months a vendor appears; user-set flag | No interval inference, no amount tolerance, no next-due-date prediction |
| Overspending pace | `src/ai/alerts.ts:97` | `% used > expected % + 15pp AND > 60%` | Assumes uniform daily spend — false positives right after rent/bills clear |

### 1.3 Signals & scoring (all pure arithmetic — correctly so)

`src/ai/financialSignals.ts`: savings rate, discretionary ratio, expense volatility (CV), income stability (1 − CV), recurring ratio, negative trend (>10% MoM), goal funding progress. `financialHealth.ts` / `lib/healthScore.ts`: weighted composite with critical/watch/stable bands (<40 / <70).

### 1.4 Behaviour analysis — **the biggest gap**

The schema is ambitious; the population is not:

- `user_semantic_state` + `UserProfile` declare `riskProfile`, `behaviorSignals`, `engagementSignals`, `preferences`.
- `src/ai/memory/updateRules.ts` writes exactly **two** fields ever: `financialHealthBand` and `incomeStabilityScore`. Everything else is permanently `null`.
- There is no computation anywhere that derives spending personality, timing habits, impulse patterns, or engagement behaviour from transaction data.

### 1.5 What's structurally healthy

Deterministic layer feeds the LLM (never the reverse); `amountBase` used consistently in analytics (currency rule respected); everything explainable to the user; validation + audit pipeline already in place. **Do not abandon this architecture — extend it.**

### 1.6 What's structurally absent

No statistical model of any kind (no EWMA, regression, distribution fitting). No seasonality — including **no Hijri-calendar awareness** (Ramadan/Eid are the largest spending seasonality events in MENA). No uncertainty quantification. No server-side computation or persistence of predictions (everything recomputed per request). No accuracy tracking — we cannot currently prove our predictions are good, which is fatal for a product whose selling point is prediction.

---

## Part 2 — Roadmap to "next level"

Ordered by (differentiation × feasibility). Each phase ships user-visible value.

### Phase 1 — Statistical foundation (2–4 weeks, pure TS, fits existing `deterministic/` layer)

1. **Real recurring-series detection** — `src/ai/deterministic/recurringSeries.ts`. Cluster transactions per merchant/category; infer cadence from median inter-transaction interval with MAD tolerance; infer amount band; predict next due date. Persist to a new `recurring_series` table (migration 013). This single capability upgrades everything downstream.
2. **Committed vs discretionary cash-flow forecast** — replace the linear run-rate: project recurring items exactly on predicted due dates; project discretionary spend via **median** daily rate with a day-of-month weight curve (captures the MENA payday effect: heavy spend days 1–7). Output a *range* (P25–P75), not a point — surface as "توقع نهاية الشهر" with a confidence band on the dashboard.
3. **Robust anomaly baselines** — per-category median + MAD over trailing 6–12 months (not last month alone); flag when current month's *pace-adjusted* spend exceeds baseline by k×MAD; gate on ≥3 months history. Kills both bugs in §1.2.
4. **Auto-budget v2** — EWMA (α≈0.5) instead of flat mean; distinguish "category absent" from "category zero"; per-category trend term.
5. **Prediction ledger** — `prediction_log` table: every forecast written with horizon + predicted value; nightly reconciliation against actuals (MAPE, hit-rate of the P25–P75 band). *This is what lets marketing say "accurate" honestly, and lets us iterate on real error metrics.*

### Phase 2 — Behaviour engine (3–5 weeks, mostly wiring what already exists)

6. **Populate `behaviorSignals` from data** — new `src/ai/deterministic/behaviorProfile.ts` computing: spend-timing profile (front-loader / smooth / back-loader), impulse index (discretionary spend within 72h of income arrival ÷ total discretionary), small-transaction frequency, weekend-vs-weekday ratio, budget adherence streak, category drift. Extend `updateRules.ts` with threshold-based writes (the guardrail pattern is already there).
7. **Behavioural archetypes** — rule-based segmentation over the signal vector (e.g. المخطّط / المندفع / الموسمي / الحذر). Feed the archetype into `promptComposer` so Mustasharak's tone and advice adapt per personality. Cheap, highly visible, and exactly what "behaviour analysis" means to a user.
8. **Hijri seasonality** — Ramadan/Eid detection via `Intl` `islamic-umalqura` calendar (no new deps). Year-2 users: last year's Ramadan delta per category. Year-1 users: population prior. Ship "وضع رمضان" — pre-Ramadan budget adjustment suggestions. **No Western PFM has this. It is the moat.**
9. **Cold start priors** — per-country × income-band category-share priors (onboarding already captures both). Blend prior→personal as history accumulates (shrinkage weighting). Day-one users get sane predictions instead of `hasEnoughHistory: false`.

### Phase 3 — Differentiated predictive product (4–8 weeks)

10. **Goal risk probability** — Monte Carlo over the user's historical monthly-savings distribution → "78% احتمال تحقيق هدفك في موعده" + the concrete monthly delta needed to reach 90%. Explainable, deterministic-adjacent, very sellable.
11. **Server-side forecast jobs** — move Phase-1/2 computation to a nightly job (pg_cron or Vercel cron → `/api/forecasts/recompute`), persisted per user. Dashboard reads precomputed forecasts; the mid-month "what if" stays client-side.
12. **Peer benchmarking (at scale)** — anonymized country/income-band percentiles ("أنت توفّر أكثر من ٦٥٪ من المستخدمين في الأردن"). RLS-safe aggregate views only. Strongest engagement lever in the list, but needs user volume — sequence it last.
13. **Alert learning** — track dismiss/act-on per alert type in `engagementSignals`; suppress alert types a user consistently ignores. Turns the static rule thresholds into adaptive ones.

### Explicitly deferred / avoid

Neural time-series models (LSTM/transformer forecasting) — data volume per user doesn't justify it, kills explainability, and classical methods beat them at this granularity. Third-party ML services — keep the math in-repo, in TypeScript, consistent with the zero-dependency `deterministic/` ethos.

---

## Part 3 — Immediate next actions

1. Migration 013: `recurring_series`, `category_baselines`, `prediction_log`.
2. Build `recurringSeries.ts` + `behaviorProfile.ts` in `src/ai/deterministic/` (pure functions, unit-tested like `autoBudget.test.ts`).
3. Swap `projectEndOfMonthBalance` for the committed+discretionary range forecast; update the dashboard card to show the band.
4. Wire new signals into `updateRules.ts` and `promptComposer` so Mustasharak immediately sounds smarter.
5. Stand up the prediction ledger before marketing says the word "predictive" anywhere.

All work on a feature branch (`feature/predictive-engine`), PR into `main` per repo rules.
