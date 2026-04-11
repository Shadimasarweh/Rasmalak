/**
 * Integration Core Types
 * ======================
 * Re-exports V2 types from crm.ts and adds integration-specific utility types.
 */

export type {
  IntegrationAdapter,
  UnifiedCalendarEvent,
  ServiceConnection,
  EventSyncMap,
  HealthEvent,
  ConnectionStatus,
  IntegrationProvider,
  ServiceType,
  SyncResult,
  OAuthState,
  HealthSeverity,
} from '@/types/crm';

/** Webhook registration result */
export interface WebhookRegistration {
  webhookId: string;
  expires: Date;
  resourceUri?: string;
}

/** Token refresh result */
export interface TokenRefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

/** Webhook event parsed from incoming request */
export interface ParsedWebhookEvent {
  provider: string;
  eventType: string;
  connectionId: string | null;
  payload: Record<string, unknown>;
}

/** OAuth token pair for storage */
export interface TokenPair {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scopes: string[];
}
