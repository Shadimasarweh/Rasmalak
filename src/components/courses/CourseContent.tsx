'use client';

import { useIntl } from 'react-intl';
import { useCourseProgress } from '@/store/courseProgressStore';
import CourseSection from './CourseSection';
import type { CourseData } from '@/types/course';

interface CourseContentProps {
  course: CourseData;
  currentLessonIndex: number;
  onNextLesson: () => void;
  onPreviousLesson: () => void;
  onComplete: () => void;
}

export default function CourseContent({
  course,
  currentLessonIndex,
  onNextLesson,
  onPreviousLesson,
  onComplete,
}: CourseContentProps) {
  const intl = useIntl();
  const isRtl = course.locale === 'ar';
  const { markSectionsComplete } = useCourseProgress();

  const lesson = course.lessons[currentLessonIndex];
  if (!lesson) return null;

  const isFirstLesson = currentLessonIndex === 0;
  const isLastLesson = currentLessonIndex === course.lessons.length - 1;

  const handleNext = () => {
    markSectionsComplete(lesson.sections.map((s) => s.id));
    onNextLesson();
  };

  const handleComplete = () => {
    markSectionsComplete(lesson.sections.map((s) => s.id));
    onComplete();
  };

  return (
    <div
      style={{
        padding: 'var(--spacing-6) var(--spacing-4)',
        maxWidth: '720px',
        margin: '0 auto',
        direction: isRtl ? 'rtl' : 'ltr',
      }}
    >
      {/* Lesson header */}
      <div
        style={{
          marginBottom: 'var(--spacing-4)',
          paddingBottom: 'var(--spacing-3)',
          borderBottom: '2px solid var(--color-accent-growth)',
        }}
      >
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: 'var(--color-accent-growth)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {isRtl
            ? `الدرس ${currentLessonIndex + 1} من ${course.lessons.length}`
            : `Lesson ${currentLessonIndex + 1} of ${course.lessons.length}`
          }
        </span>
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginTop: '4px',
            lineHeight: 1.3,
          }}
        >
          {lesson.title}
        </h2>
      </div>

      {/* All sections in this lesson -- continuous scroll */}
      {lesson.sections.map((section, idx) => (
        <div
          key={section.id}
          style={{
            paddingBottom: 'var(--spacing-4)',
            marginBottom: idx < lesson.sections.length - 1 ? 'var(--spacing-4)' : 0,
            borderBottom: idx < lesson.sections.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
          }}
        >
          <CourseSection section={section} isRtl={isRtl} />
        </div>
      ))}

      {/* Navigation buttons */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-2)',
          paddingTop: 'var(--spacing-6)',
          marginTop: 'var(--spacing-4)',
          borderTop: '2px solid var(--color-border-subtle)',
        }}
      >
        {isLastLesson ? (
          <button
            type="button"
            onClick={handleComplete}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: 'var(--color-success)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            {intl.formatMessage({ id: 'learn.course.complete_course', defaultMessage: 'Complete Course' })}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: 'var(--color-accent-growth)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {intl.formatMessage({ id: 'learn.course.next_section', defaultMessage: 'Next Section' })}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points={isRtl ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
            </svg>
          </button>
        )}

        {!isFirstLesson && (
          <button
            type="button"
            onClick={onPreviousLesson}
            style={{
              width: '100%',
              padding: '12px 24px',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points={isRtl ? '9 18 15 12 9 6' : '15 18 9 12 15 6'} />
            </svg>
            {intl.formatMessage({ id: 'learn.course.previous_section', defaultMessage: 'Previous Section' })}
          </button>
        )}
      </div>
    </div>
  );
}
