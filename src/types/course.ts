export interface ParagraphBlock {
  type: 'p';
  text: string;
}

export interface ListBlock {
  type: 'ul';
  items: string[];
}

export interface KeyInsightBlock {
  type: 'key_insight';
  title: string;
  text: string;
}

export interface ExampleBlock {
  type: 'example';
  title?: string;
  rows: { label: string; value: string }[];
}

export interface ComparisonBlock {
  type: 'comparison';
  leftTitle: string;
  rightTitle: string;
  leftItems: string[];
  rightItems: string[];
}

export interface ActionPromptBlock {
  type: 'action_prompt';
  text: string;
}

export interface CheckpointBlock {
  type: 'checkpoint';
  title?: string;
  items: string[];
}

export type Block =
  | ParagraphBlock
  | ListBlock
  | KeyInsightBlock
  | ExampleBlock
  | ComparisonBlock
  | ActionPromptBlock
  | CheckpointBlock;

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

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

export interface CourseData {
  courseId: string;
  locale: 'en' | 'ar';
  title: string;
  description: string;
  level?: CourseLevel;
  estimatedTime?: string;
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
