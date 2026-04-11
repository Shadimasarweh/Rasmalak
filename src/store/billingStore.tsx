'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore, getAuthState } from '@/store/authStore';
import { useOrg } from '@/store/orgStore';
import { mapFromDb, PLAN_FEATURE_MAP } from '@/types/crm';
import type { Subscription, Invoice, PaymentMethod, GatedFeature } from '@/types/crm';

/* ============================================
   BILLING STORE — Context Provider
   Follows transactionStore.tsx pattern.
   Loads subscription, invoices, payment methods.
   ============================================ */

interface BillingContextType {
  subscription: Subscription | null;
  invoices: Invoice[];
  paymentMethods: PaymentMethod[];
  isLoading: boolean;

  fetchSubscription: () => Promise<void>;
  fetchInvoices: () => Promise<void>;
  createCheckoutSession: (plan: string, billingCycle: string) => Promise<string | null>;
  createPortalSession: () => Promise<string | null>;
  addSeat: () => Promise<boolean>;
  changePlan: (newPlan: string) => Promise<boolean>;

  // Client-side feature check (cached for session)
  hasFeature: (feature: GatedFeature) => boolean;
  trialDaysRemaining: number | null;
}

const BillingContext = createContext<BillingContextType | null>(null);

export function BillingProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const { currentOrg } = useOrg();

  // Load subscription data
  useEffect(() => {
    if (!initialized || !user || !currentOrg) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('org_id', currentOrg.id)
          .single();

        if (data) setSubscription(mapFromDb<Subscription>(data));
      } catch (err) {
        console.warn('[BillingStore] Error loading subscription:', err);
      }
      setIsLoading(false);
    };

    load();
  }, [initialized, user, currentOrg]);

  const fetchSubscription = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('org_id', currentOrg.id)
        .single();
      if (data) setSubscription(mapFromDb<Subscription>(data));
    } catch (err) { console.warn('[BillingStore] Error:', err); }
  }, [currentOrg]);

  const fetchInvoices = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false });
      if (data) setInvoices(data.map(r => mapFromDb<Invoice>(r)));
    } catch (err) { console.warn('[BillingStore] Error:', err); }
  }, [currentOrg]);

  const createCheckoutSession = useCallback(async (plan: string, billingCycle: string): Promise<string | null> => {
    const { user } = getAuthState();
    if (!user || !currentOrg) return null;
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: currentOrg.id, plan, billingCycle }),
      });
      const data = await res.json();
      return data.url || null;
    } catch { return null; }
  }, [currentOrg]);

  const createPortalSession = useCallback(async (): Promise<string | null> => {
    if (!currentOrg) return null;
    try {
      const res = await fetch('/api/billing/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: currentOrg.id }),
      });
      const data = await res.json();
      return data.url || null;
    } catch { return null; }
  }, [currentOrg]);

  const addSeat = useCallback(async (): Promise<boolean> => {
    if (!currentOrg) return false;
    try {
      const res = await fetch('/api/billing/add-seat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: currentOrg.id }),
      });
      if (res.ok) { await fetchSubscription(); return true; }
      return false;
    } catch { return false; }
  }, [currentOrg, fetchSubscription]);

  const changePlan = useCallback(async (newPlan: string): Promise<boolean> => {
    if (!currentOrg) return false;
    try {
      const res = await fetch('/api/billing/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: currentOrg.id, plan: newPlan }),
      });
      if (res.ok) { await fetchSubscription(); return true; }
      return false;
    } catch { return false; }
  }, [currentOrg, fetchSubscription]);

  // Client-side feature check using loaded subscription
  const hasFeature = useCallback((feature: GatedFeature): boolean => {
    if (!subscription) return false;
    const allowedPlans = PLAN_FEATURE_MAP[feature];
    if (!allowedPlans) return false;
    const isActive = subscription.status === 'active' || subscription.status === 'trialing' ||
      (subscription.status === 'past_due' && subscription.gracePeriodEndsAt && new Date(subscription.gracePeriodEndsAt) > new Date());
    return isActive && allowedPlans.includes(subscription.plan);
  }, [subscription]);

  // Trial days remaining
  const trialDaysRemaining = subscription?.status === 'trialing' && subscription.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const value: BillingContextType = {
    subscription, invoices, paymentMethods, isLoading,
    fetchSubscription, fetchInvoices, createCheckoutSession,
    createPortalSession, addSeat, changePlan,
    hasFeature, trialDaysRemaining,
  };

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBilling(): BillingContextType {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error('useBilling must be used within BillingProvider');
  return ctx;
}

/**
 * Hook to check if a feature is available on the current plan.
 */
export function useFeatureAccess(feature: GatedFeature): boolean {
  const { hasFeature } = useBilling();
  return hasFeature(feature);
}
