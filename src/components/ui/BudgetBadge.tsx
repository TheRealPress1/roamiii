import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface BudgetBadgeProps {
  estimatedCost: number;
  budgetMax?: number | null;
  budgetMin?: number | null;
  showIcon?: boolean;
}

export function BudgetBadge({ estimatedCost, budgetMax, budgetMin, showIcon = true }: BudgetBadgeProps) {
  if (!budgetMax && !budgetMin) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
        No budget set
      </span>
    );
  }

  const isUnder = budgetMax ? estimatedCost <= budgetMax : true;
  const isOver = budgetMin ? estimatedCost < budgetMin : false;

  if (isOver) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-vote-in-bg text-vote-in">
        {showIcon && <TrendingDown className="h-3 w-3" />}
        Under budget
      </span>
    );
  }

  if (!isUnder) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-vote-out-bg text-vote-out">
        {showIcon && <TrendingUp className="h-3 w-3" />}
        Over budget
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-vote-in-bg text-vote-in">
      {showIcon && <Minus className="h-3 w-3" />}
      Within budget
    </span>
  );
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
