'use client';

import type { Section, Block } from '@/types/course';
import {
  TextBlock,
  BulletListBlock,
  KeyInsightBlock as KeyInsightComp,
  ExampleBlock as ExampleComp,
  ComparisonBlock as ComparisonComp,
  ActionPromptBlock as ActionPromptComp,
  CheckpointBlock as CheckpointComp,
} from './blocks';

function BlockRenderer({ block, isRtl }: { block: Block; isRtl: boolean }) {
  switch (block.type) {
    case 'p':
      return <TextBlock text={block.text} />;
    case 'ul':
      return <BulletListBlock items={block.items} />;
    case 'key_insight':
      return <KeyInsightComp title={block.title} text={block.text} />;
    case 'example':
      return <ExampleComp title={block.title} rows={block.rows} />;
    case 'comparison':
      return (
        <ComparisonComp
          leftTitle={block.leftTitle}
          rightTitle={block.rightTitle}
          leftItems={block.leftItems}
          rightItems={block.rightItems}
        />
      );
    case 'action_prompt':
      return <ActionPromptComp text={block.text} />;
    case 'checkpoint':
      return <CheckpointComp title={block.title} items={block.items} isRtl={isRtl} />;
    default:
      return null;
  }
}

interface LessonSectionContainerProps {
  section: Section;
  sectionIndex: number;
  isRtl: boolean;
  completed: boolean;
  alternateBackground: boolean;
}

export default function LessonSectionContainer({
  section,
  sectionIndex,
  isRtl,
  completed,
  alternateBackground,
}: LessonSectionContainerProps) {
  const indexStr = String(sectionIndex + 1).padStart(2, '0');

  return (
    <div
      style={{
        position: 'relative',
        padding: 'var(--spacing-6) 0',
        paddingInlineStart: 'var(--spacing-4)',
        background: alternateBackground ? 'var(--color-bg-surface-1)' : 'transparent',
        borderRadius: alternateBackground ? 'var(--radius-md)' : 0,
      }}
    >
      {/* Emerald accent line */}
      <div
        style={{
          position: 'absolute',
          top: 'var(--spacing-4)',
          bottom: 'var(--spacing-4)',
          [isRtl ? 'right' : 'left']: 0,
          width: '2px',
          background: completed
            ? 'var(--color-success)'
            : 'var(--color-accent-growth)',
          opacity: completed ? 0.5 : 0.3,
          borderRadius: '1px',
        }}
      />

      {/* Section index + title row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          marginBottom: 'var(--spacing-4)',
        }}
      >
        {/* Large index number */}
        <span
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            lineHeight: 1,
            color: completed
              ? 'var(--color-text-muted)'
              : 'var(--color-accent-growth)',
            opacity: completed ? 0.4 : 0.25,
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0,
            minWidth: '36px',
            transition: 'color 0.4s ease, opacity 0.4s ease',
          }}
        >
          {indexStr}
        </span>

        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <h3
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                lineHeight: 1.35,
                margin: 0,
              }}
            >
              {section.title}
            </h3>

            {/* Completion check -- fades in */}
            <span
              style={{
                display: 'inline-flex',
                opacity: completed ? 1 : 0,
                transform: completed ? 'scale(1)' : 'scale(0.6)',
                transition: 'opacity 0.4s ease, transform 0.3s ease',
                color: 'var(--color-success)',
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      {/* Content blocks */}
      <div style={{ paddingInlineStart: '50px' }}>
        {section.blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} isRtl={isRtl} />
        ))}
      </div>
    </div>
  );
}
