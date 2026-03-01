/**
 * Agent Registry
 * ==============
 * Central map of AgentId -> AgentDefinition.
 * The orchestrator looks up agents here for routing.
 */

import type { AgentDefinition, AgentId } from './types';
import type { AIIntent } from '../types';
import { chatAgent } from './chatAgent';
import { profileAgent } from './profileAgent';
import { insightAgent } from './insightAgent';
import { recommendationAgent } from './recommendationAgent';
import { policyAgent } from './policyAgent';

const AGENT_REGISTRY = new Map<AgentId, AgentDefinition>([
  ['chat', chatAgent],
  ['profile', profileAgent],
  ['insight', insightAgent],
  ['recommendation', recommendationAgent],
  ['policy', policyAgent],
]);

/**
 * Get an agent definition by ID.
 */
export function getAgent(id: AgentId): AgentDefinition | undefined {
  return AGENT_REGISTRY.get(id);
}

/**
 * Find the best agent for a given intent.
 * Prefers specialized agents over the general chat agent.
 * Returns chat agent as fallback.
 */
export function findAgentForIntent(intent: AIIntent): AgentDefinition {
  const ROUTING_PRIORITY: AgentId[] = ['recommendation', 'insight', 'profile', 'chat'];

  for (const agentId of ROUTING_PRIORITY) {
    if (agentId === 'chat') continue;
    const agent = AGENT_REGISTRY.get(agentId);
    if (agent && agent.supportedIntents.includes(intent)) {
      return agent;
    }
  }

  return chatAgent;
}

/**
 * Get all registered agents.
 */
export function getAllAgents(): AgentDefinition[] {
  return Array.from(AGENT_REGISTRY.values());
}
