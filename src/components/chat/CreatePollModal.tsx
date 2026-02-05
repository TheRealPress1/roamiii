import { useState } from 'react';
import { Plus, Trash2, Loader2, Clock } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PollType } from '@/lib/tripchat-types';

interface CreatePollModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    question: string;
    pollType: PollType;
    options: string[];
    expiresAt: string | null;
  }) => Promise<void>;
}

export function CreatePollModal({ open, onOpenChange, onSubmit }: CreatePollModalProps) {
  const [question, setQuestion] = useState('');
  const [pollType, setPollType] = useState<PollType>('yes_no');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationHours, setExpirationHours] = useState('24');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setQuestion('');
    setPollType('yes_no');
    setOptions(['', '']);
    setHasExpiration(false);
    setExpirationHours('24');
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const handlePollTypeChange = (type: PollType) => {
    setPollType(type);
    if (type === 'yes_no') {
      setOptions(['Yes', 'No']);
    } else {
      setOptions(['', '']);
    }
  };

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    setOptions(options.map((opt, i) => (i === index ? value : opt)));
  };

  const canSubmit = () => {
    if (!question.trim()) return false;
    if (pollType === 'multiple_choice') {
      const validOptions = options.filter(o => o.trim());
      if (validOptions.length < 2) return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!canSubmit() || submitting) return;

    setSubmitting(true);

    try {
      const finalOptions =
        pollType === 'yes_no'
          ? ['Yes', 'No']
          : options.filter(o => o.trim());

      const expiresAt = hasExpiration
        ? new Date(Date.now() + parseInt(expirationHours) * 60 * 60 * 1000).toISOString()
        : null;

      await onSubmit({
        question: question.trim(),
        pollType,
        options: finalOptions,
        expiresAt,
      });

      handleClose();
    } catch (error) {
      console.error('Failed to create poll:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Poll</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Question */}
          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              placeholder="What should we do?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          {/* Poll Type */}
          <div className="space-y-2">
            <Label>Poll Type</Label>
            <Select value={pollType} onValueChange={(v) => handlePollTypeChange(v as PollType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes_no">Yes / No</SelectItem>
                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options (for multiple choice) */}
          {pollType === 'multiple_choice' && (
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(index)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {options.length < 6 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              )}
            </div>
          )}

          {/* Expiration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="expiration" className="cursor-pointer">
                  Set expiration
                </Label>
              </div>
              <Switch
                id="expiration"
                checked={hasExpiration}
                onCheckedChange={setHasExpiration}
              />
            </div>

            {hasExpiration && (
              <Select value={expirationHours} onValueChange={setExpirationHours}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="12">12 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">2 days</SelectItem>
                  <SelectItem value="168">1 week</SelectItem>
                </SelectContent>
              </Select>
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
                Creating...
              </>
            ) : (
              'Create Poll'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
