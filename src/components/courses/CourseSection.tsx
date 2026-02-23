'use client';

import type { Section, Block } from '@/types/course';

interface CourseSectionProps {
  section: Section;
  isRtl: boolean;
}

function BlockRenderer({ block }: { block: Block }) {
  if (block.type === 'p') {
    return (
      <p
        style={{
          fontSize: '0.9375rem',
          lineHeight: 1.8,
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--spacing-3)',
        }}
      >
        {block.text}
      </p>
    );
  }

  if (block.type === 'ul') {
    return (
      <ul
        style={{
          marginBottom: 'var(--spacing-3)',
          paddingInlineStart: 'var(--spacing-4)',
          listStyleType: 'disc',
        }}
      >
        {block.items.map((item, i) => (
          <li
            key={i}
            style={{
              fontSize: '0.9375rem',
              lineHeight: 1.8,
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--spacing-1)',
            }}
          >
            {item}
          </li>
        ))}
      </ul>
    );
  }

  return null;
}

export default function CourseSection({ section, isRtl }: CourseSectionProps) {
  return (
    <div>
      <h3
        style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          lineHeight: 1.4,
          marginBottom: 'var(--spacing-3)',
        }}
      >
        {section.title}
      </h3>

      {section.blocks.map((block, i) => (
        <BlockRenderer key={i} block={block} />
      ))}
    </div>
  );
}
