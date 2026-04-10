'use client';

import { useState } from 'react';
import { useIntl } from 'react-intl';
import { MessageCircle, Check } from 'lucide-react';
import { parseWhatsAppChat } from '@/crm/whatsapp/chatParser';
import type { WhatsAppMessage, ParseResult } from '@/crm/whatsapp/types';

interface WhatsAppImportProps {
  onImport: (messages: WhatsAppMessage[], rawText: string) => void;
  onCancel: () => void;
}

export function WhatsAppImport({ onImport, onCancel }: WhatsAppImportProps) {
  const intl = useIntl();
  const [rawText, setRawText] = useState('');
  const [parseResult, setParsResult] = useState<ParseResult | null>(null);
  const [selectedUser, setSelectedUser] = useState('');

  const t = (key: string, def: string) =>
    intl.formatMessage({ id: key, defaultMessage: def });

  const handleParse = () => {
    if (!rawText.trim()) return;
    const result = parseWhatsAppChat(rawText, selectedUser ? [selectedUser, 'You', 'أنت'] : ['You', 'أنت']);
    setParsResult(result);
    // Auto-select first participant as outbound user if not set
    if (!selectedUser && result.participants.length > 0) {
      setSelectedUser(result.participants.find(p => p === 'You' || p === 'أنت') || '');
    }
  };

  const handleConfirm = () => {
    if (!parseResult) return;
    // Re-parse with selected user for correct isOutbound tagging
    const finalResult = parseWhatsAppChat(rawText, selectedUser ? [selectedUser, 'You', 'أنت'] : ['You', 'أنت']);
    onImport(finalResult.messages, rawText);
  };

  const formatTime = (ts: string) => {
    try {
      return new Intl.DateTimeFormat(intl.locale, { timeStyle: 'short' }).format(new Date(ts));
    } catch { return ''; }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Paste area */}
      {!parseResult && (
        <>
          <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ds-text-muted)' }}>
            {t('crm.whatsapp.paste', 'Paste your WhatsApp chat export here')}
          </label>
          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            rows={10}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '13px',
              border: '1px solid var(--ds-border)',
              borderRadius: '8px',
              background: 'var(--ds-bg-card)',
              color: 'var(--ds-text-body)',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'monospace',
            }}
            placeholder="[1/15/26, 2:30 PM] Mohammed: السلام عليكم..."
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={onCancel} style={{ background: 'transparent', border: '1.5px solid var(--ds-border)', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', color: 'var(--ds-text-body)' }}>
              {t('crm.action.cancel', 'Cancel')}
            </button>
            <button
              onClick={handleParse}
              disabled={!rawText.trim()}
              style={{
                background: rawText.trim() ? 'var(--ds-accent-primary)' : 'var(--ds-text-muted)',
                color: '#FFFFFF', border: 'none', borderRadius: '8px',
                padding: '8px 16px', fontSize: '13px', cursor: rawText.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              {t('crm.whatsapp.parse', 'Parse')}
            </button>
          </div>
        </>
      )}

      {/* Preview */}
      {parseResult && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
              {t('crm.whatsapp.preview', 'Message Preview')}
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--ds-text-muted)' }}>
              {t('crm.whatsapp.messages', '{count} messages').replace('{count}', String(parseResult.messages.length))}
            </span>
          </div>

          {/* Participant selector */}
          {parseResult.participants.length > 0 && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ds-text-muted)', display: 'block', marginBottom: '4px' }}>
                {t('crm.whatsapp.selectUser', 'Which participant is you?')}
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {parseResult.participants.map(p => (
                  <button
                    key={p}
                    onClick={() => setSelectedUser(p)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      border: selectedUser === p ? '2px solid var(--ds-accent-primary)' : '1px solid var(--ds-border)',
                      background: selectedUser === p ? 'var(--ds-bg-tinted)' : 'var(--ds-bg-card)',
                      color: selectedUser === p ? 'var(--ds-accent-primary)' : 'var(--ds-text-body)',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid var(--ds-border)', borderRadius: '8px', padding: '8px' }}>
            {parseResult.messages.slice(0, 50).map((msg, idx) => (
              <div
                key={idx}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  background: msg.sender === selectedUser || msg.sender === 'You' || msg.sender === 'أنت'
                    ? 'var(--ds-bg-tinted)'
                    : 'var(--ds-bg-card)',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 500, color: 'var(--ds-accent-primary)', fontSize: '12px' }}>{msg.sender}</span>
                  <span style={{ fontSize: '11px', color: 'var(--ds-text-muted)' }}>{formatTime(msg.timestamp)}</span>
                </div>
                <div style={{ color: 'var(--ds-text-body)' }}>{msg.message}</div>
              </div>
            ))}
            {parseResult.messages.length > 50 && (
              <div style={{ textAlign: 'center', padding: '8px', fontSize: '12px', color: 'var(--ds-text-muted)' }}>
                +{parseResult.messages.length - 50} more messages
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setParsResult(null); }}
              style={{ background: 'transparent', border: '1.5px solid var(--ds-border)', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', color: 'var(--ds-text-body)' }}
            >
              {t('crm.action.back', 'Back')}
            </button>
            <button
              onClick={handleConfirm}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'var(--ds-accent-primary)', color: '#FFFFFF',
                border: 'none', borderRadius: '8px', padding: '8px 16px',
                fontSize: '13px', cursor: 'pointer',
              }}
            >
              <Check size={14} />
              {t('crm.whatsapp.import', 'Import Messages')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
