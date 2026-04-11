/**
 * Zapier Trigger Definitions
 * ==========================
 * Maps 1:1 to the public REST API.
 */

const BASE = '{{bundle.authData.baseUrl}}/api/crm/v1';
const AUTH = { Authorization: 'Bearer {{bundle.authData.apiKey}}' };

export const triggers = {
  new_contact: {
    key: 'new_contact',
    noun: 'Contact',
    display: {
      label: 'New Contact',
      description: 'Triggers when a new contact is created in Rasmalak CRM.',
    },
    operation: {
      type: 'polling' as const,
      perform: { url: `${BASE}/contacts`, method: 'GET', params: { limit: '10', sort: 'created_at:desc' }, headers: AUTH },
      sample: { id: 'uuid', name: 'Ahmed Al-Hassan', email: 'ahmed@example.com', phone: '+971501234567', created_at: '2026-01-01T00:00:00Z' },
      outputFields: [
        { key: 'id', label: 'Contact ID' },
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'company', label: 'Company' },
        { key: 'created_at', label: 'Created At' },
      ],
    },
  },

  new_deal: {
    key: 'new_deal',
    noun: 'Deal',
    display: {
      label: 'New Deal',
      description: 'Triggers when a new deal is created.',
    },
    operation: {
      type: 'polling' as const,
      perform: { url: `${BASE}/deals`, method: 'GET', params: { limit: '10', sort: 'created_at:desc' }, headers: AUTH },
      sample: { id: 'uuid', title: 'Enterprise License', value: 50000, currency: 'USD', created_at: '2026-01-01T00:00:00Z' },
      outputFields: [
        { key: 'id', label: 'Deal ID' },
        { key: 'title', label: 'Title' },
        { key: 'value', label: 'Value' },
        { key: 'currency', label: 'Currency' },
        { key: 'stage_id', label: 'Stage ID' },
        { key: 'created_at', label: 'Created At' },
      ],
    },
  },

  deal_stage_changed: {
    key: 'deal_stage_changed',
    noun: 'Deal',
    display: {
      label: 'Deal Stage Changed',
      description: 'Triggers when a deal moves to a different stage.',
    },
    operation: {
      type: 'hook' as const,
      performSubscribe: { url: `${BASE}/webhooks`, method: 'POST', headers: AUTH, body: { url: '{{bundle.targetUrl}}', event_types: ['deal.stage_changed'] } },
      performUnsubscribe: { url: `${BASE}/webhooks?id={{bundle.subscribeData.id}}`, method: 'DELETE', headers: AUTH },
      perform: { source: '(z, bundle) => [bundle.cleanedRequest]' },
      sample: { id: 'uuid', title: 'Deal Name', stage_id: 'uuid', previous_stage_id: 'uuid' },
    },
  },

  task_completed: {
    key: 'task_completed',
    noun: 'Task',
    display: {
      label: 'Task Completed',
      description: 'Triggers when a task is marked as completed.',
    },
    operation: {
      type: 'hook' as const,
      performSubscribe: { url: `${BASE}/webhooks`, method: 'POST', headers: AUTH, body: { url: '{{bundle.targetUrl}}', event_types: ['task.completed'] } },
      performUnsubscribe: { url: `${BASE}/webhooks?id={{bundle.subscribeData.id}}`, method: 'DELETE', headers: AUTH },
      perform: { source: '(z, bundle) => [bundle.cleanedRequest]' },
      sample: { id: 'uuid', title: 'Follow up call', status: 'completed', completed_at: '2026-01-01T00:00:00Z' },
    },
  },

  new_communication: {
    key: 'new_communication',
    noun: 'Communication',
    display: {
      label: 'New Communication',
      description: 'Triggers when a communication is logged.',
    },
    operation: {
      type: 'polling' as const,
      perform: { url: `${BASE}/communications`, method: 'GET', params: { limit: '10', sort: 'created_at:desc' }, headers: AUTH },
      sample: { id: 'uuid', type: 'email', direction: 'inbound', subject: 'Re: Proposal', created_at: '2026-01-01T00:00:00Z' },
      outputFields: [
        { key: 'id', label: 'Communication ID' },
        { key: 'type', label: 'Type' },
        { key: 'direction', label: 'Direction' },
        { key: 'contact_id', label: 'Contact ID' },
        { key: 'created_at', label: 'Created At' },
      ],
    },
  },
};
