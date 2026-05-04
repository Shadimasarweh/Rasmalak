const moneyMessages = {
  // Section title (sidebar + page header)
  section_title: 'Money',
  section_subtitle: 'Plan, track, and compare',

  // Timeline steps
  timeline_plan: 'Plan',
  timeline_spend: 'Spend',
  timeline_compare: 'Compare',
  timeline_step_label: 'Step {n} of 3',

  // Tab labels
  tab_plan: 'Plan Your Month',
  tab_track: 'Track Your Spending',
  tab_compare: 'Compare',

  // Plan tab
  plan_title: 'Plan Your Month',
  plan_subtitle: 'Decide what you want to spend before the month begins.',
  plan_intent_label: 'This is your intention — not what you spent.',
  plan_total_question: 'How much do you want to spend in total next month?',
  plan_category_question: 'How much do you want to spend on {category} next month?',
  plan_total_placeholder: 'Total monthly intention',
  plan_save: 'Save Plan',
  plan_saved: 'Plan saved',
  plan_categories_heading: 'Plan by category',
  plan_smart_default_label: 'Based on what you spent last month',
  plan_use_suggestion: 'Use suggestion',
  plan_suggestion_applied: 'Suggestion applied',
  plan_no_history: 'Add a few transactions and we will suggest amounts next month.',
  plan_recurring_heading: 'Recurring charges (locked in)',
  plan_recurring_desc: 'These show up every month. We pre-add them to your plan.',
  plan_ai_rationale: 'Why this number',

  // Mid-month microcopy guard (Plan tab)
  plan_midmonth_warning_title: 'This is for planning next month.',
  plan_midmonth_warning_body: 'To record what you already spent, go to Track Your Spending.',
  plan_midmonth_warning_cta: 'Go to Track',

  // Track tab
  track_title: 'Track Your Spending',
  track_subtitle: 'Record what actually happened.',
  track_actual_label: 'This is real money — what you already spent.',
  track_amount_question: 'What did you already spend?',
  track_add_expense: 'Add Expense',
  track_add_income: 'Add Income',
  track_empty_title: 'No transactions yet',
  track_empty_body: 'Record your first expense to start tracking reality.',

  // Track over-plan soft warning
  track_over_plan_warning: 'Heads up: this brings {category} to {percent}% of your plan ({planned}).',
  track_over_plan_link: 'Adjust the plan',

  // Compare tab / Reality Check
  compare_title: 'Compare Plan vs Reality',
  compare_subtitle: 'See where intention met reality this month.',
  compare_table_category: 'Category',
  compare_table_planned: 'Planned',
  compare_table_actual: 'Actual',
  compare_table_difference: 'Difference',
  compare_under: 'Under',
  compare_over: 'Over',
  compare_on_track: 'On plan',
  compare_no_plan: 'No plan set for this category',
  compare_no_actual: 'No spending recorded',
  compare_total_row: 'Total',
  compare_empty_title: 'Nothing to compare yet',
  compare_empty_body: 'Set a plan and record some expenses to see the comparison.',
  compare_cta_set_plan: 'Set a plan',
  compare_cta_track: 'Add an expense',

  // Reality check banner / card
  reality_check_title: 'Last month: how did the plan hold up?',
  reality_check_summary: 'You planned {planned}. You actually spent {actual}.',
  reality_check_over_by: 'Over by {amount}',
  reality_check_under_by: 'Under by {amount}',
  reality_check_on_track: 'Right on plan.',
  reality_check_cta: "Improve next month's plan",
  reality_check_dismiss: 'Dismiss',

  // First-time wizard
  wizard_step_label: 'Step {current} of {total}',
  wizard_skip: 'Skip',
  wizard_next: 'Next',
  wizard_back: 'Back',
  wizard_done: "Let's go",
  wizard_step1_title: "Let's plan your next month",
  wizard_step1_body: 'Set a number for what you want to spend. This is your intention — your future, not your past.',
  wizard_step1_cta: 'Plan now',
  wizard_step2_title: 'Now record what you actually spend',
  wizard_step2_body: 'When real spending happens, log it here. This is reality, not intention.',
  wizard_step2_cta: 'Try it',
  wizard_step3_title: 'See the difference',
  wizard_step3_body: 'At the end of the month, compare plan vs reality. That gap is where you grow.',
  wizard_step3_cta: 'Got it',

  // Color legend (used near the comparison table)
  legend_planned: 'Planned (intention)',
  legend_actual: 'Actual (reality)',
  legend_over: 'Over plan',

  // Onboarding analogy
  onboarding_analogy_title: 'Think of it like this',
  onboarding_analogy_plan: 'Plan = your intention before the month',
  onboarding_analogy_track: 'Track = what actually happened',
  onboarding_analogy_compare: 'Compare = where you grow',
  onboarding_analogy_continue: 'Continue',
};

export default moneyMessages;
