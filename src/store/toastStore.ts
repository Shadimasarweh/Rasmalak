import { create } from 'zustand';

/**
 * Tiny global toast store.
 *
 * Used by stores and async actions that need to surface user-visible
 * feedback ("Couldn't save your entry") without coupling to a
 * specific component tree. The dashboard layout mounts a single
 * <ToastHost /> that renders whatever's in this store.
 *
 * Auto-dismisses after `duration` ms (default 4000).
 */

export type ToastVariant = 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    const dur = toast.duration ?? 4000;
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, dur);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Convenience helpers — call from anywhere. */
export const showError = (message: string, duration?: number) =>
  useToastStore.getState().push({ message, variant: 'error', duration });
export const showSuccess = (message: string, duration?: number) =>
  useToastStore.getState().push({ message, variant: 'success', duration });
