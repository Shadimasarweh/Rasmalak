'use client';

import type { CourseData, CourseLevel } from '@/types/course';
import { getTotalSections } from '@/types/course';

const LEVEL_LABELS: Record<CourseLevel, { en: string; ar: string }> = {
  beginner: { en: 'Beginner', ar: 'مبتدئ' },
  intermediate: { en: 'Intermediate', ar: 'متوسط' },
  advanced: { en: 'Advanced', ar: 'متقدم' },
};

export default function CourseHero({ course }: { course: CourseData }) {
  const isRtl = course.locale === 'ar';
  const totalSections = getTotalSections(course);
  const totalLessons = course.lessons.length;
  const level = course.level || 'beginner';
  const levelLabel = LEVEL_LABELS[level][course.locale];

  return (
    <div
      style={{
        background: 'var(--color-bg-surface-1)',
        padding: 'var(--spacing-6) var(--spacing-4)',
        borderBottom: '1px solid var(--color-border-subtle)',
        direction: isRtl ? 'rtl' : 'ltr',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Meta row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: 'var(--spacing-3)',
            flexWrap: 'wrap',
          }}
        >
          {/* Level badge */}
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: 'var(--color-accent-growth)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              background: 'var(--color-accent-growth-subtle)',
              padding: '3px 10px',
              borderRadius: 'var(--radius-pill)',
            }}
          >
            {levelLabel}
          </span>

          {/* Estimated time */}
          {course.estimatedTime && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                fontWeight: 500,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {course.estimatedTime}
            </span>
          )}

          {/* Sections count */}
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              fontWeight: 500,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            {isRtl
              ? `${totalLessons} دروس · ${totalSections} قسم`
              : `${totalLessons} lessons · ${totalSections} sections`
            }
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            lineHeight: 1.25,
            marginBottom: 'var(--spacing-2)',
          }}
        >
          {course.title}
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: '0.9375rem',
            lineHeight: 1.7,
            color: 'var(--color-text-secondary)',
            maxWidth: '640px',
            margin: 0,
          }}
        >
          {course.description}
        </p>
      </div>
    </div>
  );
}
