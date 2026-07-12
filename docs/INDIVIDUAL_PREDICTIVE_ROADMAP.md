# Individual (Personal) Users — Predictive & Behavioural Product Roadmap

> **Status 2026-07-10:** A1+A2+A3+B1 ("Rasmalak يعرفك") LIVE since
> 2026-07-08. `feature/predictive-phase2` adds, dark behind flags:
> **C2** Ramadan mode (personal prior-year deltas + Eid envelope),
> **B2** habit insights with course prescriptions (Pillar-D signal→course
> map), **B4** cooling-off nudge (in-flow consent), and cold-start
> regional priors on the Plan tab.
> **Phase 4 implemented 2026-07-12** on `feature/predictive-phase4` (dark):
> B3 payday ritual, C1 remittance awareness, C3 zakat anniversary,
> C4 Hajj goal template, C5 school-fees sinking fund, Pillar E life-event
> check-in. THE INDIVIDUAL ROADMAP IS FULLY IMPLEMENTED — everything
> from here is release gates, tuning against real usage, and Pillar D's
> measured course→behaviour claims once the ledger has volume.

**Date:** 2026-07-02 · **Companion to:** `PREDICTIVE_ENGINE_AUDIT_AND_ROADMAP.md`
**Relationship between the two documents:** the engine doc describes the shared statistical machinery (recurring-series detection, forecasting, baselines, prediction ledger). This doc describes what the **individual consumer** actually sees, feels, and pays for. Every feature below consumes the engine; none duplicates it. The SME segment gets its own roadmap later, per the CLAUDE.md rule that SME features are not built before that section is finalized.

---

## Part 1 — Who the individual user is (and what the code already knows)

The `individual` segment is one of three in `UserProfile.segment` (`individual | self_employed | sme`). For this user, onboarding already captures **goals, segment, topics of interest, and income** — four signals the predictive layer currently ignores entirely. The app already ships individual-oriented assets the engine isn't connected to: a personal-zakat calculator, a UAE gratuity calculator, debt/credit and life-stage course tracks, and a full goals system.

The individual's defining traits in MENA, which the roadmap is built around: salary paid monthly on a fixed date (income is a *pulse*, not a stream); high recurring-commitment share (rent, remittances, school fees, family support); religious-calendar seasonality (Ramadan, Eid, Hajj/Umrah, zakat anniversary); and cash-flow anxiety concentrated in the last week before payday.

---

## Part 2 — Individual feature roadmap

### Pillar A — "My month starts on payday" (the core personal unlock)

**A1. Salary detection.** Once recurring-series detection (engine Phase 1, item 1) exists, run it on `type: 'income'`: infer payday date, salary amount band, and stability. Persist to `user_semantic_state` (`incomeStabilityScore` already exists; add `paydayDayOfMonth`, `detectedSalary`).

**A2. Salary-cycle budgeting.** Offer the user a budget month that runs **payday-to-payday** instead of calendar month. Every existing computation (`autoBudget`, pacing alerts, projections) parametrizes its window on cycle start rather than day 1. This single change makes every alert dramatically more accurate for salaried users — the current "spending too fast" rule fires falsely on day 2 of a calendar month when rent clears; anchored to payday, the committed-spend cliff is *expected*.

**A3. Safe-to-Spend (المتاح للصرف).** The flagship personal number, on the dashboard above the fold:

```
safeToSpend = currentBalance
            − remaining committed bills this cycle   (from recurring_series)
            − planned goal contributions this cycle  (from goalsStore)
            − reserve buffer (P75 discretionary forecast − P50)
then ÷ days to payday  →  "متاح لك اليوم: ٦٫٥ دينار"
```

Deterministic, explainable on tap ("لماذا هذا الرقم؟" breakdown), and the single most habit-forming feature in consumer PFM. Fits `deterministic/` as a pure function.

### Pillar B — Personal behaviour mirror (make `behaviorSignals` visible)

**B1. Spending personality card.** Surface the engine's archetype (المخطّط / المندفع / الموسمي / الحذر) on the dashboard with the two or three data points that produced it. People share personality results; this is the organic-growth feature.

**B2. Habit insights, individual-grade.** From `behaviorProfile.ts`: "ثلث مصاريفك المرنة تحدث في أول ٧٢ ساعة بعد الراتب" (impulse index), "مصاريف نهاية الأسبوع عندك ضعف أيام الدوام" (weekend ratio), subscription creep ("اشتراكاتك زادت ١٨٪ خلال ٦ أشهر" — recurring-series totals over time). Each insight pairs with one concrete nudge and one course link.

**B3. Payday ritual.** A push/in-app moment on detected payday: last cycle's report card (adherence streak, top win, top leak) + one-tap "pay yourself first" transfer suggestion into the top goal, sized by the goal-risk Monte Carlo (engine Phase 3, item 10). Streaks feed the gold-accent badge system.

**B4. Cooling-off nudge (opt-in).** When a discretionary transaction is logged in the first 72h post-payday and exceeds the category's P90, respond gently in the entry flow — behavioural, not judgmental, tone-checked by the existing `toneAndRiskFilter`.

### Pillar C — MENA-specific personal finance (the moat, individual edition)

**C1. Remittance intelligence.** Detect recurring outbound transfers (recurring-series on a remittance category/vendor). Forecast them in Safe-to-Spend, and — using the existing `src/lib/fx/` layer — surface rate context: "أرسلت عادةً يوم ٢٥؛ سعر الصرف هذا الأسبوع أفضل بـ ٢٪ من متوسط الشهر". Rate *information*, not transfer execution — no licensing exposure.

**C2. Ramadan & Eid personal mode.** Engine Phase 2 item 8 applied personally: pre-Ramadan, propose an adjusted plan from the user's own prior-year delta (groceries/iftar up, transport down, Eidiyah spike); year-1 users get country priors. Includes an Eidiyah envelope suggestion.

**C3. Zakat anniversary.** The personal-zakat calculator exists but is passive. Let the user set their zakat date (hijri); the engine then maintains a rolling nisab/holdings estimate and, 60 days out, predicts the zakat amount and proposes a monthly set-aside plan. Connects calculator → goals → forecast in one loop.

**C4. Hajj/Umrah goal template.** Pre-built goal with country-typical cost, funded by a Monte-Carlo-backed monthly plan ("بهذا المعدل، احتمال ٨٥٪ أن تكون جاهزًا لموسم ١٤٥٠هـ").

**C5. School-fees season.** Detect the annual education-fee pulse (large recurring-annual series); pre-fund it as an automatic sinking fund suggestion 3 months ahead.

### Pillar D — Behaviour-driven learning paths (only Rasmalak can do this)

The 10-subject course library (`SUBJECT_ORDER`) plus live behavioural data is a combination no competitor has. Map signals → course prescriptions, injected as the course recommendation on the dashboard and as Mustasharak suggestions:

| Detected signal | Prescribed track |
|---|---|
| No emergency fund goal + volatility high | `saving_emergency_planning` |
| Credit-card category growing + payoff calculator used | `debt_and_credit` |
| Savings rate ≥15% sustained 3 cycles | `investment_fundamentals` |
| Zakat/Islamic-finance engagement | `islamic_finance_basics` |
| Life-event detected (marriage/child categories appear) | `life_stage_financial_planning` |

Track course-completion → behaviour-change in the prediction ledger ("users who finished the emergency-fund course raised savings rate by X points") — that measured claim becomes both the retention loop and the marketing headline.

### Pillar E — Life-event awareness (Phase 3+)

Category-shift detection (new sustained categories: baby supplies, school, rent jump, wedding) triggers a respectful check-in ("يبدو أن هناك تغييرًا كبيرًا — هل تريد تعديل خطتك؟") that re-runs auto-budget with the new baseline and suggests goal/insurance/course adjustments. Never assume; always confirm with the user before re-profiling — write to memory only via the existing `updateRules` guardrails.

---

## Part 3 — Sequencing against the engine roadmap

| Engine phase (shared) | Individual features unlocked |
|---|---|
| Phase 1: recurring series + range forecast + baselines | A1 salary detection, A2 salary-cycle budgeting, A3 Safe-to-Spend, C5 school fees |
| Phase 2: behaviour signals + archetypes + Hijri seasonality | B1 personality card, B2 habit insights, B4 cooling-off, C2 Ramadan mode, Pillar D learning paths |
| Phase 3: Monte Carlo goal risk + server-side jobs | B3 payday ritual, C1 remittance intel, C3 zakat anniversary, C4 Hajj goal, Pillar E life events |

**Recommended first shippable individual release** ("Rasmalak يعرفك"): A1 + A2 + A3 + B1. One dashboard, four features, all downstream of engine Phase 1 — this is the release that makes "predictive budgeting and behaviour analysis" tangible to a personal user rather than a claim.

All UI work bilingual AR/EN, RTL-first, Arabic-Indic numerals, per repo conventions; new strings in `src/messages/{ar,en}/`; no purple.
