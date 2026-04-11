/**
 * Create Stripe Checkout Session
 * ===============================
 * Creates a checkout session for new subscriptions.
 */

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabaseClient';
import { verifyBillingAuth } from './_auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion });

const PRICE_MAP: Record<string, string | undefined> = {
  'entrepreneur_monthly': process.env.STRIPE_PRICE_ENTREPRENEUR_MONTHLY,
  'entrepreneur_annual': process.env.STRIPE_PRICE_ENTREPRENEUR_ANNUAL,
  'organization_monthly': process.env.STRIPE_PRICE_ORGANIZATION_MONTHLY,
  'organization_annual': process.env.STRIPE_PRICE_ORGANIZATION_ANNUAL,
  'enterprise_monthly': process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
  'enterprise_annual': process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL,
};

export async function POST(request: Request) {
  try {
    const { orgId, plan, billingCycle } = await request.json();
    if (!orgId || !plan || !billingCycle) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Missing required fields' } }, { status: 400 });
    }

    const auth = await verifyBillingAuth(orgId);
    if (!auth.authorized) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: auth.error } }, { status: auth.error === 'Unauthorized' ? 401 : 403 });
    }

    const priceId = PRICE_MAP[`${plan}_${billingCycle}`];
    if (!priceId) {
      return NextResponse.json({ error: { code: 'INVALID_PLAN', message: 'Invalid plan or billing cycle' } }, { status: 400 });
    }

    // Get or create Stripe customer
    const { data: sub } = await supabase.from('subscriptions').select('stripe_customer_id').eq('org_id', orgId).single();
    let customerId = sub?.stripe_customer_id;

    if (!customerId) {
      const { data: org } = await supabase.from('organizations').select('name').eq('id', orgId).single();
      const customer = await stripe.customers.create({ metadata: { org_id: orgId }, name: org?.name || undefined });
      customerId = customer.id;

      // Upsert subscription record with customer ID
      await supabase.from('subscriptions').upsert({
        org_id: orgId, plan, status: 'trialing', billing_cycle: billingCycle,
        stripe_customer_id: customerId, seats_included: plan === 'enterprise' ? 25 : plan === 'organization' ? 10 : 3,
        seats_max: plan === 'enterprise' ? 150 : plan === 'organization' ? 35 : 10,
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'org_id' });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { trial_period_days: 14, metadata: { org_id: orgId } },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/crm/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/crm/settings/billing?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.warn('[Billing] Checkout error:', err);
    return NextResponse.json({ error: { code: 'CHECKOUT_FAILED', message: 'Failed to create checkout session' } }, { status: 500 });
  }
}
