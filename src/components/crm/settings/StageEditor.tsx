'use client';

import { useState } from 'react';
import { useIntl } from 'react-intl';
import { GripVertical, Plus, Trash2, Edit2 } from 'lucide-react';
import { useCrm } from '@/store/crmStore';
import { useOrgPermission } from '@/store/orgStore';

export function StageEditor() {
  const intl = useIntl();
  const { dealStages, pipelines, addPipelineStage, updateStage, deleteStage, reorderStages } = useCrm();
  const canConfigure = useOrgPermission('pipeline.configure');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNameAr, setEditNameAr] = useState('');
  const [editColor, setEditColor] = useState('#2D6A4F');
  const [editProb, setEditProb] = useState(0);
  const [showAdd, setShowAdd] = useState(false);

  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  const defaultPipeline = pipelines.find(p => p.isDefault) || pipelines[0];
  const stages = dealStages
    .filter(s => s.pipelineId === defaultPipeline?.id)
    .sort((a, b) => a.position - b.position);

  const handleEdit = (stage: typeof stages[0]) => {
    setEditingId(stage.id);
    setEditName(stage.name);
    setEditNameAr(stage.nameAr || '');
    setEditColor(stage.color);
    setEditProb(stage.probability);
  };

  const handleSave = async () => {
    if (!editingId) return;
    await updateStage(editingId, { name: editName, nameAr: editNameAr || null, color: editColor, probability: editProb });
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!defaultPipeline || !editName.trim()) return;
    await addPipelineStage(defaultPipeline.id, {
      name: editName.trim(),
      nameAr: editNameAr.trim() || undefined,
      position: stages.length + 1,
      color: editColor,
      probability: editProb,
    });
    setShowAdd(false);
    setEditName('');
    setEditNameAr('');
    setEditColor('#2D6A4F');
    setEditProb(0);
  };

  if (!canConfigure) {
    return <p style={{ fontSize: '13px', color: 'var(--ds-text-muted)', textAlign: 'center', padding: '2rem' }}>{t('crm.error.accessDenied', 'Access Denied')}</p>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-heading)' }}>
          {t('crm.pipeline.stageName', 'Pipeline Stages')}
        </h2>
        <button
          onClick={() => { setShowAdd(true); setEditName(''); setEditNameAr(''); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--ds-accent-primary)', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
        >
          <Plus size={14} />
          {t('crm.pipeline.addStage', 'Add Stage')}
        </button>
      </div>

      <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {stages.map((stage, idx) => (
          <div
            key={stage.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 16px',
              borderBottom: idx < stages.length - 1 ? '1px solid var(--ds-border)' : 'none',
            }}
          >
            <GripVertical size={14} style={{ color: 'var(--ds-text-muted)', cursor: 'grab' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: stage.color, flexShrink: 0 }} />

            {editingId === stage.id ? (
              <div style={{ flex: 1, display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input value={editName} onChange={e => setEditName(e.target.value)} style={inputStyle} placeholder="Name" />
                <input value={editNameAr} onChange={e => setEditNameAr(e.target.value)} dir="rtl" style={inputStyle} placeholder="الاسم" />
                <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} style={{ width: '32px', height: '32px', border: 'none', cursor: 'pointer' }} />
                <input type="number" value={editProb} onChange={e => setEditProb(Number(e.target.value))} min={0} max={100} style={{ ...inputStyle, width: '60px' }} />
                <button onClick={handleSave} style={{ background: 'var(--ds-accent-primary)', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>
                  {t('crm.action.save', 'Save')}
                </button>
                <button onClick={() => setEditingId(null)} style={{ background: 'none', border: '1px solid var(--ds-border)', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', color: 'var(--ds-text-body)' }}>
                  {t('crm.action.cancel', 'Cancel')}
                </button>
              </div>
            ) : (
              <>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>{stage.name}</span>
                  {stage.nameAr && <span style={{ marginInlineStart: '8px', fontSize: '13px', color: 'var(--ds-text-muted)' }}>{stage.nameAr}</span>}
                </div>
                <span style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>{stage.probability}%</span>
                <button onClick={() => handleEdit(stage)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-muted)', padding: '4px' }}>
                  <Edit2 size={14} />
                </button>
                {!stage.isWon && !stage.isLost && (
                  <button onClick={() => deleteStage(stage.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '4px' }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </>
            )}
          </div>
        ))}

        {/* Add new stage row */}
        {showAdd && (
          <div style={{ display: 'flex', gap: '8px', padding: '14px 16px', borderTop: '1px solid var(--ds-border)', flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={editName} onChange={e => setEditName(e.target.value)} style={inputStyle} placeholder="Stage name" />
            <input value={editNameAr} onChange={e => setEditNameAr(e.target.value)} dir="rtl" style={inputStyle} placeholder="اسم المرحلة" />
            <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} style={{ width: '32px', height: '32px', border: 'none', cursor: 'pointer' }} />
            <button onClick={handleAdd} disabled={!editName.trim()} style={{ background: 'var(--ds-accent-primary)', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>
              {t('crm.action.create', 'Create')}
            </button>
            <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: '1px solid var(--ds-border)', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', color: 'var(--ds-text-body)' }}>
              {t('crm.action.cancel', 'Cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { padding: '6px 10px', fontSize: '13px', border: '1px solid var(--ds-border)', borderRadius: '6px', background: 'var(--ds-bg-card)', color: 'var(--ds-text-body)', outline: 'none', width: '120px' };
