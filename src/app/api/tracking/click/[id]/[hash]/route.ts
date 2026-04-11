/**
 * Email Click Tracking Redirect
 * ==============================
 * Logs click event and redirects (302) to original URL.
 * [id] = communication ID, [hash] = URL hash for lookup.
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; hash: string }> }
) {
  const { id: communicationId, hash } = await params;

  let redirectUrl = 'https://crm.rasmalak.com'; // Fallback

  try {
    const { data: comm } = await supabase
      .from('crm_communications')
      .select('id, attachments')
      .eq('id', communicationId)
      .single();

    if (comm) {
      const metadata = (comm.attachments as Record<string, unknown>) || {};
      const trackedLinks = (metadata.trackedLinks as Record<string, string>) || {};

      // Look up original URL from hash
      if (trackedLinks[hash]) {
        redirectUrl = trackedLinks[hash];
      }

      // Log click
      const clicks = ((metadata.clicks as Record<string, unknown>[]) || []);
      clicks.push({ hash, url: redirectUrl, clickedAt: new Date().toISOString() });

      await supabase.from('crm_communications').update({
        attachments: { ...metadata, clicks },
      }).eq('id', communicationId);
    }
  } catch {
    // Never block redirect on DB errors
  }

  return NextResponse.redirect(redirectUrl, 302);
}
