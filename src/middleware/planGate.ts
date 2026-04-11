/**
 * Plan Gate — Feature Access Control
 * ===================================
 * Server-side check: does the org's subscription plan include this feature?
 * Seat check: does the org have room for more members?
 *
 * Used by API routes (server) and React hooks (client, via API call).
 */

import { supabase } from '@/lib/supabaseClient';
import { PLAN_FEATURE_MAP, PLAN_SEAT_LIMITS, PLAN_CONTACT_LIMITS } from '@/types/crm';
import type { GatedFeature, PlanTier, Subscription } from '@/types/crm';
import { mapFromDb } from '@/types/crm';

/**
 * Check if an org's plan includes a specific feature.
 */
export async function checkFeatureAccess(orgId: string, feature: GatedFeature): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('subscriptions')
      .select('plan, status, grace_period_ends_at')
      .eq('org_id', orgId)
      .single();

    if (!data) return false; // No subscription = no access

    const sub = mapFromDb<Subscription>(data);

    // Allow access during active, trialing, or within grace period
    const hasAccess = sub.status === 'active' || sub.status === 'trialing' ||
      (sub.status === 'past_due' && sub.gracePeriodEndsAt && new Date(sub.gracePeriodEndsAt) > new Date());

    if (!hasAccess) return false;

    // Check plan includes this feature
    const allowedPlans = PLAN_FEATURE_MAP[feature];
    return allowedPlans.includes(sub.plan);
  } catch {
    return false;
  }
}

export interface SeatStatus {
  available: boolean;
  current: number;
  included: number;
  purchased: number;
  max: number;
  canPurchaseAddon: boolean;
  mustUpgrade: boolean;
}

/**
 * Check seat availability for an org.
 */
export async function checkSeatAvailability(orgId: string): Promise<SeatStatus> {
  const defaultStatus: SeatStatus = {
    available: false, current: 0, included: 0, purchased: 0, max: 0,
    canPurchaseAddon: false, mustUpgrade: true,
  };

  try {
    // Get subscription
    const { data: subRow } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('org_id', orgId)
      .single();

    if (!subRow) return defaultStatus;
    const sub = mapFromDb<Subscription>(subRow);

    // Count current active members
    const { count } = await supabase
      .from('org_members')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('is_active', true);

    const current = count || 0;
    const totalSeats = sub.seatsIncluded + sub.seatsPurchased;
    const available = current < totalSeats;
    const canPurchaseAddon = current < sub.seatsMax && totalSeats < sub.seatsMax;
    const mustUpgrade = current >= sub.seatsMax;

    return {
      available,
      current,
      included: sub.seatsIncluded,
      purchased: sub.seatsPurchased,
      max: sub.seatsMax,
      canPurchaseAddon: !available && canPurchaseAddon,
      mustUpgrade,
    };
  } catch {
    return defaultStatus;
  }
}

/**
 * Check contact limit for an org.
 */
export async function checkContactLimit(orgId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  try {
    const { data: subRow } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('org_id', orgId)
      .single();

    const plan = (subRow?.plan as PlanTier) || 'entrepreneur';
    const limit = PLAN_CONTACT_LIMITS[plan];

    const { count } = await supabase
      .from('crm_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId);

    const current = count || 0;
    return { allowed: current < limit, current, limit };
  } catch {
    return { allowed: false, current: 0, limit: 0 };
  }
}
