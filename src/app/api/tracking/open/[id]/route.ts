/**
 * Email Open Tracking Pixel
 * =========================
 * Returns a 1x1 transparent PNG and logs the open event.
 * Must be fast — minimal DB operations.
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// 1x1 transparent PNG (hardcoded base64 — no file dependency)
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: communicationId } = await params;

  // Fire-and-forget: log open event without blocking the response
  try {
    // Increment open count in communication metadata
    const { data: comm } = await supabase
      .from('crm_communications')
      .select('id, attachments')
      .eq('id', communicationId)
      .single();

    if (comm) {
      const metadata = (comm.attachments as Record<string, unknown>) || {};
      const openCount = ((metadata as Record<string, unknown>).openCount as number) || 0;
      await supabase.from('crm_communications').update({
        attachments: {
          ...metadata,
          opened: true,
          openedAt: metadata.openedAt || new Date().toISOString(),
          openCount: openCount + 1,
          lastOpenedAt: new Date().toISOString(),
        },
      }).eq('id', communicationId);
    }
  } catch {
    // Never block pixel delivery on DB errors
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(PIXEL.length),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
