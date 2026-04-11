'use client';

import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/store/orgStore';
import { Key, Plus, Copy, Trash2, ExternalLink } from 'lucide-react';

interface ApiKeyDisplay {
  id: string;
  name: string;
  keyPrefix: string;
  rateLimit: number;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ApiSettingsPage() {
  const intl = useIntl();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });
  const { currentOrg } = useOrg();
  const [keys, setKeys] = useState<ApiKeyDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');

  useEffect(() => {
    if (!currentOrg) return;
    loadKeys();
  }, [currentOrg]);

  const loadKeys = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.from('api_keys').select('id, name, key_prefix, rate_limit, is_active, last_used_at, created_at')
        .eq('org_id', currentOrg!.id).order('created_at', { ascending: false });
      if (data) {
        setKeys(data.map(k => ({
          id: k.id, name: k.name, keyPrefix: k.key_prefix, rateLimit: k.rate_limit,
          isActive: k.is_active, lastUsedAt: k.last_used_at, createdAt: k.created_at,
        })));
      }
    } catch { /* handled */ }
    setIsLoading(false);
  };

  const createKey = async () => {
    if (!newKeyName.trim() || !currentOrg) return;
    try {
      // Generate raw key
      const rawKey = `rsk_${crypto.randomUUID().replace(/-/g, '')}`;
      const keyHash = await hashKey(rawKey);

      const { error } = await supabase.from('api_keys').insert({
        org_id: currentOrg.id, name: newKeyName.trim(),
        key_hash: keyHash, key_prefix: rawKey.slice(0, 8), rate_limit: 100,
      });

      if (error) throw error;
      setNewKeyValue(rawKey);
      setNewKeyName('');
      await loadKeys();
    } catch (err) {
      console.warn('[API Settings] Create key error:', err);
    }
  };

  const deleteKey = async (id: string) => {
    try {
      await supabase.from('api_keys').delete().eq('id', id);
      setKeys(prev => prev.filter(k => k.id !== id));
    } catch { /* handled */ }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ds-text-heading)', fontFeatureSettings: '"kern" 1' }}>
          {t('api.title', 'API Access')}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)' }}>
          {t('api.subtitle', 'Manage API keys for external integrations')}
        </p>
      </div>

      {/* Docs link */}
      <a href="/api/crm/v1/openapi" target="_blank" rel="noopener noreferrer" style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px',
        color: 'var(--ds-accent-primary)', textDecoration: 'none',
      }}>
        <ExternalLink size={14} />
        {t('api.viewDocs', 'View API Documentation')}
      </a>

      {/* New key shown once */}
      {newKeyValue && (
        <div style={{ padding: '14px 18px', background: 'var(--ds-bg-tinted)', border: '1px solid var(--ds-accent-primary)', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ds-accent-primary)', marginBottom: '6px' }}>
            {t('api.newKeyWarning', 'Copy this key now — it will not be shown again')}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--ds-text-body)', wordBreak: 'break-all' }}>
            {newKeyValue}
          </div>
          <button onClick={() => { navigator.clipboard.writeText(newKeyValue); setNewKeyValue(''); }} style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--ds-accent-primary)', color: '#FFF', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>
            <Copy size={12} /> {t('api.copy', 'Copy & Close')}
          </button>
        </div>
      )}

      {/* Create key */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--ds-text-muted)', marginBottom: '4px' }}>
            {t('api.keyName', 'Key Name')}
          </label>
          <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="e.g. Zapier Integration" style={{ width: '100%', padding: '10px 14px', fontSize: '13px', borderRadius: '8px', border: '0.5px solid var(--ds-border)', background: 'var(--ds-bg-page)', color: 'var(--ds-text-body)' }} />
        </div>
        <button onClick={createKey} disabled={!newKeyName.trim()} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--ds-accent-primary)', color: '#FFF', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 500, cursor: newKeyName.trim() ? 'pointer' : 'not-allowed', opacity: newKeyName.trim() ? 1 : 0.5 }}>
          <Plus size={14} /> {t('api.createKey', 'Create Key')}
        </button>
      </div>

      {/* Key list */}
      {isLoading ? (
        <div style={{ height: '80px', background: 'var(--ds-bg-card)', borderRadius: '16px', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ) : keys.length === 0 ? (
        <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '2rem', textAlign: 'center' }}>
          <Key size={28} style={{ color: 'var(--ds-text-muted)', marginBottom: '8px' }} />
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>{t('api.noKeys', 'No API keys')}</div>
          <div style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>{t('api.noKeysDesc', 'Create an API key to start using the REST API.')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {keys.map(k => (
            <div key={k.id} style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>{k.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--ds-text-muted)', fontFamily: 'monospace' }}>{k.keyPrefix}•••• · {k.rateLimit} req/hr</div>
              </div>
              <button onClick={() => deleteKey(k.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-muted)', padding: '4px' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
