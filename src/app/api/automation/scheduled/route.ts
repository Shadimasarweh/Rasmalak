/**
 * Cron: Scheduled Automation
 * ==========================
 * Runs every 5 minutes. Checks overdue tasks, inactive deals,
 * and scheduled workflow triggers.
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { runScheduledAutomation } from '@/automation/scheduler';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization') ?? '';
  if (!cronSecret || authHeader.length !== `Bearer ${cronSecret}`.length ||
      !crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(`Bearer ${cronSecret}`))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runScheduledAutomation();

    return NextResponse.json({
      ok: true,
      processed: result.processed,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scheduler error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
