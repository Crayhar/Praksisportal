import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notifications as notificationsAPI } from '../utils/api';
import { AuthContext } from '../App';

export const NotificationContext = createContext(null);

const POLL_INTERVAL_MS = 60_000; // re-fetch every 60 seconds

export function NotificationProvider({ children }) {
  const { userRole } = useContext(AuthContext);
  const isStudent = userRole === 'student';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isStudent) return;
    try {
      setLoading(true);
      const data = await notificationsAPI.list();
      setItems(data);
    } catch {
      // silently ignore — network errors shouldn't break the UI
    } finally {
      setLoading(false);
    }
  }, [isStudent]);

  // Initial load & polling
  useEffect(() => {
    fetchNotifications();
    if (!isStudent) return;
    const id = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchNotifications, isStudent]);

  const markRead = async (id) => {
    await notificationsAPI.markRead(id);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllRead = async () => {
    await notificationsAPI.markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{ items, unreadCount, loading, fetchNotifications, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}
