/**
 * Pipeline Metrics — Pure Functions
 * =================================
 * Computes pipeline analytics from deals and stages arrays.
 * No side effects, no Supabase calls.
 */

import type { CrmDeal, CrmDealStage } from '@/types/crm';

export interface PipelineMetrics {
  totalValue: number;
  weightedValue: number;
  dealsByStage: { stageId: string; stageName: string; count: number; value: number }[];
  avgCycleTime: number;       // days from created to closed
  winRate: number;            // won / (won + lost), 0-100
  avgDealSize: number;
  pipelineVelocity: number;   // weighted value / avg cycle time
  stageConversionRates: { from: string; to: string; rate: number }[];
}

export function computePipelineMetrics(
  deals: CrmDeal[],
  stages: CrmDealStage[]
): PipelineMetrics {
  const openDeals = deals.filter(d => !d.closedAt);
  const wonDeals = deals.filter(d => {
    const stage = stages.find(s => s.id === d.stageId);
    return stage?.isWon && d.closedAt;
  });
  const lostDeals = deals.filter(d => {
    const stage = stages.find(s => s.id === d.stageId);
    return stage?.isLost && d.closedAt;
  });
  const closedDeals = [...wonDeals, ...lostDeals];

  const totalValue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const weightedValue = openDeals.reduce((sum, d) => sum + ((d.value || 0) * d.probability / 100), 0);

  // Deals by stage
  const dealsByStage = stages
    .sort((a, b) => a.position - b.position)
    .map(stage => ({
      stageId: stage.id,
      stageName: stage.name,
      count: deals.filter(d => d.stageId === stage.id).length,
      value: deals.filter(d => d.stageId === stage.id).reduce((sum, d) => sum + (d.value || 0), 0),
    }));

  // Average cycle time (days)
  const cycleTimes = closedDeals
    .map(d => {
      const created = new Date(d.createdAt).getTime();
      const closed = new Date(d.closedAt!).getTime();
      return (closed - created) / (1000 * 60 * 60 * 24);
    })
    .filter(t => t > 0);
  const avgCycleTime = cycleTimes.length > 0
    ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
    : 0;

  // Win rate
  const totalClosed = wonDeals.length + lostDeals.length;
  const winRate = totalClosed > 0 ? (wonDeals.length / totalClosed) * 100 : 0;

  // Average deal size (from won deals)
  const wonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const avgDealSize = wonDeals.length > 0 ? wonValue / wonDeals.length : 0;

  // Pipeline velocity
  const pipelineVelocity = avgCycleTime > 0 ? weightedValue / avgCycleTime : 0;

  // Stage conversion rates
  const sortedStages = [...stages].sort((a, b) => a.position - b.position);
  const stageConversionRates: { from: string; to: string; rate: number }[] = [];
  for (let i = 0; i < sortedStages.length - 1; i++) {
    const current = sortedStages[i];
    const next = sortedStages[i + 1];
    const inCurrent = deals.filter(d => d.stageId === current.id || stages.findIndex(s => s.id === d.stageId) > i).length;
    const movedToNext = deals.filter(d => stages.findIndex(s => s.id === d.stageId) > i).length;
    const rate = inCurrent > 0 ? (movedToNext / inCurrent) * 100 : 0;
    stageConversionRates.push({ from: current.name, to: next.name, rate });
  }

  return {
    totalValue, weightedValue, dealsByStage,
    avgCycleTime, winRate, avgDealSize,
    pipelineVelocity, stageConversionRates,
  };
}
