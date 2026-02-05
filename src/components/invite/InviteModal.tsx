import { useState } from 'react';
import { Copy, Check, Link as LinkIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  joinCode: string;
}

export function InviteModal({ open, onClose, tripId, joinCode }: InviteModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const inviteLink = `${window.location.origin}/invite/${joinCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      toast.success('Invite link copied!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopiedCode(true);
      toast.success('Invite code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Friends</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Invite Link */}
          <div className="space-y-2">
            <Label>Share Invite Link</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={inviteLink}
                  readOnly
                  className="pl-9 text-sm bg-muted"
                />
              </div>
              <Button variant="outline" size="icon" onClick={handleCopyLink}>
                {copiedLink ? (
                  <Check className="h-4 w-4 text-vote-in" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or share code</span>
            </div>
          </div>

          {/* Invite Code */}
          <div className="space-y-2">
            <Label>Invite Code</Label>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-xl text-center tracking-widest">
                {joinCode}
              </div>
              <Button variant="outline" onClick={handleCopyCode}>
                {copiedCode ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-vote-in" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Share this link or code in any group chat. Friends can join instantly!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
