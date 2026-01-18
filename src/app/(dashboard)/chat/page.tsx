'use client';

import { useState } from 'react';
import {
  Send,
  Sparkles,
  TrendingUp,
  PiggyBank,
  Target,
  Lightbulb,
  Bot,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Wallet,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Star,
} from 'lucide-react';
import { PageHeader } from '@/components';
import { useTranslation } from '@/hooks/useTranslation';

const quickActions = [
  {
    id: 'analyze',
    icon: TrendingUp,
    color: '#10b981',
    titleAr: 'حلل مصاريفي',
    titleEn: 'Analyze my expenses',
    promptAr: 'حلل مصاريفي الشهرية وأعطني نصائح للتحسين',
    promptEn: 'Analyze my monthly expenses and give me tips for improvement',
  },
  {
    id: 'save',
    icon: PiggyBank,
    color: '#f59e0b',
    titleAr: 'كيف أدخر أكثر؟',
    titleEn: 'How to save more?',
    promptAr: 'أعطني نصائح عملية لزيادة مدخراتي الشهرية',
    promptEn: 'Give me practical tips to increase my monthly savings',
  },
  {
    id: 'budget',
    icon: Target,
    color: '#3b82f6',
    titleAr: 'ضع لي ميزانية',
    titleEn: 'Create a budget',
    promptAr: 'ساعدني في وضع ميزانية شهرية مناسبة لدخلي',
    promptEn: 'Help me create a monthly budget suitable for my income',
  },
  {
    id: 'debt',
    icon: CreditCard,
    color: '#ef4444',
    titleAr: 'إدارة الديون',
    titleEn: 'Manage debt',
    promptAr: 'كيف أتخلص من ديوني بأسرع طريقة؟',
    promptEn: 'How can I pay off my debts faster?',
  },
  {
    id: 'invest',
    icon: Wallet,
    color: '#8b5cf6',
    titleAr: 'نصائح استثمارية',
    titleEn: 'Investment tips',
    promptAr: 'ما هي أفضل طرق الاستثمار للمبتدئين؟',
    promptEn: 'What are the best investment methods for beginners?',
  },
  {
    id: 'islamic',
    icon: Star,
    color: '#06b6d4',
    titleAr: 'التمويل الإسلامي',
    titleEn: 'Islamic Finance',
    promptAr: 'ما هي خيارات الاستثمار المتوافقة مع الشريعة؟',
    promptEn: 'What are Sharia-compliant investment options?',
  },
];

const capabilities = [
  {
    icon: TrendingUp,
    titleAr: 'تحليل المصاريف',
    titleEn: 'Expense Analysis',
    descAr: 'فهم أين تذهب أموالك',
    descEn: 'Understand where your money goes',
    color: '#10b981',
  },
  {
    icon: PiggyBank,
    titleAr: 'نصائح الادخار',
    titleEn: 'Saving Tips',
    descAr: 'طرق ذكية لزيادة مدخراتك',
    descEn: 'Smart ways to increase savings',
    color: '#f59e0b',
  },
  {
    icon: Target,
    titleAr: 'تخطيط الأهداف',
    titleEn: 'Goal Planning',
    descAr: 'حقق أهدافك المالية',
    descEn: 'Achieve your financial goals',
    color: '#3b82f6',
  },
  {
    icon: Star,
    titleAr: 'التمويل الإسلامي',
    titleEn: 'Islamic Finance',
    descAr: 'نصائح متوافقة مع الشريعة',
    descEn: 'Sharia-compliant advice',
    color: '#06b6d4',
  },
];

export default function ChatPage() {
  const { language, isRTL } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: inputValue }]);
    setInputValue('');
    setIsLoading(true);
    
    // Simulate AI response (placeholder)
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

  const handleQuickAction = (prompt: string) => {
    setInputValue(prompt);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex flex-col">
      <PageHeader 
        title={language === 'ar' ? 'مستشارك' : 'Mustasharak'}
      />

      <div className="flex-1 flex flex-col page-container py-6">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-2xl p-6 mb-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-amber-500/10 -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-emerald-500/10 translate-y-1/2 -translate-x-1/2 blur-3xl" />
          
          <div className="relative flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-slate-400">
                  {language === 'ar' ? 'مدعوم بالذكاء الاصطناعي' : 'Powered by AI'}
                </span>
              </div>
              <h1 className="text-xl font-bold">
                {language === 'ar' ? 'مستشارك الذكي' : 'Mustasharak AI'}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {language === 'ar' 
                  ? 'احصل على نصائح مالية مخصصة باللغة العربية'
                  : 'Get personalized financial advice in Arabic'
                }
              </p>
            </div>
            <span className="badge badge-warning">
              {language === 'ar' ? 'قريباً' : 'Coming Soon'}
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {messages.length === 0 ? (
            /* Empty State - Show Quick Actions and Capabilities */
            <div className="space-y-6">
              {/* Quick Actions */}
              <section>
                <h2 className="section-title mb-4">
                  {language === 'ar' ? 'جرب أن تسأل' : 'Try asking'}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {quickActions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        className="card card-interactive flex items-center gap-3 p-4 text-start"
                        style={{ animationDelay: `${index * 50}ms` }}
                        onClick={() => handleQuickAction(language === 'ar' ? action.promptAr : action.promptEn)}
                      >
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${action.color}15` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: action.color }} />
                        </div>
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {language === 'ar' ? action.titleAr : action.titleEn}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Capabilities */}
              <section>
                <h2 className="section-title mb-4">
                  {language === 'ar' ? 'ما يمكن للمستشار مساعدتك فيه' : 'What the advisor can help with'}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {capabilities.map((cap, index) => {
                    const Icon = cap.icon;
                    return (
                      <div
                        key={index}
                        className="card p-4"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                          style={{ backgroundColor: `${cap.color}15` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: cap.color }} />
                        </div>
                        <h3 className="font-medium text-[var(--color-text-primary)] mb-1">
                          {language === 'ar' ? cap.titleAr : cap.titleEn}
                        </h3>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {language === 'ar' ? cap.descAr : cap.descEn}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Coming Soon Notice */}
              <div className="card border-amber-500/20 bg-amber-500/5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                      {language === 'ar' ? 'مستشارك قيد التطوير' : 'Mustasharak Under Development'}
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {language === 'ar'
                        ? 'نعمل على تطوير مستشارك المالي الذكي باستخدام أحدث تقنيات الذكاء الاصطناعي. سيكون قادراً على فهم وضعك المالي وتقديم نصائح مخصصة باللغة العربية الفصحى.'
                        : 'We are developing your AI financial advisor using the latest AI technologies. It will understand your financial situation and provide personalized advice in Modern Standard Arabic.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Chat Messages */
            <div className="flex-1 space-y-4 mb-4 overflow-y-auto">
              {messages.map((msg, index) => (
                <div 
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${
                    msg.role === 'user' 
                      ? 'bg-[var(--color-primary)] text-white rounded-2xl rounded-br-md' 
                      : 'bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl rounded-bl-md'
                  } px-4 py-3`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-medium text-amber-500">
                          {language === 'ar' ? 'مستشارك' : 'Mustasharak'}
                        </span>
                      </div>
                    )}
                    <p className={`text-sm ${msg.role === 'user' ? '' : 'text-[var(--color-text-primary)]'}`}>
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="mt-auto pt-4 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-3 p-2 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={language === 'ar' ? 'اكتب سؤالك هنا...' : 'Type your question here...'}
              className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="btn btn-primary"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">
                {language === 'ar' ? 'إرسال' : 'Send'}
              </span>
            </button>
          </div>
          <p className="text-xs text-center text-[var(--color-text-muted)] mt-2">
            {language === 'ar' 
              ? 'هذا المستشار في مرحلة التطوير. الردود قد تكون محدودة.'
              : 'This advisor is under development. Responses may be limited.'}
          </p>
        </div>
      </div>
    </div>
  );
}
