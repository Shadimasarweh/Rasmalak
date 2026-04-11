/**
 * Zapier Authentication Definition
 * =================================
 * Defines API key auth for the Zapier app.
 * Uploaded to Zapier developer platform.
 */

export const authentication = {
  type: 'custom' as const,
  test: {
    url: '{{bundle.authData.baseUrl}}/api/crm/v1/contacts',
    method: 'GET',
    params: { limit: '1' },
    headers: {
      Authorization: 'Bearer {{bundle.authData.apiKey}}',
    },
  },
  fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'string',
      required: true,
      helpText: 'Find your API key in Rasmalak CRM → Settings → API.',
    },
    {
      key: 'baseUrl',
      label: 'CRM URL',
      type: 'string',
      required: true,
      default: 'https://crm.rasmalak.com',
      helpText: 'Your Rasmalak CRM instance URL.',
    },
  ],
  connectionLabel: '{{bundle.authData.baseUrl}}',
};
