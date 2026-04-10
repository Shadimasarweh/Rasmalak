'use client';

import { useState } from 'react';
import { useIntl } from 'react-intl';
import { UserPlus, MoreVertical, Shield } from 'lucide-react';
import { useOrg, useOrgPermission } from '@/store/orgStore';
import type { OrgRoleName } from '@/types/crm';

const ROLES: OrgRoleName[] = ['owner', 'admin', 'manager', 'sales_rep', 'viewer'];

export function MemberManager() {
  const intl = useIntl();
  const { orgMembers, orgRoles, updateMemberRole, removeMember, inviteMember, userRole } = useOrg();
  const canManage = useOrgPermission('team.manage');
  const canInvite = useOrgPermission('team.invite');
  const isAr = intl.locale.startsWith('ar');

  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('sales_rep');
  const [showInvite, setShowInvite] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  const getRoleName = (role: string) => {
    const roleObj = orgRoles.find(r => r.name === role);
    return isAr ? (roleObj?.nameAr || role) : role;
  };

  const handleInvite = async () => {
    if (!inviteUserId.trim()) return;
    await inviteMember(inviteUserId.trim(), inviteRole);
    setInviteUserId('');
    setShowInvite(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)' }}>
          {t('org.team.members', 'Team Members')}
        </h2>
        {canInvite && (
          <button
            onClick={() => setShowInvite(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--ds-accent-primary)', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            <UserPlus size={14} />
            {t('org.team.invite', 'Invite Member')}
          </button>
        )}
      </div>

      {/* Invite form */}
      {showInvite && (
        <div style={{ background: 'var(--ds-bg-tinted)', border: '1px solid #D1FAE5', borderRadius: '12px', padding: '14px 18px', marginBottom: '1rem', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            value={inviteUserId}
            onChange={e => setInviteUserId(e.target.value)}
            placeholder={isAr ? 'معرف المستخدم (UUID)' : 'User ID (UUID)'}
            style={{ flex: 1, padding: '8px 12px', fontSize: '13px', border: '1px solid var(--ds-border)', borderRadius: '8px', background: 'var(--ds-bg-card)', color: 'var(--ds-text-body)', outline: 'none', minWidth: '200px' }}
          />
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value)}
            style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid var(--ds-border)', borderRadius: '8px', background: 'var(--ds-bg-card)', color: 'var(--ds-text-body)' }}
          >
            {ROLES.filter(r => r !== 'owner').map(r => (
              <option key={r} value={r}>{getRoleName(r)}</option>
            ))}
          </select>
          <button onClick={handleInvite} style={{ background: 'var(--ds-accent-primary)', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>
            {t('org.team.invite', 'Invite')}
          </button>
          <button onClick={() => setShowInvite(false)} style={{ background: 'none', border: '1px solid var(--ds-border)', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', color: 'var(--ds-text-body)' }}>
            {t('crm.action.cancel', 'Cancel')}
          </button>
        </div>
      )}

      {/* Members list */}
      <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {orgMembers.map((member, idx) => (
          <div
            key={member.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 16px',
              borderBottom: idx < orgMembers.length - 1 ? '1px solid var(--ds-border)' : 'none',
            }}
          >
            {/* Avatar */}
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--ds-bg-tinted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ds-accent-primary)' }}>
                {(member.displayName || member.userId.substring(0, 2)).charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
                {member.displayName || member.displayNameAr || member.userId.substring(0, 12)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <Shield size={12} style={{ color: 'var(--ds-text-muted)' }} />
                <span style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>
                  {getRoleName(member.role)}
                </span>
              </div>
            </div>

            {/* Actions */}
            {canManage && member.role !== 'owner' && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setMenuOpen(prev => prev === member.id ? null : member.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-muted)', padding: '4px' }}
                >
                  <MoreVertical size={16} />
                </button>
                {menuOpen === member.id && (
                  <div style={{
                    position: 'absolute', insetInlineEnd: 0, insetBlockStart: '100%',
                    background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)',
                    borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    padding: '4px', zIndex: 10, minWidth: '140px',
                  }}>
                    {ROLES.filter(r => r !== 'owner' && r !== member.role).map(r => (
                      <button
                        key={r}
                        onClick={async () => { await updateMemberRole(member.id, r); setMenuOpen(null); }}
                        style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: 'var(--ds-text-body)', textAlign: 'start', borderRadius: '6px' }}
                      >
                        {t('org.team.changeRole', 'Change to')} {getRoleName(r)}
                      </button>
                    ))}
                    <button
                      onClick={async () => { await removeMember(member.id); setMenuOpen(null); }}
                      style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#EF4444', textAlign: 'start', borderRadius: '6px' }}
                    >
                      {t('org.team.remove', 'Remove')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
