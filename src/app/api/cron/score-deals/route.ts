/**
 * Cron: Score Deals
 * =================
 * Runs daily at 2AM. Scores all open deals using AI.
 * Updates ai_score columns on crm_deals.
 * Creates notifications for 15+ point score drops.
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabaseClient';
import { dealScoringAgent, buildDealScoringContext } from '@/ai/agents/dealScoringAgent';
import { AI_CONFIG } from '@/ai/config';

// Dynamic import based on provider to follow the orchestrator pattern
async function callLLM(systemPrompt: string, userMessage: string): Promise<string> {
  const isGemini = AI_CONFIG.provider === 'gemini';

  if (isGemini) {
    const { sendChatCompletion } = await import('@/ai/providers/gemini');
    return sendChatCompletion(systemPrompt, [{ role: 'user', content: userMessage }], { maxTokens: 500 });
  } else {
    const { sendChatCompletion } = await import('@/ai/providers/openai');
    return sendChatCompletion(systemPrompt, [{ role: 'user', content: userMessage }], { maxTokens: 500 });
  }
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization') ?? '';
  if (!cronSecret || authHeader.length !== `Bearer ${cronSecret}`.length ||
      !crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(`Bearer ${cronSecret}`))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let scored = 0;
  let errors = 0;
  let alerts = 0;

  try {
    // Fetch all open deals across all orgs
    const { data: deals } = await supabase
      .from('crm_deals')
      .select(`
        id, org_id, title, value, currency, probability, stage_id, assigned_to,
        ai_score, created_at, updated_at,
        crm_contacts ( name, title, company )
      `)
      .not('status', 'in', '("won","lost")')
      .limit(200);

    if (!deals || deals.length === 0) {
      return NextResponse.json({ ok: true, scored: 0 });
    }

    // Get org-level stats for context
    const orgIds = [...new Set(deals.map(d => d.org_id))];
    const orgStats = new Map<string, { avgComms: number; avgDays: number }>();

    for (const orgId of orgIds) {
      const { count: commCount } = await supabase
        .from('crm_communications')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());

      const { count: dealCount } = await supabase
        .from('crm_deals')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .not('status', 'in', '("won","lost")');

      const avgComms = dealCount && dealCount > 0 ? Math.round((commCount ?? 0) / dealCount) : 0;
      orgStats.set(orgId, { avgComms, avgDays: 14 }); // Default avg stage days
    }

    const systemPrompt = dealScoringAgent.systemPromptBuilder({
      language: 'en',
      contextSlices: [],
      memoryFields: {},
      deterministic: null,
      userMessage: '',
      conversationHistory: [],
    });

    for (const deal of deals) {
      try {
        const stats = orgStats.get(deal.org_id) ?? { avgComms: 3, avgDays: 14 };
        const daysInStage = Math.floor(
          (Date.now() - new Date(deal.updated_at).getTime()) / 86400000
        );

        // Count recent communications for this deal's contact
        const contact = Array.isArray(deal.crm_contacts) ? deal.crm_contacts[0] : deal.crm_contacts;
        const { count: dealComms } = await supabase
          .from('crm_communications')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', deal.org_id)
          .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());

        // Count tasks
        const { count: openTasks } = await supabase
          .from('crm_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('related_entity_id', deal.id)
          .eq('status', 'pending');

        const { count: overdueTasks } = await supabase
          .from('crm_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('related_entity_id', deal.id)
          .eq('status', 'pending')
          .lt('due_date', new Date().toISOString());

        const contextMessage = buildDealScoringContext({
          title: deal.title,
          value: deal.value,
          currency: deal.currency,
          stageName: deal.stage_id ?? 'Unknown',
          daysInStage,
          avgDaysForStage: stats.avgDays,
          commsLast30Days: dealComms ?? 0,
          orgAvgComms: stats.avgComms,
          daysSinceLastContact: daysInStage,
          openTasks: openTasks ?? 0,
          overdueTasks: overdueTasks ?? 0,
          contactName: contact?.name ?? null,
          contactTitle: contact?.title ?? null,
          contactCompany: contact?.company ?? null,
          historicalWinRate: 35,
          probability: deal.probability ?? 50,
        });

        const response = await callLLM(systemPrompt, contextMessage);

        // Parse JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          errors++;
          continue;
        }

        const result = JSON.parse(jsonMatch[0]);
        const previousScore = deal.ai_score;

        // Update deal
        await supabase
          .from('crm_deals')
          .update({
            ai_score: result.score,
            ai_score_trend: result.trend,
            ai_score_reasoning: result.reasoning,
            ai_scored_at: new Date().toISOString(),
          })
          .eq('id', deal.id);

        scored++;

        // Alert on 15+ point drop
        if (previousScore != null && previousScore - result.score >= 15 && deal.assigned_to) {
          await supabase.from('crm_notifications').insert({
            org_id: deal.org_id,
            user_id: deal.assigned_to,
            title: `Score dropped: ${deal.title}`,
            body: `Deal score dropped from ${previousScore} to ${result.score}. ${result.reasoning}`,
            type: 'ai_alert',
            entity_type: 'deal',
            entity_id: deal.id,
          });
          alerts++;
        }
      } catch {
        errors++;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scoring error';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, scored, errors, alerts, timestamp: new Date().toISOString() });
}
