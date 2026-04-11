'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { useOrg } from '@/store/orgStore';
import type {
  CrmWorkflow,
  CrmWorkflowLog,
  CrmWorkflowTemplate,
  TriggerType,
  WorkflowCondition,
  WorkflowAction,
} from '@/types/crm';

/* ============================================
   AUTOMATION STORE — Context Provider
   Follows billingStore.tsx / transactionStore.tsx pattern.
   Manages workflows, templates, and execution logs.
   ============================================ */

/** snake_case DB row → camelCase CrmWorkflow */
function mapWorkflow(row: Record<string, unknown>): CrmWorkflow {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    name: row.name as string,
    nameAr: (row.name_ar as string) ?? null,
    description: (row.description as string) ?? null,
    descriptionAr: (row.description_ar as string) ?? null,
    triggerType: row.trigger_type as TriggerType,
    triggerConfig: (row.trigger_config as Record<string, unknown>) ?? {},
    conditions: (row.conditions as WorkflowCondition[]) ?? [],
    actions: (row.actions as WorkflowAction[]) ?? [],
    isActive: row.is_active as boolean,
    runCount: (row.run_count as number) ?? 0,
    lastRunAt: (row.last_run_at as string) ?? null,
    installedFrom: (row.installed_from as string) ?? null,
    createdBy: (row.created_by as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapTemplate(row: Record<string, unknown>): CrmWorkflowTemplate {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    nameAr: row.name_ar as string,
    description: (row.description as string) ?? null,
    descriptionAr: (row.description_ar as string) ?? null,
    category: row.category as string,
    region: (row.region as string) ?? null,
    triggerType: row.trigger_type as TriggerType,
    triggerConfig: (row.trigger_config as Record<string, unknown>) ?? {},
    conditions: (row.conditions as WorkflowCondition[]) ?? [],
    actions: (row.actions as WorkflowAction[]) ?? [],
    isFeatured: row.is_featured as boolean,
    createdAt: row.created_at as string,
  };
}

function mapLog(row: Record<string, unknown>): CrmWorkflowLog {
  return {
    id: row.id as string,
    workflowId: row.workflow_id as string,
    orgId: row.org_id as string,
    triggerEvent: (row.trigger_event as Record<string, unknown>) ?? null,
    conditionsMet: row.conditions_met as boolean,
    actionsExecuted: (row.actions_executed as Record<string, unknown>) ?? null,
    error: (row.error as string) ?? null,
    executionMs: (row.execution_ms as number) ?? null,
    createdAt: row.created_at as string,
  };
}

interface AutomationContextType {
  workflows: CrmWorkflow[];
  templates: CrmWorkflowTemplate[];
  logs: CrmWorkflowLog[];
  isLoading: boolean;

  fetchWorkflows: () => Promise<void>;
  fetchTemplates: () => Promise<void>;
  fetchLogs: (workflowId?: string) => Promise<void>;
  createWorkflow: (data: Partial<CrmWorkflow>) => Promise<CrmWorkflow | null>;
  updateWorkflow: (id: string, data: Partial<CrmWorkflow>) => Promise<boolean>;
  deleteWorkflow: (id: string) => Promise<boolean>;
  toggleWorkflow: (id: string, isActive: boolean) => Promise<boolean>;
  installTemplate: (template: CrmWorkflowTemplate) => Promise<CrmWorkflow | null>;
}

const AutomationContext = createContext<AutomationContextType | null>(null);

export function AutomationProvider({ children }: { children: ReactNode }) {
  const [workflows, setWorkflows] = useState<CrmWorkflow[]>([]);
  const [templates, setTemplates] = useState<CrmWorkflowTemplate[]>([]);
  const [logs, setLogs] = useState<CrmWorkflowLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const { currentOrg } = useOrg();

  // Load workflows on mount — with cleanup to prevent stale org race
  useEffect(() => {
    if (!initialized || !user || !currentOrg) {
      setWorkflows([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from('crm_workflows')
          .select('*')
          .eq('org_id', currentOrg.id)
          .order('created_at', { ascending: false });

        if (!cancelled && data) setWorkflows(data.map(mapWorkflow));
      } catch (err) {
        if (!cancelled) console.warn('[AutomationStore] Error loading workflows:', err);
      }
      if (!cancelled) setIsLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [initialized, user, currentOrg]);

  const fetchWorkflows = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const { data } = await supabase
        .from('crm_workflows')
        .select('*')
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (data) setWorkflows(data.map(mapWorkflow));
    } catch (err) {
      console.warn('[AutomationStore] Error fetching workflows:', err);
    }
  }, [currentOrg]);

  const fetchTemplates = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('crm_workflow_templates')
        .select('*')
        .order('is_featured', { ascending: false });

      if (data) setTemplates(data.map(mapTemplate));
    } catch (err) {
      console.warn('[AutomationStore] Error fetching templates:', err);
    }
  }, []);

  const fetchLogs = useCallback(async (workflowId?: string) => {
    if (!currentOrg) return;
    try {
      let query = supabase
        .from('crm_workflow_log')
        .select('*')
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (workflowId) query = query.eq('workflow_id', workflowId);

      const { data } = await query;
      if (data) setLogs(data.map(mapLog));
    } catch (err) {
      console.warn('[AutomationStore] Error fetching logs:', err);
    }
  }, [currentOrg]);

  const createWorkflow = useCallback(async (data: Partial<CrmWorkflow>): Promise<CrmWorkflow | null> => {
    if (!currentOrg || !user) return null;
    try {
      const { data: row, error } = await supabase
        .from('crm_workflows')
        .insert({
          org_id: currentOrg.id,
          name: data.name ?? '',
          name_ar: data.nameAr ?? null,
          description: data.description ?? null,
          description_ar: data.descriptionAr ?? null,
          trigger_type: data.triggerType ?? 'deal_created',
          trigger_config: data.triggerConfig ?? {},
          conditions: data.conditions ?? [],
          actions: data.actions ?? [],
          is_active: data.isActive ?? true,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      const workflow = mapWorkflow(row);
      setWorkflows(prev => [workflow, ...prev]);
      return workflow;
    } catch (err) {
      console.warn('[AutomationStore] Error creating workflow:', err);
      return null;
    }
  }, [currentOrg, user]);

  const updateWorkflow = useCallback(async (id: string, data: Partial<CrmWorkflow>): Promise<boolean> => {
    try {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.name !== undefined) updates.name = data.name;
      if (data.nameAr !== undefined) updates.name_ar = data.nameAr;
      if (data.description !== undefined) updates.description = data.description;
      if (data.descriptionAr !== undefined) updates.description_ar = data.descriptionAr;
      if (data.triggerType !== undefined) updates.trigger_type = data.triggerType;
      if (data.triggerConfig !== undefined) updates.trigger_config = data.triggerConfig;
      if (data.conditions !== undefined) updates.conditions = data.conditions;
      if (data.actions !== undefined) updates.actions = data.actions;
      if (data.isActive !== undefined) updates.is_active = data.isActive;

      const { error } = await supabase
        .from('crm_workflows')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setWorkflows(prev => prev.map(w =>
        w.id === id ? { ...w, ...data, updatedAt: updates.updated_at as string } : w
      ));
      return true;
    } catch (err) {
      console.warn('[AutomationStore] Error updating workflow:', err);
      return false;
    }
  }, []);

  const deleteWorkflow = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('crm_workflows')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setWorkflows(prev => prev.filter(w => w.id !== id));
      return true;
    } catch (err) {
      console.warn('[AutomationStore] Error deleting workflow:', err);
      return false;
    }
  }, []);

  const toggleWorkflow = useCallback(async (id: string, isActive: boolean): Promise<boolean> => {
    return updateWorkflow(id, { isActive });
  }, [updateWorkflow]);

  const installTemplate = useCallback(async (template: CrmWorkflowTemplate): Promise<CrmWorkflow | null> => {
    // Template originals are read-only — user installs a copy
    return createWorkflow({
      name: template.name,
      nameAr: template.nameAr,
      description: template.description,
      descriptionAr: template.descriptionAr,
      triggerType: template.triggerType,
      triggerConfig: template.triggerConfig,
      conditions: template.conditions,
      actions: template.actions,
      isActive: true,
    });
  }, [createWorkflow]);

  return (
    <AutomationContext.Provider
      value={{
        workflows,
        templates,
        logs,
        isLoading,
        fetchWorkflows,
        fetchTemplates,
        fetchLogs,
        createWorkflow,
        updateWorkflow,
        deleteWorkflow,
        toggleWorkflow,
        installTemplate,
      }}
    >
      {children}
    </AutomationContext.Provider>
  );
}

export function useAutomation(): AutomationContextType {
  const ctx = useContext(AutomationContext);
  if (!ctx) throw new Error('useAutomation must be used within AutomationProvider');
  return ctx;
}
