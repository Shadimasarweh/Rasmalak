'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Clock } from 'lucide-react';
import { useCourseProgress } from '@/store/courseProgressStore';
import { getTotalSections, parseEstimatedMinutes } from '@/types/course';
import CourseHero from './CourseHero';
import LessonSectionContainer from './CourseSection';
import type { CourseData, Section } from '@/types/course';

// Sections whose checkpoint carries quiz data gate page navigation: they are
// only marked complete when the quiz is passed, never by merely viewing.
function sectionHasQuiz(section: Section): boolean {
  return section.blocks.some((b) => b.type === 'checkpoint' && !!b.quiz && b.quiz.length > 0);
}

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
  const { markSectionsComplete, markSectionComplete, isSectionComplete, loading } = useCourseProgress();

  const pageLessons = useMemo(() => {
    const start = currentPage * lessonsPerPage;
    return course.lessons.slice(start, start + lessonsPerPage);
  }, [course, currentPage, lessonsPerPage]);

  const pageSections = useMemo(() => pageLessons.flatMap((l) => l.sections), [pageLessons]);

  // Flat section index at which each page lesson starts, for the stepper.
  const lessonSectionOffsets = useMemo(() => {
    const offsets: number[] = [];
    let acc = 0;
    for (const lesson of pageLessons) {
      offsets.push(acc);
      acc += lesson.sections.length;
    }
    return offsets;
  }, [pageLessons]);

  const contentRef = useRef<HTMLDivElement>(null);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);

  // Track which section currently sits in the upper reading band so the
  // stepper follows the reader's scroll position.
  useEffect(() => {
    const rootEl = contentRef.current;
    if (!rootEl) return;
    const nodes = Array.from(rootEl.querySelectorAll<HTMLElement>('[data-stepper-idx]'));
    if (nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.stepperIdx);
            if (!Number.isNaN(idx)) setActiveSectionIdx(idx);
          }
        }
      },
      { rootMargin: '-15% 0px -70% 0px' }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [currentPage, pageLessons]);

  const quizSectionIds = useMemo(
    () => pageSections.filter(sectionHasQuiz).map((s) => s.id),
    [pageSections]
  );

  useEffect(() => {
    if (loading || pageLessons.length === 0) return;
    const quizIds = new Set(quizSectionIds);
    const sectionIds = pageLessons
      .flatMap((l) => l.sections.map((s) => s.id))
      .filter((id) => !quizIds.has(id));
    if (sectionIds.length > 0) markSectionsComplete(sectionIds);
  }, [currentPage, loading, pageLessons, quizSectionIds, markSectionsComplete]);

  if (pageLessons.length === 0) return null;

  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === totalPages - 1;

  const allQuizzesPassed = quizSectionIds.every((id) => isSectionComplete(id));

  const startLessonIndex = currentPage * lessonsPerPage;

  const displayIdx = Math.max(0, Math.min(activeSectionIdx, pageSections.length - 1));
  const estMinutes = parseEstimatedMinutes(course.estimatedTime);
  const totalCourseSections = getTotalSections(course);
  const sectionsBeforePage = course.lessons
    .slice(0, startLessonIndex)
    .reduce((sum, l) => sum + l.sections.length, 0);
  const remainingSections = Math.max(1, totalCourseSections - (sectionsBeforePage + displayIdx));
  const minutesLeft =
    estMinutes !== null && totalCourseSections > 0
      ? Math.max(1, Math.ceil((estMinutes / totalCourseSections) * remainingSections))
      : null;

  const markViewedSections = () => {
    const quizIds = new Set(quizSectionIds);
    const sectionIds = pageLessons
      .flatMap((l) => l.sections.map((s) => s.id))
      .filter((id) => !quizIds.has(id));
    if (sectionIds.length > 0) markSectionsComplete(sectionIds);
  };

  const handleNext = () => {
    if (!allQuizzesPassed) return;
    markViewedSections();
    onNextPage();
  };

  const handleComplete = () => {
    if (!allQuizzesPassed) return;
    markViewedSections();
    onComplete();
  };

  return (
    <div style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      {showHero && isFirstPage && <CourseHero course={course} />}

      <div
        ref={contentRef}
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: 'var(--spacing-6) var(--spacing-4)',
        }}
      >
        {/* Sticky per-page progress stepper */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 12,
            background: 'var(--ds-bg-card)',
            border: '0.5px solid var(--ds-border)',
            borderRadius: '12px',
            boxShadow: 'var(--ds-shadow-card)',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap',
            marginBottom: 'var(--spacing-5)',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text-heading)', whiteSpace: 'nowrap' }}>
            {intl.formatMessage(
              { id: 'learn.course.stepper_section_of', defaultMessage: 'Section {current} of {total}' },
              {
                current: intl.formatNumber(displayIdx + 1),
                total: intl.formatNumber(pageSections.length),
              }
            )}
          </span>
          <div style={{ flex: 1, minWidth: '120px', display: 'flex', gap: '4px' }}>
            {pageSections.map((section, i) => (
              <div
                key={section.id}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  background:
                    i < displayIdx
                      ? 'var(--ds-primary)'
                      : i === displayIdx
                        ? 'var(--ds-primary-glow)'
                        : 'var(--ds-bg-tinted)',
                  transition: 'background 300ms ease',
                }}
              />
            ))}
          </div>
          {minutesLeft !== null && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 500, color: 'var(--ds-text-muted)', whiteSpace: 'nowrap' }}>
              <Clock size={12} />
              {intl.formatMessage(
                { id: 'learn.course.stepper_time_left', defaultMessage: '~{min} min left' },
                { min: intl.formatNumber(minutesLeft) }
              )}
            </span>
          )}
        </div>

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
                <div key={section.id} data-stepper-idx={lessonSectionOffsets[pageIdx] + idx}>
                  <LessonSectionContainer
                    section={section}
                    sectionIndex={idx}
                    lessonLabel={`${courseNumber}.${globalIndex + 1}`}
                    isRtl={isRtl}
                    completed={isSectionComplete(section.id)}
                    alternateBackground={idx % 2 === 1}
                    quizPassed={isSectionComplete(section.id)}
                    onQuizPass={() => markSectionComplete(section.id)}
                  />
                </div>
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
              disabled={!allQuizzesPassed}
              style={{
                width: '100%',
                padding: '12px 24px',
                background: allQuizzesPassed ? 'var(--ds-primary)' : 'var(--ds-text-muted)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: allQuizzesPassed ? 'pointer' : 'not-allowed',
                opacity: allQuizzesPassed ? 1 : 0.6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 150ms ease',
              }}
              onMouseEnter={(e) => { if (allQuizzesPassed) e.currentTarget.style.background = 'var(--ds-primary-hover)'; }}
              onMouseLeave={(e) => { if (allQuizzesPassed) e.currentTarget.style.background = 'var(--ds-primary)'; }}
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
              disabled={!allQuizzesPassed}
              style={{
                width: '100%',
                padding: '12px 24px',
                background: allQuizzesPassed ? 'var(--ds-primary)' : 'var(--ds-text-muted)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: allQuizzesPassed ? 'pointer' : 'not-allowed',
                opacity: allQuizzesPassed ? 1 : 0.6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 150ms ease',
              }}
              onMouseEnter={(e) => { if (allQuizzesPassed) e.currentTarget.style.background = 'var(--ds-primary-hover)'; }}
              onMouseLeave={(e) => { if (allQuizzesPassed) e.currentTarget.style.background = 'var(--ds-primary)'; }}
            >
              {intl.formatMessage({ id: 'learn.course.next', defaultMessage: 'Next' })}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points={isRtl ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
              </svg>
            </button>
          )}

          {!allQuizzesPassed && (
            <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ds-text-muted)', textAlign: 'center', margin: 0 }}>
              {intl.formatMessage({
                id: 'learn.course.quiz_locked_next',
                defaultMessage: 'Pass the checkpoint quiz to continue',
              })}
            </p>
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
