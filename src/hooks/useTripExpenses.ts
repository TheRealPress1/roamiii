import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TripExpense, ExpenseCategory, TripMember, Profile } from '@/lib/tripchat-types';
import { useAuth } from '@/contexts/AuthContext';
import {
  calculateSettlements,
  calculateTotalExpenses,
  calculateExpensesByCategory,
  getUserBalance,
} from '@/lib/expense-utils';

interface UseTripExpensesResult {
  expenses: TripExpense[];
  loading: boolean;
  error: string | null;
  totalExpenses: number;
  userBalance: number;
  expensesByCategory: Map<string, number>;
  settlements: ReturnType<typeof calculateSettlements>;
  addExpense: (data: {
    amount: number;
    description: string;
    category: ExpenseCategory;
    splitUserIds: string[];
    expenseDate?: string;
  }) => Promise<{ error: Error | null }>;
  deleteExpense: (expenseId: string) => Promise<{ error: Error | null }>;
  settleWithUser: (toUserId: string) => Promise<{ error: Error | null }>;
  refetch: () => Promise<void>;
}

export function useTripExpenses(
  tripId: string,
  members: TripMember[] = []
): UseTripExpensesResult {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Build profile map from members
  const profileMap = useMemo(() => {
    const map = new Map<string, Profile>();
    members.forEach(m => {
      if (m.profile) {
        map.set(m.user_id, m.profile);
      }
    });
    return map;
  }, [members]);

  const expenseSelectQuery = `
    *,
    payer:profiles!trip_expenses_paid_by_fkey(*),
    splits:expense_splits(*, user:profiles!expense_splits_user_id_fkey(*))
  `;

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('trip_expenses')
        .select(expenseSelectQuery)
        .eq('trip_id', tripId)
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setExpenses(data as unknown as TripExpense[]);
    } catch (err) {
      console.error('[useTripExpenses] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchExpenses();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`trip-expenses-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_expenses',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          fetchExpenses();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expense_splits',
        },
        () => {
          fetchExpenses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, fetchExpenses]);

  // Calculate derived values
  const totalExpenses = useMemo(
    () => calculateTotalExpenses(expenses),
    [expenses]
  );

  const userBalance = useMemo(
    () => (user ? getUserBalance(user.id, expenses) : 0),
    [user, expenses]
  );

  const expensesByCategory = useMemo(
    () => calculateExpensesByCategory(expenses),
    [expenses]
  );

  const settlements = useMemo(
    () => calculateSettlements(expenses, profileMap),
    [expenses, profileMap]
  );

  const addExpense = async (data: {
    amount: number;
    description: string;
    category: ExpenseCategory;
    splitUserIds: string[];
    expenseDate?: string;
  }): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      // Create the expense
      const { data: expenseData, error: expenseError } = await supabase
        .from('trip_expenses')
        .insert({
          trip_id: tripId,
          paid_by: user.id,
          amount: data.amount,
          description: data.description,
          category: data.category,
          expense_date: data.expenseDate || new Date().toISOString().split('T')[0],
        })
        .select('id')
        .single();

      if (expenseError) throw expenseError;

      // Create splits
      if (data.splitUserIds.length > 0) {
        const perPerson = Math.round((data.amount * 100) / data.splitUserIds.length) / 100;
        const remainder = Math.round((data.amount - perPerson * data.splitUserIds.length) * 100) / 100;

        const splits = data.splitUserIds.map((userId, index) => ({
          expense_id: expenseData.id,
          user_id: userId,
          amount: index === 0 ? perPerson + remainder : perPerson,
        }));

        const { error: splitError } = await supabase
          .from('expense_splits')
          .insert(splits);

        if (splitError) {
          // Cleanup expense if splits fail
          await supabase.from('trip_expenses').delete().eq('id', expenseData.id);
          throw splitError;
        }
      }

      return { error: null };
    } catch (err) {
      console.error('[useTripExpenses] Add expense error:', err);
      return { error: err instanceof Error ? err : new Error('Failed to add expense') };
    }
  };

  const deleteExpense = async (expenseId: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase
        .from('trip_expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;
      return { error: null };
    } catch (err) {
      console.error('[useTripExpenses] Delete expense error:', err);
      return { error: err instanceof Error ? err : new Error('Failed to delete expense') };
    }
  };

  const settleWithUser = async (toUserId: string): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      // Find all unsettled splits where current user owes toUser
      const splitsToSettle: string[] = [];

      for (const expense of expenses) {
        if (expense.paid_by === toUserId && expense.splits) {
          for (const split of expense.splits) {
            if (split.user_id === user.id && !split.is_settled) {
              splitsToSettle.push(split.id);
            }
          }
        }
      }

      if (splitsToSettle.length === 0) {
        return { error: null }; // Nothing to settle
      }

      const { error } = await supabase
        .from('expense_splits')
        .update({
          is_settled: true,
          settled_at: new Date().toISOString(),
        })
        .in('id', splitsToSettle);

      if (error) throw error;
      return { error: null };
    } catch (err) {
      console.error('[useTripExpenses] Settle error:', err);
      return { error: err instanceof Error ? err : new Error('Failed to settle') };
    }
  };

  return {
    expenses,
    loading,
    error,
    totalExpenses,
    userBalance,
    expensesByCategory,
    settlements,
    addExpense,
    deleteExpense,
    settleWithUser,
    refetch: fetchExpenses,
  };
}
