/**
 * Add Seat — Prorated Stripe charge
 * ==================================
 * Increments seats_purchased ONLY after Stripe charge succeeds.
 * Fixes: #1 (auth), #3 (charge-before-DB)
 */

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabaseClient';
import { mapFromDb } from '@/types/crm';
import type { Subscription } from '@/types/crm';
import { verifyBillingAuth } from './_auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion });

export async function POST(request: Request) {
  try {
    const { orgId } = await request.json();

    const auth = await verifyBillingAuth(orgId);
    if (!auth.authorized) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: auth.error } }, { status: auth.error === 'Unauthorized' ? 401 : 403 });
    }

    const addonPriceId = process.env.STRIPE_PRICE_ADDON_SEAT;
    if (!addonPriceId) {
      return NextResponse.json({ error: { code: 'CONFIG_ERROR', message: 'Seat add-on pricing not configured' } }, { status: 500 });
    }

    const { data: subRow } = await supabase.from('subscriptions').select('*').eq('org_id', orgId).single();
    if (!subRow) return NextResponse.json({ error: { code: 'NO_SUB', message: 'No subscription' } }, { status: 404 });

    const sub = mapFromDb<Subscription>(subRow);
    const totalSeats = sub.seatsIncluded + sub.seatsPurchased;

    if (totalSeats >= sub.seatsMax) {
      return NextResponse.json({ error: { code: 'MAX_SEATS', message: 'Maximum seats reached. Upgrade plan.' } }, { status: 400 });
    }

    if (!sub.stripeSubscriptionId) {
      return NextResponse.json({ error: { code: 'NO_STRIPE_SUB', message: 'No active Stripe subscription' } }, { status: 400 });
    }

    // Charge via Stripe FIRST — only update DB on success
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
    const addonItem = stripeSub.items.data.find(i => i.price.id === addonPriceId);

    if (addonItem) {
      await stripe.subscriptionItems.update(addonItem.id, { quantity: sub.seatsPurchased + 1, proration_behavior: 'create_prorations' });
    } else {
      await stripe.subscriptionItems.create({ subscription: sub.stripeSubscriptionId, price: addonPriceId, quantity: 1, proration_behavior: 'create_prorations' });
    }

    // Update local DB only after Stripe succeeds
    await supabase.from('subscriptions').update({
      seats_purchased: sub.seatsPurchased + 1,
      updated_at: new Date().toISOString(),
    }).eq('org_id', orgId);

    return NextResponse.json({ data: { seatsPurchased: sub.seatsPurchased + 1 } });
  } catch (err) {
    console.warn('[Billing] Add seat error:', err);
    return NextResponse.json({ error: { code: 'ADD_SEAT_FAILED', message: 'Failed to add seat' } }, { status: 500 });
  }
}
