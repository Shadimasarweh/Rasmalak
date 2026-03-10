'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { getAllSectionIds } from '@/types/course';
import type { CourseData } from '@/types/course';

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
  const [completedSectionIds, setCompletedSectionIds] = useState<string[]>([]);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);

  const allSectionIds = getAllSectionIds(course);
  const totalSections = allSectionIds.length;

  const completedRef = useRef(completedSectionIds);
  completedRef.current = completedSectionIds;

  useEffect(() => {
    const fetchProgress = async () => {
      if (!initialized) return;
      if (!user) {
        setCompletedSectionIds([]);
        setCompletedAt(null);
        setLoading(false);
        return;
      }

      const baseCourseId = course.courseId.replace(/_(en|ar)$/, '');
      const otherLocale = course.locale === 'en' ? 'ar' : 'en';
      const otherCourseId = `${baseCourseId}_${otherLocale}`;

      const { data, error } = await supabase
        .from('course_progress')
        .select('completed_section_ids, completed_at')
        .eq('user_id', user.id)
        .in('course_id', [course.courseId, otherCourseId]);

      if (error) {
        console.error('[CourseProgress] Failed to fetch progress:', error.message);
      }

      const merged = new Set<string>();
      let foundCompletedAt: string | null = null;
      for (const row of data ?? []) {
        for (const id of row.completed_section_ids ?? []) {
          merged.add(id);
        }
        if (row.completed_at) foundCompletedAt = row.completed_at;
      }

      setCompletedSectionIds(Array.from(merged));
      setCompletedAt(foundCompletedAt);
      setLoading(false);
    };

    fetchProgress();
  }, [initialized, user, course.courseId, course.locale]);

  const persistProgress = useCallback(
    async (updated: string[]) => {
      if (!user) return;
      const allDone = allSectionIds.every((id) => updated.includes(id));
      const now = new Date().toISOString();

      if (allDone) setCompletedAt(now);

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
        console.error('[CourseProgress] Failed to save progress:', error.message);
      }

      if (allDone && !error) {
        awardCourseCompletion(course.courseId);
      }
    },
    [user, allSectionIds, course.courseId, course.locale]
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
  console.log(`[CourseProgress] Course completed: ${courseId}`);
}
