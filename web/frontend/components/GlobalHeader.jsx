import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TopBar, Icon, Badge, Popover, ActionList, Text, Spinner } from '@shopify/polaris';
import { NotificationMajor } from '@shopify/polaris-icons';
import { useGlobalNotification } from './providers/NotificationProvider';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';

export function GlobalHeader() {
  const { refreshTrigger } = useGlobalNotification();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const fetch = useAuthenticatedFetch();
  const navigate = useNavigate();
  const location = useLocation();

  // We only fetch summary if we are NOT on the /notifications page
  const fetchNotifications = async () => {
    try {
      const resRead = await fetch('/api/notifications/read');
      let readIds = [];
      if (resRead.ok) {
        readIds = await resRead.json() || [];
      }

      const resNotif = await fetch('/api/notifications');
      if (resNotif.ok) {
        const notifData = await resNotif.json();
        const items = notifData.data || [];
        
        const unreadItems = items.filter(item => !readIds.includes(item.id));
        setUnreadCount(unreadItems.length);
        
        // Take top 5 for the popover
        setRecentNotifications(items.slice(0, 5).map(item => ({
          ...item,
          isUnread: !readIds.includes(item.id)
        })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 15s to keep the badge updated
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [location.pathname, refreshTrigger]); // Re-fetch on navigation and new toasts

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleGoToNotifications = () => {
    setIsMenuOpen(false);
    navigate('/notifications');
  };

  const markAllAsRead = async () => {
    try {
      const allIds = recentNotifications.map(n => n.id);
      // We would ideally fetch all IDs from the API, but this is a quick action
      // In a real scenario, we'd have a specific endpoint. 
      // For now, let's just mark the recent ones, or redirect.
      handleGoToNotifications();
    } catch(e) {}
  };

  const activator = (
    <div 
      style={{ position: 'relative', cursor: 'pointer', padding: '8px' }} 
      onClick={toggleMenu}
    >
      <Icon source={NotificationMajor} color="base" />
      {unreadCount > 0 && (
        <div style={{
          position: 'absolute',
          top: '2px',
          right: '2px',
          background: '#e32929',
          color: 'white',
          fontSize: '10px',
          fontWeight: 'bold',
          padding: '2px 5px',
          borderRadius: '10px',
          lineHeight: '1',
          border: '2px solid white'
        }}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'flex-end',
      padding: '12px 24px',
      borderBottom: '1px solid #dfe3e8',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    }}>
      <Popover
        active={isMenuOpen}
        activator={activator}
        onClose={toggleMenu}
        autofocusTarget="first-node"
      >
        <div style={{ width: '320px' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #dfe3e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="headingMd" as="h3">Notifications</Text>
            {unreadCount > 0 && (
              <Badge status="new">{unreadCount} new</Badge>
            )}
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {recentNotifications.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <Text color="subdued">No notifications yet</Text>
              </div>
            ) : (
              <ActionList
                items={recentNotifications.map(n => ({
                  content: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text variant="bodyMd" fontWeight={n.isUnread ? "bold" : "regular"}>{n.title}</Text>
                        {n.isUnread && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#008060' }} />}
                      </div>
                      <Text variant="bodySm" color="subdued" truncate>{n.message}</Text>
                    </div>
                  ),
                  onAction: handleGoToNotifications
                }))}
              />
            )}
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #dfe3e8', textAlign: 'center', cursor: 'pointer', background: '#f9fafb' }} onClick={handleGoToNotifications}>
            <Text variant="bodySm" fontWeight="medium" color="interactive">View all notifications</Text>
          </div>
        </div>
      </Popover>
    </div>
  );
}
