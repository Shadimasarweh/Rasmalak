import { create } from 'zustand';

export interface AppNotification {
  id: string;
  type: 'spending_alert' | 'goal_progress' | 'salary_missing' | 'health_score' | 'budget_warning' | 'recurring_charge';
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

    set((state) => ({
      notifications: [{
        ...notification,
        id,
        timestamp: Date.now(),
        read: false,
      }, ...state.notifications].slice(0, 20),
    }));
  },

  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    ),
  })),

  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
  })),

  clearAll: () => set({ notifications: [] }),

  unreadCount: () => get().notifications.filter(n => !n.read).length,
}));
