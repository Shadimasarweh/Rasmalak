'use client';

import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Check, X, RotateCcw } from 'lucide-react';
import type { QuizQuestion } from '@/types/course';

interface CheckpointQuizProps {
  title?: string;
  quiz: QuizQuestion[];
  // True when the section is already complete (e.g. passed in a previous visit).
  passed?: boolean;
  onPass?: () => void;
}

export default function CheckpointQuiz({ title, quiz, passed, onPass }: CheckpointQuizProps) {
  const intl = useIntl();
  const [selected, setSelected] = useState<Record<number, number>>({});

  const answeredCount = Object.keys(selected).length;
  const allAnswered = answeredCount === quiz.length;
  const allCorrect = allAnswered && quiz.every((q, qi) => q.options[selected[qi]]?.correct);

  const handleSelect = (qi: number, oi: number) => {
    if (selected[qi] !== undefined) return;
    const next = { ...selected, [qi]: oi };
    setSelected(next);
    const done = Object.keys(next).length === quiz.length;
    if (done && quiz.every((q, i) => q.options[next[i]]?.correct)) {
      onPass?.();
    }
  };

  const handleRetry = () => setSelected({});

  return (
    <div
      style={{
        background: 'var(--color-bg-surface-2)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--spacing-4)',
        marginBottom: 'var(--spacing-4)',
        borderTop: '2px solid var(--color-accent-growth)',
      }}
    >
      <style>{`
        @keyframes quizPassPop {
          0% { transform: scale(0.9); opacity: 0; }
          60% { transform: scale(1.03); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Header: title + answered counter */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: 'var(--spacing-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-accent-growth)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span
            style={{
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: 'var(--color-accent-growth)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {title || intl.formatMessage({ id: 'learn.course.checkpoint_title' })}
          </span>
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--ds-text-muted)',
            background: 'var(--ds-bg-card)',
            border: '0.5px solid var(--ds-border)',
            borderRadius: '9999px',
            padding: '4px 10px',
          }}
        >
          {intl.formatMessage(
            { id: 'learn.course.quiz_answered', defaultMessage: '{answered} / {total} answered' },
            {
              answered: intl.formatNumber(answeredCount),
              total: intl.formatNumber(quiz.length),
            }
          )}
        </span>
      </div>

      {/* Already passed in a previous visit */}
      {passed && !allAnswered && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--ds-success-bg)',
            border: '0.5px solid var(--ds-success-border)',
            borderRadius: '8px',
            padding: '8px 12px',
            marginBottom: 'var(--spacing-3)',
          }}
        >
          <Check size={14} style={{ color: 'var(--ds-success-text)', flexShrink: 0 }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ds-success-text)' }}>
            {intl.formatMessage({ id: 'learn.course.quiz_passed', defaultMessage: 'Checkpoint passed!' })}
          </span>
        </div>
      )}

      {/* Questions */}
      {quiz.map((q, qi) => {
        const chosen = selected[qi];
        const isAnswered = chosen !== undefined;
        const chosenCorrect = isAnswered && !!q.options[chosen]?.correct;

        return (
          <div key={qi} style={{ marginBottom: qi < quiz.length - 1 ? 'var(--spacing-5)' : 0 }}>
            <p
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                lineHeight: 1.6,
                margin: 0,
                marginBottom: '10px',
              }}
            >
              {q.question}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {q.options.map((option, oi) => {
                const isChosen = chosen === oi;
                const showCorrect = isAnswered && !!option.correct;
                const showWrong = isAnswered && isChosen && !option.correct;

                let background = 'var(--ds-bg-card)';
                let border = '1px solid var(--ds-border)';
                let color = 'var(--color-text-primary)';
                if (showCorrect) {
                  background = 'var(--ds-success-bg)';
                  border = '1px solid var(--ds-success-border)';
                  color = 'var(--ds-success-text)';
                } else if (showWrong) {
                  background = 'var(--ds-error-bg)';
                  border = '1px solid var(--ds-error-border)';
                  color = 'var(--ds-error-text)';
                }

                return (
                  <button
                    key={oi}
                    type="button"
                    onClick={() => handleSelect(qi, oi)}
                    disabled={isAnswered}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      width: '100%',
                      textAlign: 'start',
                      background,
                      border,
                      color,
                      borderRadius: '8px',
                      padding: '10px 14px',
                      minHeight: '44px',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      lineHeight: 1.5,
                      cursor: isAnswered ? 'default' : 'pointer',
                      opacity: isAnswered && !showCorrect && !showWrong ? 0.6 : 1,
                      transition: 'background 150ms ease, border-color 150ms ease, opacity 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isAnswered) e.currentTarget.style.background = 'var(--ds-bg-tinted)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isAnswered) e.currentTarget.style.background = 'var(--ds-bg-card)';
                    }}
                  >
                    <span>{option.text}</span>
                    {showCorrect && <Check size={16} style={{ flexShrink: 0 }} />}
                    {showWrong && <X size={16} style={{ flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>

            {/* Instant explanation */}
            {isAnswered && (
              <div
                style={{
                  marginTop: '8px',
                  background: 'var(--ds-bg-tinted)',
                  borderInlineStart: '2px solid var(--color-accent-growth)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: chosenCorrect ? 'var(--ds-success-text)' : 'var(--ds-error-text)',
                    marginBottom: '4px',
                  }}
                >
                  {chosenCorrect
                    ? intl.formatMessage({ id: 'learn.course.quiz_correct', defaultMessage: 'Correct' })
                    : intl.formatMessage({ id: 'learn.course.quiz_incorrect', defaultMessage: 'Not quite' })}
                </span>
                <p style={{ fontSize: '0.8125rem', lineHeight: 1.65, color: 'var(--color-text-secondary)', margin: 0 }}>
                  {q.explanation}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* Result footer */}
      {allAnswered && (
        <div
          style={{
            marginTop: 'var(--spacing-4)',
            borderRadius: '8px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            background: allCorrect ? 'var(--ds-success-bg)' : 'var(--ds-warning-bg)',
            border: allCorrect ? '0.5px solid var(--ds-success-border)' : '0.5px solid var(--ds-warning-border)',
            animation: 'quizPassPop 350ms ease-out',
          }}
        >
          {allCorrect ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--ds-primary)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Check size={18} />
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--ds-success-text)', margin: 0 }}>
                  {intl.formatMessage({ id: 'learn.course.quiz_passed', defaultMessage: 'Checkpoint passed!' })}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  {intl.formatMessage({
                    id: 'learn.course.quiz_passed_sub',
                    defaultMessage: 'Section marked complete — keep going.',
                  })}
                </p>
              </div>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--ds-warning-text)', margin: 0, lineHeight: 1.5 }}>
                {intl.formatMessage({
                  id: 'learn.course.quiz_failed',
                  defaultMessage: 'Almost there — review the explanations and try again.',
                })}
              </p>
              <button
                type="button"
                onClick={handleRetry}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--ds-primary)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  minHeight: '44px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 150ms ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-primary-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ds-primary)'; }}
              >
                <RotateCcw size={14} />
                {intl.formatMessage({ id: 'learn.course.quiz_retry', defaultMessage: 'Try again' })}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
