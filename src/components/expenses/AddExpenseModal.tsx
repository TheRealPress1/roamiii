import { useState } from 'react';
import { Loader2, DollarSign, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { ExpenseCategory, TripMember } from '@/lib/tripchat-types';
import { cn } from '@/lib/utils';

interface AddExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: TripMember[];
  currentUserId: string;
  onSubmit: (data: {
    amount: number;
    description: string;
    category: ExpenseCategory;
    splitUserIds: string[];
    expenseDate?: string;
  }) => Promise<{ error: Error | null }>;
}

const categories: { value: ExpenseCategory; label: string; icon: string }[] = [
  { value: 'food', label: 'Food & Drinks', icon: '🍽️' },
  { value: 'transport', label: 'Transport', icon: '🚗' },
  { value: 'housing', label: 'Housing', icon: '🏨' },
  { value: 'activity', label: 'Activities', icon: '🎯' },
  { value: 'other', label: 'Other', icon: '📦' },
];

export function AddExpenseModal({
  open,
  onOpenChange,
  members,
  currentUserId,
  onSubmit,
}: AddExpenseModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(members.map(m => m.user_id))
  );
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setCategory('other');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setSelectedMembers(new Set(members.map(m => m.user_id)));
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const toggleMember = (userId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedMembers(newSelected);
  };

  const selectAll = () => {
    setSelectedMembers(new Set(members.map(m => m.user_id)));
  };

  const canSubmit = () => {
    const numAmount = parseFloat(amount);
    return (
      numAmount > 0 &&
      description.trim() &&
      selectedMembers.size > 0
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit() || submitting) return;

    setSubmitting(true);

    try {
      const { error } = await onSubmit({
        amount: parseFloat(amount),
        description: description.trim(),
        category,
        splitUserIds: Array.from(selectedMembers),
        expenseDate,
      });

      if (!error) {
        handleClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const perPersonAmount = selectedMembers.size > 0
    ? parseFloat(amount || '0') / selectedMembers.size
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Add Expense
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">What was it for?</Label>
            <Input
              id="description"
              placeholder="Dinner at restaurant..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </div>

          {/* Split with */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Split with
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={selectAll}
                className="text-xs"
              >
                Select all
              </Button>
            </div>

            <div className="border border-border rounded-lg max-h-48 overflow-y-auto">
              {members.map((member) => {
                const name = member.profile?.name || member.profile?.email?.split('@')[0] || 'Unknown';
                const initials = name.slice(0, 2).toUpperCase();
                const isSelected = selectedMembers.has(member.user_id);
                const isCurrentUser = member.user_id === currentUserId;

                return (
                  <label
                    key={member.user_id}
                    className={cn(
                      'flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors',
                      'border-b border-border last:border-0'
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleMember(member.user_id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {isCurrentUser ? 'You' : name}
                      </p>
                    </div>
                    {isSelected && perPersonAmount > 0 && (
                      <span className="text-sm text-muted-foreground">
                        ${perPersonAmount.toFixed(2)}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            {selectedMembers.size > 0 && parseFloat(amount || '0') > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                ${perPersonAmount.toFixed(2)} per person ({selectedMembers.size} people)
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit() || submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Expense'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
