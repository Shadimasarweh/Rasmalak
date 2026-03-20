/**
 * Rasmalak AI – JSON Schemas for OpenAI Structured Outputs
 * ========================================================
 * Each schema follows OpenAI's strict-mode requirements:
 *   - Every object has `additionalProperties: false`
 *   - Every property is listed in `required`
 *   - Nullable fields use `anyOf: [{type: T}, {type: "null"}]`
 *
 * These schemas are passed to the OpenAI API via:
 *   response_format: { type: "json_schema", json_schema: { name, schema, strict: true } }
 */

// ============================================
// A) InsightsResponse
// ============================================

export const InsightsResponseSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    insights: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id:        { type: 'string' },
          type:      { type: 'string', enum: ['warning', 'success', 'info', 'tip'] },
          title:     { type: 'string' },
          titleAr:   { type: 'string' },
          message:   { type: 'string' },
          messageAr: { type: 'string' },
          metric: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  value:           { anyOf: [{ type: 'number' }, { type: 'string' }] },
                  unit:            { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  change:          { anyOf: [{ type: 'number' }, { type: 'null' }] },
                  changeDirection: { anyOf: [{ type: 'string', enum: ['up', 'down'] }, { type: 'null' }] },
                },
                required: ['value', 'unit', 'change', 'changeDirection'],
                additionalProperties: false,
              },
              { type: 'null' },
            ],
          },
        },
        required: ['id', 'type', 'title', 'titleAr', 'message', 'messageAr', 'metric'],
        additionalProperties: false,
      },
    },
  },
  required: ['insights'],
  additionalProperties: false,
};

// ============================================
// B) IntentResponse
// ============================================
// The enum mirrors the AIIntent union in types.ts.

const ALL_INTENTS = [
  'analyze_spending',
  'category_breakdown',
  'compare_periods',
  'savings_advice',
  'goal_progress',
  'goal_planning',
  'budget_status',
  'budget_advice',
  'overspending_alert',
  'predict_end_of_month',
  'simulate_scenario',
  'forecast_savings',
  'explain_concept',
  'general_financial_knowledge',
  'learning_recommendation',
  'greeting',
  'gratitude',
  'unclear',
  'out_of_scope',
] as const;

/** Set for O(1) membership checks at runtime. */
export const VALID_INTENTS = new Set<string>(ALL_INTENTS);

export const IntentResponseSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    intent: {
      type: 'string',
      enum: [...ALL_INTENTS],
    },
  },
  required: ['intent'],
  additionalProperties: false,
};

// ============================================
// C) EntitiesResponse
// ============================================

export const EntitiesResponseSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    entities: {
      type: 'object',
      properties: {
        amounts:    { anyOf: [{ type: 'array', items: { type: 'number' } }, { type: 'null' }] },
        categories: { anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }] },
        dates:      { anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }] },
        merchants:  { anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }] },
        goals:      { anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }] },
      },
      required: ['amounts', 'categories', 'dates', 'merchants', 'goals'],
      additionalProperties: false,
    },
  },
  required: ['entities'],
  additionalProperties: false,
};
