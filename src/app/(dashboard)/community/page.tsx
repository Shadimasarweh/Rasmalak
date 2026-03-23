'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  MessageCircleQuestion,
  Handshake,
  Lightbulb,
  BarChart3,
  Filter,
  Plus,
  ChevronRight,
  ChevronLeft,
  Clock,
  MessageSquare,
  ThumbsUp,
  Sparkles,
  X,
  Send,
  Globe,
  Building2,
  MapPin,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useOnboardingData } from '@/store/useStore';
import { 
  SEED_COMMUNITY_POSTS, 
  CommunityPost, 
  CommunityPostType, 
  CommunityVisibility 
} from '@/store/useStore';

// Post type icons
const postTypeIcons: Record<CommunityPostType, typeof MessageCircleQuestion> = {
  question: MessageCircleQuestion,
  collaboration: Handshake,
  experience: Lightbulb,
  poll: BarChart3,
};

// Industries list
const INDUSTRIES = ['retail', 'fnb', 'services', 'tech', 'manufacturing', 'construction', 'healthcare', 'education', 'other'];
const COUNTRIES = ['SA', 'AE', 'JO', 'EG', 'KW', 'BH', 'QA', 'OM', 'other'];

export default function CommunityPage() {
  const { t, language, isRTL } = useTranslation();
  const onboardingData = useOnboardingData();
  const router = useRouter();

  // Check if user has access (SME or self-employed only)
  const hasAccess = onboardingData?.segment === 'sme' || onboardingData?.segment === 'self_employed';

  // State
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);

  // Filter posts
  const filteredPosts = useMemo(() => {
    return SEED_COMMUNITY_POSTS.filter(post => {
      if (selectedIndustry !== 'all' && post.industry !== selectedIndustry) return false;
      if (selectedCountry !== 'all' && post.country !== selectedCountry) return false;
      return true;
    });
  }, [selectedIndustry, selectedCountry]);

  // Recommended posts (first 2)
  const recommendedPosts = filteredPosts.slice(0, 2);
  // Latest posts (rest)
  const latestPosts = filteredPosts.slice(2);

  // If no access, show locked state
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <div className="ds-page">
          <div className="card max-w-md mx-auto text-center p-8">
            <div className="w-16 h-16 rounded-lg bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-indigo-500" />
            </div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
              {t.community.title}
            </h1>
            <p className="text-[var(--color-text-secondary)] mb-6">
              {t.community.smeOnly}
            </p>
            <button
              onClick={() => router.push('/')}
              className="btn btn-primary w-full"
            >
              {language === 'ar' ? 'العودة للرئيسية' : 'Back to Dashboard'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const ArrowIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-white">
        <div className="ds-page py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t.community.title}</h1>
              <p className="text-sm text-slate-400">{t.community.subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ds-page py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <Filter className="w-4 h-4" />
            <span>{language === 'ar' ? 'تصفية:' : 'Filter:'}</span>
          </div>
          
          {/* Industry Filter */}
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="input text-sm py-1.5 px-3 min-w-[120px]"
          >
            <option value="all">{t.community.filters.industry}: {t.community.filters.all}</option>
            {INDUSTRIES.map(ind => (
              <option key={ind} value={ind}>
                {t.community.industries[ind as keyof typeof t.community.industries]}
              </option>
            ))}
          </select>

          {/* Country Filter */}
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="input text-sm py-1.5 px-3 min-w-[120px]"
          >
            <option value="all">{t.community.filters.country}: {t.community.filters.all}</option>
            {COUNTRIES.map(country => (
              <option key={country} value={country}>
                {t.community.countries[country as keyof typeof t.community.countries]}
              </option>
            ))}
          </select>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary mb-8 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t.community.startPost}
        </button>

        {/* Recommended Section */}
        {recommendedPosts.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              {t.community.recommended}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {recommendedPosts.map(post => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  t={t} 
                  language={language}
                  onClick={() => setSelectedPost(post)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Latest in Industry */}
        {latestPosts.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              {t.community.latestIndustry}
            </h2>
            <div className="space-y-3">
              {latestPosts.map(post => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  t={t} 
                  language={language}
                  compact
                  onClick={() => setSelectedPost(post)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {filteredPosts.length === 0 && (
          <div className="card text-center py-12">
            <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              {t.community.empty}
            </h3>
            <p className="text-[var(--color-text-secondary)] mb-4">
              {t.community.emptyDesc}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              {t.community.startPost}
            </button>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <CreatePostModal 
          t={t} 
          language={language}
          isRTL={isRTL}
          onClose={() => setShowCreateModal(false)} 
        />
      )}

      {/* Thread View Modal */}
      {selectedPost && (
        <ThreadViewModal
          post={selectedPost}
          t={t}
          language={language}
          isRTL={isRTL}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
}

// Post Card Component
interface PostCardProps {
  post: CommunityPost;
  t: ReturnType<typeof useTranslation>['t'];
  language: string;
  compact?: boolean;
  onClick: () => void;
}

function PostCard({ post, t, language, compact, onClick }: PostCardProps) {
  const Icon = postTypeIcons[post.type];
  const typeLabel = t.community.postTypes[post.type as keyof typeof t.community.postTypes];
  const industryLabel = t.community.industries[post.industry as keyof typeof t.community.industries];
  const countryLabel = t.community.countries[post.country as keyof typeof t.community.countries];

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="card w-full text-start hover:border-[var(--color-primary)] transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-[var(--color-text-primary)] truncate">
              {post.title}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-secondary)]">
              <span>{post.authorName}</span>
              <span>•</span>
              <span>{industryLabel}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {post.replyCount}
              </span>
            </div>
          </div>
          {post.isHelpful && (
            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 text-xs rounded-full">
              {t.community.thread.helpful}
            </span>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="card w-full text-start hover:border-[var(--color-primary)] transition-colors"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-indigo-500 uppercase tracking-wide">
            {typeLabel}
          </span>
          <h3 className="font-semibold text-[var(--color-text-primary)] mt-0.5 line-clamp-2">
            {post.title}
          </h3>
        </div>
      </div>
      
      <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-3">
        {post.content}
      </p>

      {/* Poll options preview */}
      {post.type === 'poll' && post.pollOptions && (
        <div className="space-y-2 mb-3">
          {post.pollOptions.slice(0, 2).map(opt => (
            <div key={opt.id} className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${(opt.votes / 40) * 100}%` }}
                />
              </div>
              <span className="text-xs text-[var(--color-text-secondary)] min-w-[40px]">
                {opt.text}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)] pt-3 border-t border-[var(--color-border)]">
        <span className="font-medium">{post.authorName}</span>
        <span className="flex items-center gap-1">
          <Building2 className="w-3 h-3" />
          {industryLabel}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {countryLabel}
        </span>
        <span className="flex items-center gap-1 ms-auto">
          <MessageSquare className="w-3 h-3" />
          {post.replyCount} {t.community.thread.replies}
        </span>
      </div>
    </button>
  );
}

// Create Post Modal
interface CreatePostModalProps {
  t: ReturnType<typeof useTranslation>['t'];
  language: string;
  isRTL: boolean;
  onClose: () => void;
}

function CreatePostModal({ t, language, isRTL, onClose }: CreatePostModalProps) {
  const [step, setStep] = useState(1);
  const [postType, setPostType] = useState<CommunityPostType | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<CommunityVisibility>('all');

  const postTypes: { type: CommunityPostType; icon: typeof MessageCircleQuestion }[] = [
    { type: 'question', icon: MessageCircleQuestion },
    { type: 'collaboration', icon: Handshake },
    { type: 'experience', icon: Lightbulb },
    { type: 'poll', icon: BarChart3 },
  ];

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handlePublish = () => {
    // Placeholder - in real app would save to store/backend
    alert(language === 'ar' ? 'تم نشر المنشور!' : 'Post published!');
    onClose();
  };

  // AI helper placeholder actions
  const handleAiAction = (action: string) => {
    if (action === 'refine' && title) {
      setTitle(title + (language === 'ar' ? ' - محسّن' : ' - refined'));
    } else if (action === 'clarify' && content) {
      setContent(content + (language === 'ar' ? '\n\n(تفاصيل إضافية...)' : '\n\n(Additional details...)'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-[var(--color-bg-surface-1)] rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {t.community.createPost.title}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full ${
                  s <= step ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            {t.community.createPost[`step${step}` as keyof typeof t.community.createPost]}
          </p>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Step 1: Post Type */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              {postTypes.map(({ type, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setPostType(type)}
                  className={`p-4 rounded-lg border-2 text-start transition-all ${
                    postType === type
                      ? 'border-indigo-500 bg-indigo-500/5'
                      : 'border-[var(--color-border)] hover:border-indigo-300'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${postType === type ? 'text-indigo-500' : 'text-[var(--color-text-secondary)]'}`} />
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {t.community.postTypes[type]}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    {t.community.postTypes[`${type}Desc` as keyof typeof t.community.postTypes]}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Content */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  {t.community.createPost.titleLabel}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.community.createPost.titlePlaceholder}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  {t.community.createPost.contentLabel}
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t.community.createPost.contentPlaceholder}
                  rows={5}
                  className="input w-full resize-none"
                />
              </div>
              {/* AI Helper Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleAiAction('refine')}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-500/10 text-amber-600 rounded-full hover:bg-amber-500/20"
                >
                  <Sparkles className="w-3 h-3" />
                  {t.community.createPost.aiRefine}
                </button>
                <button
                  onClick={() => handleAiAction('clarify')}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-500/10 text-indigo-600 rounded-full hover:bg-indigo-500/20"
                >
                  <Sparkles className="w-3 h-3" />
                  {t.community.createPost.aiClarify}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Visibility */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                {t.community.createPost.visibility}
              </p>
              {[
                { value: 'country', icon: MapPin, label: t.community.createPost.visibilityCountry },
                { value: 'industry', icon: Building2, label: t.community.createPost.visibilityIndustry },
                { value: 'all', icon: Globe, label: t.community.createPost.visibilityAll },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setVisibility(value as CommunityVisibility)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-start transition-all ${
                    visibility === value
                      ? 'border-indigo-500 bg-indigo-500/5'
                      : 'border-[var(--color-border)] hover:border-indigo-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${visibility === value ? 'text-indigo-500' : 'text-[var(--color-text-secondary)]'}`} />
                  <span className="font-medium text-[var(--color-text-primary)]">{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="card bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 mb-2">
                  {postType && (
                    <>
                      {(() => {
                        const Icon = postTypeIcons[postType];
                        return <Icon className="w-4 h-4 text-indigo-500" />;
                      })()}
                      <span className="text-xs font-medium text-indigo-500 uppercase">
                        {t.community.postTypes[postType]}
                      </span>
                    </>
                  )}
                </div>
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-2">
                  {title || (language === 'ar' ? '(بدون عنوان)' : '(No title)')}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {content || (language === 'ar' ? '(بدون محتوى)' : '(No content)')}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <Globe className="w-4 h-4" />
                <span>
                  {visibility === 'country' && t.community.createPost.visibilityCountry}
                  {visibility === 'industry' && t.community.createPost.visibilityIndustry}
                  {visibility === 'all' && t.community.createPost.visibilityAll}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[var(--color-border)]">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="btn btn-secondary disabled:opacity-50"
          >
            {language === 'ar' ? 'السابق' : 'Back'}
          </button>
          {step < 4 ? (
            <button
              onClick={handleNext}
              disabled={step === 1 && !postType}
              className="btn btn-primary disabled:opacity-50"
            >
              {language === 'ar' ? 'التالي' : 'Next'}
            </button>
          ) : (
            <button
              onClick={handlePublish}
              className="btn btn-primary flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {t.community.createPost.publish}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Thread View Modal
interface ThreadViewModalProps {
  post: CommunityPost;
  t: ReturnType<typeof useTranslation>['t'];
  language: string;
  isRTL: boolean;
  onClose: () => void;
}

function ThreadViewModal({ post, t, language, isRTL, onClose }: ThreadViewModalProps) {
  const [replyText, setReplyText] = useState('');
  const Icon = postTypeIcons[post.type];

  // Placeholder replies
  const replies = [
    {
      id: 'r1',
      authorName: language === 'ar' ? 'خالد ن.' : 'Khalid N.',
      content: language === 'ar' 
        ? 'من تجربتي، أفضل طريقة هي الحفاظ على احتياطي نقدي يعادل ثلاثة أشهر من المصاريف التشغيلية.'
        : 'From my experience, the best approach is to maintain a cash reserve equal to three months of operating expenses.',
      isHelpful: true,
      createdAt: '2026-01-20T12:00:00Z',
    },
    {
      id: 'r2',
      authorName: language === 'ar' ? 'نورة م.' : 'Noura M.',
      content: language === 'ar'
        ? 'نحن نستخدم خطوط ائتمان قصيرة الأجل لتغطية فترات الركود. ننصح بالتفاوض مع البنك مسبقاً.'
        : 'We use short-term credit lines to cover slow periods. I recommend negotiating with your bank in advance.',
      isHelpful: false,
      createdAt: '2026-01-20T14:30:00Z',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-[var(--color-bg-surface-1)] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-indigo-500" />
            <span className="text-sm font-medium text-indigo-500">
              {t.community.postTypes[post.type]}
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Original Post */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
              {post.title}
            </h2>
            <p className="text-[var(--color-text-secondary)] mb-4">
              {post.content}
            </p>
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
              <span className="font-medium">{post.authorName}</span>
              <span>•</span>
              <span>{t.community.industries[post.industry as keyof typeof t.community.industries]}</span>
              <span>•</span>
              <span>{t.community.countries[post.country as keyof typeof t.community.countries]}</span>
            </div>
          </div>

          {/* Replies */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
              {post.replyCount} {t.community.thread.replies}
            </h3>
            
            {replies.map((reply, idx) => (
              <div 
                key={reply.id} 
                className={`p-4 rounded-lg ${
                  reply.isHelpful 
                    ? 'bg-amber-500/5 border border-amber-500/20' 
                    : 'bg-slate-50 dark:bg-slate-800/50'
                }`}
              >
                {reply.isHelpful && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 mb-2">
                    <ThumbsUp className="w-3 h-3" />
                    {t.community.thread.mostHelpful}
                  </div>
                )}
                <p className="text-[var(--color-text-primary)] mb-2">
                  {reply.content}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-secondary)] font-medium">
                    {reply.authorName}
                  </span>
                  <button className="text-xs text-indigo-500 hover:underline">
                    {t.community.thread.helpful}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reply Input */}
        <div className="p-4 border-t border-[var(--color-border)]">
          <div className="flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={t.community.thread.writeReply}
              className="input flex-1"
            />
            <button className="btn btn-primary px-4">
              <Send className="w-4 h-4" />
            </button>
          </div>
          <button className="mt-3 text-sm text-indigo-500 hover:underline">
            {t.community.thread.continuePrivate}
          </button>
        </div>
      </div>
    </div>
  );
}


