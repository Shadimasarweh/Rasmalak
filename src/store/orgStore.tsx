'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore, getAuthState } from '@/store/authStore';
import type {
  Organization,
  OrgMember,
  OrgRole,
  CrmPermissions,
  CreateOrgInput,
} from '@/types/crm';
import { mapFromDb as mapRow, mapToDb } from '@/types/crm';

/* ============================================
   ORG STORE
   Context Provider for organization state.
   Follows the same pattern as transactionStore.tsx:
   - createContext + Provider
   - Auth-gated fetching
   - getAuthState() in mutations
   - console.warn for errors (not console.error to avoid dev overlay)
   ============================================ */

const DEFAULT_PERMISSIONS: CrmPermissions = {
  'contacts.read': false,
  'contacts.write': false,
  'contacts.delete': false,
  'companies.read': false,
  'companies.write': false,
  'companies.delete': false,
  'deals.read': false,
  'deals.write': false,
  'deals.delete': false,
  'tasks.read': false,
  'tasks.write': false,
  'tasks.delete': false,
  'pipeline.configure': false,
  'team.manage': false,
  'team.invite': false,
  'reports.view': false,
  'reports.export': false,
  'settings.manage': false,
  'import.execute': false,
  'audit.view': false,
  'fields.manage': false,
};

interface OrgContextType {
  currentOrg: Organization | null;
  orgMembers: OrgMember[];
  orgRoles: OrgRole[];
  userRole: string | null;
  userPermissions: CrmPermissions;
  isLoading: boolean;

  createOrg: (data: CreateOrgInput) => Promise<Organization | null>;
  updateOrg: (data: Partial<Organization>) => Promise<void>;
  inviteMember: (userId: string, role: string) => Promise<void>;
  updateMemberRole: (memberId: string, role: string) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  refreshMembers: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [orgRoles, setOrgRoles] = useState<OrgRole[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<CrmPermissions>(DEFAULT_PERMISSIONS);
  const [isLoading, setIsLoading] = useState(true);

  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);

  // Resolve permissions from role name by looking up org_roles
  const resolvePermissions = useCallback((roleName: string, roles: OrgRole[]): CrmPermissions => {
    const roleEntry = roles.find(r => r.name === roleName);
    if (!roleEntry) return DEFAULT_PERMISSIONS;
    return { ...DEFAULT_PERMISSIONS, ...roleEntry.permissions } as CrmPermissions;
  }, []);

  // Load user's org on auth ready
  useEffect(() => {
    const loadUserOrg = async () => {
      if (!initialized) return;

      if (!user) {
        setCurrentOrg(null);
        setOrgMembers([]);
        setOrgRoles([]);
        setUserRole(null);
        setUserPermissions(DEFAULT_PERMISSIONS);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // Find orgs where user is an active member
        const { data: memberRows, error: memberError } = await supabase
          .from('org_members')
          .select('*, organizations(*)')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (memberError) {
          console.warn('[OrgStore] Error fetching org memberships:', memberError.message);
          setIsLoading(false);
          return;
        }

        if (!memberRows || memberRows.length === 0) {
          // User has no org — OrgGuard will redirect to setup
          setCurrentOrg(null);
          setIsLoading(false);
          return;
        }

        // Auto-select first org (multi-org switcher is roadmap)
        const firstMembership = memberRows[0];
        const orgData = firstMembership.organizations as Record<string, unknown>;
        const org = mapRow<Organization>(orgData);
        setCurrentOrg(org);
        setUserRole(firstMembership.role);

        // Load all members for this org
        const { data: allMembers, error: membersError } = await supabase
          .from('org_members')
          .select('*')
          .eq('org_id', org.id)
          .eq('is_active', true);

        if (membersError) {
          console.warn('[OrgStore] Error fetching members:', membersError.message);
        } else if (allMembers) {
          setOrgMembers(allMembers.map(r => mapRow<OrgMember>(r)));
        }

        // Load roles for this org
        const { data: roles, error: rolesError } = await supabase
          .from('org_roles')
          .select('*')
          .eq('org_id', org.id);

        if (rolesError) {
          console.warn('[OrgStore] Error fetching roles:', rolesError.message);
        } else if (roles) {
          const mappedRoles = roles.map(r => mapRow<OrgRole>(r));
          setOrgRoles(mappedRoles);
          // Resolve current user's permissions
          setUserPermissions(resolvePermissions(firstMembership.role, mappedRoles));
        }
      } catch (err) {
        console.warn('[OrgStore] Unexpected error loading org:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserOrg();
  }, [user, initialized, resolvePermissions]);

  // Create a new organization
  const createOrg = useCallback(async (data: CreateOrgInput): Promise<Organization | null> => {
    const { user, initialized } = getAuthState();
    if (!initialized || !user) {
      console.warn('[OrgStore] Cannot create org: auth not ready');
      return null;
    }

    try {
      const dbData = mapToDb(data as Record<string, unknown>);
      const { data: row, error } = await supabase
        .from('organizations')
        .insert({ ...dbData, created_by: user.id })
        .select()
        .single();

      if (error) {
        console.warn('[OrgStore] Error creating org:', error.message);
        return null;
      }

      if (!row) return null;

      const org = mapRow<Organization>(row);

      // Wait briefly for triggers to fire (owner member, pipeline, roles)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reload full org state
      setCurrentOrg(org);

      // Reload members
      const { data: members } = await supabase
        .from('org_members')
        .select('*')
        .eq('org_id', org.id)
        .eq('is_active', true);

      if (members) setOrgMembers(members.map(r => mapRow<OrgMember>(r)));

      // Reload roles and resolve permissions
      const { data: roles } = await supabase
        .from('org_roles')
        .select('*')
        .eq('org_id', org.id);

      if (roles) {
        const mappedRoles = roles.map(r => mapRow<OrgRole>(r));
        setOrgRoles(mappedRoles);
        setUserRole('owner');
        setUserPermissions(resolvePermissions('owner', mappedRoles));
      }

      return org;
    } catch (err) {
      console.warn('[OrgStore] Unexpected error creating org:', err);
      return null;
    }
  }, [resolvePermissions]);

  // Update org fields
  const updateOrg = useCallback(async (data: Partial<Organization>) => {
    const { user, initialized } = getAuthState();
    if (!initialized || !user || !currentOrg) return;

    try {
      const dbData = mapToDb(data as Record<string, unknown>);
      const { error } = await supabase
        .from('organizations')
        .update({ ...dbData, updated_at: new Date().toISOString() })
        .eq('id', currentOrg.id);

      if (error) {
        console.warn('[OrgStore] Error updating org:', error.message);
        return;
      }

      setCurrentOrg(prev => prev ? { ...prev, ...data } : null);
    } catch (err) {
      console.warn('[OrgStore] Unexpected error updating org:', err);
    }
  }, [currentOrg]);

  // Refresh members list (defined before inviteMember to avoid stale closure)
  const refreshMembers = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const { data, error } = await supabase
        .from('org_members')
        .select('*')
        .eq('org_id', currentOrg.id)
        .eq('is_active', true);
      if (error) { console.warn('[OrgStore] Error refreshing members:', error.message); return; }
      if (data) setOrgMembers(data.map(r => mapRow<OrgMember>(r)));
    } catch (err) { console.warn('[OrgStore] Unexpected error refreshing members:', err); }
  }, [currentOrg]);

  // Invite a member (by user_id for now; email invite flow is roadmap)
  const inviteMember = useCallback(async (userId: string, role: string) => {
    const { user: authUser, initialized } = getAuthState();
    if (!initialized || !authUser || !currentOrg) return;

    try {
      const { error } = await supabase
        .from('org_members')
        .insert({
          org_id: currentOrg.id,
          user_id: userId,
          role,
          invited_by: authUser.id,
          invited_at: new Date().toISOString(),
        });

      if (error) {
        console.warn('[OrgStore] Error inviting member:', error.message);
        return;
      }

      await refreshMembers();
    } catch (err) {
      console.warn('[OrgStore] Unexpected error inviting member:', err);
    }
  }, [currentOrg, refreshMembers]);

  // Update a member's role
  const updateMemberRole = useCallback(async (memberId: string, role: string) => {
    const { user, initialized } = getAuthState();
    if (!initialized || !user || !currentOrg) return;

    try {
      const { error } = await supabase
        .from('org_members')
        .update({ role })
        .eq('id', memberId);

      if (error) {
        console.warn('[OrgStore] Error updating member role:', error.message);
        return;
      }

      setOrgMembers(prev =>
        prev.map(m => m.id === memberId ? { ...m, role: role as OrgMember['role'] } : m)
      );
    } catch (err) {
      console.warn('[OrgStore] Unexpected error updating member role:', err);
    }
  }, [currentOrg]);

  // Soft-delete a member (set is_active = false)
  const removeMember = useCallback(async (memberId: string) => {
    const { user, initialized } = getAuthState();
    if (!initialized || !user || !currentOrg) return;

    try {
      const { error } = await supabase
        .from('org_members')
        .update({ is_active: false })
        .eq('id', memberId);

      if (error) {
        console.warn('[OrgStore] Error removing member:', error.message);
        return;
      }

      setOrgMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (err) {
      console.warn('[OrgStore] Unexpected error removing member:', err);
    }
  }, [currentOrg]);

  // refreshMembers is defined above inviteMember to avoid stale closure

  const value: OrgContextType = {
    currentOrg,
    orgMembers,
    orgRoles,
    userRole,
    userPermissions,
    isLoading,
    createOrg,
    updateOrg,
    inviteMember,
    updateMemberRole,
    removeMember,
    refreshMembers,
  };

  return (
    <OrgContext.Provider value={value}>
      {children}
    </OrgContext.Provider>
  );
}

/* ===== HOOKS ===== */

export function useOrg(): OrgContextType {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
}

export function useOrgPermission(key: keyof CrmPermissions): boolean {
  const { userPermissions } = useOrg();
  return userPermissions[key] === true;
}
