export default {
  // Common chrome
  skip_for_now: 'تخطي',
  step_of: 'الخطوة {current} من {total}',
  completed: '{percent}% مكتمل',
  back: 'رجوع',
  continue: 'التالي',
  get_started: 'ابدأ الآن',

  // ============================================================
  // New 5-step wizard
  // ============================================================

  // Step 1: Primary focus
  step_focus_title: 'أهلاً بك في رسمالك',
  step_focus_subtitle: 'اختر كل ما يهمك. نستخدم هذا لإبراز الأدوات المناسبة لك أولاً.',
  step_focus_question: 'ما هو تركيزك الأساسي مع رسمالك الآن؟',
  focus_emergency_fund: 'بناء صندوق طوارئ',
  focus_debt: 'الخروج من الديون',
  focus_monthly_budget: 'إنشاء ميزانية شهرية تنبؤية',
  focus_learn_invest: 'تعلم الاستثمار / الادخار',

  // Step 2: Persona
  step_persona_title: 'حدثنا قليلاً عن وضعك المالي',
  step_persona_subtitle: 'الميزانيات تختلف كثيراً بين الراتب الثابت والدخل المتغير. نضبط النظام حسب وضعك.',
  step_persona_question: 'أي وصف يناسب دخلك؟',
  persona_salaried: 'راتب شهري ثابت',
  persona_salaried_desc: 'موظف بدخل ثابت ومتوقع',
  persona_variable: 'دخل متغير',
  persona_variable_desc: 'عمل حر، صاحب مشروع، أو متعاقد',
  persona_student: 'طالب / لا يوجد دخل ثابت بعد',
  persona_student_desc: 'مصروف، عمل جزئي، أو في المدرسة',

  // Step 3: Income baseline
  step_income_title: 'دخلك الشهري',
  step_income_subtitle: 'هذا هو السقف لميزانيتك الشهرية. تقدر تعدله في أي وقت.',
  step_income_question: 'كم متوسط دخلك الشهري الصافي؟',
  step_income_country_label: 'البلد',
  step_income_currency_hint: 'العملة: {currency}',
  step_income_amount_label: 'متوسط الدخل الشهري الصافي',

  // Step 4: Expense preset
  step_expense_title: 'تقدير سريع لمصاريفك الأساسية',
  step_expense_subtitle: 'لا داعي لتفصيل الإيجار والكهرباء والمواد \u2014 فقط اختر الأقرب لوضعك. تقدر تعدل بعدين.',
  step_expense_question: 'تقريباً، كم نسبة دخلك التي تذهب للمصاريف الأساسية؟',
  step_expense_estimate: '\u2248 {amount} شهرياً',
  expense_preset_lean: 'مقتصد',
  expense_preset_lean_desc: 'الأساسيات تستخدم حوالي 40% من دخلي',
  expense_preset_average: 'متوسط',
  expense_preset_average_desc: 'الأساسيات تستخدم حوالي 55% من دخلي',
  expense_preset_heavy: 'مرتفع',
  expense_preset_heavy_desc: 'الأساسيات تستخدم حوالي 70% من دخلي',

  // Step 5: Aha! moment
  step_aha_title: 'لنبدأ ببناء شبكة الأمان',
  step_aha_subtitle: 'صندوق طوارئ لـ 3 أشهر هو أفضل حماية من المصاريف غير المتوقعة.',
  aha_recommendation_label: 'صندوق الطوارئ الموصى به',
  aha_recommendation_basis: '3 أشهر من الأساسيات \u00b7 حوالي {amount} شهرياً',
  aha_question: 'هل تريد إضافة هذا إلى ميزانيتك؟',
  aha_inject_cta: 'نعم، أضفه إلى ميزانيتي',
  aha_skip_cta: 'سأحدد هدفي لاحقاً',
  aha_saving: 'جاري إعداد لوحة التحكم...',

  // ============================================================
  // Legacy keys (kept for compatibility)
  // ============================================================
  step1_title: 'خلنا نخصص تجربتك',
  step1_subtitle: 'عشان نقدم لك أفضل النصائح، خبرنا عن أهدافك.',
  step1_question: 'شو أهدافك المالية؟',
  step2_title: 'عرّفنا عن نفسك',
  step2_subtitle: 'هذا يساعدنا نخصص التوصيات لوضعك.',
  step2_question: 'أي وصف يناسبك؟',
  step3_title: 'شو تبي تتعلم؟',
  step3_subtitle: 'اختر المواضيع اللي تهمك. تقدر تغيرها بعدين.',
  step3_question: 'اختر مواضيعك',
  step4_title: 'خطوة أخيرة!',
  step4_subtitle: 'هذا يساعدنا نقترح ميزانية مناسبة لك.',
  step4_question: 'كم دخلك الشهري تقريباً؟',
  goal_buy_home: 'شراء منزل',
  goal_start_investing: 'بدء الاستثمار',
  goal_plan_retirement: 'التخطيط للتقاعد',
  goal_clear_debt: 'سداد الديون',
  goal_emergency_fund: 'صندوق طوارئ',
  goal_something_else: 'شي ثاني',
  custom_goal_placeholder: 'أو اكتب هدفك هنا...',
  segment_individual: 'فرد',
  segment_individual_desc: 'أدير شؤوني المالية الشخصية',
  segment_self_employed: 'عمل حر',
  segment_self_employed_desc: 'أعمل لحسابي الخاص',
  segment_sme: 'صاحب عمل',
  segment_sme_desc: 'أدير مشروع أو شركة صغيرة',
  topic_budgeting: 'الميزانية',
  topic_saving: 'الادخار',
  topic_debt: 'إدارة الديون',
  topic_investing: 'الاستثمار',
  topic_islamic_finance: 'التمويل الإسلامي',
  topic_business_cashflow: 'التدفق النقدي للأعمال',
  income_under_1000: 'أقل من $1,000',
  income_1000_3000: '$1,000 – $3,000',
  income_3000_5000: '$3,000 – $5,000',
  income_5000_10000: '$5,000 – $10,000',
  income_over_10000: 'أكثر من $10,000',
  income_prefer_not: 'أفضل ما أفصح',
  country_title: 'وين تقيم؟',
  country_subtitle: 'نستخدم هذا لتحديد عملتك الافتراضية وتخصيص النصائح لبلدك.',
  country_question: 'اختر بلدك',
};
