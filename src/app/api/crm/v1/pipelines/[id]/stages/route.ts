/**
 * Public API: Pipeline Stages — GET (list stages for a pipeline)
 */

import { supabase } from '@/lib/supabaseClient';
import { authenticateApiRequest, withRateLimitHeaders, hasPermission, apiError, apiList } from '@/middleware/apiAuth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authenticateApiRequest(request);
  if ('error' in auth) return auth.error;
  const { context, rateLimit } = auth;
  if (!hasPermission(context, 'pipelines.read')) return apiError('FORBIDDEN', 'Missing permission', 403);

  try {
    // Verify pipeline belongs to org
    const { data: pipeline } = await supabase.from('crm_pipelines').select('id')
      .eq('id', id).eq('org_id', context.orgId).single();

    if (!pipeline) return apiError('NOT_FOUND', 'Pipeline not found', 404);

    const { data, error } = await supabase.from('crm_deal_stages').select('*')
      .eq('pipeline_id', id).order('position', { ascending: true });

    if (error) throw error;
    return withRateLimitHeaders(apiList(data ?? [], 1, 100, data?.length ?? 0), rateLimit);
  } catch (err) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Error', 500);
  }
}
