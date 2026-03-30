'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { getAllSectionIds } from '@/types/course';
import type { CourseData } from '@/types/course';

const STORAGE_KEY = 'rasmalak-course-progress';

interface StoredProgress {
  completedSectionIds: string[];
  completedAt: string | null;
}

function getLocalProgress(courseId: string): StoredProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completedSectionIds: [], completedAt: null };
    const all = JSON.parse(raw) as Record<string, StoredProgress>;
    const baseCourseId = courseId.replace(/_(en|ar)$/, '');
    const enData = all[`${baseCourseId}_en`];
    const arData = all[`${baseCourseId}_ar`];
    const merged = new Set<string>();
    let completedAt: string | null = null;
    for (const d of [enData, arData]) {
      if (!d) continue;
      for (const id of d.completedSectionIds ?? []) merged.add(id);
      if (d.completedAt) completedAt = d.completedAt;
    }
    return { completedSectionIds: Array.from(merged), completedAt };
  } catch {
    return { completedSectionIds: [], completedAt: null };
  }
}

function saveLocalProgress(courseId: string, data: StoredProgress) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, StoredProgress>) : {};
    all[courseId] = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* storage full or unavailable */ }
}

export function getAllLocalProgress(): Record<string, StoredProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredProgress>) : {};
  } catch {
    return {};
  }
}

interface CourseProgressState {
  completedSectionIds: string[];
  completedAt: string | null;
  loading: boolean;
  markSectionComplete: (sectionId: string) => void;
  markSectionsComplete: (sectionIds: string[]) => void;
  isSectionComplete: (sectionId: string) => boolean;
  completionPercent: number;
}

const CourseProgressContext = createContext<CourseProgressState | null>(null);

export function CourseProgressProvider({
  course,
  children,
}: {
  course: CourseData;
  children: ReactNode;
}) {
  const [completedSectionIds, setCompletedSectionIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    return getLocalProgress(course.courseId).completedSectionIds;
  });
  const [completedAt, setCompletedAt] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return getLocalProgress(course.courseId).completedAt;
  });
  const [loading, setLoading] = useState(true);

  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);

  const allSectionIds = getAllSectionIds(course);
  const totalSections = allSectionIds.length;

  const completedRef = useRef(completedSectionIds);
  completedRef.current = completedSectionIds;

  useEffect(() => {
    const fetchProgress = async () => {
      const localData = getLocalProgress(course.courseId);
      const localIds = new Set(localData.completedSectionIds);

      if (!initialized) return;
      if (!user) {
        setCompletedSectionIds(Array.from(localIds));
        setCompletedAt(localData.completedAt);
        setLoading(false);
        return;
      }

      const baseCourseId = course.courseId.replace(/_(en|ar)$/, '');
      const otherLocale = course.locale === 'en' ? 'ar' : 'en';
      const otherCourseId = `${baseCourseId}_${otherLocale}`;

      try {
        const { data, error } = await supabase
          .from('course_progress')
          .select('completed_section_ids, completed_at')
          .eq('user_id', user.id)
          .in('course_id', [course.courseId, otherCourseId]);

        if (!error && data) {
          let foundCompletedAt: string | null = localData.completedAt;
          for (const row of data) {
            for (const id of row.completed_section_ids ?? []) {
              localIds.add(id);
            }
            if (row.completed_at) foundCompletedAt = row.completed_at;
          }
          setCompletedAt(foundCompletedAt);
        }
      } catch {
        // Supabase unavailable; localStorage data is already loaded
      }

      const merged = Array.from(localIds);
      setCompletedSectionIds(merged);
      saveLocalProgress(course.courseId, { completedSectionIds: merged, completedAt: completedAt });
      setLoading(false);
    };

    fetchProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, user, course.courseId, course.locale]);

  const persistProgress = useCallback(
    async (updated: string[]) => {
      const allDone = allSectionIds.every((id) => updated.includes(id));
      const now = new Date().toISOString();
      const newCompletedAt = allDone ? now : completedAt;

      if (allDone) setCompletedAt(now);

      saveLocalProgress(course.courseId, {
        completedSectionIds: updated,
        completedAt: newCompletedAt,
      });

      if (!user) return;

      try {
        const { error } = await supabase
          .from('course_progress')
          .upsert(
            {
              user_id: user.id,
              course_id: course.courseId,
              locale: course.locale,
              completed_section_ids: updated,
              completed_at: allDone ? now : null,
              updated_at: now,
            },
            { onConflict: 'user_id,course_id,locale' }
          );

        if (error) {
          console.error('[CourseProgress] Supabase save failed, localStorage persisted:', error.message);
        }
      } catch {
        // Supabase unavailable; progress is safely in localStorage
      }

      if (allDone) {
        awardCourseCompletion(course.courseId);
      }
    },
    [user, allSectionIds, course.courseId, course.locale, completedAt]
  );

  const markSectionComplete = useCallback(
    (sectionId: string) => {
      setCompletedSectionIds((prev) => {
        if (prev.includes(sectionId)) return prev;
        const updated = [...prev, sectionId];
        persistProgress(updated);
        return updated;
      });
    },
    [persistProgress]
  );

  const markSectionsComplete = useCallback(
    (sectionIds: string[]) => {
      setCompletedSectionIds((prev) => {
        const newIds = sectionIds.filter((id) => !prev.includes(id));
        if (newIds.length === 0) return prev;
        const updated = [...prev, ...newIds];
        persistProgress(updated);
        return updated;
      });
    },
    [persistProgress]
  );

  const isSectionComplete = useCallback(
    (sectionId: string) => completedSectionIds.includes(sectionId),
    [completedSectionIds]
  );

  const completionPercent =
    totalSections === 0 ? 0 : Math.round((completedSectionIds.length / totalSections) * 100);

  return (
    <CourseProgressContext.Provider
      value={{
        completedSectionIds,
        completedAt,
        loading,
        markSectionComplete,
        markSectionsComplete,
        isSectionComplete,
        completionPercent,
      }}
    >
      {children}
    </CourseProgressContext.Provider>
  );
}

export function useCourseProgress(): CourseProgressState {
  const ctx = useContext(CourseProgressContext);
  if (!ctx) {
    throw new Error('useCourseProgress must be used inside <CourseProgressProvider>');
  }
  return ctx;
}

function awardCourseCompletion(courseId: string) {
  if (process.env.NODE_ENV === 'development') console.log(`[CourseProgress] Course completed: ${courseId}`);
}
