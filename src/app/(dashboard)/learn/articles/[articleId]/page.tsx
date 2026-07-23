'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useIntl } from 'react-intl';
import Link from 'next/link';
import { getAllArticles, getArticle, getArticleIdForLocale } from '@/data/articles';
import { getArticleCategory } from '@/data/courses/categories';
import { useStore } from '@/store/useStore';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import type { Block } from '@/types/course';
import type { ReactNode } from 'react';
import {
  BulletListBlock,
  KeyInsightBlock as KeyInsightComp,
  ExampleBlock as ExampleComp,
  ComparisonBlock as ComparisonComp,
  CheckpointBlock as CheckpointComp,
} from '@/components/courses/blocks';

const TOOL_REFERENCES: { pattern: string; route: string }[] = [
  { pattern: 'Rasmalak Loan Calculator', route: '/calculators/simple-loan' },
  { pattern: 'Loan Calculator', route: '/calculators/simple-loan' },
  { pattern: 'Rasmalak Mustasharak AI', route: '/chat' },
  { pattern: 'Mustasharak AI', route: '/chat' },
  { pattern: 'Mustasharak', route: '/chat' },
  { pattern: 'Rasmalak Expense Tracking & Insights', route: '/money/track' },
  { pattern: 'Expense Tracking & Insights', route: '/money/track' },
  { pattern: 'Rasmalak Predictive Budgeting', route: '/money/plan' },
  { pattern: 'Predictive Budgeting', route: '/money/plan' },
  { pattern: 'أدوات Rasmalak لتتبع وتحليل المصاريف', route: '/money/track' },
  { pattern: 'حاسبة القروض', route: '/calculators/simple-loan' },
  { pattern: 'تخطيط الميزانية الذكي في Rasmalak', route: '/money/plan' },
  { pattern: 'تخطيط الميزانية الذكي', route: '/money/plan' },
  { pattern: 'مستشارك للذكاء الاصطناعي', route: '/chat' },
  { pattern: 'مستشارك', route: '/chat' },
];

const LINK_STYLE: React.CSSProperties = {
  color: 'var(--ds-primary)',
  fontWeight: 600,
  textDecoration: 'underline',
  textDecorationColor: 'var(--ds-primary)',
  textUnderlineOffset: '3px',
  cursor: 'pointer',
  transition: 'opacity 150ms ease',
};

function linkifyText(text: string): ReactNode {
  const sortedRefs = [...TOOL_REFERENCES].sort(
    (a, b) => b.pattern.length - a.pattern.length
  );

  const parts: ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    let earliest = -1;
    let matchedRef: (typeof TOOL_REFERENCES)[number] | null = null;
    let matchIdx = Infinity;

    for (const ref of sortedRefs) {
      const idx = remaining.indexOf(ref.pattern);
      if (idx !== -1 && idx < matchIdx) {
        matchIdx = idx;
        matchedRef = ref;
        earliest = idx;
      }
    }

    if (earliest === -1 || !matchedRef) {
      parts.push(remaining);
      break;
    }

    if (earliest > 0) {
      parts.push(remaining.slice(0, earliest));
    }

    parts.push(
      <Link key={keyIdx++} href={matchedRef.route} style={LINK_STYLE}>
        {matchedRef.pattern}
      </Link>
    );

    remaining = remaining.slice(earliest + matchedRef.pattern.length);
  }

  return parts.length === 1 && typeof parts[0] === 'string' ? text : <>{parts}</>;
}

function LinkedTextBlock({ text }: { text: string }) {
  return (
    <p
      style={{
        fontSize: '0.9375rem',
        lineHeight: 1.85,
        color: 'var(--color-text-secondary)',
        marginBottom: 'var(--spacing-3)',
        maxWidth: '680px',
      }}
    >
      {linkifyText(text)}
    </p>
  );
}

function LinkedActionPromptBlock({ text }: { text: string }) {
  return (
    <div
      style={{
        border: '1px dashed var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--spacing-4)',
        marginBottom: 'var(--spacing-4)',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-text-muted)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, marginTop: '2px' }}
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <p
        style={{
          fontSize: '0.875rem',
          lineHeight: 1.7,
          color: 'var(--color-text-secondary)',
          fontStyle: 'italic',
          margin: 0,
        }}
      >
        {linkifyText(text)}
      </p>
    </div>
  );
}

function BlockRenderer({ block, isRtl }: { block: Block; isRtl: boolean }) {
  switch (block.type) {
    case 'p':
      return <LinkedTextBlock text={block.text} />;
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
      return <LinkedActionPromptBlock text={block.text} />;
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

  const contentRef = useRef<HTMLDivElement>(null);
  const [readPct, setReadPct] = useState(0);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const relatedArticles = useMemo(
    () =>
      getAllArticles(language)
        .filter((a) => a.articleId !== (article?.articleId ?? ''))
        .slice(0, 3),
    [language, article]
  );

  // Reading progress — % of the article body that has passed the fold.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const scrollParent: HTMLElement | Window = el.closest('main') ?? window;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.height <= 0) return;
      const pct = Math.round(
        Math.min(1, Math.max(0, (window.innerHeight - rect.top) / rect.height)) * 100
      );
      setReadPct(pct);
    };
    update();
    scrollParent.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      scrollParent.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [article]);

  // Active section for the "On this page" rail.
  useEffect(() => {
    const el = contentRef.current;
    if (!el || !article) return;
    const nodes = Array.from(el.querySelectorAll<HTMLElement>('[data-article-section]'));
    if (nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSectionId((entry.target as HTMLElement).dataset.articleSection ?? null);
          }
        }
      },
      { rootMargin: '-15% 0px -70% 0px' }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [article]);

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
            onClick={() => router.push('/learn?tab=articles')}
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
  const category = getArticleCategory(article.tagEn, article.tagAr);
  const WatermarkIcon = category.icon;
  const publishedDate = new Date(article.publishedDate + 'T00:00:00');

  const scrollToSection = (sectionId: string) => {
    document.getElementById(`article-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="ds-page" style={{ background: 'var(--ds-bg-page)', direction: isRtl ? 'rtl' : 'ltr' }}>
      <style>{`
        .article-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 32px;
          max-width: 1060px;
          margin: 0 auto;
          width: 100%;
        }
        .article-toc { display: none; }
        @media (min-width: 1024px) {
          .article-layout { grid-template-columns: minmax(0, 1fr) 220px; }
          .article-toc { display: block; }
        }
      `}</style>

      {/* Back button */}
      <button
        type="button"
        onClick={() => router.push('/learn?tab=articles')}
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
          alignSelf: 'flex-start',
        }}
      >
        <BackArrow size={16} />
        {intl.formatMessage({ id: 'learn.article.back_to_learn', defaultMessage: 'Back to Learn' })}
      </button>

      {/* Category-colored hero */}
      <div
        style={{
          background: `linear-gradient(135deg, ${category.color} 0%, ${category.heroDark} 100%)`,
          borderRadius: '20px',
          padding: '32px 28px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Watermark category icon */}
        <WatermarkIcon
          size={190}
          aria-hidden
          style={{
            position: 'absolute',
            insetInlineEnd: '-28px',
            bottom: '-42px',
            color: '#FFFFFF',
            opacity: 0.07,
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Category pill */}
          <span
            style={{
              display: 'inline-block',
              fontSize: '10px',
              fontWeight: 600,
              color: '#FFFFFF',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              background: 'rgba(255,255,255,0.16)',
              border: '0.5px solid rgba(255,255,255,0.25)',
              borderRadius: '9999px',
              padding: '4px 12px',
              marginBottom: '14px',
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
              fontFamily: isRtl ? 'var(--font-arabic)' : undefined,
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
          {/* Author avatar · date · read-time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                aria-hidden
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  color: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {isRtl ? 'ر' : 'R'}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
                {intl.formatMessage({ id: 'learn.article.author_team', defaultMessage: 'Rasmalak Team' })}
              </span>
            </div>
            <span aria-hidden style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
              {intl.formatDate(publishedDate, { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
            <span aria-hidden style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
              <Clock size={14} />
              {isRtl
                ? `${intl.formatNumber(article.readMin)} دقيقة قراءة`
                : `${article.readMin} min read`}
            </span>
          </div>
        </div>
      </div>

      {/* Sticky reading-progress bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'var(--ds-bg-page)',
          padding: '10px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          maxWidth: '1060px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div style={{ flex: 1, height: '4px', background: 'var(--ds-bg-tinted)', borderRadius: '4px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${readPct}%`,
              height: '100%',
              background: category.color,
              borderRadius: '4px',
              transition: 'width 120ms linear',
            }}
          />
        </div>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ds-text-muted)', whiteSpace: 'nowrap' }}>
          {intl.formatMessage(
            { id: 'learn.article.percent_read', defaultMessage: '{percent}% read' },
            { percent: intl.formatNumber(readPct) }
          )}
        </span>
      </div>

      {/* Content + TOC rail */}
      <div className="article-layout">
        <div ref={contentRef} style={{ minWidth: 0 }}>
          {article.sections.map((section, sectionIdx) => (
            <div
              key={section.id}
              id={`article-${section.id}`}
              data-article-section={section.id}
              style={{ padding: '20px 0', scrollMarginTop: '48px' }}
            >
              {/* Numbered section header */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '14px' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: category.labelVar,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '0.04em',
                  }}
                >
                  {intl.formatNumber(sectionIdx + 1, { minimumIntegerDigits: 2 })}
                </span>
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    lineHeight: 1.35,
                    margin: 0,
                  }}
                >
                  {section.title}
                </h2>
              </div>

              <div style={{ paddingInlineStart: '2px' }}>
                {section.blocks.map((block, i) => (
                  <BlockRenderer key={i} block={block} isRtl={isRtl} />
                ))}
              </div>
            </div>
          ))}

          {/* Keep reading */}
          {relatedArticles.length > 0 && (
            <div style={{ paddingTop: '24px', marginTop: '16px', borderTop: '0.5px solid var(--ds-border)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ds-text-heading)', margin: 0, marginBottom: '14px' }}>
                {intl.formatMessage({ id: 'learn.article.keep_reading', defaultMessage: 'Keep reading' })}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                {relatedArticles.map((related) => {
                  const relatedCategory = getArticleCategory(related.tagEn, related.tagAr);
                  return (
                    <Link
                      key={related.articleId}
                      href={`/learn/articles/${related.articleId}`}
                      style={{ textDecoration: 'none', display: 'block' }}
                    >
                      <div
                        style={{
                          background: 'var(--ds-bg-card)',
                          border: '0.5px solid var(--ds-border)',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          boxShadow: 'var(--ds-shadow-card)',
                          transition: 'box-shadow 0.2s ease',
                          height: '100%',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--ds-shadow-card)'; }}
                      >
                        <div style={{ height: '4px', background: relatedCategory.color }} />
                        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: relatedCategory.labelVar }}>
                            {isRtl ? related.tagAr : related.tagEn}
                          </span>
                          <h3
                            style={{
                              fontSize: '14px', fontWeight: 600, color: 'var(--ds-text-heading)', margin: 0, lineHeight: 1.45,
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                            }}
                          >
                            {related.title}
                          </h3>
                          <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ds-text-muted)' }}>
                            {isRtl
                              ? `${intl.formatNumber(related.readMin)} دقيقة قراءة`
                              : `${related.readMin} min read`}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Back to articles */}
          <div style={{ paddingTop: '24px', marginTop: '16px' }}>
            <button
              type="button"
              onClick={() => router.push('/learn?tab=articles')}
              style={{
                width: '100%',
                padding: '12px 24px',
                background: 'var(--ds-primary)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                minHeight: '44px',
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

        {/* "On this page" rail */}
        <aside className="article-toc">
          <nav style={{ position: 'sticky', top: '48px' }} aria-label={intl.formatMessage({ id: 'learn.article.on_this_page', defaultMessage: 'On this page' })}>
            <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ds-text-muted)', marginBottom: '10px' }}>
              {intl.formatMessage({ id: 'learn.article.on_this_page', defaultMessage: 'On this page' })}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {article.sections.map((section) => {
                const isActive = activeSectionId === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderInlineStart: isActive ? `2px solid ${category.color}` : '2px solid var(--ds-border)',
                      color: isActive ? 'var(--ds-text-heading)' : 'var(--ds-text-muted)',
                      fontWeight: isActive ? 600 : 400,
                      fontSize: '12.5px',
                      lineHeight: 1.45,
                      textAlign: 'start',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      transition: 'color 150ms ease, border-color 150ms ease',
                    }}
                  >
                    {section.title}
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>
      </div>
    </div>
  );
}
