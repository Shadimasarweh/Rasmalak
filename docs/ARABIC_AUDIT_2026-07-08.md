# Rasmalak — Full Arabic Language Audit
**Date:** 2026-07-08 · **Branch audited:** `feature/predictive-engine` working tree (includes uncommitted report-pipeline changes)

## Scope & method

Thirteen parallel audit agents covered every Arabic surface in the product:

- All 14 `src/messages/ar/*` modules (~1,403 keys) against their English counterparts
- Hardcoded Arabic in components, pages, `src/lib/` (~208 locations)
- All 30 Arabic course files (10 subjects × 3 levels)
- The 5 legacy client-side PDF report generators + `csvExport` (pdfmake path)
- The server-side statutory report pipeline (`lib/pdf/`, `lib/xlsx/`, `api/reports`)
- The AI layer: prompts, agents, validation guardrails, alerts, vendor table, taxonomy

Mechanical integrity was verified by parsing all 1,403 ar keys with the `@formatjs` ICU parser. PDF-rendering claims were verified **by execution** against the installed pdfmake 0.3.3 / pdfkit 0.17.2 / fontkit 2.0.4 — they are not guesses.

**Totals: ≈570 findings — 154 high · ≈281 medium · ≈134 low.** Raw per-agent reports are appended at the bottom of this file.

---

## Verdict in one paragraph

The MSA core of the app is genuinely solid — `common.ts`, `money.ts`, the new onboarding wizard, and the new predictive-engine copy read native-grade, and the mechanical layer is exemplary (zero placeholder mismatches, zero escaping issues across 1,403 keys). But the product is not Arabic-release-ready: **every Arabic PDF from the legacy calculator pipeline renders financial figures with reversed digits** (numerically wrong documents), **the entire Arabic AI-safety guardrail layer is dead code** (a `\b` regex bug), the brand name is spelled **five different ways**, ~100 strings mix Levantine and Gulf dialect with MSA (sometimes both dialects in one sentence), and the intermediate/advanced course tier is lightly-edited machine translation with instrument-level terminology errors (trust rendered as "credit" throughout, syndication as "securitization"/"bonds") and several doctrinal errors in the Islamic-finance content.

---

## P0 — Correctness: Arabic output that is *wrong*, not just unpolished

1. **Legacy PDF pipeline (5 calculator reports) is unfit for financial documents.**
   `rtl()`'s U+202B/U+202C marks are Default-Ignorable — fontkit strips them; nothing implements the BiDi algorithm. Every multi-word Arabic string renders with **reversed word order**, and — because Arabic-Indic digits are Script=Arabic — every multi-digit amount renders with **reversed digits**: ١٢٣٤٫٥٦ prints as ٦٥٫٤٣٢١. Parens render backwards; the footer reads "page 5 of 1". Fix direction: real BiDi pass to visual order, or keep Western digits for numerics, or route these 5 reports through the (nearly sound) server-side shaper. Files: `src/calculators/*Report.ts`, `pdfReportBase.ts`, `arabicPdfHelper.ts`.

2. **Server-side PDF shaper (`src/lib/pdf/arabic.ts`) — 2 defects from safe.**
   Joining forms, lam-alef, tashkeel, digit runs, currency order all verified correct by execution. Remaining: (a) no bracket mirroring — every parenthesized Arabic string renders «)…(» inside-out (~11 strings per statutory report); (b) `builder.ts:186-188` footer double-reverses → «٥ من ١» ("5 of 1") and drops «صفحة». XLSX path is safe (Excel does native BiDi) — but SheetJS `ws['!rtl']` is never read; RTL view needs `wb.Workbook.Views[0].RTL`.

3. **Arabic AI guardrails never fire — `\b` never matches adjacent to Arabic letters.**
   All 7 Arabic prohibited-content patterns in `policyAgent.ts` (guaranteed returns, stock picks, tax evasion…), the **entire** Arabic tone/risk filter (`toneAndRiskFilter.ts`), and the Arabic financial keywords in `intentClassifier.ts:338` are dead code. Verified: `/\bمضمون\b/` fails on «ربح مضمون». Fix: drop `\b` around Arabic or use `\p{Arabic}` lookarounds with `/u`. 13 patterns across 3 files.

4. **Raw English enum keys shown to Arabic users (10 slots).**
   Zakat PDF & XLSX category column prints `gold_24k`, `silver_utensils`, `cash` (`lib/pdf/reports.ts:421`, `lib/xlsx/reports.ts:331`); alerts produce «صرف عالي على food» and create goals literally named «توفير food» (`alerts.ts:206-347`); `dashboardNotifications.ts:94` same leak. Root cause: two diverging Arabic category-label sources exist (`constants.ts` `nameAr` vs `messages/ar/categories.ts`) and the AI layer uses **neither**.

5. **Statutory/legal accuracy.**
   - **UAE gratuity cites a repealed regime**: Decree-Law 33/2021 abolished unlimited contracts and resignation reductions, yet the calculator defaults to «غير محدود» with 1/3–2/3 cuts while claiming «حسب قانون العمل الإماراتي». Official term: «محدد المدة». Also omits the two-year-wage cap (المادة 51/2).
   - **Jordan income tax**: pension exemption is per-**month** (first JOD 2,500) but the label says «(سنوي)» — instructs users to enter the wrong amount. Also omits المساهمة الوطنية (1% above 200k).
   - **KSA gratuity**: flat-rate simplification of المادتين 84/85 can overstate awards >5y while the PDF asserts conformity («وفق نظام العمل السعودي») — hedge as «تقرير تقديري استناداً إلى…».
   - **Zakat**: never mentions حَوَلان الحَوْل (the hawl condition); course lesson defines zakat as «مساهمة خيرية إلزامية» — doctrinally wrong (it is فريضة).
   - **Course fact**: KSA GOSI employer contribution stated as «مساهمة مماثلة» to 9.75% — employer is 11.75%.

6. **Currency-symbol collision:** `src/lib/currencies.ts:94` gives USD the abbreviation **«د.أ» — the Jordanian dinar's abbreviation**, two entries below JOD's «د.ا». Direct money-confusion risk. Also IQD «ع.د» is reversed (standard is «د.ع»; `constants.ts` disagrees with `currencies.ts`), LYD «ل.د» → «د.ل». Two conflicting currency-metadata sources exist.

7. **Meaning-inverting UI strings:** `QuickAddFAB.tsx:85` budget warning at 120% reads «120% فوق الميزانية» ("120% *above* budget" = 2.2×) — wrong meaning; Jordan bracket labeling and `insights` mislabels below also change claims. Course content: sunk-cost lesson teaches **applying** sunk-cost logic (inverted), Nash equilibrium misdefined (EN too), BEPS framed as a recommended strategy (inverted), «لا يجب أن يتجاوز» inverts a sharia screening rule to "need not".

---

## The five systemic failures

### 1 · Brand spelled five ways
«رَسمالَك / رسمالك» (canonical — onboarding, messages) · «رسملك» (auth heroes, tools copyright, community page **live**, all 5 PDF footers, `lib/pdf/builder.ts`) · «راسمالك» (layout.tsx SEO metadata ×3 **and all 6 AI identity prompts** — the model is being taught the misspelling and reproduces it at scale) · «رأسمالك» (courses ×6, incl. «رأسمالك AI») · plus EN-Latin "Rasmalak" mid-Arabic. One grep-and-fix pass + AI prompt update. ~20 files.

### 2 · Three-register dialect mixing (~100 keys)
Levantine (رح، شو، اللي، عشان، هذي، منيح) + Gulf (تبي، وين، أبغى) + MSA coexist; two sentences mix **both dialects at once** (`onboarding.step3_title` «شو تبي تتعلم؟», `settings.two_factor_disable_confirm`). Register follows file age — legacy files are dialect, new files are clean MSA. Worst concentrations: `alerts.ts` (13 canned Jordanian-dialect strings served to **all** Arabic users incl. Gulf/Egyptian), settings 2FA/password/danger-zone, legacy onboarding block, `lib/translations.ts` colloquial islands (some **live**: community page, budget subtitle, reset-password validation). Decision codified from `docs/arabic-style-guide.md`: modern MSA everywhere.

### 3 · Broken Arabic plurals (~30 sites)
17 bare-count message keys («{count} أيام», «٣٠ دورات», «3 معاملة»), ~10 component template sites («منذ 1 أسابيع», «٥ بنداً»), and 6 AI-template families — while 8 newer keys have **exemplary** 6-branch ICU plurals (the team knows the pattern; legacy never migrated). Learn tab renders «٣٠ دورات» today.

### 4 · Numeral-system chaos (71 keys + templates)
Western digits inside Arabic text concentrated in `ar/tools.ts` (54 keys — validations, zakat «عيار 24», brackets «أول 5000 دينار»); Latin `%` vs «٪» split; `$`-prefixed amounts in onboarding income ranges; `fmtPct` hardcodes Latin `%`; raw JS number interpolation beside Arabic-Indic digits in chat agent context. New calculators regressed vs older ones («مثال: ٢٠٠٬٠٠٠» done right).

### 5 · Courses: beginner tier ≠ intermediate/advanced tier
Beginner average **7.3/10** (insurance 8.5, sme 8, taxes 8 — genuinely well-written, accurate regional facts). Intermediate **5.0**, advanced **4.75** — lightly-edited MT: ~30 lessons open with the title glued into the first sentence (garbled openings, inherited from EN), ~70 empty `p` blocks, ~55 «الخطوة العملية:» block-type defects, «المتوسطون» persona calque ~60× ("the average/mediocre ones"), duplicated lessons (sme_adv 6/13, saving_adv 4/9, one EN lesson silently dropped), and wrong-instrument terminology throughout: **trust → «ائتمان» (credit) ~15×** (correct: «صناديق استئمانية»), syndication → «توريق»/«سندات», warrants → «ضمانات», durable POA → «وكالة قانونية متينة». Islamic content has 3 doctrinal highs (zakat definition, riba attributed to reader's debts, الشريعة glossed as «القانون» in the maqasid lesson) against otherwise accurate fiqh terms.

---

## Area scorecard

| Area | Strings | H/M/L | Score |
|---|---|---|---|
| Core UI (auth, onboarding, settings, nav, categories) | ≈345 | 4/42/23 | 6.5 |
| Finance UI (dashboard, transactions, money) | ≈487 | 13/46/20 | 6.5 |
| Tools · Chat · Learn | ≈565 | 13/26/18 | 6 |
| Legacy calculator PDFs (client-side) | ≈225 | 15/16/20 | **4 — not ship-safe** |
| Statutory calcs + server report pipeline | ≈370 | 10/12/12 | 6.5 |
| AI layer (27 files) | ≈420 | 12/19/13 | 6 |
| Components + lib + hardcoded | ≈560 | 12/27/15 | 6 |
| Courses (30 files) | 30 courses | 75/119/21 | 4–8.5 |
| Mechanical i18n integrity | 1,403 keys | structural: clean | ✔ |

Course matrix (beginner / intermediate / advanced):
foundations 6.5/4.5/5.5 · budgeting 6/4.5/4 · debt 7/5.5/4.5 · insurance **8.5**/5.5/4.5 · invest 7/4.5/4.5 · islamic 7.5/5.5/6 · life 7/4/4 · saving 7.5/4.5/5 · sme **8**/6/4.5 · taxes **8**/5.5/5

---

## Decisions needed (product calls, flagged not fixed)

1. **Safe-to-Spend:** «المتاح للصرف» → suggested «المتاح للإنفاق بأمان» (drops "safe"; الصرف also reads FX; app elsewhere uses الإنفاق). Defensible either way — pick one.
2. **Insights:** dashboard section labeled «التنبيهات» (Alerts) — collides with the notification panel concept. Suggested «رؤى مالية».
3. **Personality archetype:** impulsive rendered «المندفع» (judgmental, embedded in the shareable card) — EN deliberately softened to "The Spontaneous"; suggested «العفوي».
4. **Advisor brand:** nav/chat use generic «المستشار» while EN keeps brand "Mustasharak" — «مستشارك» (transactions.ts already uses it).
5. **Regionalisms as warmth vs pan-MENA neutrality:** «مونة وبقالة» (Levantine), «جوال» (Gulf), «حاسبة التمويل» (deliberate Gulf idiom) — keep or neutralize.
6. **Statutory currency pattern:** Jordan/KSA reports pin statutory currency (د.أ/ر.س) but UAE gratuity + zakat use the user's app currency — UAE gratuity is AED-denominated by law. Unify.
7. **EN copy claim mismatch:** EN hero says "over 50,000 users", AR says «آلاف» — which claim is intended?

---

## Fix plan

**P0 (before any Arabic release):** legacy PDF digit/word reversal (or route through server shaper) · server shaper bracket mirroring + footer · `\b`→`\p{Arabic}` guardrail fix (13 patterns, 3 files) · zakat/alerts raw enum keys (10 slots) · UAE repealed-law basis + Jordan pension (سنوي→شهري) + KSA hedging · USD «د.أ» symbol · QuickAddFAB 120% message. *Mostly small, surgical diffs; the PDF BiDi fix is the only real project.*

**P1 (brand + register + plurals):** brand unification grep («رسملك|راسمالك|رأسمالك») incl. 6 AI prompts + SEO metadata · MSA pass on ~100 dialect keys (alerts.ts full rewrite; settings security block; legacy onboarding; live translations.ts islands) · ICU-plural migration for 17 keys + 10 component sites (pattern already exists in newer keys) · numeral normalization (fmtPct ٪, tools.ts 54 keys, $ prefixes).

**P2 (courses program):** scriptable structural pass first — strip glued titles (~30 lessons, fixes EN too), delete empty blocks (~70), convert «الخطوة العملية:» plain-p to `action_prompt` (~55), de-duplicate lessons — then a terminology pass from one glossary (استئماني، القروض المشتركة، حقوق شراء الأسهم، الأمراض الحرجة، المالية الشخصية…), then a human re-edit of the 20 int/adv files (beginners need only light polish).

**Quick wins (single greps):** «رسملك» ×~10 · «جاري» → «جارٍ» ×8 · «لازم يكون» → «يجب أن يكون» ×24+ in tools validations · «تحميل التقرير» → «تنزيل» ×9 · «جاري التحميل...» for *Generating* → «جارٍ إنشاء التقرير...» ×13.

---

## What's genuinely good — don't touch

`common.ts` flawless · `money.ts` uniformly clean MSA with correct tanwīn · new onboarding wizard at target register · **new predictive-engine copy near-native with exemplary 6-branch plurals** · insurance/sme/taxes/saving beginner courses (7.5–8.5) · fiqh terminology accurate (مرابحة، إجارة، صكوك، تورق، مشاركة متناقصة، قرض حسن) · statutory institutional vocabulary sound (النصاب 85/595 جرام، دائرة ضريبة الدخل والمبيعات، نظام/قانون العمل correctly differentiated by country) · input-side dialect detection genuinely good (وين/فين/شلون/ازاي/بدي/أبغى all work) · mechanical layer: zero placeholder mismatches, zero escaping issues, no missing-in-ar keys.

**Predictive-engine release gate (PR #10):** the draft-marked Arabic in `dashboard/settings` passes native review with a short punch list: the 4 flagged decision items above (#1–3), 4 `ef_*`/`sts_*` plural keys, the RTL arrow in `sts_per_day_formula`, and the missing zero branch in `sts_until_cycle_end`.

**Curiosity worth knowing:** 40 keys exist in Arabic but are missing from the **English** catalog (28 live via inline `defaultMessage`) — Arabic-first development outpaced English. 10 ids referenced in code exist in *neither* catalog and render English in the Arabic UI (`settings.accent_color`, `transactions.currency_label`, …).

---
---

# Appendix — Raw per-agent reports



---

# Agent 1 — Core UI messages (app, auth, common, nav, onboarding, settings, categories, subcategories)

## FINDINGS

[high|grammar] file=src/messages/ar/auth.ts key=hero_title
current: «أدر أموالك بذكاء مع رسملك»
proposed: «أدر أموالك بذكاء مع رسمالك»
why: Brand name misspelled — missing alif («رسملك» vs canonical «رَسمالَك» in app.ts); kills the رأس مالك wordplay, reads as a typo on the login hero.

[high|grammar] file=src/messages/ar/auth.ts key=master_money_title
current: «أدر أموالك مع رسملك»
proposed: «أدر أموالك مع رسمالك»
why: Same brand misspelling «رسملك» on the signup hero (correct spelling is used in onboarding.ts).

[high|register] file=src/messages/ar/onboarding.ts key=step3_title
current: «شو تبي تتعلم؟»
proposed: «ماذا تريد أن تتعلم؟»
why: Hybrid of two dialects in one sentence — Levantine «شو» + Gulf «تبي» — jarring/embarrassing to native readers of either region.

[high|register] file=src/messages/ar/settings.ts key=two_factor_disable_confirm
current: «متأكد تبي تعطل التحقق بخطوتين؟ حسابك رح يكون أقل أماناً.»
proposed: «هل أنت متأكد من رغبتك في تعطيل التحقق بخطوتين؟ سيصبح حسابك أقل أماناً.»
why: Gulf «تبي» + Levantine «رح» mixed in one security-critical confirmation; cross-dialect hybrid reads careless.

[medium|grammar] file=src/messages/ar/auth.ts key=remember_for_days
current: «تذكرني لمدة 30 يوم»
proposed: «تذكرني لمدة 30 يوماً»
why: Counted noun after 11–99 must be accusative singular (تمييز): «30 يوماً».

[medium|register] file=src/messages/ar/auth.ts key=hero_subtitle
current: «انضم لآلاف المستخدمين في المنطقة العربية اللي بيديرون ميزانياتهم واستثماراتهم بالذكاء الاصطناعي.»
proposed: «انضم إلى آلاف المستخدمين في المنطقة العربية الذين يديرون ميزانياتهم واستثماراتهم بالذكاء الاصطناعي.»
why: Colloquial relative «اللي» + b-imperfect «بيديرون» on the marketing hero; also EN says "over 50,000 users" while AR says "thousands" (fidelity — confirm which claim is intended).

[medium|grammar] file=src/messages/ar/auth.ts key=master_money_subtitle
current: «انضم لآلاف المستخدمين في المنطقة العربية اللي بيتحكمون في مستقبلهم المالي. تتبع مصاريفك وحدد ميزانياتك ونمّي ثروتك.»
proposed: «انضم إلى آلاف المستخدمين في المنطقة العربية الذين يتحكمون في مستقبلهم المالي. تتبّع مصاريفك، وحدّد ميزانياتك، ونمِّ ثروتك.»
why: «اللي بيتحكمون» colloquial; «نمّي» is feminine/colloquial imperative — masculine address requires «نمِّ» (defective verb نمّى).

[medium|register] file=src/messages/ar/auth.ts key=no_account
current: «ما عندك حساب؟»
proposed: «ليس لديك حساب؟»
why: Colloquial «ما عندك»; same pattern in 4 auth keys — have_account («عندك حساب؟» → «لديك حساب بالفعل؟»), password_too_short («لازم تكون» → «يجب أن تتكون كلمة المرور من 6 أحرف على الأقل»), agree_terms_required («لازم توافق» → «يجب الموافقة على شروط الخدمة وسياسة الخصوصية» — also restore "Terms of Service" dropped to «الشروط»).

[medium|grammar] file=src/messages/ar/onboarding.ts key=step2_title
current: «عرّفنا عن نفسك»
proposed: «عرّفنا بنفسك»
why: Wrong preposition — عرّف takes بـ, not عن.

[medium|register] file=src/messages/ar/onboarding.ts key=step_income_subtitle
current: «هذا هو السقف لميزانيتك الشهرية. تقدر تعدله في أي وقت.»
proposed: «هذا هو سقف ميزانيتك الشهرية، ويمكنك تعديله في أي وقت.»
why: «تقدر تعدله» colloquial inside otherwise-MSA new wizard; «السقف لميزانيتك» should be إضافة.

[medium|terminology] file=src/messages/ar/onboarding.ts key=step_expense_subtitle
current: «لا داعي لتفصيل الإيجار والكهرباء والمواد — فقط اختر الأقرب لوضعك. تقدر تعدل بعدين.»
proposed: «لا داعي لتفصيل الإيجار والكهرباء والمواد الغذائية — فقط اختر الأقرب لوضعك، ويمكنك التعديل لاحقاً.»
why: «المواد» alone means "materials", not groceries; «تقدر تعدل بعدين» colloquial.

[medium|calque] file=src/messages/ar/onboarding.ts key=expense_preset_lean_desc
current: «الأساسيات تستخدم حوالي 40% من دخلي»
proposed: «الأساسيات تستهلك حوالي 40% من دخلي»
why: "Essentials use X%" calqued — expenses تستهلك a share of income, not تستخدم; same in expense_preset_average_desc, expense_preset_heavy_desc (3 keys).

[medium|register] file=src/messages/ar/onboarding.ts key=income_prefer_not
current: «أفضل ما أفصح»
proposed: «أفضّل عدم الإفصاح»
why: Fusha verb with colloquial «ما» negation — hybrid reads broken in writing.

[medium|mixed] file=src/messages/ar/onboarding.ts key=income_under_1000
current: «أقل من $1,000»
proposed: «أقل من 1,000 دولار»
why: Leading $ with Latin digits breaks RTL flow; same in income_1000_3000, income_3000_5000, income_5000_10000, income_over_10000 (5 keys).

[medium|register] file=src/messages/ar/onboarding.ts key=step1_subtitle
current: «عشان نقدم لك أفضل النصائح، خبرنا عن أهدافك.»
proposed: «لنقدّم لك أفضل النصائح، أخبرنا عن أهدافك.»
why: Legacy-wizard block is wholesale Levantine/Gulf colloquial — «عشان، خبرنا، خلنا، شو، وين، اللي، بعدين، شي ثاني»; ~8 keys: step1_title, step1_question, step2_subtitle (يساعدنا نخصص — missing أن), step3_subtitle, step4_subtitle (يساعدنا نقترح), goal_something_else («شي ثاني» → «شيء آخر»), country_title («وين تقيم؟» → «أين تقيم؟»).

[medium|clarity] file=src/messages/ar/settings.ts key=base_currency_confirm_body
current: «سيتم إعادة احتساب تاريخ معاملاتك بالعملة الجديدة باستخدام أسعار الصرف التاريخية. القيم التي أدخلتها أصلاً لا تتغير.»
proposed: «سيُعاد احتساب سجل معاملاتك بالعملة الجديدة باستخدام أسعار الصرف التاريخية. المبالغ التي أدخلتها أصلاً لن تتغير.»
why: «تاريخ معاملاتك» misreads as transaction *date* in a money-critical dialog; "history" here is «سجل».

[medium|clarity] file=src/messages/ar/settings.ts key=payday_required_error
current: «اختر يوم راتبك قبل التحويل إلى دورة الراتب.»
proposed: «اختر يوم راتبك قبل التبديل إلى دورة الراتب.»
why: In a finance app «التحويل» reads as money transfer; switching a setting is «التبديل».

[medium|grammar] file=src/messages/ar/settings.ts key=sign_out_all
current: «خروج من كل الأجهزة الثانية»
proposed: «تسجيل الخروج من جميع الأجهزة الأخرى»
why: «الثانية» colloquial for "other" — MSA reads "the second"; same in all_sessions_signed_out.

[medium|register] file=src/messages/ar/settings.ts key=two_factor_step3_desc
current: «احفظ هذي الرموز في مكان آمن — تقدر تستخدمها للدخول إذا فقدت هاتفك.»
proposed: «احفظ هذه الرموز في مكان آمن — يمكنك استخدامها للدخول إلى حسابك إذا فقدت هاتفك.»
why: «هذي» dialect orthography + «تقدر», in security-critical recovery-codes flow.

[medium|register] file=src/messages/ar/settings.ts key=password_incorrect
current: «كلمة المرور الحالية غلط»
proposed: «كلمة المرور الحالية غير صحيحة»
why: «غلط» colloquial and masculine vs feminine كلمة; same two_factor_invalid_code («الرمز غلط. حاول مرة ثانية.» → «رمز التحقق غير صحيح. حاول مرة أخرى.»).

[medium|register] file=src/messages/ar/settings.ts key=password_requirements
current: «لازم تكون 8 أحرف على الأقل وفيها حرف كبير وصغير ورقم»
proposed: «يجب أن تتكون كلمة المرور من 8 أحرف على الأقل، وتتضمن حرفاً كبيراً وحرفاً صغيراً ورقماً»
why: «لازم … فيها» colloquial validation rule.

[medium|register] file=src/messages/ar/settings.ts key=delete_account_confirm_desc
current: «رح ينحذف حسابك وكل بياناته نهائياً. ما يمكن التراجع.»
proposed: «سيُحذف حسابك وجميع بياناته نهائياً، ولا يمكن التراجع عن ذلك.»
why: Levantine «رح» + colloquial passive «ينحذف»; same «رح» in danger_zone_warning and sign_out_all_confirm (3 keys).

[medium|register] file=src/messages/ar/settings.ts key=delete_account_confirm_title
current: «تحذف حسابك؟»
proposed: «هل تريد حذف حسابك؟»
why: Bare colloquial interrogative on destructive-action modal; MSA needs هل.

[medium|terminology] file=src/messages/ar/categories.ts key=refunds
current: «مرتجعات»
proposed: «مبالغ مستردة»
why: «مرتجعات» is merchant vocabulary for returned goods; refunded money is «مبالغ مستردة/استرداد».

[medium|register] file=src/messages/ar/subcategories.ts key=groceries_snacks
current: «سناكات وحلويات»
proposed: «وجبات خفيفة وحلويات»
why: «سناكات» transliterated English with Arabic plural.

[medium|fidelity] file=src/messages/ar/nav.ts key=chat
current: «المستشار»
proposed: «مستشارك»
why: EN nav keeps brand "Mustasharak" (مستشارك); Arabic drops possessive brand to generic (same in chat.ts title).

[low|calque] auth.trusted_by: «موثوق من المستخدمين الأوائل» → «محل ثقة المستخدمين الأوائل» (drops required به)
[low|grammar] settings.allowed_formats: «الصيغ المسموحة: JPEG, JPG, PNG, GIF» → «الصيغ المسموح بها: JPEG وJPG وPNG وGIF» (سمح takes بـ; Latin commas)
[low|grammar] settings.budget_cycle_description: «اختر إن كانت... أو تمتد» → «اختر ما إذا كانت... أم تمتد» (أم required)
[low|clarity] onboarding.persona_variable_desc: «عمل حر، صاحب مشروع، أو متعاقد» → «مستقل، أو صاحب مشروع، أو متعاقد» (parallelism)
[low|calque] onboarding.persona_student_desc: «في المدرسة» reads K-12 → «ما زلت تدرس»
[low|clarity] onboarding.step_expense_question: «كم نسبة دخلك» → «ما نسبة دخلك» (non-numeric answer takes ما)
[low|clarity] onboarding.step_aha_subtitle: «صندوق طوارئ لـ 3 أشهر» → «صندوق طوارئ يغطي 3 أشهر»
[low|clarity] subcategories.tv_streaming: «تلفزيون وبث» → «تلفزيون وخدمات بث»
[low|register] subcategories.groceries_pantry: «مونة وبقالة» Levantine-regional — product decision (keep as warm localization or «مواد تموينية وبقالة»)
[low|register] subcategories.mobile: «جوال» Gulf-flavored vs Jordan «خلوي» — pick pan-MENA or accept skew
[low|fidelity] app.tagline: «شريكك المالي الذكي» vs EN "Advisor" — likely deliberate; confirm
[low|register] settings.email_notifications_description: «استلم تحديثات على بريدك» → «استلام التحديثات عبر البريد الإلكتروني» (masdar for toggles; also push_notifications_description)
[low|grammar] onboarding.segment_sme_desc: «أدير مشروع أو شركة صغيرة» → «أدير مشروعاً أو شركة صغيرة» (accusative)
[low|grammar] onboarding.aha_saving: «جاري إعداد...» → «جارٍ إعداد...» (also settings saving/verifying/deleting — 4 keys)
[low|clarity] settings.budget_cycle_change_note: «نوافذ الميزانية» calque → «فترات الميزانية»
[low|fidelity] settings.two_factor_last_used: «آخر استخدام» vs EN "Last verified" → «آخر تحقق»

## SYSTEMIC
- Three registers coexist: clean MSA (new onboarding wizard, currency-engine strings, common.ts), Levantine (رح، اللي، شو، عشان، هذي — settings sessions/danger-zone + legacy onboarding), Gulf (تبي، وين، بعدين). ~30 keys affected across auth.ts, onboarding.ts (legacy block), settings.ts (2FA/password/sessions/danger zone). Two cross-dialect hybrid sentences (onboarding.step3_title, settings.two_factor_disable_confirm). One MSA pass on auth + settings security/danger + legacy onboarding fixes ~80% of findings.
- Brand spelling split: «رسمالك» correct in onboarding.ts vs «رسملك» (missing alif) 2× in auth.ts + ar/tools.ts copyright (`© {year} رسملك`). Repo-wide grep for «رسملك» recommended.
- «جاري» vs «جارٍ» inconsistent (4 wrong keys).
- «تسجيل خروج» vs «تسجيل الخروج» — standardize with article.
- User address consistently masculine singular across all 8 files — genuinely consistent, keep as documented convention.
- No ICU plural/select in this batch; one hardcoded counted-noun bug (auth.remember_for_days «30 يوم»).
- Latin symbols in RTL: $-prefixed amounts (5 onboarding income keys), Latin commas in allowed_formats.
- Team self-flag: settings.ts:153 comment «بحاجة لمراجعة لغوية قبل الإطلاق» — covered by this audit.
- Genuinely good: common.ts flawless; «كلمتا المرور غير متطابقتين» correct dual; «أبقِ» correct; «الشهر الميلادي» smart; categories/subcategories read like real MENA supermarket; new onboarding wizard at target register.

## TERMS
budget=الميزانية; savings=الادخار; goal=هدف; transaction=معاملة; expenses=المصاريف; essentials=الأساسيات; income=الدخل; salary=راتب; payday=يوم الراتب; budget cycle=دورة الميزانية; emergency fund=صندوق الطوارئ; safety net=شبكة الأمان; debt=الديون; account=الحساب; base currency=العملة الأساسية; exchange rates=أسعار الصرف; dashboard=لوحة التحكم; calculators=الحاسبات; tools=الأدوات; 2FA=التحقق بخطوتين; recovery codes=رموز الاسترداد; password=كلمة المرور; notifications=الإشعارات; refunds=مرتجعات (flagged); allowance=مصروف.

## STATS
strings ≈345; high/med/low = 4/42/23; score 6.5/10 — MSA core native-grade, but brand misspellings + unmanaged 3-way register mixing.


---

# Agent 2 — Finance UI messages (dashboard, transactions, money)

## HIGH FINDINGS

[plural] dashboard.days_count: «{count} أيام» → full ICU plural (zero/one/two/few/many/other); breaks for 1, 2, 11+; streak counter makes 1 most common.
[plural] dashboard.ef_months_covered: «{months} أشهر مغطاة» → breaks for 1/2 and decimals (2.5).
[plural] dashboard.ef_target_months: «الهدف: {months} أشهر من المصاريف» → 12 renders «12 أشهر» (needs شهراً).
[plural] dashboard.ef_baseline_basis: «... {months} شهر من السجل» → wrong for 3-10 («6 شهر» should be ٦ أشهر).
[plural] dashboard.sts_per_day_formula: «÷ {days} يوماً حتى الراتب → {perDay} يومياً» → يوماً wrong for 1-10; ALSO → arrow points wrong way in RTL (should be ←).
[plural] dashboard.personality_evidence_small_txn: «{count} معاملة صغيرة أسبوعياً» → 3-10 typical case broken.
[plural] transactions.transaction_count: «{count, plural, =0 {ما في معاملات} =1 {معاملة واحدة} other {{count} معاملة}}» → missing two/few; «3 معاملة» broken; =0 uses dialect «ما في».
[plural] transactions.filtered_count: «{filtered} من {total} معاملة» → «من 5 معاملة» broken.
[terminology] dashboard.sts_title + sts_breakdown_total: «المتاح للصرف» → «المتاح للإنفاق بأمان» — drops "safe" concept; الصرف also reads FX (سعر الصرف); app elsewhere uses الإنفاق. [NOTE: naming decision — defensible either way, flag to user]
[fidelity] dashboard.insights_section: «التنبيهات» → «رؤى مالية» — EN "Insights" ≠ Alerts; collides with NotificationPanel concept.
[fidelity] dashboard.no_insights: «لا توجد تنبيهات» → «لا توجد رؤى حالياً».
[fidelity] dashboard.personality_archetype: impulsive rendered «المندفع» → «العفوي» — EN deliberately softened to "The Spontaneous"; المندفع judgmental on shareable card (personality_share_text embeds it).

## MEDIUM (condensed)

[register] ~18 dialect keys in dashboard+transactions: goals_delete_confirm «متأكد تبي تحذف هذا الهدف؟», no_goals_yet/goals_no_goals «ما عندك أهداف بعد», no_budgets_set «ما حددت ميزانيات بعد», no_spending_this_week «ما في إنفاق هذا الأسبوع», no_monthly_data «ما في معاملات هذا الشهر», add_first_transaction_hint «عشان تشوف رصيدك», continue_learning «كمّل التعلم», personality_archetype_desc seasonal «لكل شهر عندك طابعه الخاص», transactions.expense_description_placeholder «صرفت على شو؟», no_transactions «ما في معاملات», no_transactions_recorded, delete_confirm «متأكد تبي تحذف {type}…», delete_warning «ما يمكن التراجع عن الحذف.», error_amount_required «المبلغ لازم يكون رقم أكبر من صفر», scan_receipt_subtitle «رح نستخرج», scan_error_title «حصل خطأ». Fixes: هل أنت متأكد من حذف…/لا توجد لديك أهداف بعد/لم تحدد ميزانيات بعد/لا يوجد إنفاق هذا الأسبوع/لا توجد معاملات هذا الشهر/أضف أول معاملة لترى رصيدك/واصل التعلم/لكل شهر لديك طابعه الخاص/علامَ صرفت؟/يجب أن يكون المبلغ رقماً أكبر من صفر/وسنستخرج المبالغ تلقائياً/حدث خطأ.
[grammar] Missing tanwīn ~9 keys: add_expense «أضف مصروف» → «أضف مصروفاً», add_income «أضف دخل», goals_add_funds «أضف مبلغ», ef_add_funds «أضف أموال», transactions add_expense/add_income/empty_add_expense/empty_add_income/description_placeholder. money.ts does it correctly — inconsistent house grammar.
[grammar] dashboard.goals_saved + saved_label: «تم ادخار» dangling masdar → «المدّخر».
[grammar] dashboard.day_mon: «إثنين» → «اثنين» (hamzat waṣl).
[calque] goals_mark_complete: «حدد كمنجز» → «اعتبره منجزاً» (+hint).
[calque] coach_goal_desc: «ادخر نحو شيء مهم» → «ادخر من أجل»; Latin list-comma «، أو».
[terminology] payday_detected_cta: «التحويل لدورة الراتب» → «التبديل إلى دورة الراتب» (تحويل reads money transfer).
[plural] sts_until_cycle_end: missing zero branch → «٠ يوم حتى نهاية الشهر» on last day (sister key handles zero).
[fidelity] no_transactions: «لا توجد معاملات» vs EN rewritten "Ready to start your journey" — meanings diverged.
[terminology] recurring_charges: «الرسوم المتكررة» → «المدفوعات المتكررة» — رسوم = fees in MENA banking; also dashboard.budgets_recurring_charges + money.plan_recurring_heading (which drops EN "(locked in)" → add «(مثبّتة)»).
[terminology] money.track_empty_title: «لا توجد عمليات بعد» → «معاملات» — only place using عمليات.
[mixed] money.track_over_plan_warning: Latin % → ٪; «يجعل … عند» calque → «يوصل … إلى».
[calque] money.plan_total_question: «بشكل إجمالي» → «إجمالاً».
[clarity] money.plan_savings_over_body: bare «+» in prose + «تجمع» → «مجموع… يبلغ».
[clarity] money.plan_midmonth_warning_title: «هذه للخطة فقط — لشهر قادم.» → «هذا القسم للتخطيط للشهر القادم فقط.»
[calque] money.section_subtitle: «خطط، تتبع، وقارن» Oxford comma → «خطّط وتتبّع وقارن».
[mixed] money.timeline_step_label: «من 3» → «من ٣»; dashboard.ef_recommended «بـ 6 أشهر» → «بـ٦ أشهر».
[clarity] personality_evidence_weekend: «{ratio}× أيام الدوام» — drops "average" (changes statistical claim); الدوام regional → «متوسط أيام العمل».
[mixed] transactions.amount_signed: raw leading ASCII signs vs dashboard's bidi-safe RLM version of SAME key — render differently in RTL.

## LOW (condensed)

guest_user «مستخدم» drops brand; quick_actions «اختصارات» → «إجراءات سريعة»; explore_context «التفاصيل» drops "& Analysis"; used «مستخدم» → «مستخدَمة» (after 75٪, agrees with الميزانية); min_read «{min} د قراءة» → «قراءة {min} د»; ef_cadence_label «وتيرة التغذية» reads nutrition → «وتيرة تغذية الصندوق»; scan_field_vendor «المورّد» B2B → «المتجر»; forecast_end_balance «و {high}» → «و{high}» (attached waw); payday_detected_body add هل; money.wizard_step1_body «لما تريد أن تصرف» → «لِما تريد أن تصرفه»; plan_total_placeholder «إجمالي النية الشهرية» odd; scan_upload_formats «ميغا» → «ميغابايت»; top_spending «أعلى الإنفاق» → «الأعلى إنفاقاً»; learn_budgeting «تعلّم الميزانية» → «تعلّم إعداد الميزانية».

## SYSTEMIC
- Dialect mixing ~18 keys in dashboard+transactions (تبي شو رح عشان لازم كمّل ما في ما عندك); money.ts uniformly clean MSA — register split follows FILE AGE. Same-file clashes: MSA «لا توجد معاملات» beside dialect «ما في معاملات».
- Broken plurals: 8 legacy keys vs 7 newer keys with PERFECT zero/one/two/few/many/other (sts_days_to_payday, personality_evidence_streak, personality_evidence_drift, scan_line_items_toggle, scan_save_items, receipt_child_count, delete_receipt_confirm). Team knows the pattern; legacy never migrated.
- Missing tanwīn on «أضف + مفعول»: 9 keys; money.ts correct.
- Numeral split: Arabic-Indic mostly, Latin literals in ef_recommended, timeline_step_label, track_over_plan_warning.
- الإنفاق vs الصرف split (STS block vs rest).
- مصروفات vs مصاريف both used.
- LTR arrows → in RTL strings don't bidi-mirror: sts_per_day_formula, trend_indicator.
- Latin list punctuation habits (comma before و; bare +).

## TERMS
budget=الميزانية; on_track=ضمن الحد; over=تجاوز الحد; savings=الادخار/المدخرات; savings rate=معدل الادخار; transaction=معاملة (عمليات once); expense=مصروف/مصروفات (مصاريف ×5); income=الدخل; balance=الرصيد; cash flow=التدفق النقدي; spending=الإنفاق (الصرف in STS); safe-to-spend=المتاح للصرف; forecast=توقّع; payday=يوم الراتب; pay cycle=دورة الراتب; recurring charges=الرسوم المتكررة (flagged); subscription=اشتراك; goal=هدف; emergency fund=صندوق الطوارئ; deposit=إيداع; withdraw=سحب; safety buffer=هامش أمان; insights=التنبيهات (flagged); plan=الخطة; intention=النيّة; vendor=المورّد (flagged); receipt=إيصال; line item=بند; personality=الشخصية المالية (المخطّط/المندفع/الموسمي/الحذر).

## KEY-PARITY
dashboard.ts: 15 AR-only keys (budgets_recurring_charges, budgets_recurring_auto_detected, budgets_annual_total, saved_label, overspent_label, this_month_suffix, literacy_score, literacy_score_desc, improve, rec_budgeting(+desc), rec_saving(+desc), rec_investing(+desc)). transactions.ts: 19 AR-only keys. money.ts 1:1. en/dashboard.ts:243 comment contains Arabic «يعرفك» (comment only).

## STATS
≈487 AR keys audited; high/med/low = 13/20 blocks (~46 keys)/12 blocks (~20 keys); score 6.5/10 — new predictive copy near-native with exemplary plurals; legacy dialect empty-states + 8 broken plurals + flagship term issues (المتاح للصرف، التنبيهات، المندفع).


---

# Agent 3 — tools.ts, chat.ts, learn.ts

## HIGH FINDINGS
[terminology] tools.copyright: «© {year} رسملك» → «رسمالك» — brand misspelled.
[terminology] tools.gratuity_contract_limited/unlimited: «محدود»/«غير محدود» → statutory «محدد المدة»/«غير محدد المدة» (UAE Labour Law terms).
[plural] tools.compound_value_after: «القيمة بعد {0} سنوات» → full plural (1 سنة، 2 سنتين، 11+ سنة).
[plural] chat.transactions_count: «عندك {count} معاملة مسجلة.» → full plural + عندك colloquial.
[plural] chat.due_in_days: «مستحقة خلال {days} يوم» → full plural.
[plural] learn.sections_count + course.sections_count: «{count} أقسام» → full plural.
[plural] learn.courses_count: «{count} دورات» — app HAS 30 courses → «٣٠ دورات» renders today; must be «٣٠ دورة».
[plural] learn.lessons_count: «{count} دروس»; learn.modules_count: «{count} وحدات».
[plural] learn.course.sections_completed: «{done} من {total} أقسام مكتملة».
[terminology] learn.intro_personal_finance: «مقدمة في التمويل الشخصي» — in KSA/UAE banking التمويل الشخصي = a personal LOAN product → «المالية الشخصية».

## MEDIUM (condensed)
[register] 24 validation keys use «لازم يكون» (mortgage/simple_loan/credit_card/home_afford/compound/zakat/gratuity/ksagrat) while gratuity_validation_end_after uses MSA «يجب أن» — same file, inconsistent → all to «يجب أن يكون».
[register] 11 tool descriptions in dialect (شوف، عشان، اللي، رح، تقدر، «كيف ثروتك تنمو»، «إذا أنت»): subtitle, net_worth_tracker_desc, credit_card_payoff_desc, compound_savings_desc, mortgage_affordability_desc, mortgage_payoff_desc, retirement_planner_desc, + 4 calculator subtitles.
[mixed] ~45 keys Western digits (validations «بين 0 و 100», placeholders «مثلاً: 250», «عيار 24», «(2.5%)», jotax labels/brackets «أول 5000 دينار») vs older calculators correctly «مثال: ٢٠٠٬٠٠٠».
[grammar] zakat_add_row «أضف أصل» → «أضف أصلًا»; zakat_validation_rows; compound_validation_deposit «سالب» → «سالبًا».
[fidelity] mortgage_payoff_scheduled_payment: «القسط الشهري الأساسي» — payments-per-year input means not necessarily monthly → «القسط المجدول».
[fidelity] mortgage_payoff_lender_placeholder: «مثال: البنك الأهلي» names real bank (implied endorsement) → «مثال: بنكك».
[grammar] leasing_vs_buying_desc: «اعرف إيش أوفر لك: تأجير السيارة أو شراءها.» — إيش pure dialect; شراءها → شراؤها; تأجير (leasing OUT) → استئجار.
[terminology] debt_payoff_desc + learn.debt_snowball_title: «الانهيار» alone = collapse → «الانهيار الجليدي» (avalanche method).
[calque] zakat_subtitle: «هذا محرك حساب وليس فتوى» → «هذه أداة حسابية فقط وليست فتوى».
[terminology] zakat_row_hint_cash: «الحسابات الجارية والادخار» → «وحسابات التوفير».
[grammar] home_afford_credit_cards: «حد أدنى بطاقات ائتمان» broken إضافة → «الحد الأدنى لسداد البطاقات الائتمانية».
[calque] home_afford_fixed_closing/variable_closing/closing_costs: «تكاليف إغلاق» US calque → «رسوم إتمام الشراء».
[terminology] gratuity_subtitle: statutory + STALE LAW (Decree-Law 33/2021 abolished unlimited contracts — content issue too).
[fidelity] chat.title: «المستشار» → «مستشارك» (brand Mustasharak; transactions.ts already «اسأل مستشارك»; nav.ts same issue).
[register] chat.intro_message: flagship first message «حللت معاملاتك الأخيرة وجاهز أساعدك تحسّن ميزانيتك. على شو تبي نركز اليوم؟» — Levantine شو + Gulf تبي hybrid → MSA.
[register] chat.input_placeholder «اسأل أي شي عن أموالك...» → «اسأل مستشارك أي شيء عن أموالك...».
[register] chat.no_transactions «أضف معاملات عشان نقدر نحللها» → «لنتمكن من تحليلها».
[fidelity] chat.dining_spending_message: «أنفقت {percent}% أكثر على الطعام» — dining=مطاعم not طعام; drops "average"; EN comparative calque → «زاد إنفاقك على المطاعم بنسبة {percent}٪... مقارنة بمتوسط...». Related dining_spending «إنفاق الطعام» → «الإنفاق على المطاعم».
[grammar] chat.attach_file «أرفق ملف أو صورة» → «ملفًا»; tip_4 «ارفع إيصال» → «إيصالًا»; tip_5 «شارك مستند» → «مستندًا».
[calque] learn.subtitle: «أتقن مستقبلك المالي» — أتقن doesn't take مستقبل → «تحكّم في مستقبلك المالي».
[register] learn dialect group: progress_message «كمّل دروسك عشان تحصل», continue_learning «كمّل التعلم», save_groceries_title «٥ طرق توفر في البقالة», save_groceries_desc «بدون ما تتنازل» (4 keys).
[register] learn.spending_recommendation: «اطلع على هالدليل» + «أكل المطاعم» → «هذا الدليل» + «إنفاقك على المطاعم».
[fidelity] learn.setting_smart_goals: «كيف تحدد أهداف ذكية» loses SMART acronym → «كيف تضع أهدافًا ذكية (SMART)».
[clarity] learn.min_read: «{min} د قراءة» — «د» collides with dinar → full plural «دقائق قراءة».
[calque] learn.budgeting_101: «الميزانية ١٠١» — US course numbering meaningless → «أساسيات الميزانية» (also recommendation_text).
[fidelity] learn.investing_101 «أساسيات الاستثمار» COLLIDES with investment_basics same label → «الاستثمار للمبتدئين».

## LOW (condensed)
9 *_generating keys: «جاري التحميل...» for "Generating…" → «جارٍ إنشاء التقرير...» (also التحميل=downloading).
9 *_download_report: «تحميل التقرير PDF» → «تنزيل التقرير (PDF)».
Placeholder prefix split «مثال:» vs «مثلاً:» ~18 keys — unify.
mortgage_payoff_years_saved «سنوات تم اختصارها» → «السنوات الموفَّرة من مدة القرض».
home_afford_m1/m2 «الحد الأقصى (حسب الدخل)» drops "payment".
gratuity_equiv_days «الأيام المعادلة» drops referent.
ksagrat_transportation «بدل المواصلات» → KSA standard «بدل النقل» (keep المواصلات for UAE).
ksagrat_total_salary «مجموع الراتب» vs gratuity_total_salary «إجمالي» — unify إجمالي.
jotax_adjusted_income «الدخل الخاضع للضريبة المعدل» → «الدخل المعدَّل الخاضع للضريبة» (ambiguous attachment).
jotax_bracket_over20k mixes digit+word style.
compound_savings «حاسبة الادخار المركب» → «بالفائدة المركبة».
mortgage_affordability «القدرة على تحمّل القرض العقاري» → «أقساط القرض العقاري».
chat.supported_formats Latin commas؛ max_attachments «5 ملفات» → ٥؛ file_too_large «4 ميجابايت» → ٤؛ goal_progress_message Latin quotes → «…».
learn.score_placeholder «لفتح النتيجة» unlock-calque → «لكشف درجتك».
learn.article.back_to_articles «العودة للرؤى» → «العودة إلى المقالات».

## SYSTEMIC
- Register mixing ~45 keys across all 3 files; tools validations 24×لازم vs 2×يجب أن same file.
- 9 broken-plural strings.
- Numeral split: ~45 Western-digit keys (new calculators regressed).
- Brand: رسمالك vs رسملك (tools copyright + auth + 5 PDF reports + lib/pdf/builder.ts); مستشارك vs المستشار split.
- "mortgage" 3 ways: القرض السكني / القرض العقاري / الرهن العقاري.
- «جاري التحميل» for Generating ×9.
- Missing accusative ~6 keys.
- "Insights"=رؤى consistent in learn (8 keys) — defensible; strained in nav strings.
- Institutional/legal names verified CORRECT: دائرة ضريبة الدخل والمبيعات، نظام العمل السعودي vs قانون العمل الإماراتي differentiated, التأمينات الاجتماعية (EG) vs الضمان الاجتماعي (JO/IQ), ISTD vocabulary (الإعفاءات والتنزيلات، المكلف).
- Parity: ar/learn.ts has 6 course.tutor_* keys missing from EN.

## TERMS
tool=أداة; calculator=حاسبة; course=دورة; lesson=درس; section=قسم; advisor=المستشار/مستشارك (split); interest rate=نسبة الفائدة; compound interest=الفائدة المركبة; payment/installment=دفعة/قسط (mixed); mortgage=3-way split; down payment=الدفعة المقدمة; DTI=نسبة الدين للدخل; end-of-service=مكافأة نهاية الخدمة; joining date=تاريخ المباشرة (UAE)/تاريخ الالتحاق (KSA); basic salary=الراتب الأساسي; zakat=النصاب/الزكاة المستحقة; tax=شرائح/إعفاءات/تنزيلات/المكلف; social security=الضمان الاجتماعي (JO)/التأمينات الاجتماعية (EG); labor law=قانون العمل (UAE)/نظام العمل (KSA); credit score=الدرجة الائتمانية (SIMAH-consistent); total=إجمالي/مجموع (split).

## STATS
≈565 strings; high/med/low = 13/26/18 (≈130 keys affected); score 6/10.


---

# Agent 4 — Client-side calculator PDF reports (5 legacy *Report.ts + csvExport + arabicPdfHelper + pdfReportBase)

## VERDICT: arabicPdfHelper NOT SAFE — shipped Arabic PDFs unfit as financial documents (4/10)

Verified against installed pdfmake 0.3.3 / pdfkit 0.17.2 / fontkit 2.0.4:
1. rtl()'s U+202B/U+202C are Default_Ignorable — fontkit hides them, nothing implements the BiDi algorithm → rtl() is a pure NO-OP (its comment "fixes word order" is false).
2. pdfmake draws each UAX#14 word token as a separate LTR-positioned inline → EVERY multi-word Arabic string renders with REVERSED word order (~80+ strings: titles, subtitles, section heads, labels, footers). «جدول سداد بطاقة الائتمان» reads «الائتمان بطاقة سداد جدول».
3. fontkit OTLayoutEngine.position() reverses whole glyph run when script is RTL; Arabic-Indic digits U+0660-0669 ARE Script=Arabic → EVERY multi-digit amount/date/percent renders with digits REVERSED (١٢٣٤.٥٦ → ٦٥.٤٣٢,١; dates too) — displayed financial figures are numerically WRONG.
4. «(المصاريف)» reverses without bracket mirroring → backwards parens.
5. Footer «${pageLabel} ${pageNum} ${ofLabel} ${totalPages}» renders «٥ من ١ صفحة» — "page 5 of 1" (pdfReportBase.ts:183-185 + duplicated mortgagePayoffReport.ts:431-433).
Safe shapes: single-word Arabic labels + single-digit numbers only. cells.reverse() column mirroring is fine.
Fix direction: pre-compute visual-order text (real BiDi pass), keep Western digits for numerics, or use an engine with real BiDi.
6. csvExport ws['!rtl'] flag: SheetJS 0.18.5 never reads it (needs wb.Workbook.Views[0].RTL) → Arabic workbooks open LTR (cell text renders fine — Excel does real BiDi). XLSX otherwise the sounder export path.

## HIGH FINDINGS (language)
[terminology] simpleLoanReport.ts:62 AR.principal (schedule column): «المبلغ الأصلي» → «أصل القرض» — "original amount" wrong for principal portion.
[terminology] creditCardReport.ts:73 AR.principalPaid: «المبلغ الأصلي» → «الأصل المدفوع» (csvExport already correct).
[terminology] mortgagePayoffReport.ts:125 AR_LABELS.principal: «المبلغ الأصلي» → «أصل القرض».
[fidelity] ALL 5 reports generatedBy: «تم إنشاؤه بواسطة رسملك» → «رسمالك AI» — brand misspelled in every footer + "AI" dropped (simpleLoan:63, creditCard:74, homeAffordability:87, mortgagePayoff:129, compoundSavings:72).
[mixed] homeAffordabilityReport.ts:83-84: «الحد الأقصى PI (المصاريف)» / «(الأموال)» / «أقصى دفعة PI» — untranslated "PI" + broken rendering → «الحد الأقصى لدفعة الأصل والفائدة (حسب...)».
[formatting] homeAffordabilityReport.ts:159-160: concatenated rtl() islands + bare parens → fully jumbled cells.

## MEDIUM (condensed)
- «نسبة الفائدة السنوية» in all 5 PDFs (7 slots) vs csvExport correct «معدل الفائدة» → معدل الفائدة السنوي.
- «الدفعة الشهرية» ~20 slots → «القسط الشهري» for loan installments (formal banking register).
- Static singular counters «سنة»/«شهر» break 3-10 agreement (5 slots: «٥ سنة»).
- homeAfford maxDTI: «نسبة الدين للدخل» → «إلى الدخل».
- homeAfford resultsSection + api filename: «القدرة الشرائية» = purchasing power ≠ affordability → «القدرة على الشراء».
- homeAfford subtitle: «الذي يمكنك تحمله؟» → «تحمّل تكلفته».
- «ضريبة العقار (شهري)» agreement → «(شهريًا)».
- mortgagePayoff scheduledPayment «الدفعة الشهرية» → «الدفعة المجدولة» (paymentsPerYear input; csvExport correct); scheduledPayments «الأساسية» → «المجدولة»; yearsSaved «السنوات المختصرة» → «الموفَّرة».
- compoundSavings interestEarned: «الفائدة المقدرة» (estimated) → «المكتسبة» (earned; csvExport correct).
- homeAfford m1/m2: «الحد الأقصى (الدخل)» drops "payment".
- csvExport:335 «القيود المحسوبة» reads accounting entries → «الحدود المحسوبة»; PI rows untranslated.
- formatNumberArabic: Arabic-Indic digits with ASCII separators + ASCII % → use ٬ ٫ ٪.

## LOW (condensed)
«بيانات المدخلات» ×2 → «البيانات المدخلة»; bare «رقم» column ×5 → «رقم الدفعة»; «أشهر السداد» → «عدد أشهر السداد»; «فترة بدون فائدة» → «الفترة التمهيدية بفائدة ٠٪»; «بالإضافة للفائدة» → «إلى»; minPaymentPercent ambiguous; «مختصر تفاصيل القرض» → «ملخص القرض» (align with simpleLoan); «اسم البنك المقرض» → «الجهة المقرضة»; totalInterest drops إجمالي; extraPayment drops الشهرية; compound «خطة التوفير» vs title الادخار mix; schedule headers over-abbreviated; «تكرار الإيداع» → «دورية الإيداع»; csvExport «الودائع المجدولة» → «الإيداعات» (وديعة=term deposit); «إجمالي الفائدة التراكمية» redundant; «تكاليف الإغلاق» calque decision; creditCards minimums drops سداد; currentDebts align with csv; filenames «الادخار المركب» → «بالفائدة المركبة».

## SYSTEMIC
- PDF vs XLSX label divergence for identical values (user downloads both): 8+ pairs («الدفعة الشهرية»↔«المجدولة»، «المختصرة»↔«الموفرة»، «المقدرة»↔«المكتسبة»، «القدرة الشرائية»↔«القدرة على شراء منزل»، «الدفعة المقدمة»↔«الدفعة الأولى»...).
- «المبلغ الأصلي» wrong in all 3 PDF schedules while csvExport correct — same concept two terms.
- Brand «رسملك» + dropped AI in all 5 footers.
- Punctuation hygiene otherwise good (proper ؟، no stray Latin commas).

## TERMS
principal=«المبلغ الأصلي» (PDFs WRONG)/«الأصل» (XLSX correct); interest rate=نسبة (PDF)/معدل (XLSX); installment=دفعة (قسط never used); down payment=الدفعة المقدمة (PDF)/الدفعة الأولى (XLSX); affordability=القدرة الشرائية (wrong)/القدرة على شراء منزل (correct); deposit=إيداع/وديعة mixed.

## STATS
≈225 strings; high/med/low = 15/16/20; score 4/10.


---

# Agent 5 — Statutory calculators + server-side report pipeline (lib/pdf, lib/xlsx, api/reports, 9 calculator pages)

## PIPELINE VERDICTS
- src/lib/pdf/arabic.ts shaper: joining forms, lam-alef ligatures, tashkeel, Arabic-Indic digit runs, currency order, mixed Latin runs all VERIFIED CORRECT by execution. TWO defects: (1) no bracket mirroring → every parenthesized Arabic string renders inside-out «)…(» (~11 strings per statutory report: «(السعودية)», «(85 جرام)», «(استقالة)»); (2) builder.ts drawFooter L186-188: template pre-swapped + shaper reorders → page 1 of 5 reads «٥ من ١»; toArabicNumerals('من') is a no-op; «صفحة» missing. PDF NOT ship-safe until both fixed.
- XLSX builder: logical-order Unicode + rightToLeft="1" sheet view; Excel does native bidi. SAFE. (AR numbers exported as strings — lose sortability; product tradeoff.)

## HIGH FINDINGS
[clarity] lib/pdf/arabic.ts reverseForRTL: bracket mirroring missing (see above).
[fidelity] lib/pdf/builder.ts:188 footer «٥ من ١» inversion.
[mixed] lib/pdf/reports.ts:421 personalZakatPdf: «الفئة» column filled with RAW ENUM KEYS — Arabic PDF shows «gold_24k», «silver_utensils», «cash» → map via tools.ts zakat_cat_* labels.
[mixed] lib/xlsx/reports.ts:331 personalZakatXlsx: same raw English keys in Arabic Excel.
[terminology] tools.jotax_retirement_income: «راتب التقاعد بما يزيد عن 2500 دينار (سنوي)» — Jordan exempts first JOD 2,500 of pension PER MONTH; «(سنوي)» instructs users to enter the WRONG amount → «ما يزيد عن 2500 دينار شهرياً من الراتب التقاعدي (المجموع السنوي)». Same ambiguity in pdf/reports.ts:514 «راتب التقاعد فوق 2500 دينار» (فوق also colloquial) and xlsx/reports.ts:401.
[terminology] tools.gratuity_subtitle + contract types: UAE Decree-Law 33/2021 abolished unlimited contracts and resignation reductions; app claims «حسب قانون العمل الإماراتي» while modelling «غير محدودة المدة» with 1/3-2/3 cuts = cites a REPEALED regime; official term «محدد المدة». Same in pdf/reports.ts:450-455 («عقد محدود المدة»/«غير محدود») and xlsx/reports.ts:359 → «محدد المدة»/«غير محدد المدة (وفق القانون السابق)» + hedge title as «تقرير تقديري... استناداً إلى المرسوم بقانون اتحادي رقم (33) لسنة 2021».

## MEDIUM (condensed)
- builder.ts:186 footer brand «رسملك» → «رسمالك» (8 files total have رسملك).
- ksaGratuityPdf:578 «وفق نظام العمل السعودي» — engine is flat-rate simplification of المادتين 84/85, can overstate; PDF asserts conformity while in-app disclaimer says «تقدير مبسّط» → «تقرير تقديري... استناداً إلى».
- «الراتب الأساسي» ×6 (UI/PDF/XLSX both gratuity calcs) — statutes use «الأجر الأساسي»; KSA computes on الأجر الأخير.
- «إعفاء الإعاقة» (pdf:515, xlsx:402, tools.jotax_disability_count) → «إعفاء ذوي الإعاقة».
- tools.jotax_other_deductions: «(حد أقصى 1000 دينار للمكلف)» understates — EN "(JOD 1,000 per person)" (taxpayer+spouse+dependents) → «عن كل شخص».
- zakat_subtitle «محرك حساب» calque → «أداة حساب تقديرية ولا تُغني عن الفتوى الشرعية».
- zakat_row_hint_cash «الحسابات الجارية والادخار» → «وحسابات التوفير».
- zakat_validation_rows «أضف أصل واحد» → «أصلاً واحداً».
- «لازم يكون أكبر من 0» in 4 statutory validation keys (+~10 others) → «يجب أن يكون... أكبر من صفر».
- JORDAN_BRACKET_LABELS (pdf:485-490, xlsx:378-383, tools jotax_bracket_*): Latin digits «أول 5000 دينار» inside Arabic statutory labels while computed values are Arabic-Indic — mixed numerals in same table (also «85 جرام», «595 جرام», «عيار 24», «(2.5%)», placeholders ~25 occurrences; new calculators regressed vs older «مثال: ٢٠٠٬٠٠٠»).
- homeAffordabilityPdf:282,284: «(DTI)» / «لدفعة PI» untranslated → «(نسبة الدين إلى الدخل)» / «لقسط الأصل والفائدة» (xlsx partially fixed).
- api/reports/route.ts:58 filename «تقرير_القدرة_الشرائية.pdf» → «تقرير_القدرة_على_شراء_منزل.pdf».

## LOW (condensed)
pdf jotax:525 «الدخل الخاضع المعدل» missing complement → «الدخل الخاضع للضريبة المعدَّل» (xlsx/UI have full form); ksa «لا مكافأة» telegraphic → «لا تُستحق مكافأة»; ksa «سبب انتهاء العقد» + value «من قبل العامل» mismatch → «جهة إنهاء العقد»; 4 statutory *_generating «جاري التحميل...» → «جارٍ إنشاء التقرير...»; «الإعفاء الشخصي/العائلي» vs statute «إعفاء المكلّف/المعالين» (vernacular-acceptable); «مجمل الدخل» → «إجمالي الدخل»; zakat_add_row «أضف أصل» accusative; 9 calculator pages hardcode «تحميل Excel» ternary bypassing i18n → «تنزيل ملف Excel» + move to tools.ts; uae «الأيام المعادلة» drops base → «الأيام المستحقة من الأجر الأساسي»; xlsx mortgage «إجمالي الفائدة التراكمية» redundant.

## SYSTEMIC
- Statutory-completeness cautions (math + Arabic claims conformity): Jordan omits المساهمة الوطنية (1% above 200k); KSA flat-rate vs blended المادة 84 (overstates >5y awards); UAE omits two-year-wage cap (المادة 51/2) and DEFAULTS form to abolished 'unlimited'; zakat never mentions حَوَلان الحَوْل condition.
- UAE/zakat reports use user's app currency while Jordan/KSA pin statutory currency (د.أ/ر.س) — UAE gratuity is AED-denominated by law; inconsistent statutory-currency pattern.
- Inconsistent synonym pairs across surfaces: «إجمالي الراتب» (UAE) vs «مجموع الراتب» (KSA); «الدخل الخاضع المعدل» (PDF) vs full form (XLSX/UI); compound «الإيداع» (PDF) vs «الودائع المجدولة» (XLSX).
- Colloquial in tools.ts non-statutory strings ~15 keys; 4 statutory calculators mostly clean MSA except لازم validations.
- Institutional vocabulary largely SOUND: النصاب (85/595 جرام correct), الدخل الخاضع للضريبة, مكافأة نهاية الخدمة, دائرة ضريبة الدخل والمبيعات, fatwa disclaimer present. المساهمة الوطنية ABSENT; حول ABSENT; ربع العشر not used.

## STATS
≈370 strings; high/med/low = 10/12/12; score 6.5/10 — vocabulary sound; rendering defects + raw enum keys + repealed UAE basis + Jordan monthly/annual ambiguity make Arabic report output not release-ready.


---

# Agent 6 — AI layer (prompts, agents, taxonomy, vendors, alerts, notifications)

## HIGH FINDINGS

[mixed] policyAgent.ts PROHIBITED_PATTERNS (lines 28,34,40,46,52,58,64): JS \b never matches adjacent to Arabic letters (verified /\bمضمون\b/ fails on «ربح مضمون») → ALL 7 Arabic-side policy blocks (guaranteed returns, stock picks, tax evasion…) silently never fire. Fix: drop \b around Arabic or use \p{Arabic} lookarounds with /u.
[mixed] toneAndRiskFilter.ts TONE_RULES (19,25,31,37,43): same \b bug → entire Arabic tone/risk guardrail (urgency لازم/حالاً/فوراً, guarantees أضمن/أوعدك, judgment غبي/حمار, false reassurance لا تقلق) is dead code for Arabic replies.
[mixed] intentClassifier.ts financialKeywords (338): \b kills Arabic alternates (مال|فلوس|مصاري|ميزانية|راتب...) → Arabic financial questions missing intent patterns misroute to out_of_scope instead of unclear.
[terminology] Brand in AI identity — prompts.ts:20,468; chatAgent.ts:309; insightAgent.ts:20; recommendationAgent.ts:29; profileAgent.ts:23: «تطبيق راسمالك» → «رسمالك». All 6 identity prompts teach the model the misspelling; it reproduces at scale.
[mixed] alerts.ts category_spike (206,208,228,230): «صرف عالي على ${dev.category}» — category is raw English id → Arabic users see «صرف عالي على food». Resolve via ar category labels.
[mixed] alerts.ts reduce-category goal (340,342,345,347): «قلل صرف ${topCategory.category}» / «توفير ${category}» — goal created with name «توفير food».
[mixed] dashboardNotifications.ts:94: «إنفاقك على ${cat}...» same raw English id leak.
[plural] dashboardNotifications.ts:94: «مع بقاء ${daysLeft} يوماً» — يوماً only correct 11-99; broken for common 3-10.
[plural] alerts.ts:123: «وباقي ${daysRemaining} يوم» — broken nearly always; «وباقي» also dialect.
[plural] documentActions.ts:115: «أضف ${count} بنداً كمصروفات» — wrong for 2-10 (common receipt sizes); mixes Arabic-Indic count with Latin-digit amount.
[terminology] menaVendors.ts:63: bare alias «اتصالات» shadows STC/WE («الاتصالات السعودية» canonicalizes to Etisalat) — wrong brand shown.
[terminology] menaVendors.ts:70: bare alias «دو» substring-matches الدواء/الدوحة/مندوب → pharmacy receipts become recurring du telecom bills.

## MEDIUM (condensed)

[register] alerts.ts Levantine dialect in 13 canned strings (125 «شوف الميزانية», 150/165 «بهالمعدل، ممكن ينقصك», 181, 210/232 «شوف التفاصيل», 256 «ممكن توفر لغاية», 258 «حط هدف», 273 «قربت توصل!», 277, 320 «اعمل شبكة أمان», 342, 364 «انت بتوفر منيح!» (also انت misspelled أنت), 369 «تستاهل», 388 «لهالهدف أسرع لو زدت شوي», 390 «انت ماشي منيح») — ALL Arabic users incl. Gulf/Egyptian/Maghrebi get Jordanian dialect in fixed strings; clashes with MSA dashboardNotifications.
[terminology] alerts.ts:369: «معدل التوفير» — second term for savings rate (everywhere else معدل الادخار).
[mixed] utils.ts fmtPct (44): hardcodes Latin '%' after Arabic-Indic digits («٤٥%») — root cause for all templates using it; should emit ٪ for ar.
[mixed] chatAgent.ts 7 locations (74,93,212,213,221,222,226): raw JS numbers beside Arabic-Indic («${score}/١٠٠») — mixed digit systems; model told to quote verbatim.
[plural] chatAgent.ts:152,212: «${days} يوم», «${matchCount} فاتورة سابقة» — model instructed «لا تغيّر هذه الأرقام» so broken plurals surface in replies.
[grammar] promptComposer.ts:52: «هل تريدني أسجل هذا كمصروف؟» drops أن → «هل تريد أن أسجّل».
[register] chatAgent.ts:236: example «اضغط الزر تحت لأضيفها كمصروف.» — model copies verbatim; «الزر تحت» dialect → «الزر أدناه».
[register] orchestrator.ts:630-631: deterministic canned reply «تمام — اضغط الزر تحت لإضافة ${amount}...» — dialect + raw Latin digits.
[terminology] prompts.ts:80: Maghrebi gloss «"شحال خسرت؟" = كم خسرت؟» WRONG — darija خسّر = spent → «= كم أنفقت؟».
[terminology] chatAgent.ts:188,234: «المُورِّد» for consumer receipts → «التاجر» (promptComposer already uses التاجر/المتجر).
[calque] dashboardNotifications.ts:112,171,185: currency code BEFORE number («${currency} ${amount}» English convention; Arabic puts currency after); «إيداع واحد آخر!» calque of "One more deposit!".
[grammar] dashboardNotifications.ts:141: «بحلول ال٢٥ من الشهر» — article welded to numeral → «يوم ٢٥».
[clarity] dashboardNotifications.ts:185: «أقل بكثير من يوم إنفاقك المعتاد» calque of "typical spending day" → «معدل إنفاقك اليومي المعتاد».
[plural] documentActions.ts:54: overflow tail «+٣ آخر» — agreement + broken RTL sign ordering → «و٣ أخرى».
[mixed] documentActions.ts:152: «ذكّرني قبل 2026-07-15» raw ISO date in Arabic chip → date-fns ar locale.
[register] taxonomy.ts:104: «سناكات وحلويات» → «وجبات خفيفة وحلويات».
[clarity] taxonomy.ts:117: «تلفزيون وبث» → «تلفزيون ومنصات بث».
[terminology] menaVendors.ts:40,54: FEWA alias wrong word order (official «الهيئة الاتحادية للكهرباء والماء»); ADDC «أبو ظبي للتوزيع» — official orthography «أبوظبي» one word never substring-matches.
[terminology] menaVendors.ts:215: bare «كريم» matches آيس كريم/مطعم كريم → transport miscategorization.
[prompt-guidance] insightAgent.ts:24-30 + prompts.ts getInsightPrompt 468-492 + refineWithAI.ts:68: generate user-visible Arabic (titleAr/messageAr) with ZERO register/terminology/numeral guidance → append: «اكتب titleAr وmessageAr بالعربية الفصحى المبسّطة الدافئة (لا لهجات)، بمصطلحات مصرفية شائعة، وبالأرقام العربية-الهندية».
[register] alerts.ts:325: «توفير 3 شهور يعطيك أمان مالي» — Latin 3 + شهور colloquial-leaning + missing accusative → «ادخار ما يعادل مصاريف ٣ أشهر يمنحك أماناً مالياً».

## LOW (condensed)
prompts.ts headings «ما أنت عليه/ما لست عليه» calques; «يفهم بالمال» dialect prep; «لا تقم بتغيير» wordy; Latin digits in Arabic prompt instructions ×4 (2-3 رؤى، 3-5 جمل، 10-15 كلمة); clarification example only Levantine («ممكن توضحلي أكثر؟»); chatAgent:238 «ادخل ها كمصروف» splits pronoun → «أدخلها»; «شهراً بشهر» calque → «من شهر لآخر»; «محسوب بشكل حتمي» (deterministic=حتمي reads "inevitable") → «رياضياً»; service.ts:247 «+3 مرفق» plural; contextSelector:164 raw Latin counts beside ٩٠; service.ts:213 «احترم اللغة» vague; intentClassifier clarificationQuestion hardcoded English; documentExtractorAgent:88 JOD mapping lists only «د.ا» (add د.أ / JD); taxonomy «مونة وبقالة» Levantine / «جوال» Gulf; alerts.ts:445 «أنشئ هدف» → «أنشئ هدفاً»; Latin hyphen-as-dash ~6 locations; menaVendors Zain/Spinneys coverage gaps (bills print bare «زين»; «سبينيس» usual rendering).

## SYSTEMIC
- \b+Arabic regex bug: 13 patterns across 3 files — Arabic guardrail layer effectively does not exist. (Intent PATTERN_RULES avoid \b and work.)
- Raw English category ids in Arabic (10 user-visible slots): TWO diverging Arabic category label sources exist (constants.ts nameAr vs messages/ar/categories.ts) and the AI layer uses NEITHER.
- Brand: all 6 AI prompts + layout metadata teach «راسمالك».
- Register split: alerts.ts (older) Levantine vs dashboardNotifications.ts/orchestrator clean فصحى.
- Plural agreement ignored in 6 template families; no pluralization helper in AI layer.
- Numeral/symbol mixing: ~15 interpolations bypass fmtNum; fmtPct hardcodes %; ISO currency codes before numbers.
- Prompt-level Arabic guidance: chat path has deliberate dialect-mirroring design (defensible) BUT (a) no default register for ambiguous cases (should default فصحى مبسطة), (b) zero financial-terminology glossary, (c) no numeral-system instruction, (d) insight/refine agents no Arabic guidance at all, (e) Maghrebi gloss error.
- Vendor table: Arabic brand spellings largely real (كارفور، طلبات، نتفليكس، أنغامي، هنقرستيشن، بنده، لولو...) but substring+order collisions (اتصالات، دو، كريم) and 3 utilities' aliases don't match official orthography.
- Non-linguistic bugs: taxonomy.ts:262 dead needle 'idecoMM' (IDECO never matches); taxonomy.ts:284 bare 'du' matches "amount due" → mobile.
- Input-side dialect coverage genuinely good (وين/فين/شلون/ازاي/بدي/أبغى/هسه/دلوقتي work — non-\b patterns).

## STATS
≈420 Arabic strings audited across 27 files; high/med/low = 12/19/13 blocks; score 6/10.


---

# Agent 7 — Components + lib + pages hardcoded Arabic

## HIGH FINDINGS

[high|terminology] src/lib/currencies.ts USD (line 94): «دولار أمريكي (د.أ)» → «دولار أمريكي ($)» — د.أ is the JORDANIAN DINAR abbreviation; near-identical to JOD's «(د.ا)» two entries above. Direct confusion risk.
[high|terminology] src/lib/currencies.ts IQD (line 70): «دينار عراقي (ع.د)» → «د.ع» (standard/CLDR; constants.ts itself uses د.ع — reversed here).
[high|mixed] src/app/layout.tsx metadata title/description/keywords (lines 9-11): «راسمالك» ×3 → «رسمالك» — brand misspelled with extra alif in SEO-critical metadata.
[high|mixed] src/lib/translations.ts community.title (line 318) [LIVE — community page header]: «مجتمع رسملك» → «مجتمع رسمالك» — third distinct brand spelling live.
[high|register] src/lib/translations.ts community.createPost.visibility (line 351) [LIVE]: «مين يشوف المنشور؟» → «من يمكنه رؤية المنشور؟» — heavy colloquial live in post-creation.
[high|register] translations.ts transactions.deleteConfirm (155) [dead]: «متأكد تبي تحذف هالمعاملة؟» → «هل أنت متأكد من حذف هذه المعاملة؟» — pure Gulf dialect.
[high|register] translations.ts onboarding.insightsTitle (431) [dead]: «شو تبي تعرف؟» → «ماذا تريد أن تعرف؟» — Levantine شو + Gulf تبي hybrid.
[high|register] translations.ts onboarding.topicsTitle (420) [dead]: «شو المواضيع اللي تهمك؟» → «ما المواضيع التي تهمك؟»
[high|register] translations.ts onboarding.title (398) [dead]: «أهلاً فيك في رسملك» → «أهلاً بك في رسمالك» — Levantine أهلاً فيك + brand misspelling.
[high|plural] src/lib/utils.ts getRelativeTime (125): «منذ ${Math.floor(diffInDays/7)} أسابيع» → produces «منذ 1 أسابيع»/«منذ 2 أسابيع» — broken for most common cases. Need «منذ أسبوع»/«منذ أسبوعين»/«منذ n أسابيع».
[high|plural] src/app/(dashboard)/chat/page.tsx (884): «تمت إضافة ${count} بنداً كمصروفات» — بنداً only correct for 11-99; receipts typically 2-10 → «٥ بنداً» wrong. → «${count} بنود» for 3-10 or reword.
[high|clarity] src/components/QuickAddFAB.tsx budgetWarning.messageAr (85): «هذا سيجعل ${cat} عند ${sym}${total} — ${pct}% ${pct>100 ? 'فوق' : 'من'} الميزانية» — at pct=120 reads "120% ABOVE budget" (2.2×) — wrong meaning. Also calque «سيجعل X عند Y» + Latin %.

## MEDIUM FINDINGS (condensed)

[plural] NotificationPanel.tsx formatTimestamp (32-35): «منذ ${minutes} دقيقة»/«${hours} ساعة»/«${days} أيام» — wrong for 2 and 3-10; Western digits. Use Intl.RelativeTimeFormat.
[plural] utils.ts getRelativeTime (124): «منذ ${diffInDays} أيام» → «منذ 2 أيام» wrong dual.
[grammar] autoBudget.ts suggestionRationale (237,240): «بناءً على متوسط شهر واحد السابقة» broken agreement → «متوسط إنفاقك في الشهر الماضي» / «متوسط آخر n أشهر».
[calque] api/chat/route.ts:240 + stream:182 + tutor:213 + extract-document:190 (4 locations): «الكثير من الطلبات. الرجاء الانتظار قليلاً.» → «لقد تجاوزت عدد الطلبات المسموح به. يرجى الانتظار قليلاً ثم المحاولة مجدداً.» — bare calque of "Too many requests".
[clarity] api/extract-document:207: «حاول بصورة أوضح» parses "try in a clearer manner" → «التقط صورة أوضح».
[grammar] money/track:1911,2289: «~شهرياً، المبلغ يتراوح (a - b)» → يتراوح requires بين...و; Latin tilde.
[clarity] money/track:1914,2290: «شهرياً في حوالي ${day} من كل شهر» redundant + missing يوم → «شهرياً، حوالي يوم n من كل شهر».
[terminology] money/track DETECTED badge (1905,2285): «مكتشف» ambiguous (reads "discoverer") → «تم رصده».
[plural] money/track:1958,2307: «${n} رسوم متكررة مكتشفة» — wrong for n=1.
[plural] CourseHero.tsx:101: «${totalLessons} دروس · ${totalSections} قسم» — both unguarded, inflected in opposite directions.
[plural] learn/page.tsx:1127 + articles/[articleId]:306: «${min} دقيقة قراءة» — wrong for 3-10 (typical read times).
[plural] learn/page.tsx:399: «${n} ${n===1?'مقال':'مقالات'}» — missing dual + 11+ branches.
[plural] learn/page.tsx:658: «٠ / ١ دروس» → «٠ / ١ درس».
[grammar] chat/page.tsx:424: «الزر أسفل لا يزال صالحاً — اضغطه» → «الزر أدناه لا يزال يعمل — اضغط عليه».
[register] translations.ts LIVE colloquial: budget.subtitle:303 «عشان تتابع» (عشان ×5: 87,88,89,303,410); community.empty:392 «ما في منشورات بعد» (ما في ×4: 76,118,138,392); auth.passwordTooShort:274-275 «لازم تكون 8 أحرف» [LIVE reset-password]; auth.noAccount/haveAccount:265-266 «ما عندك حساب؟/عندك حساب؟».
[register] translations.ts dead colloquial ×7: chat.placeholder:53 «اسأل أي شي», learn.continueLearn:44 «كمّل التعلم», chat.comingSoonDesc:56 «نشتغل», chat.tryAsking:57 «جرّب تسأل», onboarding.subtitle:399 «خلنا نفهم», onboarding.insightsDesc:432 «اللي تهمك», transactions.deleteWarning:156 «ما يمكن التراجع».
[clarity] translations.ts learn.minRead:38: «د قراءة» — «د» reads as dinar; cryptic.
[terminology] ReceiptScannerModal.tsx:101 vendor fallback: «مستند» → «إيصال» (EN: Receipt).
[hardcoded] ExpenseChart.tsx:15: «لا توجد بيانات» unconditional — English users see Arabic.
[hardcoded] utils.ts:109,122-125: Arabic returned regardless of UI language; hardcodes ar-SA («يوليو») vs app convention ar-JO («تموز») — two month-name systems.
[mixed] money/track:1658 + QuickAddFAB:85: Latin % vs «٪» (StatsCard:48 does it right).
[terminology] layout.tsx keywords (11): «تمويل شخصي» → «المالية الشخصية» — تمويل = financing/lending; wrong SEO keyword.
[terminology] Sidebar.tsx:154: «حساب شخصي» vs EN "Free Account" → «حساب مجاني» (translations.ts has correct version).
[terminology] currencies.ts LYD (82): «(ل.د)» → «(د.ل)» (CLDR + constants.ts agree).

## LOW FINDINGS (condensed)

[grammar] Missing accusative tanwīn ~8 locations: AIAlertBanner:287 «أنشئ هدف», translations.ts:71 «أضف مصروف», :72 «أضف دخل», :133 «أضف وصف», :323 «ابدأ نقاش», :333 «اطرح سؤال», :368 «اكتب رد», :421 «اختر موضوع أو أكثر» — dashboard:1163 does it correctly («أنشئ هدفاً مالياً»).
[grammar] «جاري» → «جارٍ» ×4 in translations.ts: 242, 41 (بدل «جاري» وحدها: «قيد التقدم»), 359, 297.
[terminology] constants.ts:9 «الصحة والطب» → «الصحة والعلاج».
[terminology] constants.ts accents 100,108,124: «وردي»/«زهري» both = pink; «ليموني» = lemon-yellow not lime → «أخضر فاتح».
[terminology] translations.ts:70 «اختصارات» (quickActions) → «إجراءات سريعة».
[clarity] learn/page.tsx:691 Scholar badge «العالم» reads "the world" → «الباحث».
[clarity] learn/page.tsx:674-686 mixed iḍāfa: «مسار المبتدئين» vs «مسار المتوسط/المتقدم» — inconsistent.
[calque] learn/page.tsx:668,697: «سلسلة تعلم ٧ أيام» / «طالب الفيديو» → «التعلم ٧ أيام متتالية» / «متعلّم بالفيديو».
[mixed] community/page.tsx:406: «' - محسّن'» Latin hyphen → «(محسّن)».
[clarity] money/track:1320,1968,2310: «يحتاج تحسين/مراجعة» → «يحتاج إلى تحسين»/«بحاجة إلى مراجعة».
[register] useStore.ts:88 mock post: «من البداية للنهاية» → «من البداية إلى النهاية».
[clarity] CourseTutorChat.tsx:237: «التحقق من الإنترنت» → «التحقق من اتصالك بالإنترنت».
[mixed] learn/articles:29,31: «أدوات Rasmalak لتتبع وتحليل المصاريف» → «أدوات رسمالك لتتبع المصاريف وتحليلها».
[register] translations.ts:244 common.retry: «حاول مرة ثانية» → «حاول مرة أخرى».
[mixed] money/track:787 AR_MONTHS hardcodes «يناير فبراير...» while Intl (ar-JO) elsewhere emits «كانون الثاني...» — two month systems on one screen.

## SYSTEMIC
- Brand: 4 Arabic spellings — «رَسمالَك» (translations.ts:6 canonical), «رسمالك» (messages/), «راسمالك» (layout.tsx ×3, src/ai/prompts.ts ×2, ALL 4 src/ai/agents/*), «رسملك» (translations.ts:318 LIVE community, :398; + auth.ts heroes, tools.ts copyright per agent 1).
- Broken Arabic plurals with raw count interpolation: 10 distinct component sites; none use ICU plural despite react-intl available.
- Colloquial register islands: ~20 colloquial strings ALL concentrated in src/lib/translations.ts. Everything outside translations.ts (components/pages) is consistently clean MSA.
- translations.ts verdict: PARTIALLY LIVE. Imported by src/hooks/useTranslation.ts → 10 components/pages. LIVE domains: auth.* (forgot-password, reset-password pages), budget.* (budget page), community.* (entire community page), common.*+categories.* (OverviewTransactionRow). DEAD domains: nav, learn, chat, dashboard, guidance, insights, overview, transactions, calculators, settings, onboarding. Some components import hook only for language/isRTL.
- Two conflicting currency-metadata sources: currencies.ts ("SINGLE SOURCE OF TRUTH") vs constants.ts CURRENCIES (IQD, LYD, USD differ).
- Latin % vs ٪ inconsistent.
- Western digits inside Arabic template strings (NotificationPanel, utils.ts, translations.ts) vs correct ٠-٩ in learn achievements.
- Hardcoded Arabic bypassing i18n: ≈208 locations total (money/track ≈30, learn ≈50, chat ≈13, community ≈13, Header ≈23, Sidebar ≈12, NotificationPanel 8, others smaller, api routes 6).

## TERMS
All correct mainstream: الرصيد، المعاملات، المصروفات/المصاريف (both — mildly inconsistent)، الدخل، الميزانية، المدخرات، معدل الادخار، صندوق الطوارئ، التدفق النقدي، الأقساط، القسط الشهري، الدفعة الأولى، حاسبة التمويل (deliberate Gulf idiom)، نسبة الفائدة السنوية (banks say معدل الفائدة)، الالتزامات الشهرية، ضريبة القيمة المضافة، رسوم متكررة، المستشار/مستشارك، الثقافة المالية. countries.ts clean.

## STATS
strings ≈560; high/med/low = 12/27/15 (≈75 affected instances); score 6/10 — strong hand-written MSA pulled down by live colloquial islands in translations.ts, 4-way brand split, broken count-plurals, USD/د.أ error.


---

# Agent 8 — Courses: foundations_of_money + budgeting_money_management (6 files)

## HIGH FINDINGS

[grammar] foundations p1_L4: «وتقرض هذا الرأس مال» → «وتُقرض رأسَ المال هذا» — broken إضافة.
[terminology] foundations p1_L6 (title+body): «الدخل الإيجابي» for ACTIVE income → «الدخل النشط» (vs السلبي).
[terminology] foundations p1_L8: «فوائد العجز أو التعطل» — benefits mistranslated as فوائد (=interest) → «تعويضات (منافع) العجز» (GOSI/SSC usage).
[calque] foundations_intermediate int1_L1–L5 (5 lessons): section title duplicated unpunctuated at paragraph start — garbled first sentence. E.g. «القيمة الزمنية للنقود (TVM) القيمة الزمنية للنقود هي المفهوم...». Inherited from EN source.
[grammar] foundations_intermediate int1_L1 action_prompt: run-on — app CTA fused to previous sentence without punctuation.
[terminology] foundations_advanced adv1_L8 ×2: «ميزة المحرك الأول» (first-mover advantage → "first ENGINE") → «ميزة المبادر الأول».
[pedagogy] foundations_advanced adv1_L8: Nash equilibrium MISDEFINED (describes dominant strategy) — error in EN too; fix both.
[calque] budgeting p2_L18: «أن تكون مقصوداً في أين تذهب أموالك» → «أن تختار بوعيٍ وقصدٍ وجهةَ أموالك» — مقصوداً passive + «في أين» ungrammatical.
[grammar] budgeting p2_L28: shoe example sentence syntactically collapsed (أغلى/أرخص collide) — unparseable.
[mixed] budgeting p2_L30 action_prompt: stray Latin «.?» — junk char in UI.
[terminology] budgeting p2_L16/p2_L30 + int2_L1/int2_L3 + adv2_L10 (6 occurrences): brand as «رأسمالك» → «رسمالك» (adv2_L10 has «رأسمالك AI»). FIFTH brand variant.
[calque] budgeting_intermediate int2_L1–L4 (4 lessons): same title-glued-to-body defect.
[grammar] budgeting_intermediate int2_L1 action_prompt: run-on + «التطبيق لتطبيق» jarring repetition.
[grammar] budgeting_intermediate int2_L3 action_prompt: two imperatives fused, no punctuation.
[grammar] budgeting_advanced titles L1–L4: spurious «العربية» appended — «إدارة مخاطر البجعة السوداء العربية», «حصاد الخسائر الضريبية والتحسين المالي العربية», «هندسة تدفق الثروة العربية», «التحوط لتكاليف المعيشة العربية» — locale tag leaked into content; EN has no "Arab".
[terminology] budgeting_advanced adv2_L9: «هيكل ائتماني» for trust structure → «صندوق استئماني (Trust)» — ائتماني = credit.
[pedagogy] budgeting_advanced adv2_L7+L8 duplicate L3+L4 almost verbatim (also in EN) — learner reads same content twice.

## MEDIUM (condensed)
- foundations p1_L1 + int int1_L7: «المرسوم الحكومي» for fiat → «اعتماد الدولة لها عملةً قانونية».
- foundations p1_L12: «القاعدة هي دائماً احتياجاتك» ambiguous (rule vs pyramid base) → «قاعدة الهرم».
- int1_L1: «يستحق أكثر» calque of "worth more" → «يساوي أكثر»; «تأكل القوة الشرائية» madda misspelling → «تآكل».
- int1_L2: «تخلت عنه» wrong agreement → «تتخلى عنه».
- int1_L4: tool-vs-trophy metaphor lost: «كأس» → «جائزة تُعرض».
- int1_L10 title: autonomy vs independence collapse → disambiguate.
- adv p1_adv_L1: «يضع ثروته قبل هذه الدورات» calque → «يوجه ثروته استباقاً».
- adv p1_adv_L3 + adv1_L6: "long-term" clipped to bare طويل («خطراً طويلاً», «الربح الطويل»).
- adv adv1_L7: «توفير السيولة» inverts "provide liquidity" → «ضخ السيولة».
- budgeting p2_L24 action CONTRADICTS lesson body (average vs lowest month baseline).
- budgeting p2_L28: «تكلفة الاستخدام الواحدة» agreement → «الواحد».
- Course titles differ across levels: «بناء الميزانية وإدارة المال»/«الميزانية وإدارة المال»/«إدارة الميزانية والمال» while EN identical — unify.
- budgeting_advanced description recycles intermediate syllabus, matches no actual lessons (EN too).
- adv2_L5: «سندات زيرو كوبون» raw transliteration → «السندات صفرية الكوبون».
- «المستخدمون المتوسطون» pattern ~8 locations — EN "intermediate users" calqued as "average users" → rephrase as «في هذا المستوى...».

## LOW
- p1_L1: unit of account → add «(وحدة حساب)».
- p2_L21: «تمنح الأهداف المالية لمدخراتك» intrusive لـ.

## SYSTEMIC
- Title-glued-to-body: 9 lessons (int1_L1–L5, int2_L1–L4), inherited from EN source — single strip-prefix pass fixes both locales.
- «الخطوة العملية:» hardcoded label ×30 in action_prompt blocks (both intermediates, 20) + advanced files have action prompts as plain `p` blocks with this prefix instead of action_prompt type (foundations adv L5–L8, budgeting adv L5–L10) — loses styling.
- Empty {"type":"p","text":""} blocks ×11 (int1_L6–L10, int2_L5–L10) — blank gaps in UI.
- Brand «رأسمالك» ×6 here + 6 more corpus-wide.
- «قم بـ» family ×15 (budgeting beginner 9).
- «بشكل» ×15, «من خلال» ×17, «يتم/تتم» ×4 — translationese scaffolding.
- Latin tokens ×19 (TVM, Sinking Funds, IRR, Alpha, VIX, MMT, ZBB×2 bare, AI, 1031).
- Calqued idioms: ضريبة صامتة، الموت بألف جرح، ترسانتك المالية، القاتل الصامت، قارب نجاة، تحت رحمة أسعار الصرف×2، اتخاذ مخاطر، «أو أبداً».
- «ولايات قضائية» for jurisdictions ×2 → «مناطق/أنظمة قضائية».
- Stress-test term split: «اختبار جهد» vs «سيناريو ضاغط» → banking standard «اختبار الضغط/التحمل».
- Block-type poverty: only p + action_prompt in all 6 courses — ZERO checkpoints/key_insights/examples/comparisons.
- US-centric advanced tax content (tax-loss harvesting, 1031) thinly localized for MENA (no capital-gains tax for most individuals).
- Positive: good MENA localization elsewhere (دينار/ريال، قرش أو هللة، رمضان والأعياد، أوقاف، SSC/GOSI).

## PER-COURSE
foundations 6.5/10; foundations_intermediate 4.5/10 (unedited-MT fingerprints); foundations_advanced 5.5/10; budgeting 6/10 (best prose); budgeting_intermediate 4.5/10; budgeting_advanced 4/10 (weakest: junk titles, duplicated lessons, wrong trust term).

## STATS
high/med/low = 25/15/2


---

# Agent 9 — Courses: debt_and_credit + insurance_literacy (6 files)

## HIGH FINDINGS

[terminology] insurance_int int6_L6: «ملحق الأمراض المزمنة» for critical illness rider → «ملحق الأمراض الحرجة» — chronic ≠ critical, different product.
[terminology] insurance_int description: «التأمين الشامل» for umbrella policies → «الوثائق المظلية» — التأمين الشامل = comprehensive motor cover in MENA; description also drops 2 actual topics.
[terminology] insurance_adv adv6_L6 title: «صناديق الائتمان» for Irrevocable Trusts → «الصناديق الاستئمانية» — credit funds ≠ trusts.
[terminology] insurance_adv p6_adv_L4 + adv6_L6 cluster: trust rendered ائتمان throughout («صندوق ائتمان غير قابل للإلغاء», «استشر محامي ائتمان», «صندوق ائتمان تأمين (ILIT)») → استئماني / «محامٍ متخصص في الصناديق الاستئمانية والتركات».
[register] insurance_adv adv6_L8: «الدرع النهائي للرأسمالي البدوي العالمي» — "global nomad capitalist" → البدوي = Bedouin, unintentionally comic/offensive for MENA → «المستثمر العالمي الدائم التنقل».
[mixed] insurance_adv adv6_L10: «قد يؤدي لtransfer مالي احتيالي» — raw English "transfer" glued to لـ; «إيميل» dialect → «اختراق بريد إلكتروني واحد قد يؤدي إلى تحويل مالي احتيالي».
[terminology] debt_adv adv4_L10 action: «"الضمانات" (Warrants)» → «"حقوق شراء الأسهم" (Warrants)» — collateral vs equity rights, opposite meaning for venture debt pricing.
[calque] debt_adv adv4_L10: «جمع ملكية لاحقاً بسعر أعلى» inverts "raise equity later at higher price" → «جمع تمويل بالأسهم لاحقاً بتقييم أعلى».
[terminology] debt_adv adv4_L12 title+body: «السندات المشتركة (Syndication)» → «القروض المشتركة» — bonds vs loans; lesson's own action step says قرض مشترك, contradicting body.

## MEDIUM (condensed)
- Glued lesson titles into opening paragraph ×7 (int4_L1–L4, int6_L1–L3) — inherited from EN; garbled first sentences.
- Course-title divergence across levels: «المديونية والائتمان» vs «الديون والائتمان»; «ثقافة التأمين» vs «الثقافة التأمينية» — EN identical; unify.
- «الديون المستهلكة» ~6× → «الديون الاستهلاكية» (مستهلَك parses "used-up").
- p4_L44: «السلع الاستهلاكية ذات الفائدة العالية» attributes interest to goods → «المشتراة بائتمان مرتفع الفائدة».
- p4_L49: «بطاقة صراف آلي» for debit card → «بطاقة خصم مباشر».
- p4_L55: «احذر من "إعادة التشغيل"» (refi restarts calqued as rebooting) → «تصفير مدة القرض».
- int4_L2 etc: «نسبة استهلاك الائتمان» ×7 vs same file's description using استخدام → unify «نسبة استخدام الائتمان».
- int4_L5: number shift يضمنون + «كل وحدة من رأس مالهم» calque.
- int4_L7: «"عالي المخاطر، صفر المكاسب"» verbatim transplant.
- int4_L8: قارنه → قارنها (agreement); int4_L3 «لا ينبغي تجربته» slip.
- Persona calque ~20×: «المستخدم المتوسط/المتوسطون/يوقت المتوسطون/المحترفون المتقدمون» — dominant translationese marker in int/adv; beginners address reader directly.
- Action steps as plain p blocks prefixed «الخطوة العملية:» in advanced L5+ (16×); redundant prefix inside real action_prompt in intermediates (20×).
- Near-duplicate lesson pairs (debt adv L3≈L5, L4≈L6; insurance adv L2≈L5, L4≈L6; also EN) + orphan fragment block p4_adv_L3 «الاقتراض من أجل الكسب».
- وثيقة (beginner, correct) vs بوليصة/بوالص drift ~19× in int/adv → unify وثيقة.
- «كاش» anglicism ×4 → السيولة النقدية.
- adv4_L12: «المرتب الرئيسي» for lead arranger reads "salary" → «المنظم الرئيسي (Lead Arranger)».
- adv6_L9: «عمليات الاستخراج» for extraction → «الإجلاء الآمن»; title «للمسؤولين العالميين» → «لكبار التنفيذيين».
- p6_adv_L3: «يتم تسكين هذه الشركات في ولايات» → «تؤسَّس في ولايات قضائية ذات مزايا ضريبية».
- insurance_adv description: «الكيانات الأسيرة» cryptic → «شركات التأمين الأسيرة (Captive)».
- p6_L83: non-mandatory modifier attached to trip instead of insurance.
- int6_L7: typo «النسة» → «النسبة»; «كانت للشركة تاريخ» → «كان».
- «عوائد التأمين/القرض» ×4 for proceeds → «تعويض التأمين»/«حصيلة القرض».

## LOW (condensed)
«قم بـ» only 5× (not a problem here); doubled punctuation «؟.» (int6_L2); Latin quotes "…" instead of «…» in all files; raw Latin tokens (USD, Side A, Art and Specie) need Arabic gloss; p4_L47 «لا تختار» → «لا تخترْ» (jussive); int6_L4 «حيث أنك» → «إذ إنك» + MOOP phrasing; p6_L79 «البصريات» → «رعاية العيون»; p6_L81 «زوجتك» assumes male reader → «شريك حياتك»; 13 empty p blocks (debt int L5–L10 ×6, insurance int L4–L10 ×7); int4_L9 «أداة مهنية» → «احترافية»; p4_L49 «فائدة صفرية» calque; int6_L10 «بوليصة "محمولة"» evokes laptops; int6_L2 «كم هو المبلغ المغطى؟» word-for-word + «الطبقة الزهيدة».

## SYSTEMIC
- Glued titles ×7 (inherited from EN).
- Duplicate lesson pairs in both advanced courses (also EN) — content pipeline artifact.
- Action-step block-type problems: 16 plain-p in advanced; 20 redundant prefixes in intermediates; beginners clean.
- Empty p blocks ×13.
- Persona calque ~20× (int/adv only).
- وثيقة vs بوليصة drift ~19×.
- استهلاك vs استخدام الائتمان ~7×.
- Anglicisms: كاش ×4، إيميل، raw transfer/USD/Side A؛ «ائتمانات لومبارد» ~5× → «قروض لومبارد».
- Beginner debt L46–L48 open with dangling هي/هو referring to title.
- NO checkpoint/key_insight/example/comparison blocks anywhere — only p + action_prompt.
- Inherited EN factual issues: LIBOR cited live (adv4_L1); debt adv description describes intermediate topics; technical default loosely equated with below-book trading (adv4_L11).

## PER-COURSE
debt 7/10 (competent, real MENA localization); debt_int 5.5/10; debt_adv 4.5/10 (wrong instrument terms, needs expert rework); insurance 8.5/10 (genuinely well-written, correct MENA insurance terms: قسط، تحمّل، مستفيد، وثيقة); insurance_int 5.5/10; insurance_adv 4.5/10 (heaviest translationese, trust=ائتمان، البدوي، raw transfer).

## STATS
high/med/low = 9/22/11


---

# Agent 10 — Courses: investment_fundamentals + islamic_finance_basics (6 files)

## HIGH FINDINGS
[clarity] invest_int int5_L1–L3: title concatenated into first sentence (3 lessons, also in EN source) — garbled openings; int5_L3 also «كانت الأصول ليست» ungrammatical negation.
[clarity] islamic_int int9_L1–L2: same glued-title defect ×2 («تطهير عوائد الاستثمار يشمل الاستثمار الحلال المتوسط "التطهير"» = nonsense).
[grammar] invest_int int5_L7 title ×2 (lesson+section): «دورات السوق وممشاعر المستثمرين» — «ممشاعر» non-word typo in user-facing title.
[terminology] invest_adv adv5_L8 title+body: «التوريق» for Real Estate Syndication — securitization is a DIFFERENT concept → «المشاركات العقارية (Syndication)».
[terminology] invest_adv p5_adv_L2 (+dup adv5_L5): «البقاء "طويلاً" في السوق» — false friend for LONG position → «الاحتفاظ بمراكز الشراء».
[terminology] islamic p9_L122: «الترفيه للبالغين» for adult entertainment — reader cannot apply sharia screen → «المواد الإباحية».
[terminology] islamic p9_L124: zakat = «مساهمة خيرية سنوية إلزامية» — doctrinally WRONG (zakat is فريضة, pillar of Islam, not charity; self-contradictory with إلزامية) → «فريضة مالية سنوية».
[terminology] islamic p9_L125 action: «التخطيط العقاري» for estate planning (= real-estate planning) → «التخطيط للتركة» (body has it right).
[terminology] islamic_int int9_L5: «الاستثمارات المضاربية» pejorative 4 lessons after teaching المضاربة as noble contract — homonym collision confuses core religious term → gloss «المقامرة على الأسعار»; also «تعتمد بحتاً» ungrammatical.
[terminology] islamic_adv p9_adv_L1: «إدارة مخاطر الفائدة على ديون عملك» attributes RIBA to reader's own debts in a sharia-hedging lesson — religiously incoherent → «مخاطر تقلب معدل الربح على تمويلات عملك».
[clarity] islamic_adv p9_adv_L1: «تتجاوز الأسهم العادية للمنتجات المهيكلة» — parses as "stocks surpass structured products", meaning INVERTED → «تنتقل من الأسهم البسيطة إلى المنتجات المهيكلة».
[terminology] islamic_adv adv9_L11: «"مقاصد الشريعة"—الأهداف العليا للقانون» — الشريعة glossed as «القانون» (calque of "the Law") in the lesson DEFINING maqasid → «أي غاياتها العليا».

## MEDIUM (condensed)
- «المتوسطون» persona ~11× (int5_L1,L2,L5,L7,L8,L9; int9_L1,L3,L4,L6,L7,L10) — reads "average/mediocre".
- invest p5_L74 (+p5_L73, adv5_L10): «تجنب المضاربة» needs gloss «(المقامرة على الأسعار)» — app-wide homonym with Islamic contract.
- invest p5_L59/L63/L64: definition paragraphs open subject-less «هو...» disagreeing with titles.
- islamic p9_L120: «(إجارة وإقتناء)» hamza error + nonstandard name → «(الإجارة المنتهية بالتمليك)» (intermediate has it right).
- islamic p9_L124: «دفعها في وقتها، عادةً خلال شهر رمضان» implies Ramadan due date — religiously imprecise → hawl completion, Ramadan customary.
- islamic p9_L122: «لا يجب أن يتجاوز» means "need not" — INVERTS screening rule → «يجب ألا يتجاوز».
- islamic_int int9_L7: قرض حسن glossed «"القرض الجميل"» back-translation artifact; «لأغراض خيرية» wrongly narrows.
- islamic_int int9_L8: «تدوير الثروة» (money-laundering connotation) → «تداول الثروة» (classical: كي لا يكون دولة).
- islamic_adv adv9_L10 title: «تحسين الزكاة» (optimizing worship) → «إتقان حساب الزكاة».
- islamic_adv adv9_L11: «حماية الدين، النفس...» → canonical «حفظ» + English serial commas.
- islamic_adv p9_adv_L2: waqf framed as "Islamic version of the perpetual endowment" — historically backwards.
- islamic_adv p9_adv_L4 title: «تدرج التكافل» invented → «مستويات التكافل»; «حماية الثروة الإسلامية» implies wealth is Islamic.
- Register: «كاش» ×3 (adv5_L5, adv9_L7, adv9_L9), «بوليصة/بوالص» ×5 (takaful lesson should be وثيقة/اشتراك تكافل), «الفينتك» (adv5_L3).
- Duplicates: invest_adv p5_adv_L2≈adv5_L5, p5_adv_L4≈adv5_L6; islamic_adv p9_adv_L3≈adv9_L5 (3 pairs).
- Structure: 15 empty p blocks (int5_L4–L10, int9_L3–L10); «الخطوة العملية:» ×35 (20 redundant prefixes in intermediates, 15 plain-p in advanced adv5_L5–L12/adv9_L5–L11 losing styling).
- invest_adv adv5_L3: «الوصول للملكية الخاصة ورأس المال المغامر» → «الاستثمار في الأسهم الخاصة ورأس المال الجريء»; «ثروات السلالات» (dynastic wealth → biological lineages!) → «الثروات العابرة للأجيال»; gender disagreement «إمكانية...هو».
- invest_adv adv5_L9 title: «ألعاب منحنى العائد» (games!) → «استراتيجيات منحنى العائد».
- invest_adv adv5_L10 title: «العملات النادرة» reads rare CURRENCIES (forex) — body says المقتنيات → align.
- islamic_adv adv9_L8 title: «تجارة السلع الآجلة» reads commodity FUTURES (non-compliant) in Islamic course → «البيع الآجل للسلع» (salam is inverse of futures).
- Descriptions mismatch actual lessons: islamic_int promises takaful+fintech lessons that don't exist; islamic_adv description summarizes INTERMEDIATE content (both inherited from EN).
- islamic_int int9_L5 title: «أخلاقيات الغرر» ("ethics of gharar") → «تحريم الغرر (الوضوح في مقابل الجهالة)».

## LOW
Stray tatweel «بشـر» (p5_L65); «وجد مكرر ربحيتها» past-tense-looking imperative → «وابحث عن» (also p9_adv_L4); «يجرى المتقدمون» passive form with subject → «يجري»; islamic_int series title «التمويل الإسلامي» missing «أساسيات» (EN drops it too).

## SYSTEMIC
- Glued titles ×5 (EN source too — fix both locales).
- «المتوسطون» ~11×.
- 15 empty blocks; «الخطوة العملية:» ×35.
- Latin punctuation: em-dash ×22, hyphen parentheticals, English serial commas; Western numerals throughout.
- «لـ» for «إلى» ~10+.
- «سلبي» for passive ×3 (الدخل السلبي، مستثمر سلبي، شريك محدود (سلبي)) — needs gloss since سلبي=negative.
- Perform/do calques: «تؤدي جيداً» ×3، «قم بـ» ×5، «يتم» ×4 — mild.
- US/dollar-centric: «متوسط التكلفة بالدولار (DCA)» + «100 دولار كل شهر»، «مزايا إهلاك ضريبي» (no MENA personal tax shield)، S&P 500 default → localize.
- Advanced hype register: «توسيع إمبراطوريتك»، «الربح من "فوضى" العالم» — clashes with warm-educator brand, jarring in Islamic course.
- المضاربة homonym never disambiguated app-wide — one glossing convention needed.

## PER-COURSE
invest 7/10 (light polish); invest_int 4.5/10 (full edit pass); invest_adv 4.5/10 (terminology rework); islamic 7.5/10 (strongest: fiqh terms accurate — مرابحة، إجارة، صكوك، تورق، مشاركة متناقصة، قرض حسن؛ 3 high slips); islamic_int 5.5/10 (mudaraba loss allocation CORRECT; garbled openings); islamic_adv 6/10 (استصناع، سلم، مشاركة متناقصة، عروض التجارة، إعادة التكافل correct; undermined by الشريعة=القانون + فائدة slip + duplicate).

## STATS
high/med/low = 15/22/4


---

# Agent 11 — Courses: life_stage_financial_planning + saving_emergency_planning (6 files)

## HIGH FINDINGS
[clarity] life_int int10_L1–L3 + saving_int int3_L1–L3: title fused into first sentence (6 lessons, inherited from EN) — garbled openings; int3_L1 also broken iḍāfa «نقد السائل».
[terminology] life_int int10_L3/L8/L9: standalone «المتوسطون/المتوسطين» = "the average ones" — meaning-breaking rendering of "intermediates" («يبني المتوسطون "حسابات تجسير"»).
[pedagogy] saving_int int3_L6: sunk-cost concept INVERTED — «بتطبيق منطق "التكلفة الغارقة"، يلغون...» teaches applying sunk-cost logic; intended IGNORING sunk costs (flaw in EN too, AR teaches wrong concept) → «وبتجاهل "التكلفة الغارقة"...».
[pedagogy] life_adv adv10_L5: near-verbatim duplicate of p10_adv_L2 AND the EN course's final lesson ("Mentoring the Next Generation") was silently DROPPED — content shifted.
[pedagogy] saving_adv adv3_L5 duplicates p3_adv_L3; adv3_L6 duplicates p3_adv_L2 (mirrors EN) — 4 of 9 lessons duplicated.
[terminology] life_adv adv10_L10: «"وكالة قانونية متينة"» for Durable Power of Attorney ("sturdy legal agency") → «توكيل رسمي دائم (يظل نافذاً عند فقدان الأهلية)»; «صناديق ائتمان قابلة للإلغاء» → «استئمانية».
[terminology] life_adv adv10_L11: «الائتمانات، الشركات، الوقف» — الائتمانات = credits, intended trusts → «الصناديق الاستئمانية».
[terminology] saving_adv adv3_L9: «استشر محامي ائتمان» = credit lawyer → «محامياً متخصصاً في الصناديق الاستئمانية»; «بند الحماية» drops spendthrift meaning → «شرط منع التبذير».
[terminology] life_adv p10_adv_L4: «تترك خلفك "نظاماً رأسمالياً"» = "a capitalist system" — comically wrong for "system of capital" → «منظومة رأس مال».
[clarity] life_adv adv10_L11 title: «التركيب» for "The Synthesis" (reads installation) → «الخلاصة».

## MEDIUM (condensed)
- life_adv p10_adv_L1: «تروستات» raw transliteration → «الصناديق الاستئمانية»; Latin serial commas.
- Course-title splits: life 3 levels = 3 different titles (المرحلي/للمراحل العمرية/حسب مراحل الحياة) → unify «التخطيط المالي لمراحل الحياة»; saving beginner «التوفير» vs int/adv «الادخار» → unify الادخار.
- Advanced descriptions describe INTERMEDIATE content (both files, inherited from EN) — course-picker mismatch.
- life p10_L129: Western "relationship" framing («للمرتبطين»، «قبل أو في بداية العلاقة») vs MENA engagement/marriage frame; dual/plural drift.
- life p10_L130: «هناك توقع أن يتحمل الزوج» calque — النفقة is legal obligation → «جرت العادة — بل يُعد من مسؤوليات الزوج».
- life p10_L131: «تجهيز الحضانة» reads daycare/custody → «مستلزمات المولود».
- life p10_L132: double «كلما»; «خطط التأمين التعليمية التي تضمن تعويضاً» — تعويض=indemnity → «صرف مبلغ محدد».
- life p10_L133: «الشراء يبني حقوق ملكية» accounting jargon → «يراكم لك ملكية حقيقية».
- life p10_L135: 70-80% retirement guideline word-order chain unparseable → restructure.
- life p10_L136: «عند مغادرة صاحب العمل» reads "when the employer leaves" → «عند انتهاء عملهم لدى صاحب العمل»; «مبلغ إجمالي» → «مبلغ مقطوع».
- life p10_L139: DIFC parenthetical ungrammatical + untranslated → «عبر خدمة الوصايا في مركز دبي المالي العالمي (DIFC)».
- life p10_L140: «ليس عن... بل عن» is-not-about calque.
- life_int int10_L1: «ذو الكفاءة» case error → ذي; «التي تعتبر انهيار السوق» verb misassigned.
- life_int int10_L2: «القيمة» without shadda reads "and the value"; «تتيح طلباً أعلى لأجرك» garbled.
- saving p3_L31: «على بُعد "راتب واحد مفقود"» idiom literal; «لنفسك المستقبلية» calque.
- saving p3_L32: «"بوليصة تأمين" تدفعها لنفسك» — one pays a PREMIUM (قسط) not a policy; «السلام النفسي» → «راحة البال».
- saving p3_L34: dangling «هي» disagreeing with masculine antecedent; bare-pronoun openings ×3.
- saving p3_L36: «تعمل لحسابك الخاص أو صاحب عمل» — صاحب عمل=employer, broken coordination; action's «أنشئ مجلداً» (folder for money, EN artifact) → «ظرفاً مخصصاً».
- saving p3_L42: «الشروط التي يجب استخدامها فيها» scrambled relative → «الحالات التي يجوز استخدامه فيها».
- saving_int int3_L2: «لحالات الطوارئ الليلة» broken apposition ("emergencies tonight") → «الطوارئ العاجلة».
- saving_int int3_L4: «غير فعال» for inefficient (=ineffective) → «منخفض الكفاءة».
- saving_int int3_L5: «مشروع تجاري طارئ» reads "emergency business project" → «فرصة تجارية مفاجئة»; «"معروضة للبيع"» misses discount sense.
- saving_int int3_L7: «عملة أصعب» literal comparative → fixed term «عملة صعبة».
- saving_int int3_L8 title: «تحليل معدل الحرق الادخاري» opaque coinage → «احسب مدة صمودك المالي».
- saving_int int3_L10: «"الكنس التلقائي"» literal sweeping/broom → «التحويل التلقائي للفائض (auto-sweep)»; «تحقق ما إذا» → «تحقق مما إذا».
- saving_adv p3_adv_L3: bare «ولايات» for jurisdictions (سويسرا، سنغافورة، الإمارات as "states"!) → «دول ذات أنظمة قانونية موثوقة».
- saving_adv p3_adv_L4: «الأرقام الرقمية» solecism ("digital digits") → «الأرقام التي تراها»; «مخاطر طرف ثالث» → «مخاطر الطرف المقابل» (counterparty).
- saving_adv adv3_L7: typo «نقذك» → «نقدك»; agreement «تظل لـ"بارودك الجاف" كامل قوته» → يظل.
- life_adv adv10_L7 title: «"ضد الكسر" (Anti-Fragile)» → established «المضادة للهشاشة».
- life_adv adv10_L11: «مخاطرك محصنة» says risks are protected — inverted → «مُدارة بإحكام»; «هو إذا استطاعوا» calque + disagreement.
- "Dry powder" translated literally 4+× (int3_L5, p3_adv_L1, adv3_L7) → gloss once, then «صندوق الفرص».
- life_adv p10_adv_L4: «إنهاء وصيتك» can read "terminating your will" → «إتمام وصيتك»; «متجذرون روحياً» literal.

## LOW
saving p3_L37: «ستشتري أقل» calque; «النقد هو الملك» unquoted idiom. saving_int int3_L6 action: «ألغِ اشتراكاً واحداً لا تستخدمه اليوم» — اليوم attaches to wrong verb.

## SYSTEMIC
- Glued titles ×6 (int10_L1–L3, int3_L1–L3), inherited from EN.
- «المتوسط/المتوسطون» ~12× across both intermediates (standalone uses meaning-breaking).
- Empty p blocks ×14 (life_int L4–L10, saving_int L4–L10).
- «الخطوة العملية:» ×20 redundant prefixes (intermediates) + 12 advanced lessons with action steps as plain p (adv10_L5–L11, adv3_L5–L9).
- English serial commas ~10+ (advanced files).
- Detached «لـ » + «الـ» + digit («السنة الـ 15») ~10.
- «قم بـ» ~5 (mild).
- Scare-quote saturation in int/adv — translated-listicle feel.
- Untranslated tokens: HYSA, MMF, CPI, LLC, DIFC, auto-sweep, Puts, Anti-Fragile, SROI, Family Office — most glossed, DIFC/LLC not.
- Beginner life course quotes USD prices while sibling uses دينار/ريال.
- No key_insight/example/comparison/ul/checkpoint blocks anywhere — prose+action only.
- Both advanced descriptions describe intermediate content.

## PER-COURSE
life 7/10 (solid MSA, genuinely good MENA content: فرائض، مكافأة نهاية الخدمة accurate; fix relationship framing); life_int 4/10 (re-edit); life_adv 4/10 (duplicated+dropped lesson, wrong legal terms; good Islamic touches — استخلاف، وقف، بركة); saving 7.5/10 (best of six; warm natural teaching tone); saving_int 4.5/10 (inverted sunk-cost, concept misfires); saving_adv 5/10 (4/9 duplicated, «محامي ائتمان»، «ولايات»).

## STATS
high/med/low = 15/33/2


---

# Agent 12 — Mechanical i18n integrity sweep (all ar/en message files)

Corpus: en=1,363 keys, ar=1,403 keys, 1,363 shared. All parse cleanly under react-intl strict mode.

## PLURAL-ISSUES (19 flagged; 8 messages have exemplary full 6-category plurals)
Bare counts (17): chat.due_in_days «مستحقة خلال {days} يوم»; chat.transactions_count «عندك {count} معاملة مسجلة.»; dashboard.days_count «{count} أيام»; dashboard.ef_months_covered; dashboard.ef_baseline_basis; dashboard.ef_target_months; dashboard.sts_per_day_formula; dashboard.personality_evidence_small_txn; dashboard.more_budgets «+{count} أخرى» (borderline); learn.sections_count; learn.courses_count; learn.lessons_count; learn.modules_count; learn.course.sections_count; learn.course.sections_completed; transactions.filtered_count; tools.compound_value_after «القيمة بعد {0} سنوات» (sole positional arg in codebase).
Incomplete plural (1): transactions.transaction_count =0/=1/other copied from EN — missing two/few; contrast siblings scan_line_items_toggle/scan_save_items/receipt_child_count/delete_receipt_confirm with full zero/one/two/few/many/other.
Minor (1): dashboard.sts_until_cycle_end lacks optional zero branch (sister sts_days_to_payday has it) → «٠ يوم حتى نهاية الشهر» on last day.

## PLACEHOLDER-MISMATCHES
NONE — all 1,363 shared keys identical placeholder sets (parser + regex cross-validated).

## KEY-PARITY
missing-in-ar: NONE anywhere.
missing-in-en (40): dashboard 15 (budgets_recurring_charges, budgets_recurring_auto_detected, budgets_annual_total, saved_label, overspent_label, this_month_suffix, literacy_score, literacy_score_desc, improve, rec_budgeting(+desc), rec_saving(+desc), rec_investing(+desc)); learn 6 (course.tutor_*); transactions 19 (savings_rate, spending_breakdown, income_vs_expenses, monthly_comparison, this_vs_last, last_month, this_month, savings_calculator, ask_mustasharak, ai_insight, based_on_data, get_advice, learn_budgeting, savings_goals, manage_goals, income_label, expenses_label, monthly_income, monthly_expenses).
Of those 40: 12 DEAD (dashboard budgets_recurring_*, literacy_*, improve, rec_*) — referenced nowhere; 28 LIVE via inline defaultMessage (English defaultMessages bypass en catalog).
RUNTIME ENGLISH IN ARABIC UI (10 ids referenced in code, in NEITHER catalog — render English defaultMessage): auth.password_requirements (signup/page.tsx:46), auth.too_many_attempts (login/page.tsx:37), dashboard.health_score (money/track:1313), settings.accent_color (:1934), settings.accent_color_description (:1943), settings.current_password_wrong (:1367), settings.done (:2021), settings.tap_to_change (:2655), transactions.currency_label (CurrencyAndRateField.tsx:118), transactions.fx_rate_hint (:162).

## UNTRANSLATED
settings.english «English» (defensible; but asymmetric — en has arabic='Arabic' not 'العربية'); auth.email_placeholder «name@example.com»; settings.phone_placeholder «+962 7XX XXX XXX» (Latin X + Western digits); transactions.amount_signed pure-ICU identical to EN (dashboard's ar variant RTL-adapts with RLM, this one doesn't); settings.allowed_formats + transactions.scan_upload_formats benign format names.

## PUNCTUATION/DIGITS
Latin ? : none. Latin ; : none. Latin commas: chat.supported_formats «JPG, PNG, GIF».
Western-formatted money: onboarding.income_under_1000 «$1,000», income_over_10000 «$10,000» (+3 more income keys).
Western digits 0-9 in Arabic display text: 71 keys total, heaviest ar/tools.ts with 54 (all numeric validations «بين 0 و 100», zakat «عيار 24» «(2.5%)», gratuity/jotax/ksagrat placeholders «مثلاً: 15000», jotax brackets «أول 5000 دينار», jotax deductions «بحد أعلى 9000 دينار» «25%»); others: auth.remember_for_days «30 يوم», auth.password_too_short «6 أحرف», chat.max_attachments «5 ملفات», chat.file_too_large «4 ميجابايت», dashboard.ef_recommended «6 أشهر», money.timeline_step_label «من 3», onboarding expense_preset_* «40%/55%/70%» + step_aha_subtitle + aha_recommendation_basis «3 أشهر», settings two_factor_step1/2/3 «الخطوة 1:», two_factor_step2_desc «6 أرقام», password_requirements «8 أحرف», max_size «3.1 ميجابايت».
Percent split: Latin % in chat.dining_spending_message, learn.top_users_mena, onboarding.completed, money.track_over_plan_warning vs Arabic ٪ consistently in dashboard.

## SELECT-ISSUES
personality_archetype_desc other{} empty — identical in EN, intentional. All 10 select messages match EN branch sets, all have other, no English leftovers. greeting duplicates «مساء الخير» for afternoon/evening/night (linguistic choice, valid).

## ESCAPING
NONE — zero straight apostrophes, balanced braces, no unclosed tags across all 1,403 ar messages.

## VERDICT
Structurally sound where it counts (no crash risk). Systemic debt: grammatical plural handling (17 bare counts, concentrated dashboard/learn), pervasive Western digits in ar/tools.ts, 40-key en-catalog lag (Arabic-first development outpaced English), 10 runtime-English ids in Arabic UI.


---

# Agent 12 — Courses: sme_financial_management + taxes_and_legal (6 files)

## HIGH FINDINGS
[terminology] sme p8_L111: «وتحصيل الفواتير (بيع فواتير معلقة بخصم...)» — invoice factoring as "collection", contradicts own gloss → «التخصيم» (advanced course uses it correctly).
[calque] sme_int int8_L1: title fused into first sentence + circular definition (دخل vs إيرادات) → «تقيس الرافعة التشغيلية مدى تضاعف الربح التشغيلي عند نمو الإيرادات».
[calque] sme_int int8_L2: title fused; «دورة تحويل النقد (CCC)» sentence broken.
[calque] taxes_int int7_L1: title fused («فهم الكيانات القانونية (LLC مقابل المؤسسة الفردية) مع نمو عملك...»).
[calque] taxes_int int7_L2: title fused; «العبء الضريبي الطويل» missing الأمد.
[pedagogy] sme_adv: 3 duplicate pairs (p8_adv_L2↔adv8_L5, L3↔L6, L4↔L7) = 6 of 13 lessons duplicated; L2 opens with orphan subtitle block «مضاعفات الـ EBITDA والاندماج والاستحواذ» as body paragraph.
[clarity] taxes p7_L93 action: «ثم اجمع وامسح أهم وثائقك الحالية» — «امسح» primarily = ERASE/DELETE → readable as "delete your most important documents" → «وامسحها ضوئياً».
[terminology] taxes_int int7_L4 title: «الضرائب التقديرية» — in Jordan/Egypt = authority's deemed (jazafi) assessment, DIFFERENT concept from estimated prepayments → «الدفعات الضريبية المقدَّمة وتجنيب مبالغها».
[terminology] taxes_int int7_L10: «اتفاقية التشغيل» — US "operating agreement" calque, meaningless in MENA company law → «اتفاقية الشركاء (عقد التأسيس والنظام الأساسي)» (+ title fix).
[terminology] taxes_adv p7_adv_L3 title + description: «هياكل الائتمان المتقدمة والإدارة الائتمانية» — trust=«الائتمان» reads credit structures/bank credit → «هياكل الصناديق الاستئمانية (Trusts) المتقدمة وإدارتها».
[terminology] taxes_adv adv7_L6 + title: «"قانون تقادم"—فترة...» — statute of limitations calqued as a law then defined as period → «مدة تقادم»; title → «حماية الأصول ومدة التقادم على التصرفات الاحتيالية».

## MEDIUM (condensed)
- Course-title splits across levels: «الإدارة المالية للشركات» (int/adv) vs SME-specific; «الضرائب والأساسيات القانونية» (int) → unify.
- taxes_int description: «الأدوات الضريبية الفعالة... والحجاب المؤسسي» → «الأوعية الاستثمارية ذات الكفاءة الضريبية... والستار المؤسسي» (lessons use الستار); «تعلم عن» calque.
- taxes_adv p7_adv_L2: «المواطنة عبر الاستثمار» → industry term «الجنسية عبر الاستثمار».
- sme_int int8_L2 action: CCC formula labels ambiguous → «أيام تحصيل الذمم المدينة + أيام بقاء المخزون − أيام سداد الذمم الدائنة».
- sme_int int8_L3: «القيمة الدائمة (LTV)» → «القيمة العمرية للعميل»; «تكلفة الاستحواذ (CAC)» connotes M&A → «تكلفة اكتسابه».
- sme_int int8_L4: «بقاء عملك مليئاً مالياً» ("financially full") → «محافظة عملك على ملاءته المالية».
- Personas ~15×: «المستخدمون المتوسطون، المديرون المتقدمون» (int7_L3/L5/L6/L8/L10; adv7_L5/L6/L10; adv8_L1/L3/L8/L10/L12/L13) → «أصحاب الأعمال في هذه المرحلة».
- taxes_int int7_L4: «أصحاب الدخل المتوسط» — "intermediate earners" became middle-income bracket!; «من كل شيك» → «من كل دفعة».
- taxes p7_L87: «الضرائب هي العملية التي تجمع من خلالها...» category-error calque → «هي المبالغ التي تجمعها الحكومات».
- taxes p7_L90: KSA GOSI «9.75% مع مساهمة مماثلة من صاحب العمل» — employer is 11.75%, NOT مماثلة; 2024 reform dates the figure → correct both.
- taxes p7_L91: «يتركون أموالاً على الطاولة» literal idiom → «يفوّتون على أنفسهم مبالغ من حقهم».
- taxes p7_L94: «شروط الجزاءات» → contract-law term «الشروط الجزائية».
- taxes p7_L96: «معظم الجهات القضائية» — jurisdictions as judicial bodies → «معظم الدول».
- taxes description promises estate/legacy lesson that doesn't exist.
- sme p8_L99: «الحفاظ على توقعات تدفق نقدي — إسقاط بسيط... للأشهر 3-6» calques → «إعداد توقعات... وتحديثها — تقدير بسيط... للأشهر الثلاثة إلى الستة».
- sme p8_L107: «المصاريف الإجمالية (إيجار ورواتب وتسويق)» — overheads mislabeled right after الهامش الإجمالي → «المصاريف التشغيلية».
- sme p8_L114: JEDCO official name «المؤسسة الأردنية لتطوير المشاريع الاقتصادية»; «صناديق مطابقة» → «برامج تمويل مطابق».
- adv8 p8_adv_L1: «"هندسة مركبة مالية"» — financial vehicle as a CAR → «هندسة كيان مالي متكامل».
- adv8_L13 title: «القيادة الجزئية والتميز الخارجي» opaque fractional-leadership calque → «قيادات تنفيذية بدوام جزئي وخبرات خارجية»; «مستوى C» bare Latin.
- adv7 p7_adv_L1: BEPS framed as recommended strategy — factually INVERTED (OECD label for combatted practices) → reframe.
- adv7_L7: «مجرد "قشرة"» shell-company literal → «شركة صورية (واجهة)».
- adv7_L8: «مكافأة "القوة العقلية" لعملك... من "العمل اليدوي" للعمل» garbled + dangling → «أن يُكافأ الجانب الفكري من عملك بمعدل ضريبي أقل من جانبه التشغيلي»; bare «IP».
- adv7_L9: unhedged US estate-tax premise → hedge (most MENA states levy none; relevant cross-border).
- adv7_L10 title: «التعاقب العابر للحدود» — التعاقب = succession in roles → «انتقال التركات عبر الحدود».
- adv7_L6: «يحول هذا صافي ثروتك لـ"غير مستهدف" من قبل المتقاضين الهجوميين» calque → «تصبح ثروتك هدفاً غير مغرٍ للمتقاضين العدوانيين»; «يجرى المتقدمون» → «يُجري».
- Structure: 16 empty p blocks (both intermediates L3–L10); «الخطوة العملية:» plain-p ×15 (adv8_L5–13, adv7_L5–10) + redundant prefix ×20 (intermediates).

## LOW
sme p8_L98: Latin quotes + stiff «الربح عقل» → ««الإيرادات غرور، والربح واقع، والنقد هو الملك»». sme p8_L113: «رأس المال المغامر» → dominant MENA term «رأس المال الجريء».

## SYSTEMIC
- Glued titles ×4 (int8_L1, int8_L2, int7_L1, int7_L2).
- sme_adv 3 duplicate pairs = 6/13 lessons.
- Empty p blocks ×16.
- Action-step split: 15 plain-p advanced + 20 redundant prefixes intermediate.
- Personas ~15×.
- Latin quotes "…" 100+ across the 4 int/adv files; beginners largely clean.
- «كاش» ~5×.
- «لـ» for «إلى» ~15×.
- «الطويل» missing الأجل/الأمد ×4.
- Bare English: Alpha، IP، مستوى C، (SMEs) in Arabic title، LLC leading a title; garbled «% نمو السنوي + % هامش الربح الصافي» (adv8_L10 action).
- «قام بـ» ~4× mild.
- No checkpoint/key_insight/example/comparison blocks; zero comprehension checks.
- Clear quality split: beginners read like edited original Arabic with ACCURATE regional facts (VAT dates/rates, Jordan SSC, ADGM/DIFC); the 4 int/adv files read like lightly-edited MT — separate production batch.

## PER-COURSE
sme 8/10 (near-native, publishable after factoring fix); sme_int 6/10; sme_adv 4.5/10 (structurally broken); taxes 8/10 (accurate regional facts, warm tone); taxes_int 5.5/10; taxes_adv 5/10.

## STATS
high/med/low = 11/27/2

---

## P0 fix log (2026-07-08, branch `fix/arabic-p0`)

**P0·3 guardrails — DONE.** `policyAgent.ts`, `toneAndRiskFilter.ts`, `intentClassifier.ts` rewritten from `\b`-anchored ordered patterns to order-independent AND-of-substring groups. Verified by `src/ai/validation/__tests__/arabicGuardrails.test.ts` (13 tests). **New P1 follow-up discovered:** the Arabic keyword lists carry only imperative/verbal-noun stems, so present-tense conjugations with the تـ prefix (تشتري، تستثمر، تخفي) still don't match — a morphology-coverage pass (not a mechanism bug) should expand them. Also the `no_certainty_claims` future-marker group misses the attached سـ (سيرتفع vs سوف).

**P0·4 enum-key leaks — DONE.** Added `getCategoryLabel()` to `constants.ts` and `zakatCategoryLabel()` to `personalZakatCalculator.ts` (labels match the `zakat_cat_*` i18n keys). Wired into `alerts.ts` (category-spike + reduce-category suggestion, incl. generated goal names) and the zakat PDF/XLSX category column. Verified by `src/lib/__tests__/categoryLabels.test.ts` (5 tests). `dashboardNotifications.ts:94` does not exist on `main` — it ships with PR #10, fix it there. The LLM **context strings** in `prompts.ts`/`contextSelector.ts` still pass raw ids to the model (not directly user-visible); folded into the P1 "consolidate category labels in the AI layer" task.

**P0·5 statutory — LANGUAGE PARTS DONE; CALCULATION PARTS ESCALATED.**
Done (pure wording, no math touched): Jordan pension label clarified in `ar/tools.ts`, `en/tools.ts`, `pdf/reports.ts`, `xlsx/reports.ts` — the calculator's own doc-comment defines the field as "annual total of the portion above JOD 2,500/**month**", so the old ambiguous `(سنوي)`/`(annual)` label was misinstructing input; UAE and KSA report **titles** softened from asserting conformity («وفق قانون العمل…») to an indicative estimate («تقرير تقديري … استرشاداً …»).

**ESCALATED — these change money math and need the authoritative spreadsheet + domain sign-off; I did NOT alter them:**
1. **UAE gratuity models a repealed regime.** `uaeGratuityCalculator.ts` still offers `contractType: 'unlimited'` and applies the 1/3–2/3 resignation reductions abolished by Federal Decree-Law 33/2021 (all contracts are fixed-term since 2023), and omits the two-year-wage cap (Art. 51/2). The UI/report contract-type terminology («محدود/غير محدود» → «محدد المدة/غير محدد المدة») is deliberately left untouched because relabeling would make an abolished computation look current. Decision needed: update the calculator to the 2021 unified rule (21 days/yr first 5 years, 30 days/yr after, on basic wage, 2-year cap, no resignation cut) or keep-with-explicit-legacy-labeling.
2. **KSA gratuity** flat-rates Articles 84/85 and can overstate awards beyond 5 years (blended rate). Title now hedged; formula needs review against the authoritative source.
3. **Jordan** omits المساهمة الوطنية (national contribution, 1% above 200k taxable).
4. **Zakat** never surfaces the حَوَلان الحَوْل (hawl / one lunar year) condition.

**P0·1 legacy PDF reversal — MOOT on `main` (dead code).** The 5 client-side `src/calculators/*Report.ts` reports (+ `arabicPdfHelper.ts`, `pdfReportBase.ts`) that render reversed digits/words have ZERO live imports — every calculator page now calls `downloadReport()` → `/api/reports` → the server-side `lib/pdf` shaper. The reversed-digit rendering cannot reach users. The dead files still exist on disk (recommend deleting them to remove the footgun; not done here to keep this branch's diff scoped to fixes).

**P0·2 server shaper — DONE & verified.** (1) `arabic.ts reverseForRTL` now mirrors paired brackets `()[]{}` when reversing an RTL run — «(السعودية)» no longer renders inside-out. (2) `builder.ts drawFooter` builds the page label in natural reading order (`صفحة ${n} من ${total}`) and lets the shaper reorder it, fixing «٥ من ١» → «صفحة ١ من ٥» and restoring the dropped «صفحة»; footer brand «رسملك» → «رسمالك». Verified by `src/lib/pdf/__tests__/arabicShaper.test.ts` (3 tests). The XLSX `ws['!rtl']` sheet-view flag (needs `wb.Workbook.Views[0].RTL`) is a cosmetic sheet-direction nicety, not a correctness defect (Excel does native BiDi on the cell text) — left for P1.

### P0 pass summary — verification & scope
Branch `fix/arabic-p0` off `main`. **14 source files** changed (+136/−49), **3 vitest files** added (21 tests, all pass). `npm run build` exits 0 (crm/ stashed); `tsc --noEmit` clean. Test files excluded from the production type-check (`tsconfig.json`) so the app build doesn't depend on the vitest devDep that PR #10 introduces.

Done & verified: P0·2 (PDF shaper brackets + footer), P0·3 (Arabic guardrails), P0·4 (enum-key leaks), P0·6 (currency symbols), P0·7 (budget-warning inversion), and the safe language half of P0·5 (Jordan pension label, UAE/KSA report-title hedges). P0·1 is moot (dead code).

**Not done — deliberately escalated (need domain sign-off / product decision, not a language fix):** UAE gratuity calculator models the repealed pre-2021 regime; KSA flat-rate may overstate; Jordan omits المساهمة الوطنية; zakat omits the hawl condition; delete the 7 dead legacy `*Report.ts` files. **Deferred to P1:** guardrail keyword morphology (present-tense verbs), AI context-string category localization, brand-spelling sweep, dialect→MSA register pass, ICU plural migration, numeral normalization, and the full courses program.
