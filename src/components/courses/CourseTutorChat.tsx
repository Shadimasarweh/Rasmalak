'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useLanguage } from '@/store/useStore';
import { useSession } from '@/store/authStore';
import { AIMessage } from '@/ai/types';
import type { Lesson } from '@/types/course';

/* ===== ICONS ===== */

const TutorIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
  </svg>
);

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const MinimizeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 14 10 14 10 20" />
    <polyline points="20 10 14 10 14 4" />
    <line x1="14" y1="10" x2="21" y2="3" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

/* ===== LOADING DOTS ===== */

function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: '4px', padding: '4px 0' }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--ds-text-muted)',
            animation: `tutorBounce 1.4s ${i * 0.2}s infinite ease-in-out both`,
          }}
        />
      ))}
      <style>{`
        @keyframes tutorBounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ===== MESSAGE BUBBLE ===== */

function TutorMessageBubble({ message, isUser }: { message: AIMessage; isUser: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '8px',
      }}
    >
      <div
        style={{
          maxWidth: '85%',
          padding: '10px 14px',
          borderRadius: isUser
            ? '14px 14px 2px 14px'
            : '14px 14px 14px 2px',
          background: isUser
            ? 'var(--ds-primary)'
            : 'var(--ds-bg-card)',
          color: isUser
            ? '#FFFFFF'
            : 'var(--ds-text-heading)',
          border: isUser
            ? 'none'
            : '0.5px solid var(--ds-border)',
          fontSize: '13px',
          lineHeight: isUser ? 1.5 : 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {message.isLoading ? (
          <LoadingDots />
        ) : message.isError ? (
          <span style={{ color: isUser ? '#FCA5A5' : 'var(--ds-error)' }}>
            {message.errorMessage || message.content}
          </span>
        ) : (
          message.content
        )}
      </div>
    </div>
  );
}

/* ===== PROPS ===== */

interface CourseTutorChatProps {
  courseId: string;
  courseTitle: string;
  currentLessons: Lesson[];
  onOpenChange?: (open: boolean) => void;
}

/* ===== MAIN COMPONENT ===== */

export default function CourseTutorChat({ courseId, courseTitle: _courseTitle, currentLessons: _currentLessons, onOpenChange }: CourseTutorChatProps) {
  const intl = useIntl();
  const language = useLanguage();
  const session = useSession();

  const STORAGE_KEY = 'course-tutor-open';
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === '1';
  });
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleOpen = useCallback((open: boolean) => {
    setIsOpen(open);
    localStorage.setItem(STORAGE_KEY, open ? '1' : '0');
    onOpenChange?.(open);
  }, [onOpenChange]);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keep a plain-text history for the tutor API (no financial data)
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim()) return;
    if (isLoading) return;

    const userMessage: AIMessage = {
      id: `tutor_${Date.now()}_user`,
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date().toISOString(),
    };

    const loadingMessage: AIMessage = {
      id: `tutor_${Date.now()}_loading`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/tutor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({
          message: messageText.trim(),
          courseId,
          language,
          conversationHistory,
        }),
      });

      const data = await response.json();

      if (data.success && data.content) {
        const assistantMessage: AIMessage = {
          id: `tutor_${Date.now()}_assistant`,
          role: 'assistant',
          content: data.content,
          timestamp: new Date().toISOString(),
        };

        setConversationHistory(prev => [
          ...prev,
          { role: 'user', content: messageText.trim() },
          { role: 'assistant', content: data.content },
        ]);
        setMessages(prev => [...prev.slice(0, -1), assistantMessage]);
      } else {
        const errorMessage: AIMessage = {
          id: `tutor_${Date.now()}_error`,
          role: 'assistant',
          content: data.error || (language === 'ar'
            ? 'حدث خطأ. الرجاء المحاولة مرة أخرى.'
            : 'An error occurred. Please try again.'),
          timestamp: new Date().toISOString(),
          isError: true,
          errorMessage: data.error,
        };
        setMessages(prev => [...prev.slice(0, -1), errorMessage]);
      }
    } catch {
      const errorMessage: AIMessage = {
        id: `tutor_${Date.now()}_error`,
        role: 'assistant',
        content: language === 'ar'
          ? 'خطأ في الاتصال. الرجاء التحقق من الإنترنت والمحاولة مرة أخرى.'
          : 'Connection error. Please check your internet and try again.',
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages(prev => [...prev.slice(0, -1), errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, courseId, language, conversationHistory, session?.access_token]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const tutorTitle = intl.formatMessage({
    id: 'learn.course.tutor_title',
    defaultMessage: 'Course Tutor',
  });

  const placeholderText = intl.formatMessage({
    id: 'learn.course.tutor_placeholder',
    defaultMessage: 'Ask about this course...',
  });

  /* ===== COLLAPSED STATE — FAB BUTTON ===== */
  if (!isOpen) {
    return (
      <>
        <style>{`
          @media (max-width: 1023px) {
            .tutor-chat-fab { bottom: 80px !important; }
          }
        `}</style>
        <button
          className="tutor-chat-fab"
          onClick={() => toggleOpen(true)}
          aria-label={tutorTitle}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            insetInlineEnd: '24px',
            insetInlineStart: 'auto',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--ds-primary)',
            color: '#FFFFFF',
            border: 'none',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 40,
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
          }}
        >
          <TutorIcon />
        </button>
      </>
    );
  }

  /* ===== EXPANDED STATE — CHAT PANEL ===== */
  return (
    <>
    <style>{`
      @media (max-width: 1023px) {
        .tutor-chat-panel { bottom: 80px !important; }
      }
    `}</style>
    <div
      className="tutor-chat-panel"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        insetInlineEnd: '24px',
        insetInlineStart: 'auto',
        width: '380px',
        maxWidth: 'calc(100vw - 32px)',
        height: '500px',
        maxHeight: 'calc(100vh - 100px)',
        borderRadius: '16px',
        background: 'var(--ds-bg-card)',
        border: '0.5px solid var(--ds-border)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 40,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          background: 'var(--ds-primary)',
          color: '#FFFFFF',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <TutorIcon />
          </div>
          <span style={{ fontWeight: 500, fontSize: '15px' }}>{tutorTitle}</span>
        </div>
        <button
          onClick={() => toggleOpen(false)}
          aria-label={intl.formatMessage({ id: 'learn.course.tutor_minimize', defaultMessage: 'Minimize' })}
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            border: 'none',
            borderRadius: '8px',
            width: '44px',
            height: '44px',
            padding: '0',
            color: '#FFFFFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MinimizeIcon />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              padding: '24px',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--ds-bg-tinted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ds-primary)',
              }}
            >
              <TutorIcon />
            </div>
            <p
              style={{
                fontSize: '15px',
                fontWeight: 500,
                color: 'var(--ds-text-heading)',
              }}
            >
              {intl.formatMessage({
                id: 'learn.course.tutor_welcome',
                defaultMessage: 'Need help with the course?',
              })}
            </p>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--ds-text-muted)',
                maxWidth: '240px',
                lineHeight: 1.5,
              }}
            >
              {intl.formatMessage({
                id: 'learn.course.tutor_welcome_sub',
                defaultMessage: 'Ask me to explain a topic, expand on a concept, or help you understand anything in this course.',
              })}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <TutorMessageBubble
              key={msg.id}
              message={msg}
              isUser={msg.role === 'user'}
            />
          ))
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px',
          borderTop: '0.5px solid var(--ds-border)',
          flexShrink: 0,
          background: 'var(--ds-bg-card)',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '10px 14px',
            minHeight: '44px',
            fontSize: '13px',
            color: 'var(--ds-text-heading)',
            background: 'var(--ds-bg-input)',
            border: '0.5px solid var(--ds-border)',
            borderRadius: '20px',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          aria-label={intl.formatMessage({ id: 'learn.course.tutor_send', defaultMessage: 'Send' })}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: inputValue.trim() && !isLoading
              ? 'var(--ds-primary)'
              : 'var(--ds-text-muted)',
            color: '#FFFFFF',
            border: 'none',
            cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            opacity: inputValue.trim() && !isLoading ? 1 : 0.5,
            transition: 'background 0.15s ease, opacity 0.15s ease',
          }}
        >
          <SendIcon />
        </button>
      </form>
    </div>
    </>
  );
}
