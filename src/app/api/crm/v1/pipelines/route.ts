/**
 * Public API: Pipelines — GET (list)
 */

import { supabase } from '@/lib/supabaseClient';
import { authenticateApiRequest, withRateLimitHeaders, hasPermission, apiError, apiList } from '@/middleware/apiAuth';

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if ('error' in auth) return auth.error;
  const { context, rateLimit } = auth;
  if (!hasPermission(context, 'pipelines.read')) return apiError('FORBIDDEN', 'Missing permission', 403);

  try {
    const { data, error } = await supabase.from('crm_pipelines').select('*')
      .eq('org_id', context.orgId).order('created_at', { ascending: true });

    if (error) throw error;
    return withRateLimitHeaders(apiList(data ?? [], 1, 100, data?.length ?? 0), rateLimit);
  } catch (err) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Error', 500);
  }
}
