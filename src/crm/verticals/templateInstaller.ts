/**
 * Vertical Template Installer
 * ============================
 * Installs industry-specific templates: pipeline stages, custom fields,
 * workflow copies, and AI context injection.
 */

import { supabase } from '@/lib/supabaseClient';
import type { CrmVerticalTemplate } from '@/types/crm';

export interface InstallResult {
  success: boolean;
  pipelineId?: string;
  workflowCount?: number;
  error?: string;
}

/**
 * Install a vertical template for an org.
 * Creates: pipeline with stages, workflow copies.
 */
export async function installTemplate(
  orgId: string,
  slug: string,
  userId: string
): Promise<InstallResult> {
  try {
    // Fetch template
    const { data: tpl, error } = await supabase
      .from('crm_vertical_templates')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error || !tpl) {
      return { success: false, error: 'Template not found' };
    }

    const template = tpl as unknown as Record<string, unknown>;
    const pipelineConfig = template.pipeline_config as {
      name: string;
      nameAr: string;
      stages: Array<{ name: string; nameAr: string; probability: number; color: string; isWon?: boolean; isLost?: boolean }>;
    };

    // Create pipeline
    const { data: pipeline, error: pipeErr } = await supabase
      .from('crm_pipelines')
      .insert({
        org_id: orgId,
        name: pipelineConfig.name,
        name_ar: pipelineConfig.nameAr,
        created_by: userId,
      })
      .select()
      .single();

    if (pipeErr || !pipeline) {
      return { success: false, error: `Pipeline creation failed: ${pipeErr?.message}` };
    }

    // Create stages
    const stages = pipelineConfig.stages.map((s, i) => ({
      pipeline_id: pipeline.id,
      org_id: orgId,
      name: s.name,
      name_ar: s.nameAr,
      position: i,
      probability: s.probability,
      color: s.color,
      is_won: s.isWon ?? false,
      is_lost: s.isLost ?? false,
    }));

    const { error: stageErr } = await supabase.from('crm_deal_stages').insert(stages);
    if (stageErr) {
      return { success: false, error: `Stage creation failed: ${stageErr.message}` };
    }

    // Install workflow templates
    const workflowTemplates = (template.workflow_templates as Array<Record<string, unknown>>) ?? [];
    let workflowCount = 0;

    for (const wf of workflowTemplates) {
      try {
        await supabase.from('crm_workflows').insert({
          org_id: orgId,
          name: wf.name,
          name_ar: wf.nameAr ?? null,
          description: wf.description ?? null,
          description_ar: wf.descriptionAr ?? null,
          trigger_type: wf.triggerType,
          trigger_config: wf.triggerConfig ?? {},
          conditions: wf.conditions ?? [],
          actions: wf.actions ?? [],
          is_active: true,
          installed_from: `vertical:${slug}`,
          created_by: userId,
        });
        workflowCount++;
      } catch { /* skip individual workflow failures */ }
    }

    // Install record is tracked via workflow installed_from = 'vertical:{slug}'
    // getInstalledTemplate() queries this field — no separate org update needed.

    return { success: true, pipelineId: pipeline.id, workflowCount };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Install failed' };
  }
}

/**
 * Get the currently installed vertical template for an org.
 */
export async function getInstalledTemplate(orgId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('crm_workflows')
      .select('installed_from')
      .eq('org_id', orgId)
      .like('installed_from', 'vertical:%')
      .limit(1)
      .single();

    if (data?.installed_from) {
      return (data.installed_from as string).replace('vertical:', '');
    }
    return null;
  } catch {
    return null;
  }
}
