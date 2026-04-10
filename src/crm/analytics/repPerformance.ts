/**
 * Rep Performance Metrics
 * =======================
 * Per-rep analytics: deals, revenue, activity volume.
 */

import type { CrmDeal, CrmTask, CrmCommunication } from '@/types/crm';

export interface RepMetrics {
  userId: string;
  displayName: string;
  dealsOpen: number;
  dealsWon: number;
  dealsLost: number;
  revenue: number;
  activityCount: number;
  taskCompletionRate: number;
}

export function computeRepPerformance(
  deals: CrmDeal[],
  tasks: CrmTask[],
  comms: CrmCommunication[],
  members: { userId: string; displayName: string | null }[]
): RepMetrics[] {
  return members.map(member => {
    const repDeals = deals.filter(d => d.assignedTo === member.userId);
    const repTasks = tasks.filter(t => t.assignedTo === member.userId);
    const repComms = comms.filter(c => c.loggedBy === member.userId);

    const openDeals = repDeals.filter(d => !d.closedAt);
    const wonDeals = repDeals.filter(d => d.closedAt && d.actualClose);
    const lostDeals = repDeals.filter(d => d.closedAt && !d.actualClose);

    const revenue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);

    const completedTasks = repTasks.filter(t => t.status === 'completed').length;
    const totalTasks = repTasks.length;
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      userId: member.userId,
      displayName: member.displayName || 'Unknown',
      dealsOpen: openDeals.length,
      dealsWon: wonDeals.length,
      dealsLost: lostDeals.length,
      revenue,
      activityCount: repComms.length,
      taskCompletionRate,
    };
  });
}
