'use client';

import { useState } from 'react';
import { useIntl } from 'react-intl';
import { useRouter } from 'next/navigation';
import { useOrg } from '@/store/orgStore';
import { useAuthStore } from '@/store/authStore';
import { installTemplate } from '@/crm/verticals/templateInstaller';
import { CheckCircle, Loader, AlertCircle } from 'lucide-react';

interface InstallWizardProps {
  slug: string;
  templateName: string;
  onComplete: () => void;
}

export function InstallWizard({ slug, templateName, onComplete }: InstallWizardProps) {
  const intl = useIntl();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });
  const router = useRouter();
  const { currentOrg } = useOrg();
  const user = useAuthStore((state) => state.user);

  const [status, setStatus] = useState<'idle' | 'installing' | 'success' | 'error'>('idle');
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleInstall = async () => {
    if (!currentOrg || !user) return;
    setStatus('installing');
    setError('');

    const result = await installTemplate(currentOrg.id, slug, user.id);

    if (result.success) {
      setStatus('success');
      setPipelineId(result.pipelineId ?? null);
    } else {
      setStatus('error');
      setError(result.error ?? 'Installation failed');
    }
  };

  return (
    <div style={{
      background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
      padding: '24px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', textAlign: 'center',
      maxWidth: '400px', marginInline: 'auto',
    }}>
      {status === 'idle' && (
        <>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ds-text-heading)', marginBottom: '8px' }}>
            {t('verticals.installConfirm', 'Install {name}?').replace('{name}', templateName)}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginBottom: '20px' }}>
            {t('verticals.installDesc', 'This will create a new pipeline with stages, custom fields, and workflow automations.')}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <button onClick={onComplete} style={{ padding: '9px 18px', fontSize: '13px', borderRadius: '8px', border: '0.5px solid var(--ds-border)', background: 'transparent', color: 'var(--ds-text-body)', cursor: 'pointer' }}>
              {t('verticals.cancel', 'Cancel')}
            </button>
            <button onClick={handleInstall} style={{ padding: '9px 18px', fontSize: '13px', fontWeight: 500, borderRadius: '8px', border: 'none', background: 'var(--ds-accent-primary)', color: '#FFFFFF', cursor: 'pointer' }}>
              {t('verticals.confirm', 'Install')}
            </button>
          </div>
        </>
      )}

      {status === 'installing' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '1rem' }}>
          <Loader size={32} style={{ color: 'var(--ds-accent-primary)', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: '14px', color: 'var(--ds-text-heading)' }}>
            {t('verticals.installing', 'Installing template...')}
          </div>
        </div>
      )}

      {status === 'success' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '1rem' }}>
          <CheckCircle size={40} color="var(--ds-accent-primary)" />
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ds-text-heading)' }}>
            {t('verticals.installed', 'Template Installed!')}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)' }}>
            {t('verticals.installedDesc', 'Pipeline, fields, and workflows have been created.')}
          </p>
          <button
            onClick={() => router.push('/crm')}
            style={{ padding: '9px 18px', fontSize: '13px', fontWeight: 500, borderRadius: '8px', border: 'none', background: 'var(--ds-accent-primary)', color: '#FFFFFF', cursor: 'pointer' }}
          >
            {t('verticals.viewPipeline', 'View Pipeline')}
          </button>
        </div>
      )}

      {status === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '1rem' }}>
          <AlertCircle size={40} color="#DC2626" />
          <div style={{ fontSize: '14px', color: '#DC2626' }}>{error}</div>
          <button onClick={() => setStatus('idle')} style={{ padding: '9px 18px', fontSize: '13px', borderRadius: '8px', border: '0.5px solid var(--ds-border)', background: 'transparent', color: 'var(--ds-text-body)', cursor: 'pointer' }}>
            {t('verticals.retry', 'Try Again')}
          </button>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
