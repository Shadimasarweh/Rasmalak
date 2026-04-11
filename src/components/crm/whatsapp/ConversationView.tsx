'use client';

import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { supabase } from '@/lib/supabaseClient';
import { sendTextMessage, sendTemplateMessage } from '@/integrations/adapters/whatsappBusiness';
import { Send, Clock, MessageCircle } from 'lucide-react';

interface ConversationViewProps {
  contactId: string;
  contactPhone: string;
  orgId: string;
  accountId: string;
}

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  createdAt: string;
}

export function ConversationView({ contactId, contactPhone, orgId, accountId }: ConversationViewProps) {
  const intl = useIntl();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [windowOpen, setWindowOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMessages();
    checkWindow();
  }, [contactId]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('crm_communications')
        .select('id, direction, body, created_at')
        .eq('org_id', orgId)
        .eq('contact_id', contactId)
        .eq('type', 'whatsapp')
        .order('created_at', { ascending: true })
        .limit(100);

      if (data) {
        setMessages(data.map(m => ({
          id: m.id, direction: m.direction as 'inbound' | 'outbound',
          body: m.body ?? '', createdAt: m.created_at,
        })));
      }
    } catch (err) {
      console.warn('[ConversationView] Error loading:', err);
    }
    setIsLoading(false);
  };

  const checkWindow = async () => {
    try {
      const { data } = await supabase
        .from('whatsapp_conversations')
        .select('window_expires')
        .eq('account_id', accountId)
        .eq('contact_phone', contactPhone)
        .eq('status', 'active')
        .single();

      setWindowOpen(!!data?.window_expires && new Date(data.window_expires) > new Date());
    } catch {
      setWindowOpen(false);
    }
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);

    try {
      if (windowOpen) {
        await sendTextMessage({ accountId, to: contactPhone, text: text.trim() });
      } else {
        // Outside window — would need template. Show message.
        console.warn('[ConversationView] 24h window closed — need template');
        setSending(false);
        return;
      }

      // Log locally
      await supabase.from('crm_communications').insert({
        org_id: orgId,
        contact_id: contactId,
        type: 'whatsapp',
        direction: 'outbound',
        body: text.trim(),
        source: 'manual',
      });

      setText('');
      await loadMessages();
    } catch (err) {
      console.warn('[ConversationView] Send error:', err);
    }

    setSending(false);
  };

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ds-text-muted)' }}>
        {t('whatsapp.loading', 'Loading conversation...')}
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px',
      display: 'flex', flexDirection: 'column', height: '400px', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '0.5px solid var(--ds-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageCircle size={16} color="var(--ds-accent-primary)" />
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
            {t('whatsapp.conversation', 'WhatsApp')}
          </span>
        </div>
        {windowOpen ? (
          <span style={{ fontSize: '11px', color: 'var(--ds-accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} /> {t('whatsapp.windowOpen', '24h window open')}
          </span>
        ) : (
          <span style={{ fontSize: '11px', color: 'var(--ds-text-muted)' }}>
            {t('whatsapp.windowClosed', 'Use template to start')}
          </span>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--ds-text-muted)', fontSize: '13px', paddingTop: '3rem' }}>
            {t('whatsapp.noMessages', 'No messages yet')}
          </div>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              alignSelf: msg.direction === 'outbound' ? 'flex-end' : 'flex-start',
              maxWidth: '75%', padding: '8px 12px', borderRadius: '12px',
              background: msg.direction === 'outbound' ? 'var(--ds-accent-primary)' : 'var(--ds-bg-page)',
              color: msg.direction === 'outbound' ? '#FFFFFF' : 'var(--ds-text-body)',
              fontSize: '13px', lineHeight: 1.5,
            }}
          >
            {msg.body}
            <div style={{
              fontSize: '10px', marginTop: '4px',
              color: msg.direction === 'outbound' ? 'rgba(255,255,255,0.7)' : 'var(--ds-text-muted)',
              textAlign: 'end',
            }}>
              {new Date(msg.createdAt).toLocaleTimeString(intl.locale, { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '8px 12px', borderTop: '0.5px solid var(--ds-border)', display: 'flex', gap: '8px' }}>
        <input
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={windowOpen
            ? t('whatsapp.typePlaceholder', 'Type a message...')
            : t('whatsapp.templateOnly', 'Send a template to start')
          }
          disabled={!windowOpen}
          style={{
            flex: 1, padding: '8px 12px', fontSize: '13px', borderRadius: '8px',
            border: '0.5px solid var(--ds-border)', background: 'var(--ds-bg-page)',
            color: 'var(--ds-text-body)',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!windowOpen || !text.trim() || sending}
          style={{
            background: 'var(--ds-accent-primary)', color: '#FFFFFF', border: 'none',
            borderRadius: '8px', padding: '8px 12px', cursor: windowOpen ? 'pointer' : 'not-allowed',
            opacity: windowOpen && text.trim() ? 1 : 0.5,
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
