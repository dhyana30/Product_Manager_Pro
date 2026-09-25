import React, { createContext, useState, useContext, useEffect } from 'react';
import { Toast } from '@shopify/polaris';
import { useAuthenticatedFetch } from '../../hooks/useAuthenticatedFetch';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [toastMessage, setToastMessage] = useState(null);
  const [isError, setIsError] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const fetch = useAuthenticatedFetch();

  const fetchUnread = async () => {
    try {
      const resRead = await fetch('/api/notifications/read');
      let readIds = [];
      if (resRead.ok) readIds = await resRead.json() || [];

      const resNotif = await fetch('/api/notifications');
      if (resNotif.ok) {
        const notifData = await resNotif.json();
        const items = notifData.data || [];
        const unreadItems = items.filter(item => !readIds.includes(item.id));
        setUnreadCount(unreadItems.length);
      }
    } catch(e) {}
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  const showToast = (message, error = false) => {
    setToastMessage(message);
    setIsError(error);
    setRefreshTrigger(prev => prev + 1);
  };

  const hideToast = () => {
    setToastMessage(null);
    setIsError(false);
  };

  return (
    <NotificationContext.Provider value={{ showToast, hideToast, refreshTrigger, unreadCount }}>
      {children}
      {toastMessage && (
        <Toast content={toastMessage} error={isError} onDismiss={hideToast} />
      )}
    </NotificationContext.Provider>
  );
}

export const useGlobalNotification = () => useContext(NotificationContext);
