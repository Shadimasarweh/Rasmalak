export interface ParagraphBlock {
  type: 'p';
  text: string;
}

export interface ListBlock {
  type: 'ul';
  items: string[];
}

export type Block = ParagraphBlock | ListBlock;

export interface Section {
  id: string;
  title: string;
  blocks: Block[];
}

export interface Lesson {
  lessonId: string;
  title: string;
  order: number;
  sections: Section[];
}

export interface CourseData {
  courseId: string;
  locale: 'en' | 'ar';
  title: string;
  description: string;
  lessons: Lesson[];
}

export function getTotalSections(course: CourseData): number {
  return course.lessons.reduce((sum, lesson) => sum + lesson.sections.length, 0);
}

export function getAllSectionIds(course: CourseData): string[] {
  return course.lessons.flatMap((lesson) =>
    lesson.sections.map((section) => section.id)
  );
}
