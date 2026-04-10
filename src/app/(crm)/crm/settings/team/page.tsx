'use client';
import { MemberManager } from '@/components/crm/settings/MemberManager';
import { RoleEditor } from '@/components/crm/settings/RoleEditor';

export default function TeamSettingsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <MemberManager />
      <RoleEditor />
    </div>
  );
}
