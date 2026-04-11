/**
 * Billing route auth helper.
 * Verifies the caller has an active Supabase session and is an org owner/admin.
 */

import { supabase } from '@/lib/supabaseClient';

export async function verifyBillingAuth(orgId: string): Promise<{ authorized: boolean; userId: string | null; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { authorized: false, userId: null, error: 'Unauthorized' };
    }

    const { data: member } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return { authorized: false, userId: session.user.id, error: 'Forbidden — owner or admin role required' };
    }

    return { authorized: true, userId: session.user.id };
  } catch {
    return { authorized: false, userId: null, error: 'Auth check failed' };
  }
}
