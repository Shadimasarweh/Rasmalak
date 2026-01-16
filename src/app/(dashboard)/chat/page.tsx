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
} from 'lucide-react';
import { PageHeader, PageContainer, SectionCard } from '@/components';
import { useTranslation } from '@/hooks/useTranslation';

const quickActions = [
  {
    id: 'analyze',
    icon: '📊',
    titleAr: 'حلل مصاريفي',
    titleEn: 'Analyze my expenses',
    promptAr: 'حلل مصاريفي الشهرية وأعطني نصائح للتحسين',
    promptEn: 'Analyze my monthly expenses and give me tips for improvement',
  },
  {
    id: 'save',
    icon: '💰',
    titleAr: 'كيف أدخر أكثر؟',
    titleEn: 'How to save more?',
    promptAr: 'أعطني نصائح عملية لزيادة مدخراتي الشهرية',
    promptEn: 'Give me practical tips to increase my monthly savings',
  },
  {
    id: 'budget',
    icon: '📋',
    titleAr: 'ضع لي ميزانية',
    titleEn: 'Create a budget',
    promptAr: 'ساعدني في وضع ميزانية شهرية مناسبة لدخلي',
    promptEn: 'Help me create a monthly budget suitable for my income',
  },
  {
    id: 'invest',
    icon: '📈',
    titleAr: 'نصائح استثمارية',
    titleEn: 'Investment tips',
    promptAr: 'ما هي أفضل طرق الاستثمار للمبتدئين؟',
    promptEn: 'What are the best investment methods for beginners?',
  },
];

export default function ChatPage() {
  const { language, isRTL } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [isComingSoon] = useState(true);

  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div>
      <PageHeader 
        title={language === 'ar' ? 'المستشار الذكي' : 'Smart Advisor'}
        showBack
        backUrl="/"
      />

      <PageContainer>
        {/* Hero Card */}
        <div className="card-gradient p-6 relative overflow-hidden rounded-2xl">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />

          <div className="relative flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center animate-float">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-[var(--color-gold)]" />
                <span className="text-sm font-medium opacity-90">
                  {language === 'ar' ? 'مدعوم بالذكاء الاصطناعي' : 'Powered by AI'}
                </span>
              </div>
              <h1 className="text-2xl font-bold">
                {language === 'ar' ? 'المستشار المالي الذكي' : 'Smart Financial Advisor'}
              </h1>
            </div>
          </div>
        </div>

        {/* Coming Soon Notice */}
        {isComingSoon && (
          <SectionCard className="bg-[var(--color-gold)]/10 border-[var(--color-gold)]/30">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-gold)]/20 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-6 h-6 text-[var(--color-gold)]" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-[var(--color-text-primary)] mb-1">
                  {language === 'ar' ? 'قريباً' : 'Coming Soon'}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {language === 'ar'
                    ? 'نعمل على تطوير مستشارك المالي الذكي ليقدم لك تحليلات مخصصة بناءً على دخلك ومصاريفك.'
                    : 'We are developing your smart financial advisor to provide personalized analysis based on your income and expenses.'}
                </p>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="section-title mb-4">
            {language === 'ar' ? 'جرب أن تسأل' : 'Try asking'}
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={action.id}
                className="card card-interactive p-5 text-right animate-fadeInUp"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => setInputValue(language === 'ar' ? action.promptAr : action.promptEn)}
              >
                <span className="text-3xl mb-3 block">{action.icon}</span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {language === 'ar' ? action.titleAr : action.titleEn}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Features Preview */}
        <SectionCard title={language === 'ar' ? 'ما يمكن للمستشار مساعدتك فيه' : 'What the advisor can help you with'}>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--color-bg-secondary)]">
              <div className="stat-icon stat-icon-income">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">
                  {language === 'ar' ? 'تحليل المصاريف' : 'Expense Analysis'}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {language === 'ar' ? 'فهم أين تذهب أموالك' : 'Understand where your money goes'}
                </p>
              </div>
              <ChevronIcon className="w-5 h-5 text-[var(--color-text-muted)] ml-auto" />
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--color-bg-secondary)]">
              <div className="stat-icon stat-icon-savings">
                <PiggyBank className="w-6 h-6" />
              </div>
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">
                  {language === 'ar' ? 'نصائح الادخار' : 'Saving Tips'}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {language === 'ar' ? 'طرق ذكية لزيادة مدخراتك' : 'Smart ways to increase savings'}
                </p>
              </div>
              <ChevronIcon className="w-5 h-5 text-[var(--color-text-muted)] ml-auto" />
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--color-bg-secondary)]">
              <div className="stat-icon stat-icon-balance">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">
                  {language === 'ar' ? 'تخطيط الأهداف' : 'Goal Planning'}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {language === 'ar' ? 'حقق أهدافك المالية' : 'Achieve your financial goals'}
                </p>
              </div>
              <ChevronIcon className="w-5 h-5 text-[var(--color-text-muted)] ml-auto" />
            </div>
          </div>
        </SectionCard>

        {/* Chat Input */}
        <SectionCard elevated className="flex items-center gap-4">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={language === 'ar' ? 'اكتب سؤالك هنا...' : 'Type your question here...'}
            className="flex-1 bg-transparent border-none outline-none px-2 text-lg text-[var(--color-text-primary)]"
            disabled={isComingSoon}
          />
          <button
            className={`btn btn-primary btn-icon ${isComingSoon ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isComingSoon}
          >
            <Send className="w-5 h-5" />
          </button>
        </SectionCard>
      </PageContainer>
    </div>
  );
}
