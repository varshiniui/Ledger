import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(data || []);
  }, [user.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function handleOpen() {
    setOpen((o) => !o);
    if (!open && unreadCount > 0) {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
      await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  }

  return (
    <div className="relative">
      <button onClick={handleOpen} className="relative text-ink/60 hover:text-ink text-sm">
        Notifications
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-3 bg-rust text-paper text-[10px] font-mono px-1.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate shadow-lg z-10 max-h-96 overflow-y-auto">
          {notifications.length === 0 && (
            <p className="text-sm text-ink/50 p-4">No notifications yet.</p>
          )}
          {notifications.map((n) => (
            <div key={n.id} className="px-4 py-3 border-b border-slate text-sm">
              <p className="text-ink">{n.message}</p>
              <p className="text-xs text-ink/40 mt-1">
                {new Date(n.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}