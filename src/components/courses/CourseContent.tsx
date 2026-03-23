'use client';

import { useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useCourseProgress } from '@/store/courseProgressStore';
import CourseHero from './CourseHero';
import LessonSectionContainer from './CourseSection';
import type { CourseData } from '@/types/course';

interface CourseContentProps {
  course: CourseData;
  courseNumber: number;
  currentPage: number;
  totalPages: number;
  lessonsPerPage: number;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onComplete: () => void;
  showHero: boolean;
}

export default function CourseContent({
  course,
  courseNumber,
  currentPage,
  totalPages,
  lessonsPerPage,
  onNextPage,
  onPreviousPage,
  onComplete,
  showHero,
}: CourseContentProps) {
  const intl = useIntl();
  const isRtl = course.locale === 'ar';
  const { markSectionsComplete, isSectionComplete, loading } = useCourseProgress();

  const pageLessons = useMemo(() => {
    const start = currentPage * lessonsPerPage;
    return course.lessons.slice(start, start + lessonsPerPage);
  }, [course, currentPage, lessonsPerPage]);

  useEffect(() => {
    if (loading || pageLessons.length === 0) return;
    const sectionIds = pageLessons.flatMap((l) => l.sections.map((s) => s.id));
    markSectionsComplete(sectionIds);
  }, [currentPage, loading, pageLessons, markSectionsComplete]);

  if (pageLessons.length === 0) return null;

  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === totalPages - 1;

  const startLessonIndex = currentPage * lessonsPerPage;

  const handleNext = () => {
    const sectionIds = pageLessons.flatMap((l) => l.sections.map((s) => s.id));
    markSectionsComplete(sectionIds);
    onNextPage();
  };

  const handleComplete = () => {
    const sectionIds = pageLessons.flatMap((l) => l.sections.map((s) => s.id));
    markSectionsComplete(sectionIds);
    onComplete();
  };

  return (
    <div style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      {showHero && isFirstPage && <CourseHero course={course} />}

      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: 'var(--spacing-6) var(--spacing-4)',
        }}
      >
        {pageLessons.map((lesson, pageIdx) => {
          const globalIndex = startLessonIndex + pageIdx;
          return (
            <div key={lesson.lessonId} style={{ marginBottom: 'var(--spacing-6)' }}>
              <div
                style={{
                  marginBottom: 'var(--spacing-5)',
                  paddingBottom: 'var(--spacing-3)',
                  borderBottom: '2px solid var(--ds-primary)',
                }}
              >
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: 'var(--ds-text-heading)',
                    marginTop: '4px',
                    lineHeight: 1.3,
                    fontFeatureSettings: '"kern" 1',
                  }}
                >
                  {lesson.title}
                </h2>
              </div>

              {lesson.sections.map((section, idx) => (
                <LessonSectionContainer
                  key={section.id}
                  section={section}
                  sectionIndex={idx}
                  lessonLabel={`${courseNumber}.${globalIndex + 1}`}
                  isRtl={isRtl}
                  completed={isSectionComplete(section.id)}
                  alternateBackground={idx % 2 === 1}
                />
              ))}
            </div>
          );
        })}

        {/* Navigation buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-2)',
            paddingTop: 'var(--spacing-6)',
            marginTop: 'var(--spacing-4)',
            borderTop: '0.5px solid var(--ds-border)',
          }}
        >
          {isLastPage ? (
            <button
              type="button"
              onClick={handleComplete}
              style={{
                width: '100%',
                padding: '12px 24px',
                background: 'var(--ds-primary)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-primary-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ds-primary)'; }}
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
                padding: '12px 24px',
                background: 'var(--ds-primary)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-primary-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ds-primary)'; }}
            >
              {intl.formatMessage({ id: 'learn.course.next', defaultMessage: 'Next' })}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points={isRtl ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
              </svg>
            </button>
          )}

          {!isFirstPage && (
            <button
              type="button"
              onClick={onPreviousPage}
              style={{
                width: '100%',
                padding: '12px 24px',
                background: 'transparent',
                color: 'var(--ds-text-body)',
                border: '0.5px solid var(--ds-border)',
                borderRadius: '8px',
                fontSize: '13px',
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
              {intl.formatMessage({ id: 'learn.course.previous', defaultMessage: 'Previous' })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
