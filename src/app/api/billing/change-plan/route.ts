/**
 * Change Plan — Upgrade or Downgrade
 * ====================================
 * Updates Stripe subscription to new plan price.
 */

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabaseClient';
import { mapFromDb } from '@/types/crm';
import type { Subscription } from '@/types/crm';
import { verifyBillingAuth } from './_auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion });

const PRICE_MAP: Record<string, string | undefined> = {
  entrepreneur: process.env.STRIPE_PRICE_ENTREPRENEUR_MONTHLY,
  organization: process.env.STRIPE_PRICE_ORGANIZATION_MONTHLY,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
};

export async function POST(request: Request) {
  try {
    const { orgId, plan } = await request.json();
    if (!orgId || !plan) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Missing orgId or plan' } }, { status: 400 });
    }

    const auth = await verifyBillingAuth(orgId);
    if (!auth.authorized) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: auth.error } }, { status: auth.error === 'Unauthorized' ? 401 : 403 });
    }

    const newPriceId = PRICE_MAP[plan];
    if (!newPriceId) {
      return NextResponse.json({ error: { code: 'INVALID_PLAN', message: 'Invalid plan' } }, { status: 400 });
    }

    const { data: subRow } = await supabase.from('subscriptions').select('*').eq('org_id', orgId).single();
    if (!subRow) return NextResponse.json({ error: { code: 'NO_SUB', message: 'No subscription' } }, { status: 404 });

    const sub = mapFromDb<Subscription>(subRow);

    if (sub.stripeSubscriptionId) {
      const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
      const mainItem = stripeSub.items.data[0];

      if (mainItem) {
        await stripe.subscriptions.update(sub.stripeSubscriptionId, {
          items: [{ id: mainItem.id, price: newPriceId }],
          proration_behavior: 'create_prorations',
        });
      }
    }

    // Update seat limits based on new plan
    const seatLimits: Record<string, { included: number; max: number }> = {
      entrepreneur: { included: 3, max: 10 },
      organization: { included: 10, max: 35 },
      enterprise: { included: 25, max: 150 },
    };
    const limits = seatLimits[plan] || seatLimits.entrepreneur;

    await supabase.from('subscriptions').update({
      plan,
      seats_included: limits.included,
      seats_max: limits.max,
      updated_at: new Date().toISOString(),
    }).eq('org_id', orgId);

    return NextResponse.json({ data: { plan } });
  } catch (err) {
    console.warn('[Billing] Change plan error:', err);
    return NextResponse.json({ error: { code: 'CHANGE_FAILED', message: 'Failed to change plan' } }, { status: 500 });
  }
}
