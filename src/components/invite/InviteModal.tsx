import { useState } from 'react';
import { Copy, Check, Mail, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  joinCode: string;
}

export function InviteModal({ open, onClose, tripId, joinCode }: InviteModalProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [sending, setSending] = useState(false);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(joinCode);
    setCopied(true);
    toast.success('Join code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (emails.includes(email)) {
      toast.error('Email already added');
      return;
    }
    
    setEmails([...emails, email]);
    setEmailInput('');
  };

  const removeEmail = (email: string) => {
    setEmails(emails.filter(e => e !== email));
  };

  const handleSendInvites = async () => {
    if (!user || emails.length === 0) return;

    setSending(true);
    try {
      const invites = emails.map(email => ({
        trip_id: tripId,
        email,
        invited_by: user.id,
      }));

      const { error } = await supabase.from('trip_invites').insert(invites);
      if (error) throw error;

      toast.success(`Invited ${emails.length} friend${emails.length > 1 ? 's' : ''}!`);
      setEmails([]);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invites');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Friends</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Join Code */}
          <div className="space-y-2">
            <Label>Share Join Code</Label>
            <div className="flex gap-2">
              <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-xl text-center tracking-widest">
                {joinCode}
              </div>
              <Button variant="outline" size="icon" onClick={handleCopyCode}>
                {copied ? (
                  <Check className="h-4 w-4 text-vote-in" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Share this code with friends so they can join the trip.
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or invite by email</span>
            </div>
          </div>

          {/* Email Invites */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="friend@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                  className="pl-9"
                />
              </div>
              <Button variant="secondary" onClick={addEmail}>
                Add
              </Button>
            </div>

            {emails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {emails.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary text-sm"
                  >
                    {email}
                    <button
                      onClick={() => removeEmail(email)}
                      className="hover:text-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {emails.length > 0 && (
            <Button
              onClick={handleSendInvites}
              disabled={sending}
              className="w-full gradient-primary text-white"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                `Send ${emails.length} Invite${emails.length > 1 ? 's' : ''}`
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
