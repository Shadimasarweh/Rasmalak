'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useTransactions } from '@/store/transactionStore';
import { 
  useCurrency, 
  useLanguage, 
  useMonthlyBudget, 
  useCategoryBudgets, 
  useSavingsGoals,
  useOnboardingData,
  useUserName,
} from '@/store/useStore';
import { buildUserContext } from '@/ai/context';
import { AIMessage, AIResponse, SuggestedAction } from '@/ai/types';

/* ============================================
   MUSTASHARAK AI ADVISOR PAGE
   Fully functional chat with AI integration
   ============================================ */

/* ===== ICONS ===== */
const BotIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM7.5 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm9 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM12 9a5 5 0 0 0-5 5v1h10v-1a5 5 0 0 0-5-5z" />
  </svg>
);

const ChartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const PiggyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z" />
    <path d="M2 9v1c0 1.1.9 2 2 2h1" />
    <path d="M16 11h.01" />
  </svg>
);

const TrendUpIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const RepeatIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const SparklesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v5m0 0l3-3m-3 3l-3-3" />
    <path d="M19 12h-5m0 0l3 3m-3-3l3-3" />
    <path d="M12 19v-5m0 0l-3 3m3-3l3 3" />
    <path d="M5 12h5m0 0l-3-3m3 3l-3 3" />
  </svg>
);

const LoadingDots = () => (
  <div style={{ display: 'flex', gap: '4px', padding: '8px 0' }}>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'var(--theme-text-muted)',
          animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
        }}
      />
    ))}
    <style>{`
      @keyframes pulse {
        0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
        40% { opacity: 1; transform: scale(1); }
      }
    `}</style>
  </div>
);

/* ===== QUICK ACTION CARD ===== */
function QuickActionCard({
  icon,
  iconBg,
  iconColor,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: 'var(--spacing-2)',
        background: 'var(--theme-bg-card)',
        border: '1px solid var(--theme-border)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        textAlign: 'start',
        width: '100%',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = iconColor;
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--theme-border)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-sm)',
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: iconColor,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--theme-text-primary)',
            marginBottom: '2px',
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontSize: '0.75rem',
            color: 'var(--theme-text-muted)',
          }}
        >
          {description}
        </p>
      </div>
    </button>
  );
}

/* ===== CHAT MESSAGE BUBBLE ===== */
function MessageBubble({ message, isUser }: { message: AIMessage; isUser: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 'var(--spacing-2)',
      }}
    >
      <div
        style={{
          maxWidth: '80%',
          padding: 'var(--spacing-2)',
          borderRadius: isUser 
            ? '16px 16px 4px 16px' 
            : '16px 16px 16px 4px',
          background: isUser 
            ? 'var(--color-brand-emerald)' 
            : 'var(--theme-bg-card)',
          color: isUser 
            ? '#FFFFFF' 
            : 'var(--theme-text-primary)',
          border: isUser 
            ? 'none' 
            : '1px solid var(--theme-border)',
          fontSize: '0.9375rem',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}
      >
        {message.isLoading ? (
          <LoadingDots />
        ) : message.isError ? (
          <span style={{ color: isUser ? '#FCA5A5' : 'var(--color-error)' }}>
            {message.errorMessage || message.content}
          </span>
        ) : (
          message.content
        )}
      </div>
    </div>
  );
}

/* ===== SUGGESTED ACTIONS ===== */
function SuggestedActions({ 
  actions, 
  onAction,
  language,
}: { 
  actions: SuggestedAction[]; 
  onAction: (action: SuggestedAction) => void;
  language: 'ar' | 'en';
}) {
  if (actions.length === 0) return null;
  
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: 'var(--spacing-1)',
        marginBottom: 'var(--spacing-2)',
      }}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => onAction(action)}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--color-brand-emerald)',
            background: 'transparent',
            color: 'var(--color-brand-emerald)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-brand-emerald)';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-brand-emerald)';
          }}
        >
          {language === 'ar' ? action.labelAr : action.label}
        </button>
      ))}
    </div>
  );
}

/* ===== MAIN PAGE ===== */
export default function MustasharakPage() {
  const intl = useIntl();
  const language = useLanguage();
  const userName = useUserName();
  
  // Get user data for context
  const { transactions } = useTransactions();
  const currency = useCurrency();
  const monthlyBudget = useMonthlyBudget();
  const categoryBudgets = useCategoryBudgets();
  const savingsGoals = useSavingsGoals();
  const onboardingData = useOnboardingData();
  
  // Chat state
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<AIResponse | null>(null);
  
  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Build user context for AI
  const buildContext = useCallback(() => {
    return buildUserContext({
      transactions,
      currency,
      language,
      monthlyBudget,
      categoryBudgets,
      savingsGoals,
      onboardingData,
    });
  }, [transactions, currency, language, monthlyBudget, categoryBudgets, savingsGoals, onboardingData]);
  
  // Send message to AI
  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;
    
    const userMessage: AIMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date().toISOString(),
    };
    
    const loadingMessage: AIMessage = {
      id: `msg_${Date.now()}_loading`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isLoading: true,
    };
    
    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      const context = buildContext();
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText.trim(),
          conversationId,
          language,
          context,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.response) {
        // Update conversation ID
        if (!conversationId) {
          setConversationId(data.conversationId);
        }
        
        // Replace loading message with actual response
        const assistantMessage: AIMessage = {
          id: `msg_${Date.now()}_assistant`,
          role: 'assistant',
          content: data.response.message,
          timestamp: new Date().toISOString(),
          intent: data.response.intent,
          confidence: data.response.confidence,
        };
        
        setMessages(prev => [
          ...prev.slice(0, -1), // Remove loading message
          assistantMessage,
        ]);
        
        setLastResponse(data.response);
      } else {
        // Error response
        const errorMessage: AIMessage = {
          id: `msg_${Date.now()}_error`,
          role: 'assistant',
          content: data.error || 'حدث خطأ. الرجاء المحاولة مرة أخرى.',
          timestamp: new Date().toISOString(),
          isError: true,
          errorMessage: data.error,
        };
        
        setMessages(prev => [
          ...prev.slice(0, -1), // Remove loading message
          errorMessage,
        ]);
      }
    } catch (error) {
      // Network error
      const errorMessage: AIMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: language === 'ar' 
          ? 'خطأ في الاتصال. الرجاء التحقق من الإنترنت والمحاولة مرة أخرى.'
          : 'Connection error. Please check your internet and try again.',
        timestamp: new Date().toISOString(),
        isError: true,
      };
      
      setMessages(prev => [
        ...prev.slice(0, -1), // Remove loading message
        errorMessage,
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, conversationId, language, buildContext]);
  
  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };
  
  // Handle quick action click
  const handleQuickAction = (messageText: string) => {
    sendMessage(messageText);
  };
  
  // Handle suggested action click
  const handleSuggestedAction = (action: SuggestedAction) => {
    if (action.action === 'send_message') {
      sendMessage(action.payload);
    } else if (action.action === 'navigate') {
      window.location.href = action.payload;
    }
  };
  
  // Get display name
  const displayName = userName || intl.formatMessage({ id: 'dashboard.guest_user', defaultMessage: 'User' });
  
  // Check if we have messages
  const hasMessages = messages.length > 0;
  
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        gap: 'var(--spacing-2)',
        height: 'calc(100vh - 80px)',
        padding: 'var(--spacing-2)',
      }}
    >
      {/* ===== LEFT COLUMN: CHAT AREA ===== */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--theme-bg-card)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--theme-border)',
          overflow: 'hidden',
        }}
      >
        {/* ----- Intro Message (only show if no messages) ----- */}
        {!hasMessages && (
          <div
            style={{
              padding: 'var(--spacing-3)',
              borderBottom: '1px solid var(--theme-border)',
            }}
          >
            {/* AI Avatar */}
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              <BotIcon />
            </div>

            {/* Greeting */}
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--theme-text-primary)',
                marginBottom: '8px',
              }}
            >
              {intl.formatMessage({ id: 'chat.greeting', defaultMessage: 'Hello, {name}!' }, { name: displayName })} 👋
            </h2>
            <p
              style={{
                fontSize: '0.9375rem',
                color: 'var(--theme-text-secondary)',
                lineHeight: 1.6,
                marginBottom: 'var(--spacing-2)',
              }}
            >
              {intl.formatMessage({ id: 'chat.intro_message', defaultMessage: "I'm your Mustasharak financial advisor. I've analyzed your recent transactions and I'm ready to help you optimize your budget. What would you like to focus on today?" })}
            </p>

            {/* Quick Action Cards (2x2 grid) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--spacing-1)',
              }}
            >
              <QuickActionCard
                icon={<ChartIcon />}
                iconBg="rgba(99, 102, 241, 0.1)"
                iconColor="#6366F1"
                title={intl.formatMessage({ id: 'chat.analyze_expenses', defaultMessage: 'Analyze my expenses' })}
                description={intl.formatMessage({ id: 'chat.analyze_expenses_desc', defaultMessage: 'Breakdown by category' })}
                onClick={() => handleQuickAction(language === 'ar' ? 'حلل مصاريفي لهذا الشهر' : 'Analyze my expenses this month')}
              />
              <QuickActionCard
                icon={<PiggyIcon />}
                iconBg="rgba(16, 185, 129, 0.1)"
                iconColor="#10B981"
                title={intl.formatMessage({ id: 'chat.how_save_more', defaultMessage: 'How can I save more?' })}
                description={intl.formatMessage({ id: 'chat.how_save_more_desc', defaultMessage: 'Smart budgeting tips' })}
                onClick={() => handleQuickAction(language === 'ar' ? 'كيف أوفر أكثر؟' : 'How can I save more money?')}
              />
              <QuickActionCard
                icon={<TrendUpIcon />}
                iconBg="rgba(245, 158, 11, 0.1)"
                iconColor="#F59E0B"
                title={intl.formatMessage({ id: 'chat.investment_options', defaultMessage: 'Investment options' })}
                description={intl.formatMessage({ id: 'chat.investment_options_desc', defaultMessage: 'Based on your savings' })}
                onClick={() => handleQuickAction(language === 'ar' ? 'ما هي خيارات الاستثمار المناسبة لي؟' : 'What investment options are suitable for me?')}
              />
              <QuickActionCard
                icon={<RepeatIcon />}
                iconBg="rgba(239, 68, 68, 0.1)"
                iconColor="#EF4444"
                title={intl.formatMessage({ id: 'chat.review_subscriptions', defaultMessage: 'Review subscriptions' })}
                description={intl.formatMessage({ id: 'chat.review_subscriptions_desc', defaultMessage: 'Detect recurring charges' })}
                onClick={() => handleQuickAction(language === 'ar' ? 'راجع اشتراكاتي والمصاريف المتكررة' : 'Review my subscriptions and recurring expenses')}
              />
            </div>
          </div>
        )}

        {/* ----- Chat Messages Area ----- */}
        <div
          ref={chatContainerRef}
          style={{
            flex: 1,
            padding: 'var(--spacing-3)',
            overflowY: 'auto',
            minHeight: '200px',
          }}
        >
          {hasMessages ? (
            <>
              {messages.map((msg) => (
                <MessageBubble 
                  key={msg.id} 
                  message={msg} 
                  isUser={msg.role === 'user'} 
                />
              ))}
              
              {/* Suggested actions after last assistant message */}
              {lastResponse && !isLoading && lastResponse.suggestedActions.length > 0 && (
                <SuggestedActions 
                  actions={lastResponse.suggestedActions} 
                  onAction={handleSuggestedAction}
                  language={language}
                />
              )}
            </>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--theme-text-muted)',
                  textAlign: 'center',
                }}
              >
                {intl.formatMessage({ id: 'chat.start_conversation', defaultMessage: 'Start a conversation to get insights' })}
              </p>
            </div>
          )}
        </div>

        {/* ----- Chat Input (Bottom) ----- */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: 'var(--spacing-2)',
            borderTop: '1px solid var(--theme-border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 12px',
              background: 'var(--theme-bg-secondary)',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--theme-border)',
            }}
          >
            {/* Text Input */}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={intl.formatMessage({ id: 'chat.input_placeholder', defaultMessage: 'Ask Mustasharak anything about your finances...' })}
              disabled={isLoading}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '0.875rem',
                color: 'var(--theme-text-primary)',
                direction: language === 'ar' ? 'rtl' : 'ltr',
              }}
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: inputValue.trim() && !isLoading
                  ? 'var(--color-brand-emerald)'
                  : 'var(--theme-border)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
                opacity: inputValue.trim() && !isLoading ? 1 : 0.6,
                transition: 'all 0.2s ease',
              }}
            >
              <SendIcon />
            </button>
          </div>

          {/* Disclaimer */}
          <p
            style={{
              fontSize: '0.6875rem',
              color: 'var(--theme-text-muted)',
              textAlign: 'center',
              marginTop: '8px',
            }}
          >
            {intl.formatMessage({ id: 'chat.ai_disclaimer', defaultMessage: 'AI can make mistakes. Please verify important financial information.' })}
          </p>
        </form>
      </div>

      {/* ===== RIGHT COLUMN: INSIGHTS PANEL ===== */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-2)',
          overflowY: 'auto',
        }}
      >
        {/* ----- Spending Insights Card ----- */}
        <div 
          style={{
            padding: 'var(--spacing-2)',
            background: 'var(--theme-bg-card)',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--theme-border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#6366F1' }}>
                <SparklesIcon />
              </span>
              <p
                style={{
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  color: 'var(--theme-text-primary)',
                }}
              >
                {intl.formatMessage({ id: 'chat.spending_insights', defaultMessage: 'Spending Insights' })}
              </p>
            </div>
            <span
              style={{
                fontSize: '0.625rem',
                fontWeight: 600,
                color: 'var(--color-brand-emerald)',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-pill)',
                textTransform: 'uppercase',
              }}
            >
              {intl.formatMessage({ id: 'chat.live', defaultMessage: 'Live' })}
            </span>
          </div>

          {/* Dynamic insights based on context */}
          {transactions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.1)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--spacing-1)',
                }}
              >
                <p style={{ fontSize: '0.8125rem', color: 'var(--theme-text-secondary)', lineHeight: 1.5 }}>
                  {intl.formatMessage(
                    { id: 'chat.transactions_count', defaultMessage: 'You have {count} transactions recorded.' },
                    { count: transactions.length }
                  )}
                </p>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '0.8125rem', color: 'var(--theme-text-muted)' }}>
              {intl.formatMessage({ id: 'chat.no_transactions', defaultMessage: 'Add transactions to see insights' })}
            </p>
          )}
        </div>

        {/* ----- Tips Card ----- */}
        <div 
          style={{
            padding: 'var(--spacing-2)',
            background: 'var(--theme-bg-card)',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--theme-border)',
          }}
        >
          <p
            style={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'var(--theme-text-primary)',
              marginBottom: 'var(--spacing-1)',
            }}
          >
            {intl.formatMessage({ id: 'chat.tips_title', defaultMessage: 'Quick Tips' })}
          </p>
          <ul style={{ fontSize: '0.8125rem', color: 'var(--theme-text-secondary)', lineHeight: 1.6, paddingInlineStart: '16px', margin: 0 }}>
            <li>{intl.formatMessage({ id: 'chat.tip_1', defaultMessage: 'Ask about your spending patterns' })}</li>
            <li>{intl.formatMessage({ id: 'chat.tip_2', defaultMessage: 'Get personalized saving tips' })}</li>
            <li>{intl.formatMessage({ id: 'chat.tip_3', defaultMessage: 'Track your budget progress' })}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
