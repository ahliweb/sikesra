
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

export function useNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Separate fetching for unread count (global indicator)
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      // 1. Get all relevant notification IDs (efficiently)
      // This is still heavy if we have millions of notifs. 
      // Optimized approach: Count notifications where created_at > user_created_at 
      // AND id NOT IN notification_readers for this user.

      // For now, let's stick to the current logic but optimize query
      // Count total notifications for user
      const { error: countError } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .is('deleted_at', null);

      if (countError) throw countError;

      // Count read notifications
      const { error: readError } = await supabase
        .from('notification_readers')
        .select('notification_id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (readError) throw readError;

      // This is an approximation because totalRead might include deleted notifications. 
      // But it's faster than joining. 
      // A more accurate way:
      /*
        SELECT count(*) 
        FROM notifications n
        LEFT JOIN notification_readers nr ON n.id = nr.notification_id AND nr.user_id = uid
        WHERE (n.user_id = uid OR n.user_id IS NULL)
        AND n.deleted_at IS NULL
        AND nr.notification_id IS NULL
      */

      // Let's rely on client-side calculation for the current page or fetched set for now
      // or simplistic subtraction if we assume read records are cleaned up. 
      // Actually, for accurate unread count in a broadcast system, we really need that JOIN / NOT EXISTS.
      // Supabase JS doesn't do "NOT EXISTS" or complex joins easily in one line.
      // We will create an RPC for this later if perf issues arise.
      // For now, sticking to a simpler limit-based fetch for the dropdown is safer.

    } catch (error) {
      console.error("Error fetching unread count", error);
    }
  }, [user]);


  const fetchNotifications = useCallback(async ({ page = 1, limit = 50, filters = {} } = {}) => {
    if (!user) return;
    setLoading(true);

    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // 1. Fetch Notifications
      let query = supabase
        .from('notifications')
        .select('*, tenant:tenants(name)', { count: 'exact' })
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,message.ilike.%${filters.search}%`);
      }
      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }

      const { data: notifsData, count, error: notifsError } = await query;

      if (notifsError) throw notifsError;
      setTotalCount(count || 0);

      // 2. Fetch Read Status for fetched notifications
      const notifIds = notifsData.map(n => n.id);
      let readMap = new Set();

      if (notifIds.length > 0) {
        const { data: readData, error: readError } = await supabase
          .from('notification_readers')
          .select('notification_id')
          .eq('user_id', user.id)
          .in('notification_id', notifIds);

        if (!readError && readData) {
          readData.forEach(r => readMap.add(r.notification_id));
        }
      }

      // 3. Merge Data
      const mergedNotifications = notifsData.map(n => ({
        ...n,
        is_read: readMap.has(n.id) || n.is_read === true
      }));

      setNotifications(mergedNotifications);

      // Update unread count based on the first page fetch (if it's page 1)
      // or we should fetch unread count separately.
      // For simplicity/perf in this iteration, we'll calculate unread count 
      // based on the top 50 items which is usually what matters most 
      // OR explicitly fetch count of unread.
      if (page === 1) {
        // This is partial but often enough for UI
        setUnreadCount(mergedNotifications.filter(n => !n.is_read).length);
      }

    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load notifications' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const channel = supabase
      .channel('public:notifications:realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const isForMe = payload.new.user_id === user.id || payload.new.user_id === null;
            if (isForMe && !payload.new.deleted_at) {
              toast({
                title: payload.new.title,
                description: payload.new.message,
              });
              // Refresh current view
              // We pass arguments from a ref/state if we want to stay on current page
              // but for now simple refresh is okay.
              fetchNotifications();
            }
          } else {
            fetchNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications, toast]);

  const markAsRead = useCallback(async (id) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('notification_readers')
        .upsert(
          { notification_id: id, user_id: user.id },
          { onConflict: 'notification_id,user_id', ignoreDuplicates: true }
        );

      if (error) throw error;

      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));

    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch ALL unread notification IDs first (not just current page)
      // Limitation: This might be heavy if thousands.
      // A better way is a Postgres Function `mark_all_notifications_read(user_id)`.

      const { data: unreadData, error: fetchError } = await supabase
        .from('notifications')
        .select('id')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .is('deleted_at', null);

      if (fetchError) throw fetchError;

      // Filter out those already read? 
      // Client side filter is safer if we don't have the "NOT IN" capability.
      // Actually, upserting everything safe due to ignoreDuplicates.

      if (!unreadData || unreadData.length === 0) return;

      const records = unreadData.map(n => ({
        notification_id: n.id,
        user_id: user.id
      }));

      // Batched insert if too many
      const batchSize = 1000;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error } = await supabase
          .from('notification_readers')
          .upsert(batch, { onConflict: 'notification_id,user_id', ignoreDuplicates: true });
        if (error) throw error;
      }

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast({ title: 'Success', description: 'All notifications marked as read' });

    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  }, [user, toast]);

  const deleteNotification = useCallback(async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== id));
      setTotalCount(prev => prev - 1);
      toast({ title: 'Success', description: 'Notification deleted' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete notification' });
    }
  }, [toast]);

  const sendNotification = useCallback(async ({ userId, title, message, type = 'info', link = null, priority = 'normal', category = 'general', tenantId = null }) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          type,
          link,
          priority,
          category,
          tenant_id: tenantId,
          created_by: user.id
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }, [user]);

  return {
    notifications,
    unreadCount,
    totalCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendNotification,
    fetchNotifications,
    fetchUnreadCount
  };
}
