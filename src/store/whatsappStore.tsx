'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { useOrg } from '@/store/orgStore';
import type { WhatsAppAccount, WhatsAppTemplate, WhatsAppConversation } from '@/types/crm';

/* ============================================
   WHATSAPP STORE — Context Provider
   Manages WhatsApp Business accounts, templates,
   and conversations.
   ============================================ */

function mapAccount(row: Record<string, unknown>): WhatsAppAccount {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    phoneNumber: row.phone_number as string,
    wabaId: row.waba_id as string,
    accessToken: '', // Never expose encrypted token to frontend
    status: row.status as WhatsAppAccount['status'],
    numberModel: (row.number_model as string) ?? 'shared',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapTemplate(row: Record<string, unknown>): WhatsAppTemplate {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    accountId: row.account_id as string,
    name: row.name as string,
    language: row.language as string,
    category: row.category as WhatsAppTemplate['category'],
    status: row.status as WhatsAppTemplate['status'],
    header: (row.header as Record<string, unknown>) ?? null,
    body: row.body as string,
    footer: (row.footer as string) ?? null,
    buttons: (row.buttons as Record<string, unknown>) ?? null,
    metaTemplateId: (row.meta_template_id as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapConversation(row: Record<string, unknown>): WhatsAppConversation {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    accountId: (row.account_id as string) ?? null,
    contactId: (row.contact_id as string) ?? null,
    contactPhone: row.contact_phone as string,
    assignedTo: (row.assigned_to as string) ?? null,
    status: (row.status as 'active' | 'expired') ?? 'active',
    windowExpires: (row.window_expires as string) ?? null,
    lastMessageAt: (row.last_message_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

interface WhatsAppContextType {
  accounts: WhatsAppAccount[];
  templates: WhatsAppTemplate[];
  conversations: WhatsAppConversation[];
  isLoading: boolean;

  fetchAccounts: () => Promise<void>;
  fetchTemplates: (accountId?: string) => Promise<void>;
  fetchConversations: () => Promise<void>;
}

const WhatsAppContext = createContext<WhatsAppContextType | null>(null);

export function WhatsAppProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const { currentOrg } = useOrg();

  useEffect(() => {
    if (!initialized || !user || !currentOrg) {
      setAccounts([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from('whatsapp_accounts')
          .select('id, org_id, phone_number, waba_id, status, number_model, created_at, updated_at')
          .eq('org_id', currentOrg.id);

        if (!cancelled && data) setAccounts(data.map(mapAccount));
      } catch (err) {
        if (!cancelled) console.warn('[WhatsAppStore] Error loading accounts:', err);
      }
      if (!cancelled) setIsLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [initialized, user, currentOrg]);

  const fetchAccounts = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const { data } = await supabase
        .from('whatsapp_accounts')
        .select('*')
        .eq('org_id', currentOrg.id);
      if (data) setAccounts(data.map(mapAccount));
    } catch (err) {
      console.warn('[WhatsAppStore] Error fetching accounts:', err);
    }
  }, [currentOrg]);

  const fetchTemplates = useCallback(async (accountId?: string) => {
    if (!currentOrg) return;
    try {
      let query = supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('org_id', currentOrg.id);

      if (accountId) query = query.eq('account_id', accountId);

      const { data } = await query;
      if (data) setTemplates(data.map(mapTemplate));
    } catch (err) {
      console.warn('[WhatsAppStore] Error fetching templates:', err);
    }
  }, [currentOrg]);

  const fetchConversations = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const { data } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('org_id', currentOrg.id)
        .order('last_message_at', { ascending: false })
        .limit(50);

      if (data) setConversations(data.map(mapConversation));
    } catch (err) {
      console.warn('[WhatsAppStore] Error fetching conversations:', err);
    }
  }, [currentOrg]);

  return (
    <WhatsAppContext.Provider value={{
      accounts, templates, conversations, isLoading,
      fetchAccounts, fetchTemplates, fetchConversations,
    }}>
      {children}
    </WhatsAppContext.Provider>
  );
}

export function useWhatsApp(): WhatsAppContextType {
  const ctx = useContext(WhatsAppContext);
  if (!ctx) throw new Error('useWhatsApp must be used within WhatsAppProvider');
  return ctx;
}
