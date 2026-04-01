'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore, getAuthState } from '@/store/authStore';

export interface EmergencyFund {
  id: string;
  targetAmount: number;
  currentAmount: number;
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
  }, [user, initialized]);

  const createFund = useCallback(async (targetAmount: number) => {
    const { user, initialized } = getAuthState();
    if (!initialized || !user) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id || user.id;

    const { data, error } = await supabase
      .from('emergency_funds')
      .insert({ user_id: uid, target_amount: targetAmount, current_amount: 0 })
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
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      });
    }
  }, []);

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
