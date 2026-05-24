'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useStore } from '@/store/useStore';
import { getProfile, initializeProfile } from '@/lib/profile';

/**
 * One-shot bootstrap that runs on dashboard mount.
 *
 * Ensures the user has a `profiles` row with `base_currency` set.
 * For onboarding users this is a no-op (onboarding already wrote
 * the row). For pre-migration / pre-onboarding users it backfills
 * the row using the persisted Zustand `baseCurrency` so the rest
 * of the app's analytics layer has a deterministic base from the
 * very first render.
 *
 * Lives in the dashboard layout so it runs after auth is ready and
 * doesn't interfere with login / onboarding flows.
 */

export default function CurrencyBootstrap() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const baseCurrency = useStore((s) => s.baseCurrency);
  const country = useStore((s) => s.country);
  const setBaseCurrency = useStore((s) => s.setBaseCurrency);
  const setCountry = useStore((s) => s.setCountry);

  useEffect(() => {
    if (!initialized || !user) return;
    let cancelled = false;
    (async () => {
      const profile = await getProfile(user.id);
      if (cancelled) return;
      if (profile) {
        // Sync server -> client. setBaseCurrency mirrors to currency too.
        if (profile.baseCurrency && profile.baseCurrency !== baseCurrency) {
          setBaseCurrency(profile.baseCurrency);
        }
        if (profile.country && profile.country !== country) {
          setCountry(profile.country);
        }
      } else {
        // No row yet: write the persisted base currency so the FX
        // refresh job sees this user the next time it runs. Country
        // stays null until the user goes through onboarding.
        await initializeProfile(user.id, country ?? '', baseCurrency || 'SAR');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, initialized, baseCurrency, country, setBaseCurrency, setCountry]);

  return null;
}
