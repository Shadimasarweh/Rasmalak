/**
 * Create Stripe Customer Portal Session
 * ======================================
 * Opens Stripe's hosted portal for managing payment methods.
 */

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabaseClient';
import { verifyBillingAuth } from './_auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion });
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: Request) {
  try {
    const { orgId } = await request.json();

    const auth = await verifyBillingAuth(orgId);
    if (!auth.authorized) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: auth.error } }, { status: auth.error === 'Unauthorized' ? 401 : 403 });
    }

    const { data: sub } = await supabase.from('subscriptions').select('stripe_customer_id').eq('org_id', orgId).single();
    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: { code: 'NO_CUSTOMER', message: 'No billing account found' } }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${APP_URL}/crm/settings/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.warn('[Billing] Portal error:', err);
    return NextResponse.json({ error: { code: 'PORTAL_FAILED', message: 'Failed to create portal session' } }, { status: 500 });
  }
}
