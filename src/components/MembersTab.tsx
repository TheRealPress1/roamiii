import { useState } from 'react';
import { Mail, X, UserPlus, Crown, Shield, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { BoardMember, Profile } from '@/lib/supabase-types';
import { toast } from 'sonner';
import { getDisplayName } from '@/lib/utils';

interface MembersTabProps {
  boardId: string;
  members: BoardMember[];
  currentMember: BoardMember | null;
  onRefresh: () => void;
}

export function MembersTab({ boardId, members, currentMember, onRefresh }: MembersTabProps) {
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);

  const canInvite = currentMember?.role === 'owner' || currentMember?.role === 'admin';

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !user) return;

    const email = inviteEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setInviting(true);
    try {
      const { error } = await supabase
        .from('invites')
        .insert({
          board_id: boardId,
          email,
          invited_by: user.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('This person has already been invited');
        } else {
          throw error;
        }
      } else {
        toast.success('Invite sent!');
        setInviteEmail('');
        onRefresh();
      }
    } catch (error: any) {
      console.error('Error inviting:', error);
      toast.error(error.message || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-amber-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge variant="outline" className="border-amber-500/50 text-amber-600">Owner</Badge>;
      case 'admin':
        return <Badge variant="outline" className="border-blue-500/50 text-blue-600">Admin</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Invite Section */}
      {canInvite && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Friends
          </h3>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="friend@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                className="pl-9"
                disabled={inviting}
              />
            </div>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Send Invite'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">
            {members.length} Member{members.length !== 1 ? 's' : ''}
          </h3>
        </div>
        <div className="divide-y divide-border">
          {members.map((member) => {
            const profile = (member as any).profile as Profile | undefined;
            return (
              <div key={member.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {profile?.name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {getDisplayName(profile)}
                      </span>
                      {getRoleBadge(member.role)}
                    </div>
                    {profile?.email && (
                      <span className="text-sm text-muted-foreground">{profile.email}</span>
                    )}
                  </div>
                </div>
                {getRoleIcon(member.role)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
