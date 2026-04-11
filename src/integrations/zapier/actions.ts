/**
 * Zapier Action Definitions
 * =========================
 * Maps 1:1 to the public REST API create/update endpoints.
 */

const BASE = '{{bundle.authData.baseUrl}}/api/crm/v1';
const AUTH = { Authorization: 'Bearer {{bundle.authData.apiKey}}', 'Content-Type': 'application/json' };

export const actions = {
  create_contact: {
    key: 'create_contact',
    noun: 'Contact',
    display: { label: 'Create Contact', description: 'Creates a new contact in Rasmalak CRM.' },
    operation: {
      perform: { url: `${BASE}/contacts`, method: 'POST', headers: AUTH, body: { name: '{{bundle.inputData.name}}', email: '{{bundle.inputData.email}}', phone: '{{bundle.inputData.phone}}', company: '{{bundle.inputData.company}}', source: 'zapier' } },
      inputFields: [
        { key: 'name', label: 'Name', type: 'string', required: true },
        { key: 'email', label: 'Email', type: 'string' },
        { key: 'phone', label: 'Phone', type: 'string' },
        { key: 'company', label: 'Company', type: 'string' },
        { key: 'title', label: 'Job Title', type: 'string' },
      ],
      sample: { id: 'uuid', name: 'Ahmed', email: 'ahmed@example.com' },
    },
  },

  create_deal: {
    key: 'create_deal',
    noun: 'Deal',
    display: { label: 'Create Deal', description: 'Creates a new deal in Rasmalak CRM.' },
    operation: {
      perform: { url: `${BASE}/deals`, method: 'POST', headers: AUTH, body: { title: '{{bundle.inputData.title}}', pipeline_id: '{{bundle.inputData.pipeline_id}}', stage_id: '{{bundle.inputData.stage_id}}', value: '{{bundle.inputData.value}}', currency: '{{bundle.inputData.currency}}', contact_id: '{{bundle.inputData.contact_id}}', source: 'zapier' } },
      inputFields: [
        { key: 'title', label: 'Deal Title', type: 'string', required: true },
        { key: 'pipeline_id', label: 'Pipeline ID', type: 'string', required: true },
        { key: 'stage_id', label: 'Stage ID', type: 'string', required: true },
        { key: 'value', label: 'Value', type: 'number' },
        { key: 'currency', label: 'Currency', type: 'string', default: 'USD' },
        { key: 'contact_id', label: 'Contact ID', type: 'string' },
      ],
      sample: { id: 'uuid', title: 'New Deal', value: 10000 },
    },
  },

  update_deal_stage: {
    key: 'update_deal_stage',
    noun: 'Deal',
    display: { label: 'Update Deal Stage', description: 'Moves a deal to a different stage.' },
    operation: {
      perform: { url: `${BASE}/deals/{{bundle.inputData.deal_id}}`, method: 'PATCH', headers: AUTH, body: { stage_id: '{{bundle.inputData.stage_id}}' } },
      inputFields: [
        { key: 'deal_id', label: 'Deal ID', type: 'string', required: true },
        { key: 'stage_id', label: 'New Stage ID', type: 'string', required: true },
      ],
      sample: { id: 'uuid', stage_id: 'uuid' },
    },
  },

  create_task: {
    key: 'create_task',
    noun: 'Task',
    display: { label: 'Create Task', description: 'Creates a new task in Rasmalak CRM.' },
    operation: {
      perform: { url: `${BASE}/tasks`, method: 'POST', headers: AUTH, body: { title: '{{bundle.inputData.title}}', description: '{{bundle.inputData.description}}', priority: '{{bundle.inputData.priority}}', due_date: '{{bundle.inputData.due_date}}', assigned_to: '{{bundle.inputData.assigned_to}}' } },
      inputFields: [
        { key: 'title', label: 'Title', type: 'string', required: true },
        { key: 'description', label: 'Description', type: 'text' },
        { key: 'priority', label: 'Priority', type: 'string', choices: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
        { key: 'due_date', label: 'Due Date', type: 'datetime' },
        { key: 'assigned_to', label: 'Assigned To (User ID)', type: 'string' },
      ],
      sample: { id: 'uuid', title: 'Follow up', priority: 'medium' },
    },
  },

  log_communication: {
    key: 'log_communication',
    noun: 'Communication',
    display: { label: 'Log Communication', description: 'Logs a communication entry.' },
    operation: {
      perform: { url: `${BASE}/communications`, method: 'POST', headers: AUTH, body: { type: '{{bundle.inputData.type}}', direction: '{{bundle.inputData.direction}}', subject: '{{bundle.inputData.subject}}', body: '{{bundle.inputData.body}}', contact_id: '{{bundle.inputData.contact_id}}' } },
      inputFields: [
        { key: 'type', label: 'Type', type: 'string', choices: ['email', 'call', 'meeting', 'note'], required: true },
        { key: 'direction', label: 'Direction', type: 'string', choices: ['inbound', 'outbound'], required: true },
        { key: 'subject', label: 'Subject', type: 'string' },
        { key: 'body', label: 'Body', type: 'text' },
        { key: 'contact_id', label: 'Contact ID', type: 'string' },
      ],
      sample: { id: 'uuid', type: 'email', direction: 'inbound' },
    },
  },
};
