'use client';

import { useIntl } from 'react-intl';
import { useCourseProgress } from '@/store/courseProgressStore';
import type { CourseData } from '@/types/course';

interface CourseSidebarProps {
  course: CourseData;
  activeSectionId: string | null;
  onSectionClick: (sectionId: string) => void;
  open: boolean;
  onToggle: () => void;
}

export default function CourseSidebar({
  course,
  activeSectionId,
  onSectionClick,
  open,
  onToggle,
}: CourseSidebarProps) {
  const intl = useIntl();
  const { isSectionComplete, completionPercent } = useCourseProgress();
  const isRtl = course.locale === 'ar';

  return (
    <>
      {/* Mobile-only backdrop -- on desktop the sidebar coexists with content */}
      {open && (
        <div
          onClick={onToggle}
          className="course-sidebar-backdrop"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 9,
            background: 'rgba(0,0,0,0.15)',
          }}
        />
      )}
      <style>{`
        @media (min-width: 768px) {
          .course-sidebar-backdrop {
            display: none !important;
          }
        }
      `}</style>

      {/* Drawer panel */}
      <aside
        style={{
          width: '280px',
          position: 'absolute',
          top: 0,
          bottom: 0,
          [isRtl ? 'right' : 'left']: 0,
          zIndex: 10,
          background: 'var(--color-bg-surface-1)',
          borderRight: isRtl ? 'none' : '0.5px solid var(--ds-border)',
          borderLeft: isRtl ? '0.5px solid var(--ds-border)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          transition: 'transform 0.3s ease',
          transform: open
            ? 'translateX(0)'
            : isRtl
            ? 'translateX(100%)'
            : 'translateX(-100%)',
          boxShadow: open ? '4px 0 12px rgba(0,0,0,0.15)' : 'none',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--spacing-4) var(--spacing-3)',
            borderBottom: '0.5px solid var(--ds-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-2)' }}>
            <h2
              style={{
                fontSize: '15px',
                fontWeight: 500,
                color: 'var(--ds-text-heading)',
                lineHeight: 1.4,
                flex: 1,
              }}
            >
              {course.title}
            </h2>
            <button
              type="button"
              onClick={onToggle}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: 'var(--ds-text-muted)',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
            <div
              style={{
                flex: 1,
                height: '4px',
                background: 'var(--ds-bg-tinted)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${completionPercent}%`,
                  background: completionPercent === 100 ? 'var(--color-success)' : 'var(--ds-primary-glow)',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: completionPercent === 100 ? 'var(--color-success)' : 'var(--ds-primary)',
                flexShrink: 0,
                minWidth: '32px',
                textAlign: 'end',
              }}
            >
              {intl.formatNumber(completionPercent)}%
            </span>
          </div>

          {completionPercent === 100 && (
            <p style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 500, marginTop: '6px' }}>
              {intl.formatMessage({ id: 'learn.course.course_complete', defaultMessage: 'Course Complete!' })}
            </p>
          )}
        </div>

        {/* Lesson / Section list */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-2) 0' }}>
          {course.lessons.map((lesson) => (
            <div key={lesson.lessonId} style={{ marginBottom: 'var(--spacing-1)' }}>
              <div
                style={{
                  padding: 'var(--spacing-2) var(--spacing-3)',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'var(--ds-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {lesson.title}
              </div>

              {lesson.sections.map((section) => {
                const completed = isSectionComplete(section.id);
                const active = activeSectionId === section.id;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => onSectionClick(section.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '10px var(--spacing-3)',
                      paddingInlineStart: 'var(--spacing-4)',
                      background: active ? 'var(--color-accent-growth-subtle)' : 'transparent',
                      border: 'none',
                      borderInlineStart: active ? '3px solid var(--color-accent-growth)' : '3px solid transparent',
                      cursor: 'pointer',
                      textAlign: isRtl ? 'right' : 'left',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <span style={{ flexShrink: 0, color: completed ? 'var(--color-success)' : active ? 'var(--color-accent-growth)' : 'var(--color-border)' }}>
                      {completed ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                        </svg>
                      )}
                    </span>

                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: active ? 600 : 400,
                        color: completed
                          ? 'var(--color-text-muted)'
                          : active
                          ? 'var(--color-accent-growth)'
                          : 'var(--color-text-primary)',
                        lineHeight: 1.4,
                      }}
                    >
                      {section.title}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
