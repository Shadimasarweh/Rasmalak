import type { CourseData } from '@/types/course';

import budgetingEn from './budgeting_foundations_en.json';
import budgetingAr from './budgeting_foundations_ar.json';

const ALL_COURSES: CourseData[] = [
  budgetingEn as CourseData,
  budgetingAr as CourseData,
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
