'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Send,
  MessageSquare,
  Bot,
  TrendingUp,
  PiggyBank,
  Target,
  CreditCard,
  Wallet,
  Star,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const promptSuggestions = [
  {
    id: 'analyze',
    icon: TrendingUp,
    labelAr: 'حلل مصاريفي',
    labelEn: 'Analyze my expenses',
    promptAr: 'حلل مصاريفي الشهرية وأعطني نصائح للتحسين',
    promptEn: 'Analyze my monthly expenses and give me tips for improvement',
  },
  {
    id: 'save',
    icon: PiggyBank,
    labelAr: 'كيف أدخر أكثر؟',
    labelEn: 'How to save more?',
    promptAr: 'أعطني نصائح عملية لزيادة مدخراتي الشهرية',
    promptEn: 'Give me practical tips to increase my monthly savings',
  },
  {
    id: 'budget',
    icon: Target,
    labelAr: 'ضع لي ميزانية',
    labelEn: 'Create a budget',
    promptAr: 'ساعدني في وضع ميزانية شهرية مناسبة لدخلي',
    promptEn: 'Help me create a monthly budget suitable for my income',
  },
  {
    id: 'debt',
    icon: CreditCard,
    labelAr: 'إدارة الديون',
    labelEn: 'Manage debt',
    promptAr: 'كيف أتخلص من ديوني بأسرع طريقة؟',
    promptEn: 'How can I pay off my debts faster?',
  },
  {
    id: 'invest',
    icon: Wallet,
    labelAr: 'نصائح استثمارية',
    labelEn: 'Investment tips',
    promptAr: 'ما هي أفضل طرق الاستثمار للمبتدئين؟',
    promptEn: 'What are the best investment methods for beginners?',
  },
  {
    id: 'islamic',
    icon: Star,
    labelAr: 'التمويل الإسلامي',
    labelEn: 'Islamic Finance',
    promptAr: 'ما هي خيارات الاستثمار المتوافقة مع الشريعة؟',
    promptEn: 'What are Sharia-compliant investment options?',
  },
];

export default function ChatPage() {
  const { language, isRTL } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isEmpty = messages.length === 0;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: inputValue }]);
    setInputValue('');
    setIsLoading(true);
    
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: language === 'ar' 
          ? 'شكراً على سؤالك! نحن نعمل حالياً على تطوير المستشار المالي الذكي. سيكون متاحاً قريباً لتقديم نصائح مخصصة بناءً على وضعك المالي.'
          : 'Thank you for your question! We are currently developing the AI Financial Advisor. It will be available soon to provide personalized advice based on your financial situation.'
      }]);
      setIsLoading(false);
    }, 1500);
  };

  const handleSuggestionClick = (prompt: string) => {
    setInputValue(prompt);
  };

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col relative overflow-hidden">
      {/* AI Presence Background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center 40%, rgba(99, 102, 241, 0.04) 0%, transparent 60%)',
        }}
      />
      
      {/* Subtle mesh gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 opacity-30 blur-3xl pointer-events-none">
        <div 
          className="w-full h-full rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)' }}
        />
      </div>

      {/* Header with Input Bar */}
      <div className="relative flex-shrink-0 px-6 py-6 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[var(--color-bg-primary)]" />
            </div>
            <div className="text-center">
              <h1 className="text-base font-semibold text-[var(--color-text-primary)]">
                {language === 'ar' ? 'مستشارك' : 'Mustasharak'}
              </h1>
              <p className="text-xs text-[var(--color-text-muted)]">
                {language === 'ar' ? 'مستشارك المالي الذكي' : 'Your AI Financial Advisor'}
              </p>
            </div>
          </div>

          {/* Input Bar - Centered at Top */}
          <div
            className={`
              flex items-center gap-3 p-2
              bg-white dark:bg-slate-800
              rounded-2xl border-2
              transition-all duration-200
              ${isFocused
                ? 'border-indigo-400 shadow-lg shadow-indigo-500/10'
                : 'border-[var(--color-border)] shadow-sm'
              }
            `}
          >
            <input
              type="text"
              dir={isRTL ? 'rtl' : 'ltr'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={language === 'ar' ? 'اكتب سؤالك هنا...' : 'Type your question here...'}
              className={`flex-1 bg-transparent border-none outline-none px-4 py-2.5 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] text-base ${isRTL ? 'text-right' : 'text-left'}`}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="h-11 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-medium inline-flex items-center gap-2 hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">
                {language === 'ar' ? 'إرسال' : 'Send'}
              </span>
            </button>
          </div>
          {/* Status Line */}
          <p className="text-[11px] text-center text-[var(--color-text-muted)] mt-3 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            {language === 'ar'
              ? 'المستشار في مرحلة التطوير النشط'
              : 'Advisor in active development'}
          </p>
        </div>
      </div>

      {/* Conversation Area */}
      <div className="relative flex-1 overflow-y-auto px-6">
        {isEmpty ? (
          /* Empty State - Premium Presence */
          <div className="h-full flex flex-col items-center justify-center py-12">
            <div className="text-center max-w-lg animate-fade-in-up">
              {/* Breathing AI Icon */}
              <div className="relative w-24 h-24 mx-auto mb-8">
                {/* Glow ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 animate-breathe" />
                {/* Icon container */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-slate-100 to-white dark:from-slate-800 dark:to-slate-700 flex items-center justify-center shadow-xl">
                  <MessageSquare className="w-10 h-10 text-indigo-500" />
                </div>
              </div>
              
              {/* Welcome Text */}
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
                {language === 'ar' 
                  ? 'مرحباً، أنا مستشارك'
                  : 'Hello, I\'m Mustasharak'}
              </h2>
              <p className="text-base text-[var(--color-text-secondary)] mb-10 leading-relaxed">
                {language === 'ar' 
                  ? 'اسألني عن أي موضوع مالي — الميزانية، الادخار، الاستثمار، أو إدارة الديون'
                  : 'Ask me about any financial topic — budgeting, saving, investing, or debt management'}
              </p>

              {/* Suggestion Chips - Staggered Animation */}
              <div className="flex flex-wrap justify-center gap-2">
                {promptSuggestions.map((suggestion, index) => {
                  const Icon = suggestion.icon;
                  return (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSuggestionClick(language === 'ar' ? suggestion.promptAr : suggestion.promptEn)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:shadow-md transition-all duration-200 animate-fade-in-up"
                      style={{ animationDelay: `${150 + index * 50}ms` }}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{language === 'ar' ? suggestion.labelAr : suggestion.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Chat Messages */
          <div className="py-6 space-y-4 max-w-3xl mx-auto">
            {messages.map((msg, index) => (
              <div 
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                style={{ animationDelay: '50ms' }}
              >
                <div className={`max-w-[80%] ${
                  msg.role === 'user' 
                    ? `bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 ${isRTL ? 'rounded-2xl rounded-bl-sm' : 'rounded-2xl rounded-br-sm'}` 
                    : `bg-white dark:bg-slate-800 border border-[var(--color-border)] shadow-sm ${isRTL ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm'}`
                } px-4 py-3`}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[var(--color-border-light)]">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {language === 'ar' ? 'مستشارك' : 'Mustasharak'}
                      </span>
                    </div>
                  )}
                  <p className={`text-sm leading-relaxed ${msg.role === 'user' ? '' : 'text-[var(--color-text-primary)]'}`}>
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-white dark:bg-slate-800 border border-[var(--color-border)] rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

    </div>
  );
}
