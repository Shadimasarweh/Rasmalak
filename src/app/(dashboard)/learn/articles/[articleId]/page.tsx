'use client';

import { useParams, useRouter } from 'next/navigation';
import { useIntl } from 'react-intl';
import { getArticle, getArticleIdForLocale } from '@/data/articles';
import { useStore } from '@/store/useStore';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import type { Block } from '@/types/course';
import {
  TextBlock,
  BulletListBlock,
  KeyInsightBlock as KeyInsightComp,
  ExampleBlock as ExampleComp,
  ComparisonBlock as ComparisonComp,
  ActionPromptBlock as ActionPromptComp,
  CheckpointBlock as CheckpointComp,
} from '@/components/courses/blocks';

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

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const intl = useIntl();
  const language = useStore((s) => s.language);
  const isRtl = language === 'ar';

  const rawId = params.articleId as string;
  const localizedId = getArticleIdForLocale(rawId, language);
  const article = getArticle(localizedId) || getArticle(rawId);

  if (!article) {
    return (
      <div
        className="ds-page"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          direction: isRtl ? 'rtl' : 'ltr',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ds-text-heading)', marginBottom: '8px' }}>
            {intl.formatMessage({ id: 'learn.article.not_found', defaultMessage: 'Article not found' })}
          </h2>
          <button
            type="button"
            onClick={() => router.push('/learn')}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              background: 'var(--ds-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {intl.formatMessage({ id: 'learn.article.back_to_learn', defaultMessage: 'Back to Learn' })}
          </button>
        </div>
      </div>
    );
  }

  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  return (
    <div className="ds-page" style={{ background: 'var(--ds-bg-page)', direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.push('/learn')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 0',
          background: 'transparent',
          border: 'none',
          color: 'var(--ds-primary)',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          marginBottom: '16px',
        }}
      >
        <BackArrow size={16} />
        {intl.formatMessage({ id: 'learn.article.back_to_learn', defaultMessage: 'Back to Learn' })}
      </button>

      {/* Article hero */}
      <div
        style={{
          background: 'linear-gradient(135deg, #2D6A4F 0%, #1B4332 100%)',
          borderRadius: '16px',
          padding: '32px 28px',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: '10px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.8)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            {isRtl ? article.tagAr : article.tagEn}
          </span>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#FFFFFF',
              margin: 0,
              marginBottom: '12px',
              lineHeight: 1.35,
              fontFeatureSettings: '"kern" 1',
            }}
          >
            {article.title}
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.85)',
              margin: 0,
              marginBottom: '16px',
              lineHeight: 1.6,
              maxWidth: '600px',
            }}
          >
            {article.description}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} style={{ color: 'rgba(255,255,255,0.7)' }} />
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
              {isRtl
                ? `${intl.formatNumber(article.readMin)} دقيقة قراءة`
                : `${article.readMin} min read`}
            </span>
          </div>
        </div>
      </div>

      {/* Article content */}
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
        {article.sections.map((section, sectionIdx) => (
          <div
            key={section.id}
            style={{
              position: 'relative',
              padding: '24px 0',
              paddingInlineStart: '16px',
              background: sectionIdx % 2 === 1 ? 'var(--color-bg-surface-1)' : 'transparent',
              borderRadius: sectionIdx % 2 === 1 ? '12px' : 0,
            }}
          >
            {/* Emerald accent line */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                bottom: '16px',
                [isRtl ? 'right' : 'left']: 0,
                width: '2px',
                background: 'var(--color-accent-growth)',
                opacity: 0.3,
                borderRadius: '1px',
              }}
            />

            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                lineHeight: 1.35,
                margin: 0,
                marginBottom: '16px',
              }}
            >
              {section.title}
            </h2>

            <div style={{ paddingInlineStart: '4px' }}>
              {section.blocks.map((block, i) => (
                <BlockRenderer key={i} block={block} isRtl={isRtl} />
              ))}
            </div>
          </div>
        ))}

        {/* Back to articles */}
        <div
          style={{
            paddingTop: '24px',
            marginTop: '16px',
            borderTop: '0.5px solid var(--ds-border)',
          }}
        >
          <button
            type="button"
            onClick={() => router.push('/learn')}
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
            <BackArrow size={16} />
            {intl.formatMessage({ id: 'learn.article.back_to_articles', defaultMessage: 'Back to Articles' })}
          </button>
        </div>
      </div>
    </div>
  );
}
