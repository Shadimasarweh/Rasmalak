'use client';

import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { Users, Plus } from 'lucide-react';
import { useBilling } from '@/store/billingStore';
import { checkSeatAvailability, type SeatStatus } from '@/middleware/planGate';
import { useOrg } from '@/store/orgStore';

export function SeatManager() {
  const intl = useIntl();
  const { subscription, addSeat } = useBilling();
  const { currentOrg } = useOrg();
  const [seatStatus, setSeatStatus] = useState<SeatStatus | null>(null);
  const [adding, setAdding] = useState(false);
  const t = (key: string, def: string) => intl.formatMessage({ id: key, defaultMessage: def });

  useEffect(() => {
    if (!currentOrg) return;
    checkSeatAvailability(currentOrg.id).then(setSeatStatus);
  }, [currentOrg, subscription]);

  if (!seatStatus || !subscription) return null;

  const usedPercent = seatStatus.max > 0 ? Math.round((seatStatus.current / seatStatus.max) * 100) : 0;

  const handleAddSeat = async () => {
    setAdding(true);
    await addSeat();
    if (currentOrg) {
      const updated = await checkSeatAvailability(currentOrg.id);
      setSeatStatus(updated);
    }
    setAdding(false);
  };

  return (
    <div style={{ background: 'var(--ds-bg-card)', border: '0.5px solid var(--ds-border)', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Users size={18} style={{ color: 'var(--ds-accent-primary)' }} />
        <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ds-text-heading)' }}>
          {t('billing.seat.title', 'Team Seats')}
        </h3>
      </div>

      {/* Progress bar */}
      <div style={{ background: 'var(--ds-border)', borderRadius: '8px', height: '8px', marginBottom: '12px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(usedPercent, 100)}%`, height: '100%', background: usedPercent > 90 ? '#EF4444' : 'var(--ds-accent-primary)', borderRadius: '8px', transition: 'width 300ms ease' }} />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <StatItem label={t('billing.seat.used', 'Used')} value={seatStatus.current} />
        <StatItem label={t('billing.seat.included', 'Included')} value={seatStatus.included} />
        <StatItem label={t('billing.seat.purchased', 'Add-on')} value={seatStatus.purchased} />
        <StatItem label={t('billing.seat.max', 'Max')} value={seatStatus.max} />
      </div>

      {/* Add seat button */}
      {seatStatus.canPurchaseAddon && (
        <button
          onClick={handleAddSeat}
          disabled={adding}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--ds-accent-primary)', color: '#FFFFFF',
            border: 'none', borderRadius: '8px', padding: '9px 18px',
            fontSize: '13px', fontWeight: 500,
            cursor: adding ? 'not-allowed' : 'pointer',
          }}
        >
          <Plus size={14} />
          {adding ? '...' : t('billing.seat.addSeat', 'Add Seat')}
        </button>
      )}

      {seatStatus.mustUpgrade && (
        <p style={{ fontSize: '13px', color: '#EF4444', marginTop: '8px' }}>
          {t('billing.seat.upgradeRequired', 'Upgrade required for more seats')}
        </p>
      )}
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ds-text-heading)' }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--ds-text-muted)' }}>{label}</div>
    </div>
  );
}
