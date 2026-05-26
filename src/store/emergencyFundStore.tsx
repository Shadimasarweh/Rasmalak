'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore, getAuthState } from '@/store/authStore';
import { useStore } from '@/store/useStore';

export type EFFrequency = 'monthly' | 'biweekly';

export interface EmergencyFund {
  id: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  // Replenishment cadence per "Emergency funds and Savings Goals.docx".
  // 'monthly' uses monthlyContribution as-is; 'biweekly' uses
  // monthlyContribution as the BI-WEEKLY amount (we store the chosen
  // cadence value and convert at display time so a single column
  // serves both cadences — see convertCadence in lib/emergencyFund/baseline).
  frequency: EFFrequency;
  // Anchor date for bi-weekly cycles so they line up with the
  // user's pay schedule. Null when frequency is 'monthly'.
  frequencyAnchorDate: string | null;
  // ISO 4217 currency the user typed the target in. Display layer
  // converts to base when comparing against transactions.
  currencyNative: string;
  createdAt: string;
  updatedAt: string;
}

export interface FundDeposit {
  id: string;
  fundId: string;
  amount: number;
  note: string;
  createdAt: string;
}

interface EmergencyFundStore {
  fund: EmergencyFund | null;
  deposits: FundDeposit[];
  loading: boolean;
  createFund: (targetAmount: number) => Promise<void>;
  updateTarget: (targetAmount: number) => Promise<void>;
  setMonthlyContribution: (amount: number) => Promise<void>;
  setFrequency: (frequency: EFFrequency, anchorDate?: string | null) => Promise<void>;
  addDeposit: (amount: number, note?: string) => Promise<void>;
  deleteDeposit: (depositId: string) => Promise<void>;
}

const EmergencyFundContext = createContext<EmergencyFundStore | null>(null);

export function EmergencyFundProvider({ children }: { children: ReactNode }) {
  const [fund, setFund] = useState<EmergencyFund | null>(null);
  const [deposits, setDeposits] = useState<FundDeposit[]>([]);
  const [loading, setLoading] = useState(true);

  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const baseCurrency = useStore((s) => s.baseCurrency);

  useEffect(() => {
    const fetchFund = async () => {
      if (!initialized || !user) {
        setFund(null);
        setDeposits([]);
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setFund(null);
        setDeposits([]);
        setLoading(false);
        return;
      }

      const uid = sessionData.session.user.id;

      const { data: fundData, error: fundErr } = await supabase
        .from('emergency_funds')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();

      if (fundErr) {
        console.error('[EmergencyFundStore] Error fetching fund:', fundErr.message);
        setLoading(false);
        return;
      }

      if (fundData) {
        setFund({
          id: fundData.id,
          targetAmount: Number(fundData.target_amount),
          currentAmount: Number(fundData.current_amount),
          monthlyContribution: Number(fundData.monthly_contribution ?? 0),
          frequency: ((fundData.frequency as EFFrequency | undefined) ?? 'monthly'),
          frequencyAnchorDate: (fundData.frequency_anchor_date as string | null | undefined) ?? null,
          currencyNative: (fundData.currency_native as string | undefined) ?? baseCurrency,
          createdAt: fundData.created_at,
          updatedAt: fundData.updated_at,
        });

        const { data: depData, error: depErr } = await supabase
          .from('emergency_fund_deposits')
          .select('*')
          .eq('fund_id', fundData.id)
          .order('created_at', { ascending: false });

        if (depErr) {
          console.error('[EmergencyFundStore] Error fetching deposits:', depErr.message);
        } else if (depData) {
          setDeposits(depData.map(d => ({
            id: d.id,
            fundId: d.fund_id,
            amount: Number(d.amount),
            note: d.note || '',
            createdAt: d.created_at,
          })));
        }
      } else {
        setFund(null);
        setDeposits([]);
      }

      setLoading(false);
    };

    fetchFund();
  }, [user, initialized, baseCurrency]);

  const createFund = useCallback(async (targetAmount: number) => {
    const { user, initialized } = getAuthState();
    if (!initialized || !user) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id || user.id;

    const { data, error } = await supabase
      .from('emergency_funds')
      .insert({
        user_id: uid,
        target_amount: targetAmount,
        current_amount: 0,
        currency_native: baseCurrency,
      })
      .select()
      .single();

    if (error) {
      console.error('[EmergencyFundStore] Error creating fund:', error.message);
      return;
    }

    if (data) {
      setFund({
        id: data.id,
        targetAmount: Number(data.target_amount),
        currentAmount: Number(data.current_amount),
        monthlyContribution: Number(data.monthly_contribution ?? 0),
        frequency: ((data.frequency as EFFrequency | undefined) ?? 'monthly'),
        frequencyAnchorDate: (data.frequency_anchor_date as string | null | undefined) ?? null,
        currencyNative: (data.currency_native as string | undefined) ?? baseCurrency,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      });
    }
  }, [baseCurrency]);

  const updateTarget = useCallback(async (targetAmount: number) => {
    if (!fund) return;

    const { error } = await supabase
      .from('emergency_funds')
      .update({ target_amount: targetAmount, updated_at: new Date().toISOString() })
      .eq('id', fund.id);

    if (error) {
      console.error('[EmergencyFundStore] Error updating target:', error.message);
      return;
    }

    setFund(prev => prev ? { ...prev, targetAmount, updatedAt: new Date().toISOString() } : null);
  }, [fund]);

  const setMonthlyContribution = useCallback(async (amount: number) => {
    if (!fund) return;

    const { error } = await supabase
      .from('emergency_funds')
      .update({ monthly_contribution: amount, updated_at: new Date().toISOString() })
      .eq('id', fund.id);

    if (error) {
      console.error('[EmergencyFundStore] Error updating monthly contribution:', error.message);
      return;
    }

    setFund(prev => prev ? { ...prev, monthlyContribution: amount, updatedAt: new Date().toISOString() } : null);
  }, [fund]);

  const setFrequency = useCallback(async (frequency: EFFrequency, anchorDate?: string | null) => {
    if (!fund) return;
    // Bi-weekly always needs an anchor date so cycle math is
    // deterministic. Default to today when the caller didn't supply one.
    const finalAnchor = frequency === 'biweekly'
      ? (anchorDate ?? new Date().toISOString().slice(0, 10))
      : null;
    const { error } = await supabase
      .from('emergency_funds')
      .update({
        frequency,
        frequency_anchor_date: finalAnchor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fund.id);
    if (error) {
      console.error('[EmergencyFundStore] Error updating frequency:', error.message);
      return;
    }
    setFund(prev => prev ? {
      ...prev,
      frequency,
      frequencyAnchorDate: finalAnchor,
      updatedAt: new Date().toISOString(),
    } : null);
  }, [fund]);

  const addDeposit = useCallback(async (amount: number, note?: string) => {
    if (!fund) return;
    const { user, initialized } = getAuthState();
    if (!initialized || !user) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id || user.id;

    const newAmount = fund.currentAmount + amount;

    const { data: depData, error: depErr } = await supabase
      .from('emergency_fund_deposits')
      .insert({ fund_id: fund.id, user_id: uid, amount, note: note || null })
      .select()
      .single();

    if (depErr) {
      console.error('[EmergencyFundStore] Error adding deposit:', depErr.message);
      return;
    }

    const { error: fundErr } = await supabase
      .from('emergency_funds')
      .update({ current_amount: newAmount, updated_at: new Date().toISOString() })
      .eq('id', fund.id);

    if (fundErr) {
      console.error('[EmergencyFundStore] Error updating fund balance:', fundErr.message);
      return;
    }

    setFund(prev => prev ? { ...prev, currentAmount: newAmount, updatedAt: new Date().toISOString() } : null);

    if (depData) {
      setDeposits(prev => [{
        id: depData.id,
        fundId: depData.fund_id,
        amount: Number(depData.amount),
        note: depData.note || '',
        createdAt: depData.created_at,
      }, ...prev]);
    }
  }, [fund]);

  const deleteDeposit = useCallback(async (depositId: string) => {
    if (!fund) return;

    const deposit = deposits.find(d => d.id === depositId);
    if (!deposit) return;

    const { error: depErr } = await supabase
      .from('emergency_fund_deposits')
      .delete()
      .eq('id', depositId);

    if (depErr) {
      console.error('[EmergencyFundStore] Error deleting deposit:', depErr.message);
      return;
    }

    const newAmount = fund.currentAmount - deposit.amount;

    const { error: fundErr } = await supabase
      .from('emergency_funds')
      .update({ current_amount: newAmount, updated_at: new Date().toISOString() })
      .eq('id', fund.id);

    if (fundErr) {
      console.error('[EmergencyFundStore] Error updating fund after delete:', fundErr.message);
    }

    setFund(prev => prev ? { ...prev, currentAmount: newAmount, updatedAt: new Date().toISOString() } : null);
    setDeposits(prev => prev.filter(d => d.id !== depositId));
  }, [fund, deposits]);

  const store: EmergencyFundStore = {
    fund,
    deposits,
    loading,
    createFund,
    updateTarget,
    setMonthlyContribution,
    setFrequency,
    addDeposit,
    deleteDeposit,
  };

  return (
    <EmergencyFundContext.Provider value={store}>{children}</EmergencyFundContext.Provider>
  );
}

export function useEmergencyFund(): EmergencyFundStore {
  const context = useContext(EmergencyFundContext);
  if (!context) {
    throw new Error('useEmergencyFund must be used within an EmergencyFundProvider');
  }
  return context;
}
