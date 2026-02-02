import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteTripDialogProps {
  open: boolean;
  onClose: () => void;
  tripName: string;
  onConfirm: () => void;
  loading: boolean;
}

export function DeleteTripDialog({
  open,
  onClose,
  tripName,
  onConfirm,
  loading,
}: DeleteTripDialogProps) {
  const [confirmText, setConfirmText] = useState('');

  const isConfirmed = confirmText.toLowerCase() === 'delete';

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  const handleConfirm = () => {
    if (isConfirmed && !loading) {
      onConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Trip
          </DialogTitle>
          <DialogDescription className="text-left space-y-3 pt-2">
            <p>
              You are about to permanently delete <strong>"{tripName}"</strong>.
            </p>
            <p className="text-muted-foreground">
              This will remove all messages, proposals, votes, and member data. This action cannot be undone.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <label htmlFor="confirm-delete" className="text-sm font-medium">
            Type <span className="font-mono bg-muted px-1.5 py-0.5 rounded">delete</span> to confirm
          </label>
          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="delete"
            autoComplete="off"
            disabled={loading}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmed || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Trip'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
