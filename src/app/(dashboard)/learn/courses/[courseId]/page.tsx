'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useIntl } from 'react-intl';
import { getCourse } from '@/data/courses';
import { CourseProgressProvider } from '@/store/courseProgressStore';
import CourseSidebar from '@/components/courses/CourseSidebar';
import CourseContent from '@/components/courses/CourseContent';

export default function CourseViewerPage() {
  const params = useParams();
  const router = useRouter();
  const intl = useIntl();
  const courseId = params.courseId as string;

  const course = getCourse(courseId);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeSectionId = useMemo(() => {
    if (!course) return null;
    const lesson = course.lessons[currentLessonIndex];
    return lesson?.sections[0]?.id ?? null;
  }, [course, currentLessonIndex]);

  const handleSectionClick = useCallback(
    (sectionId: string) => {
      if (!course) return;
      for (let li = 0; li < course.lessons.length; li++) {
        const lesson = course.lessons[li];
        if (lesson.sections.some((s) => s.id === sectionId)) {
          setCurrentLessonIndex(li);
          setSidebarOpen(false);
          scrollRef.current?.scrollTo({ top: 0 });
          return;
        }
      }
    },
    [course]
  );

  const handleNextLesson = useCallback(() => {
    if (!course) return;
    setCurrentLessonIndex((prev) => Math.min(prev + 1, course.lessons.length - 1));
    scrollRef.current?.scrollTo({ top: 0 });
  }, [course]);

  const handlePreviousLesson = useCallback(() => {
    setCurrentLessonIndex((prev) => Math.max(prev - 1, 0));
    scrollRef.current?.scrollTo({ top: 0 });
  }, []);

  const handleComplete = useCallback(() => {
    router.push('/learn');
  }, [router]);

  if (!course) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60vh',
          gap: 'var(--spacing-3)',
        }}
      >
        <p style={{ fontSize: '1.125rem', color: 'var(--color-text-secondary)' }}>
          {intl.formatMessage({ id: 'learn.course.not_found', defaultMessage: 'Course not found' })}
        </p>
        <button
          type="button"
          onClick={() => router.push('/learn')}
          style={{
            padding: '10px 20px',
            background: 'var(--color-accent-growth)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {intl.formatMessage({ id: 'learn.course.back_to_courses', defaultMessage: 'Back to Learn' })}
        </button>
      </div>
    );
  }

  const isRtl = course.locale === 'ar';

  return (
    <CourseProgressProvider course={course}>
      {/* Course page wrapper -- position:relative so sidebar is scoped here */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 'calc(100vh - 64px)',
          margin: 'calc(-1 * var(--spacing-3))',
          overflow: 'hidden',
        }}
        className="course-viewer-responsive"
      >
        {/* Sidebar drawer -- positioned within this container */}
        <CourseSidebar
          course={course}
          activeSectionId={activeSectionId}
          onSectionClick={handleSectionClick}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((o) => !o)}
        />

        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--spacing-2) var(--spacing-4)',
            borderBottom: '1px solid var(--color-border-subtle)',
            background: 'var(--color-bg-surface-1)',
            flexShrink: 0,
            zIndex: 1,
          }}
        >
          <button
            type="button"
            onClick={() => router.push('/learn')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points={isRtl ? '9 18 15 12 9 6' : '15 18 9 12 15 6'} />
            </svg>
            {intl.formatMessage({ id: 'learn.course.back_to_courses', defaultMessage: 'Back to Learn' })}
          </button>

          <button
            type="button"
            onClick={() => router.push('/learn')}
            style={{
              padding: '6px 16px',
              background: 'none',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {intl.formatMessage({ id: 'learn.course.exit_course', defaultMessage: 'Exit Course' })}
          </button>
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto' }}>
          <CourseContent
            course={course}
            currentLessonIndex={currentLessonIndex}
            onNextLesson={handleNextLesson}
            onPreviousLesson={handlePreviousLesson}
            onComplete={handleComplete}
            showHero
          />
        </div>
      </div>

      <style>{`
        @media (min-width: 640px) {
          .course-viewer-responsive {
            margin: calc(-1 * 1.5rem) !important;
          }
        }
      `}</style>
    </CourseProgressProvider>
  );
}
