/**
 * Connection Manager
 * ==================
 * CRUD for service_connections. Encrypts tokens before storage,
 * decrypts on read. Single point of contact between adapters and Supabase.
 */

import { supabase } from '@/lib/supabaseClient';
import { encrypt, decrypt } from './encryption';
import { mapFromDb, mapToDb } from '@/types/crm';
import type { ServiceConnection, ConnectionStatus } from '@/types/crm';
import type { TokenPair } from './types';

/**
 * Create a new service connection with encrypted tokens.
 */
export async function createConnection(
  params: {
    orgId: string;
    userId: string;
    provider: string;
    serviceType: string;
    tokens: TokenPair;
    connectedEmail?: string;
    externalAccountId?: string;
  }
): Promise<ServiceConnection | null> {
  try {
    const { data, error } = await supabase
      .from('service_connections')
      .insert({
        org_id: params.orgId,
        user_id: params.userId,
        provider: params.provider,
        service_type: params.serviceType,
        access_token: encrypt(params.tokens.accessToken),
        refresh_token: params.tokens.refreshToken ? encrypt(params.tokens.refreshToken) : null,
        token_expires_at: params.tokens.expiresAt?.toISOString() || null,
        scopes: params.tokens.scopes,
        connected_email: params.connectedEmail || null,
        external_account_id: params.externalAccountId || null,
        status: 'active',
      })
      .select()
      .single();

    if (error) { console.warn('[ConnectionManager] Create error:', error.message); return null; }
    return data ? mapFromDb<ServiceConnection>(data) : null;
  } catch (err) {
    console.warn('[ConnectionManager] Unexpected error creating connection:', err);
    return null;
  }
}

/**
 * Get a connection with decrypted tokens.
 */
export async function getConnection(connectionId: string): Promise<ServiceConnection | null> {
  try {
    const { data, error } = await supabase
      .from('service_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (error || !data) return null;

    const conn = mapFromDb<ServiceConnection>(data);
    // Decrypt tokens in memory — never expose encrypted strings to adapters
    conn.accessToken = decrypt(conn.accessToken);
    if (conn.refreshToken) conn.refreshToken = decrypt(conn.refreshToken);

    return conn;
  } catch (err) {
    console.warn('[ConnectionManager] Error getting connection:', err);
    return null;
  }
}

/**
 * Get all active connections for a user (tokens NOT decrypted for listing).
 */
export async function getUserConnections(userId: string): Promise<ServiceConnection[]> {
  try {
    const { data, error } = await supabase
      .from('service_connections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    // Return without decrypting — listing doesn't need token values
    return data.map(r => {
      const conn = mapFromDb<ServiceConnection>(r);
      conn.accessToken = '[encrypted]';
      if (conn.refreshToken) conn.refreshToken = '[encrypted]';
      return conn;
    });
  } catch (err) {
    console.warn('[ConnectionManager] Error listing connections:', err);
    return [];
  }
}

/**
 * Update connection status and optional error message.
 */
export async function updateStatus(
  connectionId: string,
  status: ConnectionStatus,
  errorMessage?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('service_connections')
      .update({
        status,
        error_message: errorMessage || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    if (error) console.warn('[ConnectionManager] Status update error:', error.message);
  } catch (err) {
    console.warn('[ConnectionManager] Unexpected error updating status:', err);
  }
}

/**
 * Update tokens after refresh (re-encrypts).
 */
export async function updateTokens(
  connectionId: string,
  tokens: TokenPair
): Promise<void> {
  try {
    const updateData: Record<string, unknown> = {
      access_token: encrypt(tokens.accessToken),
      token_expires_at: tokens.expiresAt?.toISOString() || null,
      status: 'active',
      error_message: null,
      updated_at: new Date().toISOString(),
    };
    if (tokens.refreshToken) {
      updateData.refresh_token = encrypt(tokens.refreshToken);
    }

    const { error } = await supabase
      .from('service_connections')
      .update(updateData)
      .eq('id', connectionId);

    if (error) console.warn('[ConnectionManager] Token update error:', error.message);
  } catch (err) {
    console.warn('[ConnectionManager] Unexpected error updating tokens:', err);
  }
}

/**
 * Update webhook info on connection.
 */
export async function updateWebhook(
  connectionId: string,
  webhookId: string,
  expires: Date
): Promise<void> {
  try {
    await supabase
      .from('service_connections')
      .update({
        webhook_id: webhookId,
        webhook_expires: expires.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);
  } catch (err) {
    console.warn('[ConnectionManager] Webhook update error:', err);
  }
}

/**
 * Update last sync time and stats.
 */
export async function updateSyncStatus(
  connectionId: string,
  stats: Record<string, unknown>
): Promise<void> {
  try {
    await supabase
      .from('service_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_stats: stats,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);
  } catch (err) {
    console.warn('[ConnectionManager] Sync status update error:', err);
  }
}

/**
 * Delete a connection and log a health event.
 */
export async function deleteConnection(connectionId: string, orgId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('service_connections')
      .delete()
      .eq('id', connectionId)
      .eq('org_id', orgId);

    if (error) {
      console.warn('[ConnectionManager] Delete error:', error.message);
      return;
    }

    // Log disconnection health event
    await supabase.from('health_events').insert({
      org_id: orgId,
      connection_id: null,
      event_type: 'disconnected',
      severity: 'info',
      message: `Connection ${connectionId} disconnected by user`,
    });
  } catch (err) {
    console.warn('[ConnectionManager] Unexpected error deleting connection:', err);
  }
}

/**
 * Log a health event for a connection.
 */
export async function logHealthEvent(
  orgId: string,
  connectionId: string | null,
  eventType: string,
  severity: 'info' | 'warning' | 'error' | 'critical',
  message: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('health_events').insert({
      org_id: orgId,
      connection_id: connectionId,
      event_type: eventType,
      severity,
      message,
      details: details || null,
    });
  } catch {
    // Health logging should never block operations
  }
}
