'use client';

import { useState, useCallback } from 'react';
import { useIntl } from 'react-intl';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { detectSource, autoMapFields, type ImportSource, type FieldMapping } from '@/crm/migration/fieldMapper';
import { SALESFORCE_CONTACT_MAP } from '@/crm/migration/salesforceMapper';
import { HUBSPOT_CONTACT_MAP } from '@/crm/migration/hubspotMapper';
import { parseCsv, readFileAsText, type CsvParseResult } from '@/crm/migration/csvParser';
import { useCrm } from '@/store/crmStore';
import { useOrgPermission } from '@/store/orgStore';
import { FieldMappingUI } from './FieldMappingUI';
import { ImportPreview } from './ImportPreview';
import { ImportProgress } from './ImportProgress';
import type { CreateContactInput } from '@/types/crm';

type WizardStep = 'source' | 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

export function MigrationWizard() {
  const intl = useIntl();
  const { addContact, contacts } = useCrm();
  const canImport = useOrgPermission('import.execute');

  const [step, setStep] = useState<WizardStep>('source');
  const [source, setSource] = useState<ImportSource>('generic');
  const [csvData, setCsvData] = useState<CsvParseResult | null>(null);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [fileName, setFileName] = useState('');
  const [importStats, setImportStats] = useState({ imported: 0, skipped: 0, errors: 0, total: 0 });
  const [isImporting, setIsImporting] = useState(false);

  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  const handleFileUpload = useCallback(async (file: File) => {
    setFileName(file.name);
    const text = await readFileAsText(file);
    const parsed = parseCsv(text);
    setCsvData(parsed);

    // Auto-detect source and map fields
    const detected = detectSource(parsed.headers);
    setSource(detected);

    const baseMap = detected === 'salesforce' ? SALESFORCE_CONTACT_MAP
      : detected === 'hubspot' ? HUBSPOT_CONTACT_MAP
      : {};
    const mapped = autoMapFields(parsed.headers, baseMap);
    setFieldMapping(mapped);
    setStep('mapping');
  }, []);

  const handleImport = useCallback(async () => {
    if (!csvData) return;
    setStep('importing');
    setIsImporting(true);

    const stats = { imported: 0, skipped: 0, errors: 0, total: csvData.rows.length };

    for (let i = 0; i < csvData.rows.length; i++) {
      const row = csvData.rows[i];
      try {
        const contact: Partial<CreateContactInput> = {};

        for (const [sourceCol, targetField] of Object.entries(fieldMapping)) {
          if (!targetField || !row[sourceCol]) continue;
          const value = row[sourceCol].trim();
          if (!value) continue;

          switch (targetField) {
            case 'first_name': contact.firstName = value; break;
            case 'last_name': contact.lastName = value; break;
            case 'email': contact.email = value; break;
            case 'phone': contact.phone = value; break;
            case 'phone_secondary': contact.phoneSecondary = value; break;
            case 'job_title': contact.jobTitle = value; break;
            case 'department': contact.department = value; break;
            case 'notes': contact.notes = value; break;
            case 'source': contact.source = value as CreateContactInput['source']; break;
          }
        }

        if (!contact.firstName) {
          stats.skipped++;
          continue;
        }

        contact.source = source === 'salesforce' ? 'migration_salesforce'
          : source === 'hubspot' ? 'migration_hubspot'
          : 'import';

        const result = await addContact(contact as CreateContactInput);
        if (result) stats.imported++;
        else stats.errors++;
      } catch {
        stats.errors++;
      }

      setImportStats({ ...stats, total: csvData.rows.length });
    }

    setIsImporting(false);
    setImportStats(stats);
    setStep('complete');
  }, [csvData, fieldMapping, source, addContact]);

  if (!canImport) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ fontSize: '15px', color: 'var(--ds-text-heading)' }}>{t('crm.error.accessDenied', 'Access Denied')}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ds-text-heading)', marginBottom: '4px', fontFeatureSettings: '"kern" 1' }}>
        {t('crm.nav.import', 'Import Data')}
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginBottom: '1.5rem' }}>
        {t('crm.import.subtitle', 'استيراد البيانات')}
      </p>

      {/* Step 1: Source selection */}
      {step === 'source' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {(['salesforce', 'hubspot', 'generic'] as ImportSource[]).map(s => (
            <button
              key={s}
              onClick={() => { setSource(s); setStep('upload'); }}
              style={{
                background: 'var(--ds-bg-card)',
                border: '0.5px solid var(--ds-border)',
                borderRadius: '16px',
                padding: '24px 20px',
                cursor: 'pointer',
                textAlign: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'border-color 150ms ease',
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)', marginBottom: '4px' }}>
                {t(`crm.import.${s === 'generic' ? 'csv' : s}`, s)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>
                {s === 'generic' ? 'CSV' : s === 'salesforce' ? 'Salesforce CSV Export' : 'HubSpot CSV Export'}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Upload */}
      {step === 'upload' && (
        <div
          style={{
            background: 'var(--ds-bg-card)', border: '2px dashed var(--ds-border)',
            borderRadius: '16px', padding: '3rem', textAlign: 'center',
          }}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--ds-accent-primary)'; }}
          onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--ds-border)'; }}
          onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--ds-border)'; const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
        >
          <Upload size={32} style={{ color: 'var(--ds-text-muted)', margin: '0 auto 1rem' }} />
          <p style={{ fontSize: '14px', color: 'var(--ds-text-body)', marginBottom: '0.5rem' }}>
            {t('crm.import.dragDrop', 'Drag and drop your CSV file here')}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', marginBottom: '1rem' }}>
            {t('crm.import.orBrowse', 'or browse files')}
          </p>
          <label style={{ display: 'inline-block', background: 'var(--ds-accent-primary)', color: '#FFFFFF', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
            {t('crm.import.uploadFile', 'Upload File')}
            <input type="file" accept=".csv" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} style={{ display: 'none' }} />
          </label>
          {fileName && <p style={{ marginTop: '1rem', fontSize: '13px', color: 'var(--ds-accent-primary)' }}>{fileName}</p>}
        </div>
      )}

      {/* Step 3: Field mapping */}
      {step === 'mapping' && csvData && (
        <div>
          <FieldMappingUI
            headers={csvData.headers}
            mapping={fieldMapping}
            onChange={setFieldMapping}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button onClick={() => setStep('upload')} style={secondaryBtnStyle}>{t('crm.import.back', 'Back')}</button>
            <button onClick={() => setStep('preview')} style={primaryBtnStyle}>{t('crm.import.next', 'Next')}</button>
          </div>
        </div>
      )}

      {/* Step 4: Preview */}
      {step === 'preview' && csvData && (
        <div>
          <ImportPreview rows={csvData.rows.slice(0, 10)} mapping={fieldMapping} />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button onClick={() => setStep('mapping')} style={secondaryBtnStyle}>{t('crm.import.back', 'Back')}</button>
            <button onClick={handleImport} style={primaryBtnStyle}>{t('crm.import.startImport', 'Start Import')}</button>
          </div>
        </div>
      )}

      {/* Step 5: Progress */}
      {step === 'importing' && (
        <ImportProgress current={importStats.imported + importStats.skipped + importStats.errors} total={importStats.total} />
      )}

      {/* Step 6: Complete */}
      {step === 'complete' && (
        <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '2rem', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <CheckCircle size={40} style={{ color: 'var(--ds-accent-primary)', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)', marginBottom: '1rem' }}>
            {t('crm.import.complete', 'Import Complete')}
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1.5rem' }}>
            <Stat label={t('crm.import.imported', 'Imported')} value={importStats.imported} color="var(--ds-accent-primary)" />
            <Stat label={t('crm.import.skipped', 'Skipped')} value={importStats.skipped} color="#F59E0B" />
            <Stat label={t('crm.import.errors', 'Errors')} value={importStats.errors} color="#EF4444" />
          </div>
          <button onClick={() => window.location.href = '/crm/contacts'} style={primaryBtnStyle}>
            {t('crm.import.viewContacts', 'View Contacts')}
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ fontSize: '24px', fontWeight: 600, color }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>{label}</div>
    </div>
  );
}

const primaryBtnStyle: React.CSSProperties = { background: 'var(--ds-accent-primary)', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' };
const secondaryBtnStyle: React.CSSProperties = { background: 'transparent', border: '1.5px solid #86EFAC', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 500, color: 'var(--ds-accent-primary)', cursor: 'pointer' };
