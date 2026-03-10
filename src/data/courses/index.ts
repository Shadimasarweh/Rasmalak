import type { CourseData } from '@/types/course';

import foundationsOfMoneyEn from './foundations_of_money_en.json';
import foundationsOfMoneyAr from './foundations_of_money_ar.json';
import budgetingMoneyManagementEn from './budgeting_money_management_en.json';
import budgetingMoneyManagementAr from './budgeting_money_management_ar.json';
import savingEmergencyPlanningEn from './saving_emergency_planning_en.json';
import savingEmergencyPlanningAr from './saving_emergency_planning_ar.json';
import debtAndCreditEn from './debt_and_credit_en.json';
import debtAndCreditAr from './debt_and_credit_ar.json';
import investmentFundamentalsEn from './investment_fundamentals_en.json';
import investmentFundamentalsAr from './investment_fundamentals_ar.json';
import insuranceLiteracyEn from './insurance_literacy_en.json';
import insuranceLiteracyAr from './insurance_literacy_ar.json';
import taxesAndLegalEn from './taxes_and_legal_en.json';
import taxesAndLegalAr from './taxes_and_legal_ar.json';
import smeFinancialManagementEn from './sme_financial_management_en.json';
import smeFinancialManagementAr from './sme_financial_management_ar.json';
import islamicFinanceBasicsEn from './islamic_finance_basics_en.json';
import islamicFinanceBasicsAr from './islamic_finance_basics_ar.json';
import lifeStageFinancialPlanningEn from './life_stage_financial_planning_en.json';
import lifeStageFinancialPlanningAr from './life_stage_financial_planning_ar.json';

const ALL_COURSES: CourseData[] = [
  foundationsOfMoneyEn as CourseData,
  foundationsOfMoneyAr as CourseData,
  budgetingMoneyManagementEn as CourseData,
  budgetingMoneyManagementAr as CourseData,
  savingEmergencyPlanningEn as CourseData,
  savingEmergencyPlanningAr as CourseData,
  debtAndCreditEn as CourseData,
  debtAndCreditAr as CourseData,
  investmentFundamentalsEn as CourseData,
  investmentFundamentalsAr as CourseData,
  insuranceLiteracyEn as CourseData,
  insuranceLiteracyAr as CourseData,
  taxesAndLegalEn as CourseData,
  taxesAndLegalAr as CourseData,
  smeFinancialManagementEn as CourseData,
  smeFinancialManagementAr as CourseData,
  islamicFinanceBasicsEn as CourseData,
  islamicFinanceBasicsAr as CourseData,
  lifeStageFinancialPlanningEn as CourseData,
  lifeStageFinancialPlanningAr as CourseData,
];

const courseMap = new Map<string, CourseData>(
  ALL_COURSES.map((c) => [c.courseId, c])
);

export function getCourse(courseId: string): CourseData | undefined {
  return courseMap.get(courseId);
}

export function getAllCourses(locale: string): CourseData[] {
  return ALL_COURSES.filter((c) => c.locale === locale);
}

export function getCourseIdForLocale(baseCourseId: string, locale: string): string {
  const suffix = `_${locale}`;
  if (baseCourseId.endsWith(suffix)) return baseCourseId;
  const withoutLocale = baseCourseId.replace(/_(?:en|ar)$/, '');
  return `${withoutLocale}_${locale}`;
}
