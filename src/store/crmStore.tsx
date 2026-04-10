'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore, getAuthState } from '@/store/authStore';
import { useOrg } from '@/store/orgStore';
import { mapFromDb, mapToDb } from '@/types/crm';
import type {
  CrmContact,
  CrmCompany,
  CrmDeal,
  CrmTask,
  CrmCommunication,
  CrmPipeline,
  CrmDealStage,
  CrmCustomFieldDef,
  CrmNotification,
  CreateContactInput,
  CreateCompanyInput,
  CreateDealInput,
  CreateTaskInput,
  CreateCommunicationInput,
  CreateStageInput,
} from '@/types/crm';

/* ============================================
   CRM STORE
   Context Provider for all CRM entities.
   Follows transactionStore.tsx pattern:
   - Auth-gated fetching via useAuthStore
   - Org-scoped via useOrg
   - getAuthState() in mutations
   - console.warn for errors
   ============================================ */

interface CrmLoadingState {
  contacts: boolean;
  companies: boolean;
  deals: boolean;
  tasks: boolean;
  pipelines: boolean;
  notifications: boolean;
}

interface CrmContextType {
  // Data
  contacts: CrmContact[];
  companies: CrmCompany[];
  deals: CrmDeal[];
  tasks: CrmTask[];
  communications: CrmCommunication[];
  pipelines: CrmPipeline[];
  dealStages: CrmDealStage[];
  customFieldDefs: CrmCustomFieldDef[];
  notifications: CrmNotification[];
  isLoading: CrmLoadingState;

  // Contact CRUD
  addContact: (data: CreateContactInput) => Promise<CrmContact | null>;
  updateContact: (id: string, data: Partial<CrmContact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  searchContacts: (query: string) => Promise<CrmContact[]>;

  // Company CRUD
  addCompany: (data: CreateCompanyInput) => Promise<CrmCompany | null>;
  updateCompany: (id: string, data: Partial<CrmCompany>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;

  // Deal CRUD + pipeline
  addDeal: (data: CreateDealInput) => Promise<CrmDeal | null>;
  updateDeal: (id: string, data: Partial<CrmDeal>) => Promise<void>;
  moveDealToStage: (dealId: string, stageId: string) => Promise<void>;
  deleteDeal: (id: string) => Promise<void>;

  // Task CRUD
  addTask: (data: CreateTaskInput) => Promise<CrmTask | null>;
  updateTask: (id: string, data: Partial<CrmTask>) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  // Communication logging
  logCommunication: (data: CreateCommunicationInput) => Promise<CrmCommunication | null>;
  importWhatsAppChat: (contactId: string, rawChat: string) => Promise<CrmCommunication | null>;

  // Pipeline config
  addPipelineStage: (pipelineId: string, data: CreateStageInput) => Promise<void>;
  reorderStages: (pipelineId: string, stageIds: string[]) => Promise<void>;
  updateStage: (stageId: string, data: Partial<CrmDealStage>) => Promise<void>;
  deleteStage: (stageId: string) => Promise<void>;

  // Notifications
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // Reload
  refreshContacts: () => Promise<void>;
  refreshDeals: () => Promise<void>;
}

const CrmContext = createContext<CrmContextType | null>(null);

export function CrmProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [companies, setCompanies] = useState<CrmCompany[]>([]);
  const [deals, setDeals] = useState<CrmDeal[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [communications, setCommunications] = useState<CrmCommunication[]>([]);
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([]);
  const [dealStages, setDealStages] = useState<CrmDealStage[]>([]);
  const [customFieldDefs, setCustomFieldDefs] = useState<CrmCustomFieldDef[]>([]);
  const [notifications, setNotifications] = useState<CrmNotification[]>([]);
  const [isLoading, setIsLoading] = useState<CrmLoadingState>({
    contacts: true, companies: true, deals: true,
    tasks: true, pipelines: true, notifications: true,
  });

  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const { currentOrg } = useOrg();

  // Helper: log audit entry (fire-and-forget)
  const logAudit = useCallback(async (
    action: string, entityType: string, entityId: string | null,
    changes?: Record<string, unknown> | null
  ) => {
    if (!currentOrg) return;
    const { user } = getAuthState();
    if (!user) return;
    try {
      await supabase.from('crm_audit_log').insert({
        org_id: currentOrg.id,
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        changes: changes || null,
      });
    } catch {
      // Audit logging should never block mutations
    }
  }, [currentOrg]);

  // ─── LOAD DATA ───────────────────────────────────────────

  useEffect(() => {
    if (!initialized || !user || !currentOrg) {
      setContacts([]); setCompanies([]); setDeals([]);
      setTasks([]); setPipelines([]); setDealStages([]);
      setNotifications([]); setCommunications([]);
      return;
    }

    // Reset loading flags when org changes (Fix #12)
    setIsLoading({ contacts: true, companies: true, deals: true, tasks: true, pipelines: true, notifications: true });

    const orgId = currentOrg.id;

    // Load pipelines+stages first (deals reference them)
    const loadPipelines = async () => {
      try {
        const { data: pData } = await supabase
          .from('crm_pipelines').select('*').eq('org_id', orgId);
        if (pData) setPipelines(pData.map(r => mapFromDb<CrmPipeline>(r)));

        const { data: sData } = await supabase
          .from('crm_deal_stages').select('*').eq('org_id', orgId).order('position');
        if (sData) setDealStages(sData.map(r => mapFromDb<CrmDealStage>(r)));
      } catch (err) { console.warn('[CrmStore] Error loading pipelines:', err); }
      setIsLoading(prev => ({ ...prev, pipelines: false }));
    };

    const loadContacts = async () => {
      try {
        const { data } = await supabase
          .from('crm_contacts').select('*').eq('org_id', orgId).order('created_at', { ascending: false });
        if (data) setContacts(data.map(r => mapFromDb<CrmContact>(r)));
      } catch (err) { console.warn('[CrmStore] Error loading contacts:', err); }
      setIsLoading(prev => ({ ...prev, contacts: false }));
    };

    const loadCompanies = async () => {
      try {
        const { data } = await supabase
          .from('crm_companies').select('*').eq('org_id', orgId).order('created_at', { ascending: false });
        if (data) setCompanies(data.map(r => mapFromDb<CrmCompany>(r)));
      } catch (err) { console.warn('[CrmStore] Error loading companies:', err); }
      setIsLoading(prev => ({ ...prev, companies: false }));
    };

    const loadDeals = async () => {
      try {
        const { data } = await supabase
          .from('crm_deals').select('*').eq('org_id', orgId).order('created_at', { ascending: false });
        if (data) setDeals(data.map(r => mapFromDb<CrmDeal>(r)));
      } catch (err) { console.warn('[CrmStore] Error loading deals:', err); }
      setIsLoading(prev => ({ ...prev, deals: false }));
    };

    const loadTasks = async () => {
      try {
        const { data } = await supabase
          .from('crm_tasks').select('*').eq('org_id', orgId).order('due_date', { ascending: true });
        if (data) setTasks(data.map(r => mapFromDb<CrmTask>(r)));
      } catch (err) { console.warn('[CrmStore] Error loading tasks:', err); }
      setIsLoading(prev => ({ ...prev, tasks: false }));
    };

    const loadNotifications = async () => {
      try {
        const { data } = await supabase
          .from('crm_notifications').select('*').eq('user_id', user.id)
          .eq('org_id', orgId).order('created_at', { ascending: false }).limit(50);
        if (data) setNotifications(data.map(r => mapFromDb<CrmNotification>(r)));
      } catch (err) { console.warn('[CrmStore] Error loading notifications:', err); }
      setIsLoading(prev => ({ ...prev, notifications: false }));
    };

    const loadCommunications = async () => {
      try {
        const { data } = await supabase
          .from('crm_communications').select('*').eq('org_id', orgId).order('occurred_at', { ascending: false });
        if (data) setCommunications(data.map(r => mapFromDb<CrmCommunication>(r)));
      } catch (err) { console.warn('[CrmStore] Error loading communications:', err); }
    };

    const loadCustomFields = async () => {
      try {
        const { data } = await supabase
          .from('crm_custom_field_defs').select('*').eq('org_id', orgId).order('position');
        if (data) setCustomFieldDefs(data.map(r => mapFromDb<CrmCustomFieldDef>(r)));
      } catch { /* silent */ }
    };

    // Load pipelines first, then everything else in parallel
    loadPipelines().then(() => {
      loadContacts();
      loadCompanies();
      loadDeals();
      loadTasks();
      loadCommunications();
      loadNotifications();
      loadCustomFields();
    });
  }, [initialized, user, currentOrg]);

  // ─── CONTACT CRUD ────────────────────────────────────────

  const addContact = useCallback(async (data: CreateContactInput): Promise<CrmContact | null> => {
    const { user } = getAuthState();
    if (!user || !currentOrg) return null;
    try {
      const dbData = mapToDb(data as Record<string, unknown>);
      const { data: row, error } = await supabase
        .from('crm_contacts')
        .insert({ ...dbData, org_id: currentOrg.id, created_by: user.id })
        .select().single();
      if (error) { console.warn('[CrmStore] Error adding contact:', error.message); return null; }
      const contact = mapFromDb<CrmContact>(row);
      setContacts(prev => [contact, ...prev]);
      logAudit('create', 'contact', contact.id);
      return contact;
    } catch (err) { console.warn('[CrmStore] Unexpected error adding contact:', err); return null; }
  }, [currentOrg, logAudit]);

  const updateContact = useCallback(async (id: string, data: Partial<CrmContact>) => {
    const { user } = getAuthState();
    if (!user || !currentOrg) return;
    try {
      const dbData = mapToDb(data as Record<string, unknown>);
      const { error } = await supabase
        .from('crm_contacts').update({ ...dbData, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) { console.warn('[CrmStore] Error updating contact:', error.message); return; }
      setContacts(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
      logAudit('update', 'contact', id, data as Record<string, unknown>);
    } catch (err) { console.warn('[CrmStore] Unexpected error updating contact:', err); }
  }, [currentOrg, logAudit]);

  const deleteContact = useCallback(async (id: string): Promise<boolean> => {
    const { user } = getAuthState();
    if (!user || !currentOrg) return false;
    try {
      const { error } = await supabase.from('crm_contacts').delete().eq('id', id);
      if (error) { console.warn('[CrmStore] Error deleting contact:', error.message); return false; }
      setContacts(prev => prev.filter(c => c.id !== id));
      logAudit('delete', 'contact', id);
      return true;
    } catch (err) { console.warn('[CrmStore] Unexpected error deleting contact:', err); return false; }
  }, [currentOrg, logAudit]);

  const searchContacts = useCallback(async (query: string): Promise<CrmContact[]> => {
    if (!currentOrg || !query.trim()) return contacts;
    try {
      // Escape PostgREST filter special chars to prevent filter injection
      const sanitized = query.trim().replace(/[(),.*\\]/g, '');
      if (!sanitized) return contacts;
      const term = `%${sanitized}%`;
      const { data, error } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('org_id', currentOrg.id)
        .or(`search_name_normalized.ilike.${term},search_full_text.ilike.${term},search_name_translit.ilike.${term}`)
        .limit(50);
      if (error) { console.warn('[CrmStore] Error searching contacts:', error.message); return []; }
      return (data || []).map(r => mapFromDb<CrmContact>(r));
    } catch (err) { console.warn('[CrmStore] Unexpected error searching:', err); return []; }
  }, [currentOrg, contacts]);

  const refreshContacts = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const { data } = await supabase
        .from('crm_contacts').select('*').eq('org_id', currentOrg.id).order('created_at', { ascending: false });
      if (data) setContacts(data.map(r => mapFromDb<CrmContact>(r)));
    } catch { /* silent */ }
  }, [currentOrg]);

  // ─── COMPANY CRUD ────────────────────────────────────────

  const addCompany = useCallback(async (data: CreateCompanyInput): Promise<CrmCompany | null> => {
    const { user } = getAuthState();
    if (!user || !currentOrg) return null;
    try {
      const dbData = mapToDb(data as Record<string, unknown>);
      const { data: row, error } = await supabase
        .from('crm_companies')
        .insert({ ...dbData, org_id: currentOrg.id, created_by: user.id })
        .select().single();
      if (error) { console.warn('[CrmStore] Error adding company:', error.message); return null; }
      const company = mapFromDb<CrmCompany>(row);
      setCompanies(prev => [company, ...prev]);
      logAudit('create', 'company', company.id);
      return company;
    } catch (err) { console.warn('[CrmStore] Unexpected error adding company:', err); return null; }
  }, [currentOrg, logAudit]);

  const updateCompany = useCallback(async (id: string, data: Partial<CrmCompany>) => {
    const { user } = getAuthState();
    if (!user || !currentOrg) return;
    try {
      const dbData = mapToDb(data as Record<string, unknown>);
      const { error } = await supabase
        .from('crm_companies').update({ ...dbData, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) { console.warn('[CrmStore] Error updating company:', error.message); return; }
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
      logAudit('update', 'company', id, data as Record<string, unknown>);
    } catch (err) { console.warn('[CrmStore] Unexpected error updating company:', err); }
  }, [currentOrg, logAudit]);

  const deleteCompany = useCallback(async (id: string) => {
    const { user } = getAuthState();
    if (!user || !currentOrg) return;
    try {
      const { error } = await supabase.from('crm_companies').delete().eq('id', id);
      if (error) { console.warn('[CrmStore] Error deleting company:', error.message); return; }
      setCompanies(prev => prev.filter(c => c.id !== id));
      logAudit('delete', 'company', id);
    } catch (err) { console.warn('[CrmStore] Unexpected error deleting company:', err); }
  }, [currentOrg, logAudit]);

  // ─── DEAL CRUD ───────────────────────────────────────────

  const addDeal = useCallback(async (data: CreateDealInput): Promise<CrmDeal | null> => {
    const { user } = getAuthState();
    if (!user || !currentOrg) return null;
    try {
      const dbData = mapToDb(data as Record<string, unknown>);
      const { data: row, error } = await supabase
        .from('crm_deals')
        .insert({ ...dbData, org_id: currentOrg.id, created_by: user.id })
        .select().single();
      if (error) { console.warn('[CrmStore] Error adding deal:', error.message); return null; }
      const deal = mapFromDb<CrmDeal>(row);
      setDeals(prev => [deal, ...prev]);
      logAudit('create', 'deal', deal.id);
      return deal;
    } catch (err) { console.warn('[CrmStore] Unexpected error adding deal:', err); return null; }
  }, [currentOrg, logAudit]);

  const updateDeal = useCallback(async (id: string, data: Partial<CrmDeal>) => {
    const { user } = getAuthState();
    if (!user || !currentOrg) return;
    try {
      const dbData = mapToDb(data as Record<string, unknown>);
      const { error } = await supabase
        .from('crm_deals').update({ ...dbData, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) { console.warn('[CrmStore] Error updating deal:', error.message); return; }
      setDeals(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
      logAudit('update', 'deal', id, data as Record<string, unknown>);
    } catch (err) { console.warn('[CrmStore] Unexpected error updating deal:', err); }
  }, [currentOrg, logAudit]);

  const moveDealToStage = useCallback(async (dealId: string, stageId: string) => {
    const { user } = getAuthState();
    if (!user || !currentOrg) return;
    try {
      // Optimistic update
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stageId } : d));

      const { error } = await supabase
        .from('crm_deals')
        .update({ stage_id: stageId, updated_at: new Date().toISOString() })
        .eq('id', dealId);

      if (error) {
        console.warn('[CrmStore] Error moving deal:', error.message);
        // Revert optimistic update by refetching
        await refreshDeals();
        return;
      }

      // Refetch deal to get trigger-updated fields (closed_at, actual_close)
      const { data: updated } = await supabase
        .from('crm_deals').select('*').eq('id', dealId).single();
      if (updated) {
        const deal = mapFromDb<CrmDeal>(updated);
        setDeals(prev => prev.map(d => d.id === dealId ? deal : d));
      }
      logAudit('stage_change', 'deal', dealId, { stageId });
    } catch (err) {
      console.warn('[CrmStore] Unexpected error moving deal:', err);
      await refreshDeals();
    }
  }, [currentOrg, logAudit, refreshDeals]);

  const deleteDeal = useCallback(async (id: string) => {
    const { user } = getAuthState();
    if (!user || !currentOrg) return;
    try {
      const { error } = await supabase.from('crm_deals').delete().eq('id', id);
      if (error) { console.warn('[CrmStore] Error deleting deal:', error.message); return; }
      setDeals(prev => prev.filter(d => d.id !== id));
      logAudit('delete', 'deal', id);
    } catch (err) { console.warn('[CrmStore] Unexpected error deleting deal:', err); }
  }, [currentOrg, logAudit]);

  const refreshDeals = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const { data } = await supabase
        .from('crm_deals').select('*').eq('org_id', currentOrg.id).order('created_at', { ascending: false });
      if (data) setDeals(data.map(r => mapFromDb<CrmDeal>(r)));
    } catch { /* silent */ }
  }, [currentOrg]);

  // ─── TASK CRUD ───────────────────────────────────────────

  const addTask = useCallback(async (data: CreateTaskInput): Promise<CrmTask | null> => {
    const { user } = getAuthState();
    if (!user || !currentOrg) return null;
    try {
      const dbData = mapToDb(data as Record<string, unknown>);
      const { data: row, error } = await supabase
        .from('crm_tasks')
        .insert({ ...dbData, org_id: currentOrg.id, created_by: user.id })
        .select().single();
      if (error) { console.warn('[CrmStore] Error adding task:', error.message); return null; }
      const task = mapFromDb<CrmTask>(row);
      setTasks(prev => [task, ...prev]);
      logAudit('create', 'task', task.id);
      return task;
    } catch (err) { console.warn('[CrmStore] Unexpected error adding task:', err); return null; }
  }, [currentOrg, logAudit]);

  const updateTask = useCallback(async (id: string, data: Partial<CrmTask>) => {
    const { user } = getAuthState();
    if (!user || !currentOrg) return;
    try {
      const dbData = mapToDb(data as Record<string, unknown>);
      const { error } = await supabase
        .from('crm_tasks').update({ ...dbData, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) { console.warn('[CrmStore] Error updating task:', error.message); return; }
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
      logAudit('update', 'task', id, data as Record<string, unknown>);
    } catch (err) { console.warn('[CrmStore] Unexpected error updating task:', err); }
  }, [currentOrg, logAudit]);

  const completeTask = useCallback(async (id: string) => {
    await updateTask(id, { status: 'completed', completedAt: new Date().toISOString() } as Partial<CrmTask>);
  }, [updateTask]);

  const deleteTask = useCallback(async (id: string) => {
    const { user } = getAuthState();
    if (!user || !currentOrg) return;
    try {
      const { error } = await supabase.from('crm_tasks').delete().eq('id', id);
      if (error) { console.warn('[CrmStore] Error deleting task:', error.message); return; }
      setTasks(prev => prev.filter(t => t.id !== id));
      logAudit('delete', 'task', id);
    } catch (err) { console.warn('[CrmStore] Unexpected error deleting task:', err); }
  }, [currentOrg, logAudit]);

  // ─── COMMUNICATION LOGGING ──────────────────────────────

  const logCommunication = useCallback(async (data: CreateCommunicationInput): Promise<CrmCommunication | null> => {
    const { user } = getAuthState();
    if (!user || !currentOrg) return null;
    try {
      const dbData = mapToDb(data as Record<string, unknown>);
      const { data: row, error } = await supabase
        .from('crm_communications')
        .insert({ ...dbData, org_id: currentOrg.id, logged_by: user.id })
        .select().single();
      if (error) { console.warn('[CrmStore] Error logging communication:', error.message); return null; }
      const comm = mapFromDb<CrmCommunication>(row);
      setCommunications(prev => [comm, ...prev]);
      logAudit('create', 'communication', comm.id);
      return comm;
    } catch (err) { console.warn('[CrmStore] Unexpected error logging communication:', err); return null; }
  }, [currentOrg, logAudit]);

  const importWhatsAppChat = useCallback(async (contactId: string, rawChat: string): Promise<CrmCommunication | null> => {
    // TODO: Parse with src/crm/whatsapp/chatParser.ts when built in Phase 10
    // For now, store raw text as a whatsapp communication
    return logCommunication({
      contactId,
      type: 'whatsapp',
      direction: null,
      body: rawChat,
      whatsappRaw: rawChat,
    } as CreateCommunicationInput);
  }, [logCommunication]);

  // ─── PIPELINE CONFIG ─────────────────────────────────────

  const addPipelineStage = useCallback(async (pipelineId: string, data: CreateStageInput) => {
    const { user } = getAuthState();
    if (!user || !currentOrg) return;
    try {
      const dbData = mapToDb(data as Record<string, unknown>);
      const { data: row, error } = await supabase
        .from('crm_deal_stages')
        .insert({ ...dbData, pipeline_id: pipelineId, org_id: currentOrg.id })
        .select().single();
      if (error) { console.warn('[CrmStore] Error adding stage:', error.message); return; }
      const stage = mapFromDb<CrmDealStage>(row);
      setDealStages(prev => [...prev, stage].sort((a, b) => a.position - b.position));
    } catch (err) { console.warn('[CrmStore] Unexpected error adding stage:', err); }
  }, [currentOrg]);

  const reorderStages = useCallback(async (pipelineId: string, stageIds: string[]) => {
    if (!currentOrg) return;
    try {
      // Update positions in parallel
      await Promise.all(stageIds.map((id, idx) =>
        supabase.from('crm_deal_stages').update({ position: idx + 1 }).eq('id', id)
      ));
      // Refresh stages
      const { data } = await supabase
        .from('crm_deal_stages').select('*').eq('org_id', currentOrg.id).order('position');
      if (data) setDealStages(data.map(r => mapFromDb<CrmDealStage>(r)));
    } catch (err) { console.warn('[CrmStore] Error reordering stages:', err); }
  }, [currentOrg]);

  const updateStage = useCallback(async (stageId: string, data: Partial<CrmDealStage>) => {
    if (!currentOrg) return;
    try {
      const dbData = mapToDb(data as Record<string, unknown>);
      const { error } = await supabase.from('crm_deal_stages').update(dbData).eq('id', stageId);
      if (error) { console.warn('[CrmStore] Error updating stage:', error.message); return; }
      setDealStages(prev => prev.map(s => s.id === stageId ? { ...s, ...data } : s));
    } catch (err) { console.warn('[CrmStore] Unexpected error updating stage:', err); }
  }, [currentOrg]);

  const deleteStage = useCallback(async (stageId: string) => {
    if (!currentOrg) return;
    try {
      const { error } = await supabase.from('crm_deal_stages').delete().eq('id', stageId);
      if (error) { console.warn('[CrmStore] Error deleting stage:', error.message); return; }
      setDealStages(prev => prev.filter(s => s.id !== stageId));
    } catch (err) { console.warn('[CrmStore] Unexpected error deleting stage:', err); }
  }, [currentOrg]);

  // ─── NOTIFICATIONS ───────────────────────────────────────

  const markNotificationRead = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('crm_notifications').update({ is_read: true }).eq('id', id);
      if (error) { console.warn('[CrmStore] Error marking notification:', error.message); return; }
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) { console.warn('[CrmStore] Unexpected error:', err); }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    const { user } = getAuthState();
    if (!user || !currentOrg) return;
    try {
      const { error } = await supabase
        .from('crm_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('org_id', currentOrg.id)
        .eq('is_read', false);
      if (error) { console.warn('[CrmStore] Error marking all read:', error.message); return; }
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) { console.warn('[CrmStore] Unexpected error:', err); }
  }, [currentOrg]);

  // ─── VALUE ───────────────────────────────────────────────

  const value: CrmContextType = {
    contacts, companies, deals, tasks, communications,
    pipelines, dealStages, customFieldDefs, notifications, isLoading,
    addContact, updateContact, deleteContact, searchContacts,
    addCompany, updateCompany, deleteCompany,
    addDeal, updateDeal, moveDealToStage, deleteDeal,
    addTask, updateTask, completeTask, deleteTask,
    logCommunication, importWhatsAppChat,
    addPipelineStage, reorderStages, updateStage, deleteStage,
    markNotificationRead, markAllNotificationsRead,
    refreshContacts, refreshDeals,
  };

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

/* ===== HOOKS ===== */

export function useCrm(): CrmContextType {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error('useCrm must be used within CrmProvider');
  return ctx;
}

export function useCrmContacts() {
  const { contacts, isLoading, addContact, updateContact, deleteContact, searchContacts, refreshContacts } = useCrm();
  return { contacts, isLoading: isLoading.contacts, addContact, updateContact, deleteContact, searchContacts, refreshContacts };
}

export function useCrmDeals() {
  const { deals, dealStages, pipelines, isLoading, addDeal, updateDeal, moveDealToStage, deleteDeal, refreshDeals } = useCrm();
  return { deals, dealStages, pipelines, isLoading: isLoading.deals, addDeal, updateDeal, moveDealToStage, deleteDeal, refreshDeals };
}

export function useCrmTasks() {
  const { tasks, isLoading, addTask, updateTask, completeTask, deleteTask } = useCrm();
  return { tasks, isLoading: isLoading.tasks, addTask, updateTask, completeTask, deleteTask };
}
