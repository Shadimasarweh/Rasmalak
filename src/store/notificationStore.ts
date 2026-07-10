import { create } from 'zustand';
import { AI_FEATURES } from '@/ai/config';
import { shouldSuppressAlert } from '@/ai/deterministic/alertLearning';
import { loadEngagement, trackAlertEvent } from '@/lib/predictive/alertEngagement';
import { useAuthStore } from '@/store/authStore';

// Alert learning (Phase 3 item 13) — everything below is fail-open and
// flag-gated: with alertLearning off, this store behaves exactly as
// before. 'shown' is counted on add, 'acted' when a notification is
// opened (markAsRead), 'dismissed' when clearAll wipes it unread.
function learningUserId(): string | null {
  if (!AI_FEATURES.alertLearning) return null;
  try {
    return useAuthStore.getState().user?.id ?? null;
  } catch {
    return null;
  }
}


export interface AppNotification {
  id: string;
  type:
    | 'spending_alert'
    | 'goal_progress'
    | 'salary_missing'
    | 'health_score'
    | 'budget_warning'
    | 'recurring_charge'
    | 'payday_detected'
    | 'safe_to_spend_low'
    | 'payday';
  severity: 'info' | 'warning' | 'critical' | 'positive';
  messageEn: string;
  messageAr: string;
  actionHref?: string;
  actionLabelEn?: string;
  actionLabelAr?: string;
  timestamp: number;
  read: boolean;
}

interface NotificationStore {
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  unreadCount: () => number;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const existing = get().notifications;
    const isDuplicate = existing.some(n => n.messageEn === notification.messageEn);
    if (isDuplicate) return;

    const learnerId = learningUserId();
    if (learnerId) {
      if (shouldSuppressAlert(notification.type, notification.severity, loadEngagement(learnerId))) {
        return; // this user has voted this type into silence — respect it
      }
      trackAlertEvent(learnerId, notification.type, 'shown');
    }

    set((state) => ({
      notifications: [{
        ...notification,
        id,
        timestamp: Date.now(),
        read: false,
      }, ...state.notifications].slice(0, 20),
    }));
  },

  markAsRead: (id) => {
    const learnerId = learningUserId();
    if (learnerId) {
      const target = get().notifications.find((n) => n.id === id);
      if (target && !target.read) trackAlertEvent(learnerId, target.type, 'acted');
    }
    set((state) => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },

  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
  })),

  clearAll: () => {
    const learnerId = learningUserId();
    if (learnerId) {
      for (const n of get().notifications) {
        if (!n.read) trackAlertEvent(learnerId, n.type, 'dismissed');
      }
    }
    set({ notifications: [] });
  },

  unreadCount: () => get().notifications.filter(n => !n.read).length,
}));
