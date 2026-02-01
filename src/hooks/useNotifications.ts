import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Notification } from '@/lib/tripchat-types';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          actor:profiles!actor_id(id, email, name, avatar_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const mappedNotifications: Notification[] = (data || []).map((n: any) => ({
        id: n.id,
        user_id: n.user_id,
        trip_id: n.trip_id,
        actor_id: n.actor_id,
        type: n.type,
        title: n.title,
        body: n.body,
        href: n.href,
        read_at: n.read_at,
        created_at: n.created_at,
        actor: n.actor || undefined,
      }));

      setNotifications(mappedNotifications);
      setUnreadCount(mappedNotifications.filter(n => !n.read_at).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch to get actor profile
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications]);

  const markAsRead = async (id: string) => {
    if (!user?.id) return;

    const now = new Date().toISOString();
    
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read_at: now } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('id', id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Revert on error
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    const now = new Date().toISOString();
    
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => ({ ...n, read_at: n.read_at || now }))
    );
    setUnreadCount(0);

    try {
      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('user_id', user.id)
        .is('read_at', null);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      // Revert on error
      fetchNotifications();
    }
  };

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
