
# Partiful-Style Notifications System (MVP)

This plan implements a complete in-app notification system for TripChat with a bell icon, slide-out drawer, database storage, and automatic notification generation for key events.

---

## Current State

- No notification system exists
- Header component (`src/components/layout/Header.tsx`) has user dropdown but no bell icon
- Events like member joins, proposals, and plan locks happen without cross-user notifications
- Existing realtime patterns in `useTripMessages.ts` and `useTripData.ts` can be referenced

---

## Part 1: Database Schema

### New Table: `notifications`

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  href TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

### Notification Types (enum values stored as text)

| Type | Event |
|------|-------|
| `member_joined` | Someone joined a trip you're in |
| `proposal_posted` | Someone posted a proposal |
| `plan_locked` | Admin pinned a final proposal |
| `mention` | (Future) You were @mentioned in chat |

---

## Part 2: Row-Level Security Policies

```sql
-- Users can only read their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Users can update their own notifications (to mark read)
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Authenticated users can insert notifications for trip members
-- (actor must be current user, recipient must be in same trip)
CREATE POLICY "Trip members can create notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid() 
  AND (
    trip_id IS NULL 
    OR is_trip_member(trip_id, user_id)
  )
);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE TO authenticated
USING (user_id = auth.uid());
```

---

## Part 3: Helper Function for Creating Notifications

Create a helper function to batch-create notifications for all trip members except the actor:

```sql
CREATE OR REPLACE FUNCTION public.notify_trip_members(
  _trip_id UUID,
  _actor_id UUID,
  _type TEXT,
  _title TEXT,
  _body TEXT DEFAULT NULL,
  _href TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, trip_id, actor_id, type, title, body, href)
  SELECT 
    tm.user_id,
    _trip_id,
    _actor_id,
    _type,
    _title,
    _body,
    _href
  FROM public.trip_members tm
  WHERE tm.trip_id = _trip_id
    AND tm.user_id != _actor_id;
END;
$$;
```

---

## Part 4: Notification Creation in Frontend

Since database triggers are complex and the frontend already handles these events, we'll create notifications inline after each action.

### A) When Member Joins (`JoinTripPreview.tsx`)

After successfully joining, notify the trip owner (or all existing members):

```typescript
// After inserting trip_members and system message
// Notify existing members
const { data: existingMembers } = await supabase
  .from('trip_members')
  .select('user_id')
  .eq('trip_id', preview.id)
  .neq('user_id', user.id);

if (existingMembers?.length) {
  const notifications = existingMembers.map(m => ({
    user_id: m.user_id,
    trip_id: preview.id,
    actor_id: user.id,
    type: 'member_joined',
    title: 'New member joined',
    body: `${displayName} joined ${preview.name}`,
    href: `/app/trip/${preview.id}`,
  }));
  
  await supabase.from('notifications').insert(notifications);
}
```

### B) When Proposal Posted (`CreateProposalModal.tsx`)

After creating proposal:

```typescript
// After proposal + message insert succeeds
await supabase.rpc('notify_trip_members', {
  _trip_id: tripId,
  _actor_id: user.id,
  _type: 'proposal_posted',
  _title: 'New proposal posted',
  _body: `${profile?.name || 'Someone'} proposed ${destination}`,
  _href: `/app/trip/${tripId}`,
});
```

### C) When Plan Locked (`ProposalDetailModal.tsx`)

After pinning proposal:

```typescript
// After updating trip with pinned_proposal_id
await supabase.rpc('notify_trip_members', {
  _trip_id: tripId,
  _actor_id: user.id,
  _type: 'plan_locked',
  _title: 'Plan locked',
  _body: `${profile?.name || 'Someone'} locked the plan for ${proposal.destination}`,
  _href: `/app/trip/${tripId}`,
});
```

---

## Part 5: TypeScript Types

### File: `src/lib/tripchat-types.ts`

Add new types:

```typescript
export type NotificationType = 'member_joined' | 'proposal_posted' | 'plan_locked' | 'mention';

export interface Notification {
  id: string;
  user_id: string;
  trip_id: string | null;
  actor_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
  actor?: Profile;
}
```

---

## Part 6: Notifications Hook

### New File: `src/hooks/useNotifications.ts`

```typescript
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select(`*, actor:profiles!notifications_actor_id_fkey(*)`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    
    setNotifications(data || []);
    setUnreadCount(data?.filter(n => !n.read_at).length || 0);
    setLoading(false);
  }, [user?.id]);

  // Subscribe to realtime
  useEffect(() => {
    if (!user) return;
    
    fetchNotifications();
    
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        // Refetch to get actor profile
        fetchNotifications();
      })
      .subscribe();
    
    return () => supabase.removeChannel(channel);
  }, [user?.id, fetchNotifications]);

  // Mark as read
  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);
    
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Mark all as read
  const markAllAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);
    
    setNotifications(prev => 
      prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
    setUnreadCount(0);
  };

  return { notifications, loading, unreadCount, markAsRead, markAllAsRead, refetch: fetchNotifications };
}
```

---

## Part 7: UI Components

### New File: `src/components/notifications/NotificationBell.tsx`

Bell icon with unread badge for the header:

```typescript
interface NotificationBellProps {
  count: number;
  onClick: () => void;
}

export function NotificationBell({ count, onClick }: NotificationBellProps) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} className="relative">
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Button>
  );
}
```

### New File: `src/components/notifications/NotificationDrawer.tsx`

Slide-in panel from the right (~400px wide):

```typescript
interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  notifications: Notification[];
  loading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigate: (href: string, id: string) => void;
}

export function NotificationDrawer({...}) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] sm:max-w-[400px] p-0">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle>Notifications</SheetTitle>
            <Button variant="ghost" size="sm" onClick={onMarkAllAsRead}>
              Mark all as read
            </Button>
          </div>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-80px)]">
          {loading ? (
            <Loader2 className="animate-spin mx-auto my-8" />
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <NotificationItem 
                  key={notification.id}
                  notification={notification}
                  onClick={() => onNavigate(notification.href, notification.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
```

### New File: `src/components/notifications/NotificationItem.tsx`

Individual notification row:

```typescript
interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const isUnread = !notification.read_at;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 hover:bg-muted/50 transition-colors flex gap-3",
        isUnread && "bg-primary/5"
      )}
    >
      {/* Actor avatar */}
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={notification.actor?.avatar_url || undefined} />
        <AvatarFallback>
          {notification.actor?.name?.[0] || 'U'}
        </AvatarFallback>
      </Avatar>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", isUnread && "font-medium")}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-sm text-muted-foreground truncate">
            {notification.body}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      
      {/* Unread indicator */}
      {isUnread && (
        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
      )}
    </button>
  );
}
```

---

## Part 8: Header Integration

### Update: `src/components/layout/Header.tsx`

Add bell icon and drawer state:

```typescript
export function Header({ transparent }: HeaderProps) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Only fetch notifications when authenticated
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } = 
    useNotifications();

  const handleNotificationClick = (href: string | null, id: string) => {
    markAsRead(id);
    setDrawerOpen(false);
    if (href) navigate(href);
  };

  return (
    <header>
      {/* ... existing content ... */}
      
      {user && (
        <>
          {/* Bell icon before user dropdown */}
          <NotificationBell 
            count={unreadCount} 
            onClick={() => setDrawerOpen(true)} 
          />
          
          {/* User dropdown (existing) */}
          <DropdownMenu>...</DropdownMenu>
          
          {/* Notification drawer */}
          <NotificationDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            notifications={notifications}
            loading={loading}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onNavigate={handleNotificationClick}
          />
        </>
      )}
    </header>
  );
}
```

---

## Part 9: Files Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/[timestamp]_add_notifications.sql` | Create | Table, RLS, indexes, realtime, helper function |
| `src/lib/tripchat-types.ts` | Update | Add `Notification` and `NotificationType` types |
| `src/hooks/useNotifications.ts` | Create | Hook for fetching, realtime, and mark-as-read |
| `src/components/notifications/NotificationBell.tsx` | Create | Bell icon with badge |
| `src/components/notifications/NotificationDrawer.tsx` | Create | Slide-out panel |
| `src/components/notifications/NotificationItem.tsx` | Create | Individual notification row |
| `src/components/layout/Header.tsx` | Update | Add bell + drawer integration |
| `src/pages/JoinTripPreview.tsx` | Update | Add notification on member join |
| `src/components/proposal/CreateProposalModal.tsx` | Update | Add notification on proposal post |
| `src/components/proposal/ProposalDetailModal.tsx` | Update | Add notification on plan lock |

---

## Part 10: Optional Future Enhancements

- `/app/notifications` page with full list and infinite scroll
- @mention detection in chat messages
- Push notifications via service worker
- Email digest for unread notifications
- Notification preferences per user

---

## Acceptance Criteria

1. Bell icon visible in header with unread count badge
2. Clicking bell opens right-side drawer (~400px)
3. Notifications display actor avatar, title, body, and timestamp
4. Unread notifications have subtle highlight and dot indicator
5. Clicking notification marks it read and navigates to trip
6. "Mark all as read" clears all unread
7. Empty state shows friendly message
8. Realtime: new notifications appear without refresh
9. RLS enforced: users only see their own notifications
10. Notifications created for: member joins, proposal posts, plan locks
