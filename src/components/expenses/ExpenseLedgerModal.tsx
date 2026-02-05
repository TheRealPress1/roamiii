import { useState } from 'react';
import { format } from 'date-fns';
import {
  X,
  Plus,
  DollarSign,
  Trash2,
  ArrowRight,
  CheckCircle,
  Loader2,
  Receipt,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { TripExpense, TripMember, SettlementSummary } from '@/lib/tripchat-types';
import { useTripExpenses } from '@/hooks/useTripExpenses';
import { formatCurrency } from '@/lib/expense-utils';
import { AddExpenseModal } from './AddExpenseModal';
import { cn, getDisplayName } from '@/lib/utils';
import { toast } from 'sonner';

interface ExpenseLedgerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  members: TripMember[];
  currentUserId: string;
}

const categoryIcons: Record<string, string> = {
  food: '🍽️',
  transport: '🚗',
  housing: '🏨',
  activity: '🎯',
  other: '📦',
};

export function ExpenseLedgerModal({
  open,
  onOpenChange,
  tripId,
  members,
  currentUserId,
}: ExpenseLedgerModalProps) {
  const {
    expenses,
    loading,
    totalExpenses,
    userBalance,
    settlements,
    addExpense,
    deleteExpense,
    settleWithUser,
  } = useTripExpenses(tripId, members);

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settlingWith, setSettlingWith] = useState<string | null>(null);

  const handleDeleteExpense = async (expenseId: string) => {
    setDeletingId(expenseId);
    const { error } = await deleteExpense(expenseId);
    if (error) {
      toast.error('Failed to delete expense');
    }
    setDeletingId(null);
  };

  const handleSettle = async (toUserId: string) => {
    setSettlingWith(toUserId);
    const { error } = await settleWithUser(toUserId);
    if (error) {
      toast.error('Failed to mark as settled');
    } else {
      toast.success('Marked as settled');
    }
    setSettlingWith(null);
  };

  // Find settlements where current user needs to pay
  const mySettlements = settlements.filter(s => s.from_user_id === currentUserId);

  // Find what I'm owed
  const owedToMe = settlements.filter(s => s.to_user_id === currentUserId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Expense Ledger
              </DialogTitle>
              <Button size="sm" onClick={() => setShowAddExpense(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Expense
              </Button>
            </div>
          </DialogHeader>

          {/* Summary bar */}
          <div className="px-6 py-3 bg-muted/30 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="text-lg font-semibold">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Your Balance</p>
                <p className={cn(
                  'text-lg font-semibold',
                  userBalance > 0 ? 'text-green-600' : userBalance < 0 ? 'text-red-600' : ''
                )}>
                  {userBalance >= 0 ? '+' : ''}{formatCurrency(userBalance)}
                </p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="expenses" className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-6 mt-2">
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="settlements">Settle Up</TabsTrigger>
            </TabsList>

            <TabsContent value="expenses" className="flex-1 mt-0 overflow-hidden">
              <ScrollArea className="h-full max-h-[calc(85vh-250px)]">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : expenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center px-6">
                    <DollarSign className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No expenses yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add expenses to track who paid for what
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {expenses.map((expense) => {
                      const payer = expense.payer;
                      const payerName = getDisplayName(payer);
                      const isOwn = expense.paid_by === currentUserId;

                      return (
                        <div key={expense.id} className="px-6 py-4 hover:bg-muted/30 transition-colors">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl flex-shrink-0">
                              {categoryIcons[expense.category] || '📦'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-medium">{expense.description}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Paid by {isOwn ? 'you' : payerName} •{' '}
                                    {format(new Date(expense.expense_date), 'MMM d')}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="font-semibold">
                                    {formatCurrency(expense.amount)}
                                  </p>
                                  {expense.splits && expense.splits.length > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                      {formatCurrency(expense.amount / expense.splits.length)}/person
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Split info */}
                              {expense.splits && expense.splits.length > 0 && (
                                <div className="flex items-center gap-1 mt-2">
                                  <span className="text-xs text-muted-foreground">Split with:</span>
                                  <div className="flex -space-x-1">
                                    {expense.splits.slice(0, 5).map((split) => {
                                      const splitUser = split.user;
                                      const name = getDisplayName(splitUser, '?');
                                      return (
                                        <Avatar key={split.id} className="h-5 w-5 border-2 border-background">
                                          <AvatarImage src={splitUser?.avatar_url || undefined} />
                                          <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                            {name.slice(0, 1)}
                                          </AvatarFallback>
                                        </Avatar>
                                      );
                                    })}
                                    {expense.splits.length > 5 && (
                                      <div className="h-5 w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                                        <span className="text-[8px] text-muted-foreground">
                                          +{expense.splits.length - 5}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Delete button (only for own expenses) */}
                            {isOwn && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteExpense(expense.id)}
                                disabled={deletingId === expense.id}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              >
                                {deletingId === expense.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="settlements" className="flex-1 mt-0 overflow-hidden">
              <ScrollArea className="h-full max-h-[calc(85vh-250px)]">
                <div className="p-6 space-y-6">
                  {/* What I owe */}
                  {mySettlements.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <span className="text-red-500">You owe</span>
                      </h3>
                      <div className="space-y-2">
                        {mySettlements.map((settlement, i) => {
                          const toUser = settlement.to_user;
                          const name = getDisplayName(toUser);
                          const initials = name.slice(0, 2).toUpperCase();

                          return (
                            <div
                              key={i}
                              className="flex items-center gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20"
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={toUser?.avatar_url || undefined} />
                                <AvatarFallback className="bg-red-500/10 text-red-600">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-medium">{name}</p>
                                <p className="text-sm text-red-600">
                                  {formatCurrency(settlement.amount)}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSettle(settlement.to_user_id)}
                                disabled={settlingWith === settlement.to_user_id}
                              >
                                {settlingWith === settlement.to_user_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Settled
                                  </>
                                )}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* What's owed to me */}
                  {owedToMe.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <span className="text-green-600">You're owed</span>
                      </h3>
                      <div className="space-y-2">
                        {owedToMe.map((settlement, i) => {
                          const fromUser = settlement.from_user;
                          const name = getDisplayName(fromUser);
                          const initials = name.slice(0, 2).toUpperCase();

                          return (
                            <div
                              key={i}
                              className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20"
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={fromUser?.avatar_url || undefined} />
                                <AvatarFallback className="bg-green-500/10 text-green-600">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-medium">{name}</p>
                                <p className="text-sm text-green-600">
                                  {formatCurrency(settlement.amount)}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-green-600 border-green-500/30">
                                Pending
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* All settled! */}
                  {mySettlements.length === 0 && owedToMe.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
                      <h3 className="font-medium text-lg">All Settled Up!</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Everyone is square. No payments needed.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AddExpenseModal
        open={showAddExpense}
        onOpenChange={setShowAddExpense}
        members={members}
        currentUserId={currentUserId}
        onSubmit={addExpense}
      />
    </>
  );
}
