/**
 * Stripe Webhook Handler
 * ======================
 * Processes Stripe subscription lifecycle events.
 * Verifies signature, responds 200 immediately, processes async.
 */

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabaseClient';
import { mapFromDb } from '@/types/crm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion });

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err) {
    console.warn('[Stripe Webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Respond 200 immediately — process async
  try {
    await handleStripeEvent(event);
  } catch (err) {
    // Log but don't fail the webhook response
    console.warn('[Stripe Webhook] Processing error:', err);
  }

  return NextResponse.json({ received: true });
}

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      await upsertSubscription(sub);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await supabase.from('subscriptions')
        .update({ status: 'canceled', canceled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id);
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceOrgId = await getOrgIdFromCustomer(invoice.customer as string);
      if (!invoiceOrgId) {
        console.error('[Stripe Webhook] Cannot resolve org for customer', invoice.customer, '— invoice', invoice.id, 'skipped');
        break;
      }
      await supabase.from('invoices').upsert({
        stripe_invoice_id: invoice.id,
        org_id: invoiceOrgId,
        amount: (invoice.amount_paid || 0) / 100,
        currency: invoice.currency.toUpperCase(),
        status: 'paid',
        period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
        period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
        pdf_url: invoice.invoice_pdf || null,
      }, { onConflict: 'stripe_invoice_id' });
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const orgId = await getOrgIdFromCustomer(invoice.customer as string);
      if (orgId) {
        // Set subscription to past_due with 7-day grace period
        const gracePeriodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('subscriptions')
          .update({ status: 'past_due', grace_period_ends_at: gracePeriodEnd, updated_at: new Date().toISOString() })
          .eq('org_id', orgId);

        // Create admin notification
        await supabase.from('crm_notifications').insert({
          org_id: orgId,
          user_id: orgId, // Will be resolved to org owner in notification display
          type: 'payment_failed',
          title: 'Payment Failed',
          title_ar: 'فشل الدفع',
          body: 'Your payment has failed. Please update your payment method within 7 days.',
          body_ar: 'فشلت عملية الدفع. يرجى تحديث طريقة الدفع خلال ٧ أيام.',
        });
      }
      break;
    }

    case 'customer.subscription.trial_will_end': {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = await getOrgIdFromCustomer(sub.customer as string);
      if (orgId) {
        await supabase.from('crm_notifications').insert({
          org_id: orgId,
          user_id: orgId,
          type: 'trial_ending',
          title: 'Trial Ending Soon',
          title_ar: 'الفترة التجريبية تنتهي قريباً',
          body: 'Your trial ends in 3 days. Upgrade to continue.',
          body_ar: 'تنتهي فترتك التجريبية خلال ٣ أيام. قم بالترقية للاستمرار.',
        });
      }
      break;
    }
  }
}

async function upsertSubscription(sub: Stripe.Subscription) {
  const orgId = await getOrgIdFromCustomer(sub.customer as string);
  if (!orgId) return;

  // Determine plan from price ID
  const priceId = sub.items.data[0]?.price?.id || '';
  const plan = getPlanFromPrice(priceId);
  if (!plan) return; // Don't upsert with unknown plan — logged in getPlanFromPrice

  const seatLimits: Record<string, { included: number; max: number }> = {
    entrepreneur: { included: 3, max: 10 },
    organization: { included: 10, max: 35 },
    enterprise: { included: 25, max: 150 },
    custom: { included: 50, max: 999 },
  };
  const limits = seatLimits[plan] || seatLimits.entrepreneur;

  await supabase.from('subscriptions').upsert({
    org_id: orgId,
    plan,
    status: sub.status === 'trialing' ? 'trialing' : sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : 'canceled',
    billing_cycle: sub.items.data[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly',
    billing_currency: sub.currency.toUpperCase(),
    seats_included: limits.included,
    seats_max: limits.max,
    stripe_customer_id: sub.customer as string,
    stripe_subscription_id: sub.id,
    current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'org_id' });
}

function getPlanFromPrice(priceId: string): string | null {
  const priceMap: Record<string, string> = {};
  // Only add entries for configured price IDs (skip empty strings)
  const entries: [string | undefined, string][] = [
    [process.env.STRIPE_PRICE_ENTREPRENEUR_MONTHLY, 'entrepreneur'],
    [process.env.STRIPE_PRICE_ENTREPRENEUR_ANNUAL, 'entrepreneur'],
    [process.env.STRIPE_PRICE_ORGANIZATION_MONTHLY, 'organization'],
    [process.env.STRIPE_PRICE_ORGANIZATION_ANNUAL, 'organization'],
    [process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY, 'enterprise'],
    [process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL, 'enterprise'],
  ];
  for (const [key, val] of entries) {
    if (key) priceMap[key] = val;
  }
  const plan = priceMap[priceId];
  if (!plan) {
    console.error('[Stripe Webhook] Unrecognized price ID:', priceId, '— subscription NOT updated');
  }
  return plan || null;
}

async function getOrgIdFromCustomer(customerId: string): Promise<string | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('org_id')
    .eq('stripe_customer_id', customerId)
    .single();
  return data?.org_id || null;
}
