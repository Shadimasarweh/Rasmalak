'use client';

import { useIntl } from 'react-intl';
import type { ActionType } from '@/types/crm';

interface ActionConfiguratorProps {
  actionType: ActionType;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

/** Renders a config form for the given action type */
export function ActionConfigurator({ actionType, config, onChange }: ActionConfiguratorProps) {
  const intl = useIntl();
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  const set = (key: string, value: unknown) => onChange({ ...config, [key]: value });

  const inputStyle = {
    width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px',
    border: '0.5px solid var(--ds-border)', background: 'var(--ds-bg-page)', color: 'var(--ds-text-body)',
  };

  const labelStyle = {
    display: 'block' as const, fontSize: '12px', color: 'var(--ds-text-muted)', marginBottom: '4px',
  };

  switch (actionType) {
    case 'create_task':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div>
            <label style={labelStyle}>{t('automation.action.config.taskTitle', 'Task Title')}</label>
            <input style={inputStyle} value={config.title as string ?? ''} onChange={e => set('title', e.target.value)} placeholder="Follow up with {{name}}" />
          </div>
          <div>
            <label style={labelStyle}>{t('automation.action.config.taskDescription', 'Description')}</label>
            <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={config.description as string ?? ''} onChange={e => set('description', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t('automation.action.config.dueInDays', 'Due In (Days)')}</label>
              <input style={inputStyle} type="number" value={config.dueInDays as number ?? ''} onChange={e => set('dueInDays', Number(e.target.value))} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t('automation.action.config.priority', 'Priority')}</label>
              <select style={inputStyle} value={config.priority as string ?? 'medium'} onChange={e => set('priority', e.target.value)}>
                <option value="low">{t('automation.action.config.priority.low', 'Low')}</option>
                <option value="medium">{t('automation.action.config.priority.medium', 'Medium')}</option>
                <option value="high">{t('automation.action.config.priority.high', 'High')}</option>
              </select>
            </div>
          </div>
        </div>
      );

    case 'send_notification':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div>
            <label style={labelStyle}>{t('automation.action.config.notifyTitle', 'Title')}</label>
            <input style={inputStyle} value={config.title as string ?? ''} onChange={e => set('title', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>{t('automation.action.config.notifyBody', 'Body')}</label>
            <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={config.body as string ?? ''} onChange={e => set('body', e.target.value)} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '13px', color: 'var(--ds-text-body)' }}>
            <input type="checkbox" checked={config.assignee as boolean ?? false} onChange={e => set('assignee', e.target.checked)} />
            {t('automation.action.config.notifyAssignee', 'Notify assigned user')}
          </label>
        </div>
      );

    case 'move_deal_stage':
      return (
        <div>
          <label style={labelStyle}>{t('automation.action.config.stageId', 'Target Stage')}</label>
          <input style={inputStyle} value={config.stageId as string ?? ''} onChange={e => set('stageId', e.target.value)} placeholder="Stage ID" />
        </div>
      );

    case 'add_tag':
    case 'remove_tag':
      return (
        <div>
          <label style={labelStyle}>{t('automation.action.config.tag', 'Tag Name')}</label>
          <input style={inputStyle} value={config.tag as string ?? ''} onChange={e => set('tag', e.target.value)} />
        </div>
      );

    case 'update_field':
      return (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>{t('automation.action.config.field', 'Field')}</label>
            <input style={inputStyle} value={config.field as string ?? ''} onChange={e => set('field', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>{t('automation.action.config.fieldValue', 'Value')}</label>
            <input style={inputStyle} value={String(config.value ?? '')} onChange={e => set('value', e.target.value)} />
          </div>
        </div>
      );

    case 'send_email':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div>
            <label style={labelStyle}>{t('automation.action.config.emailSubject', 'Subject')}</label>
            <input style={inputStyle} value={config.subject as string ?? ''} onChange={e => set('subject', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>{t('automation.action.config.emailBody', 'Body')}</label>
            <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={config.body as string ?? ''} onChange={e => set('body', e.target.value)} />
          </div>
        </div>
      );

    case 'send_whatsapp':
      return (
        <div>
          <label style={labelStyle}>{t('automation.action.config.waTemplate', 'WhatsApp Template')}</label>
          <input style={inputStyle} value={config.templateName as string ?? ''} onChange={e => set('templateName', e.target.value)} />
        </div>
      );

    case 'send_slack':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div>
            <label style={labelStyle}>{t('automation.action.config.slackChannel', 'Channel')}</label>
            <input style={inputStyle} value={config.channelId as string ?? ''} onChange={e => set('channelId', e.target.value)} placeholder="C0XXXXXXXXX" />
          </div>
          <div>
            <label style={labelStyle}>{t('automation.action.config.slackMessage', 'Message')}</label>
            <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={config.message as string ?? ''} onChange={e => set('message', e.target.value)} />
          </div>
        </div>
      );

    case 'assign_to':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div>
            <label style={labelStyle}>{t('automation.action.config.userId', 'User')}</label>
            <input style={inputStyle} value={config.userId as string ?? ''} onChange={e => set('userId', e.target.value)} placeholder="User ID or leave empty for round robin" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '13px', color: 'var(--ds-text-body)' }}>
            <input type="checkbox" checked={config.method === 'round_robin'} onChange={e => set('method', e.target.checked ? 'round_robin' : 'direct')} />
            {t('automation.action.config.roundRobin', 'Round Robin')}
          </label>
        </div>
      );

    case 'wait':
      return (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>{t('automation.action.config.waitDays', 'Days')}</label>
            <input style={inputStyle} type="number" value={config.days as number ?? ''} onChange={e => set('days', Number(e.target.value))} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>{t('automation.action.config.waitHours', 'Hours')}</label>
            <input style={inputStyle} type="number" value={config.hours as number ?? ''} onChange={e => set('hours', Number(e.target.value))} />
          </div>
        </div>
      );

    case 'webhook':
      return (
        <div>
          <label style={labelStyle}>{t('automation.action.config.webhookUrl', 'URL')}</label>
          <input style={inputStyle} value={config.url as string ?? ''} onChange={e => set('url', e.target.value)} placeholder="https://..." />
        </div>
      );

    default:
      return null;
  }
}
