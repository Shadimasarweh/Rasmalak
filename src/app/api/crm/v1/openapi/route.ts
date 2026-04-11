/**
 * Public API: OpenAPI 3.0 Specification
 * GET /api/crm/v1/openapi — Returns the OpenAPI spec as JSON
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'Rasmalak CRM API',
      description: 'Public REST API for Rasmalak CRM — the Arabic-first CRM for the MENA region.',
      version: '1.0.0',
      contact: { name: 'Rasmalak Support', url: 'https://rasmalak.com' },
    },
    servers: [
      { url: 'https://crm.rasmalak.com/api/crm/v1', description: 'Production' },
    ],
    security: [{ BearerAuth: [] }],
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer', description: 'API key from Settings → API' },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'object' },
              },
            },
          },
        },
        ListMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            has_more: { type: 'boolean' },
          },
        },
        Contact: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            name_ar: { type: 'string', nullable: true },
            email: { type: 'string', nullable: true },
            phone: { type: 'string', nullable: true },
            company: { type: 'string', nullable: true },
            title: { type: 'string', nullable: true },
            source: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            custom_fields: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Deal: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            value: { type: 'number', nullable: true },
            currency: { type: 'string' },
            probability: { type: 'integer' },
            stage_id: { type: 'string', format: 'uuid' },
            pipeline_id: { type: 'string', format: 'uuid' },
            contact_id: { type: 'string', format: 'uuid', nullable: true },
            expected_close: { type: 'string', format: 'date', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Task: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
            due_date: { type: 'string', format: 'date-time', nullable: true },
            assigned_to: { type: 'string', format: 'uuid', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Communication: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['email', 'call', 'meeting', 'note', 'whatsapp'] },
            direction: { type: 'string', enum: ['inbound', 'outbound'] },
            subject: { type: 'string', nullable: true },
            body: { type: 'string', nullable: true },
            contact_id: { type: 'string', format: 'uuid', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
      parameters: {
        page: { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        limit: { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
      },
    },
    paths: buildPaths(),
  };

  return NextResponse.json(spec, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}

function buildPaths() {
  const entities = [
    { name: 'contacts', schema: 'Contact', permissions: { read: 'contacts.read', write: 'contacts.write', delete: 'contacts.delete' } },
    { name: 'companies', schema: 'Company', permissions: { read: 'companies.read', write: 'companies.write', delete: 'companies.delete' } },
    { name: 'deals', schema: 'Deal', permissions: { read: 'deals.read', write: 'deals.write', delete: 'deals.delete' } },
    { name: 'tasks', schema: 'Task', permissions: { read: 'tasks.read', write: 'tasks.write', delete: 'tasks.delete' } },
  ];

  const paths: Record<string, unknown> = {};

  for (const entity of entities) {
    // List + Create
    paths[`/${entity.name}`] = {
      get: {
        summary: `List ${entity.name}`,
        tags: [entity.name],
        parameters: [{ $ref: '#/components/parameters/page' }, { $ref: '#/components/parameters/limit' }],
        responses: {
          '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: `#/components/schemas/${entity.schema}` } }, meta: { $ref: '#/components/schemas/ListMeta' } } } } } },
          '401': { description: 'Unauthorized' },
          '429': { description: 'Rate limited' },
        },
      },
      post: {
        summary: `Create ${entity.name.slice(0, -1)}`,
        tags: [entity.name],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: `#/components/schemas/${entity.schema}` } } } },
        responses: {
          '201': { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: `#/components/schemas/${entity.schema}` } } } } } },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
        },
      },
    };

    // Detail
    paths[`/${entity.name}/{id}`] = {
      get: { summary: `Get ${entity.name.slice(0, -1)}`, tags: [entity.name], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Success' }, '404': { description: 'Not found' } } },
      patch: { summary: `Update ${entity.name.slice(0, -1)}`, tags: [entity.name], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } } },
      delete: { summary: `Delete ${entity.name.slice(0, -1)}`, tags: [entity.name], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Deleted' } } },
    };
  }

  // Communications
  paths['/communications'] = {
    get: { summary: 'List communications', tags: ['communications'], parameters: [{ name: 'contact_id', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Success' } } },
    post: { summary: 'Log communication', tags: ['communications'], responses: { '201': { description: 'Created' } } },
  };

  // Pipelines
  paths['/pipelines'] = { get: { summary: 'List pipelines', tags: ['pipelines'], responses: { '200': { description: 'Success' } } } };
  paths['/pipelines/{id}/stages'] = { get: { summary: 'List pipeline stages', tags: ['pipelines'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Success' } } } };

  // Webhooks
  paths['/webhooks'] = {
    get: { summary: 'List webhook subscriptions', tags: ['webhooks'], responses: { '200': { description: 'Success' } } },
    post: { summary: 'Create webhook subscription', tags: ['webhooks'], responses: { '201': { description: 'Created — secret returned once' } } },
    delete: { summary: 'Delete webhook subscription', tags: ['webhooks'], parameters: [{ name: 'id', in: 'query', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Deleted' } } },
  };

  return paths;
}
