'use client';

import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Shield, Plus, Trash2 } from 'lucide-react';
import { useOrg } from '@/store/orgStore';
import { supabase } from '@/lib/supabaseClient';
import { mapFromDb } from '@/types/crm';
import type { OrgRole, CrmPermissions } from '@/types/crm';

const PERMISSION_GROUPS = [
  {
    group: 'Contacts',
    groupAr: 'جهات الاتصال',
    keys: ['contacts.read', 'contacts.write', 'contacts.delete'] as (keyof CrmPermissions)[],
  },
  {
    group: 'Companies',
    groupAr: 'الشركات',
    keys: ['companies.read', 'companies.write', 'companies.delete'] as (keyof CrmPermissions)[],
  },
  {
    group: 'Deals',
    groupAr: 'الصفقات',
    keys: ['deals.read', 'deals.write', 'deals.delete'] as (keyof CrmPermissions)[],
  },
  {
    group: 'Tasks',
    groupAr: 'المهام',
    keys: ['tasks.read', 'tasks.write', 'tasks.delete'] as (keyof CrmPermissions)[],
  },
  {
    group: 'Pipeline',
    groupAr: 'المسار',
    keys: ['pipeline.configure'] as (keyof CrmPermissions)[],
  },
  {
    group: 'Team',
    groupAr: 'الفريق',
    keys: ['team.manage', 'team.invite'] as (keyof CrmPermissions)[],
  },
  {
    group: 'Reports',
    groupAr: 'التقارير',
    keys: ['reports.view', 'reports.export'] as (keyof CrmPermissions)[],
  },
  {
    group: 'Settings',
    groupAr: 'الإعدادات',
    keys: ['settings.manage', 'import.execute', 'audit.view', 'fields.manage'] as (keyof CrmPermissions)[],
  },
];

export function RoleEditor() {
  const intl = useIntl();
  const { orgRoles, currentOrg } = useOrg();
  const isAr = intl.locale.startsWith('ar');
  const [selectedRole, setSelectedRole] = useState<OrgRole | null>(null);
  const [editPermissions, setEditPermissions] = useState<CrmPermissions | null>(null);

  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  const handleSelectRole = (role: OrgRole) => {
    setSelectedRole(role);
    setEditPermissions({ ...role.permissions } as CrmPermissions);
  };

  const handleToggle = (key: keyof CrmPermissions) => {
    if (!editPermissions || selectedRole?.isSystem) return;
    setEditPermissions(prev => prev ? { ...prev, [key]: !prev[key] } : null);
  };

  const handleSave = async () => {
    if (!selectedRole || !editPermissions || !currentOrg) return;
    try {
      await supabase
        .from('org_roles')
        .update({ permissions: editPermissions })
        .eq('id', selectedRole.id);

      // Refresh would happen via orgStore, but for now update local
      setSelectedRole({ ...selectedRole, permissions: editPermissions });
    } catch (err) {
      console.warn('[RoleEditor] Error saving:', err);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '1rem', minHeight: '400px' }}
      className="crm-role-editor"
    >
      {/* Role list */}
      <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Shield size={16} />
          {t('org.role.owner', 'Roles')}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {orgRoles.map(role => (
            <button
              key={role.id}
              onClick={() => handleSelectRole(role)}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: 'none',
                background: selectedRole?.id === role.id ? 'var(--ds-bg-tinted)' : 'transparent',
                color: selectedRole?.id === role.id ? 'var(--ds-accent-primary)' : 'var(--ds-text-body)',
                fontSize: '13px',
                fontWeight: selectedRole?.id === role.id ? 500 : 400,
                cursor: 'pointer',
                textAlign: 'start',
              }}
            >
              <div>{isAr ? (role.nameAr || role.name) : role.name}</div>
              {role.isSystem && (
                <span style={{ fontSize: '10px', color: 'var(--ds-text-muted)' }}>
                  {isAr ? 'نظام' : 'System'}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Permission editor */}
      <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {!selectedRole ? (
          <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', textAlign: 'center', padding: '3rem' }}>
            {isAr ? 'اختر دوراً لعرض الصلاحيات' : 'Select a role to view permissions'}
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
                {isAr ? (selectedRole.nameAr || selectedRole.name) : selectedRole.name}
              </h3>
              {!selectedRole.isSystem && (
                <button onClick={handleSave} style={{ background: 'var(--ds-accent-primary)', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                  {t('crm.action.save', 'Save')}
                </button>
              )}
            </div>

            {selectedRole.isSystem && (
              <div style={{ background: 'var(--ds-bg-tinted)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--ds-text-muted)', marginBottom: '1rem' }}>
                {isAr ? 'أدوار النظام للعرض فقط ولا يمكن تعديلها' : 'System roles are view-only and cannot be modified'}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {PERMISSION_GROUPS.map(group => (
                <div key={group.group}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ds-text-heading)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {isAr ? group.groupAr : group.group}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {group.keys.map(key => (
                      <label
                        key={key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          cursor: selectedRole.isSystem ? 'default' : 'pointer',
                          fontSize: '13px',
                          color: 'var(--ds-text-body)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editPermissions?.[key] ?? false}
                          onChange={() => handleToggle(key)}
                          disabled={selectedRole.isSystem}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--ds-accent-primary)' }}
                        />
                        {t(`org.permission.${key}`, key.replace(/\./g, ' '))}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 767px) {
          .crm-role-editor { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
