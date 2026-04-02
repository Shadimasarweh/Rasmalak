'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useIntl } from 'react-intl';
import { getCourse, getCourseNumber, getCourseIdForLocale } from '@/data/courses';
import { useStore } from '@/store/useStore';
import { CourseProgressProvider } from '@/store/courseProgressStore';
import CourseSidebar from '@/components/courses/CourseSidebar';
import CourseContent from '@/components/courses/CourseContent';
import CourseTutorChat from '@/components/courses/CourseTutorChat';

export default function CourseViewerPage() {
  const params = useParams();
  const router = useRouter();
  const intl = useIntl();
  const courseId = params.courseId as string;

  const course = getCourse(courseId);
  const language = useStore((s) => s.language);

  useEffect(() => {
    if (!course) return;
    if (course.locale === language) return;
    const targetId = getCourseIdForLocale(courseId, language);
    const targetCourse = getCourse(targetId);
    if (targetCourse) {
      router.replace(`/learn/courses/${targetId}`);
    }
  }, [language, course, courseId, router]);

  const lessonsPerPage = useMemo(() => {
    if (!course) return 1;
    return Math.max(1, Math.round(course.lessons.length / 4));
  }, [course]);

  const totalPages = useMemo(() => {
    if (!course) return 1;
    return Math.ceil(course.lessons.length / lessonsPerPage);
  }, [course, lessonsPerPage]);

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('courseSidebarOpen') === 'true';
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [tutorOpen, setTutorOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('courseSidebarOpen', String(sidebarOpen));
  }, [sidebarOpen]);

  const currentPageLessons = useMemo(() => {
    if (!course) return [];
    const start = currentPage * lessonsPerPage;
    return course.lessons.slice(start, start + lessonsPerPage);
  }, [course, currentPage, lessonsPerPage]);

  const activeSectionId = useMemo(() => {
    if (currentPageLessons.length === 0) return null;
    return currentPageLessons[0]?.sections[0]?.id ?? null;
  }, [currentPageLessons]);

  const handleSectionClick = useCallback(
    (sectionId: string) => {
      if (!course) return;
      for (let li = 0; li < course.lessons.length; li++) {
        const lesson = course.lessons[li];
        if (lesson.sections.some((s) => s.id === sectionId)) {
          const targetPage = Math.floor(li / lessonsPerPage);
          setCurrentPage(targetPage);
          if (window.innerWidth < 768) {
            setSidebarOpen(false);
          }
          scrollRef.current?.scrollTo({ top: 0 });
          return;
        }
      }
    },
    [course, lessonsPerPage]
  );

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
    scrollRef.current?.scrollTo({ top: 0 });
  }, [totalPages]);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
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
        <p style={{ fontSize: '15px', color: 'var(--ds-text-body)' }}>
          {intl.formatMessage({ id: 'learn.course.not_found', defaultMessage: 'Course not found' })}
        </p>
        <button
          type="button"
          onClick={() => router.push('/learn')}
          style={{
            padding: '10px 18px',
            background: 'var(--ds-primary)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            minHeight: '44px',
            cursor: 'pointer',
            transition: 'background-color 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-primary-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ds-primary)'; }}
        >
          {intl.formatMessage({ id: 'learn.course.back_to_courses', defaultMessage: 'Back to Learn' })}
        </button>
      </div>
    );
  }

  const isRtl = course.locale === 'ar';
  const courseNumber = getCourseNumber(courseId);

  return (
    <CourseProgressProvider course={course}>
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
        {/* Sidebar drawer */}
        <CourseSidebar
          course={course}
          activeSectionId={activeSectionId}
          onSectionClick={handleSectionClick}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((o) => !o)}
        />

        {/* Top bar with sidebar toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            padding: 'var(--spacing-2) var(--spacing-4)',
            borderBottom: '0.5px solid var(--ds-border)',
            background: 'var(--ds-bg-card)',
            flexShrink: 0,
            zIndex: 11,
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Sidebar toggle button -- always visible in the top bar */}
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '44px',
                height: '44px',
                background: sidebarOpen ? 'rgba(45, 106, 79, 0.08)' : 'var(--ds-bg-tinted)',
                border: sidebarOpen ? '0.5px solid var(--ds-primary)' : '0.5px solid var(--ds-border)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={sidebarOpen ? '#2D6A4F' : '#374151'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {sidebarOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>

            <button
              type="button"
              onClick={() => router.push('/learn')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                color: 'var(--ds-text-muted)',
                fontSize: '13px',
                fontWeight: 500,
                minHeight: '44px',
                cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points={isRtl ? '9 18 15 12 9 6' : '15 18 9 12 15 6'} />
              </svg>
              {intl.formatMessage({ id: 'learn.course.back_to_courses', defaultMessage: 'Back to Learn' })}
            </button>
          </div>

          <button
            type="button"
            onClick={() => router.push('/learn')}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: '0.5px solid var(--ds-border)',
              borderRadius: '8px',
              color: 'var(--ds-text-muted)',
              fontSize: '13px',
              fontWeight: 500,
              minHeight: '44px',
              cursor: 'pointer',
            }}
          >
            {intl.formatMessage({ id: 'learn.course.exit_course', defaultMessage: 'Exit Course' })}
          </button>
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} className={tutorOpen ? 'course-content-with-tutor' : undefined} style={{ flex: 1, overflowY: 'auto' }}>
          <CourseContent
            course={course}
            courseNumber={courseNumber}
            currentPage={currentPage}
            totalPages={totalPages}
            lessonsPerPage={lessonsPerPage}
            onNextPage={handleNextPage}
            onPreviousPage={handlePreviousPage}
            onComplete={handleComplete}
            showHero
          />
        </div>
      </div>

      <CourseTutorChat
        courseTitle={course.title}
        currentLessons={currentPageLessons}
        onOpenChange={setTutorOpen}
      />

      <style>{`
        .course-content-with-tutor {
          padding-right: 400px;
        }
        @media (min-width: 640px) {
          .course-viewer-responsive {
            margin: calc(-1 * 1.5rem) !important;
          }
        }
        @media (max-width: 900px) {
          .course-content-with-tutor {
            padding-right: 0 !important;
          }
        }
      `}</style>
    </CourseProgressProvider>
  );
}
