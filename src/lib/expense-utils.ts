import type { TripExpense, SettlementSummary, Profile } from './tripchat-types';

/**
 * Calculate net balance for each member
 * Positive = they are owed money
 * Negative = they owe money
 */
export function calculateBalances(
  expenses: TripExpense[]
): Map<string, number> {
  const balances = new Map<string, number>();

  for (const expense of expenses) {
    // Add amount paid to payer's balance
    const currentPayerBalance = balances.get(expense.paid_by) || 0;
    balances.set(expense.paid_by, currentPayerBalance + expense.amount);

    // Subtract split amounts from each user's balance
    if (expense.splits) {
      for (const split of expense.splits) {
        const currentBalance = balances.get(split.user_id) || 0;
        balances.set(split.user_id, currentBalance - split.amount);
      }
    }
  }

  return balances;
}

/**
 * Calculate simplified settlements using greedy algorithm
 * Returns list of "X pays Y $Z" settlements
 */
export function calculateSettlements(
  expenses: TripExpense[],
  profiles?: Map<string, Profile>
): SettlementSummary[] {
  const balances = calculateBalances(expenses);

  // Separate into creditors (positive) and debtors (negative)
  const creditors: { userId: string; amount: number }[] = [];
  const debtors: { userId: string; amount: number }[] = [];

  balances.forEach((balance, userId) => {
    // Round to 2 decimal places and ignore tiny imbalances
    const rounded = Math.round(balance * 100) / 100;
    if (rounded > 0.01) {
      creditors.push({ userId, amount: rounded });
    } else if (rounded < -0.01) {
      debtors.push({ userId, amount: Math.abs(rounded) });
    }
  });

  // Sort by amount descending for more efficient settlement
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements: SettlementSummary[] = [];

  // Greedy algorithm: match largest debtor with largest creditor
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];

    const amount = Math.min(creditor.amount, debtor.amount);
    const roundedAmount = Math.round(amount * 100) / 100;

    if (roundedAmount > 0) {
      const settlement: SettlementSummary = {
        from_user_id: debtor.userId,
        to_user_id: creditor.userId,
        amount: roundedAmount,
      };

      // Add profile info if available
      if (profiles) {
        settlement.from_user = profiles.get(debtor.userId);
        settlement.to_user = profiles.get(creditor.userId);
      }

      settlements.push(settlement);
    }

    // Update remaining amounts
    creditor.amount -= amount;
    debtor.amount -= amount;

    // Move to next if settled
    if (creditor.amount < 0.01) creditorIndex++;
    if (debtor.amount < 0.01) debtorIndex++;
  }

  return settlements;
}

/**
 * Calculate total expenses for a trip
 */
export function calculateTotalExpenses(expenses: TripExpense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Calculate expenses by category
 */
export function calculateExpensesByCategory(
  expenses: TripExpense[]
): Map<string, number> {
  const byCategory = new Map<string, number>();

  for (const expense of expenses) {
    const current = byCategory.get(expense.category) || 0;
    byCategory.set(expense.category, current + expense.amount);
  }

  return byCategory;
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Split expense equally among users
 */
export function splitEqually(amount: number, userIds: string[]): { userId: string; amount: number }[] {
  if (userIds.length === 0) return [];

  const perPerson = Math.floor((amount * 100) / userIds.length) / 100;
  const remainder = Math.round((amount - perPerson * userIds.length) * 100) / 100;

  return userIds.map((userId, index) => ({
    userId,
    // Give the remainder to the first person
    amount: index === 0 ? perPerson + remainder : perPerson,
  }));
}

/**
 * Get user's net balance in a trip
 */
export function getUserBalance(
  userId: string,
  expenses: TripExpense[]
): number {
  const balances = calculateBalances(expenses);
  return balances.get(userId) || 0;
}

/**
 * Check if user has unsettled debts
 */
export function hasUnsettledDebts(
  userId: string,
  expenses: TripExpense[]
): boolean {
  for (const expense of expenses) {
    if (expense.splits) {
      for (const split of expense.splits) {
        if (split.user_id === userId && !split.is_settled && split.amount > 0) {
          return true;
        }
      }
    }
  }
  return false;
}
