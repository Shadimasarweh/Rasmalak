export default {
  // Common chrome
  skip_for_now: 'Skip for now',
  step_of: 'Step {current} of {total}',
  completed: '{percent}% Completed',
  back: 'Back',
  continue: 'Continue',
  get_started: 'Get Started',

  // ============================================================
  // New 5-step wizard (per "The onboarding process.docx")
  // ============================================================

  // Step 1: Primary focus
  step_focus_title: 'Welcome to Rasmalak',
  step_focus_subtitle: 'Pick everything that matters to you. We use this to highlight the right tools first.',
  step_focus_question: 'What is your primary focus with Rasmalak right now?',
  focus_emergency_fund: 'Building an emergency fund',
  focus_debt: 'Getting out of debt',
  focus_monthly_budget: 'Creating a monthly predictive budget',
  focus_learn_invest: 'Learning how to invest / save',

  // Step 2: Persona
  step_persona_title: 'Tell us a bit about your financial setup',
  step_persona_subtitle: 'Budgets look very different for salaried vs. variable income. We tune the engine to your situation.',
  step_persona_question: 'Which best describes your income?',
  persona_salaried: 'Fixed monthly salary',
  persona_salaried_desc: 'Salaried employee with predictable income',
  persona_variable: 'Fluctuating / variable income',
  persona_variable_desc: 'Freelancer, SME owner, or contractor',
  persona_student: 'Student / no steady income yet',
  persona_student_desc: 'Allowance, part-time work, or in school',

  // Step 3: Income baseline
  step_income_title: 'Your income baseline',
  step_income_subtitle: 'This is the ceiling for your monthly budget. You can change it any time.',
  step_income_question: 'What is your average monthly take-home income?',
  step_income_country_label: 'Country',
  step_income_currency_hint: 'Currency: {currency}',
  step_income_amount_label: 'Average monthly take-home income',

  // Step 4: Expense preset
  step_expense_title: 'Quick estimate of your essentials',
  step_expense_subtitle: 'No need to list rent, electricity, groceries \u2014 just pick the closest match. You will fine-tune later.',
  step_expense_question: 'Roughly, how much of your income goes to essentials?',
  step_expense_estimate: '\u2248 {amount} / month',
  expense_preset_lean: 'Lean',
  expense_preset_lean_desc: 'Essentials use about 40% of my income',
  expense_preset_average: 'Average',
  expense_preset_average_desc: 'Essentials use about 55% of my income',
  expense_preset_heavy: 'Heavy',
  expense_preset_heavy_desc: 'Essentials use about 70% of my income',

  // Step 5: Aha! moment
  step_aha_title: "Let's kick-start your safety net",
  step_aha_subtitle: 'A 3-month emergency fund is the single best protection against unexpected expenses.',
  aha_recommendation_label: 'Recommended emergency fund',
  aha_recommendation_basis: '3 months of essentials \u00b7 about {amount} / month',
  aha_question: 'Would you like to add this to your budget?',
  aha_inject_cta: 'Yes, inject into my budget',
  aha_skip_cta: "I'll set my own goal later",
  aha_saving: 'Setting up your dashboard...',

  // ============================================================
  // Legacy keys (kept for compatibility — not referenced by the
  // new wizard but other surfaces or tests might still read them).
  // Safe to delete in a follow-up once those references are gone.
  // ============================================================
  step1_title: "Let's personalize your experience",
  step1_subtitle: "To give you the best advice, we need to know what you're aiming for.",
  step1_question: 'What are your financial goals?',
  step2_title: 'Tell us about yourself',
  step2_subtitle: 'This helps us tailor recommendations to your situation.',
  step2_question: 'Which best describes you?',
  step3_title: 'What would you like to learn?',
  step3_subtitle: "Select topics you're interested in. You can change these later.",
  step3_question: 'Choose your topics of interest',
  step4_title: 'Almost done!',
  step4_subtitle: 'This helps us provide relevant budgeting suggestions.',
  step4_question: 'What is your monthly income range?',
  goal_buy_home: 'Buy a home',
  goal_start_investing: 'Start investing',
  goal_plan_retirement: 'Plan retirement',
  goal_clear_debt: 'Clear debt',
  goal_emergency_fund: 'Emergency fund',
  goal_something_else: 'Something else',
  custom_goal_placeholder: 'Or type your specific goal here...',
  segment_individual: 'Individual',
  segment_individual_desc: 'Managing personal finances',
  segment_self_employed: 'Self-Employed',
  segment_self_employed_desc: 'Freelancer or contractor',
  segment_sme: 'Small Business',
  segment_sme_desc: 'Running a small or medium business',
  topic_budgeting: 'Budgeting',
  topic_saving: 'Saving',
  topic_debt: 'Debt Management',
  topic_investing: 'Investing',
  topic_islamic_finance: 'Islamic Finance',
  topic_business_cashflow: 'Business Cash Flow',
  income_under_1000: 'Under $1,000',
  income_1000_3000: '$1,000 - $3,000',
  income_3000_5000: '$3,000 - $5,000',
  income_5000_10000: '$5,000 - $10,000',
  income_over_10000: 'Over $10,000',
  income_prefer_not: 'Prefer not to say',
  country_title: 'Where are you based?',
  country_subtitle: 'We use this to set your default currency and tailor advice to your country.',
  country_question: 'Pick your country',
};
