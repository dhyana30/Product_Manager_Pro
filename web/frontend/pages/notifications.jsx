import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from 'react';
import {
  Page,
  Card,
  Text,
  Icon,
} from '@shopify/polaris';
import {
  CircleAlertMajor,
  AlertMinor,
  CircleInformationMajor,
  CircleTickMajor,
} from '@shopify/polaris-icons';
import { TitleBar, useAuthenticatedFetch } from '@shopify/app-bridge-react';
import { useStoreTimezone } from '../utils/storeTimezone';

export default function Notifications() {
  const navigate = useNavigate();
  const fetch = useAuthenticatedFetch();
  const [selectedTab, setSelectedTab] = useState(0);
  const [readIds, setReadIds] = useState([]);
  const [groupedNotifications, setGroupedNotifications] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const timeZone = useStoreTimezone();

  useEffect(() => {
    async function loadData() {
      try {
        const resRead = await fetch('/api/notifications/read');
        if (resRead.ok) {
          const data = await resRead.json();
          setReadIds(data || []);
        }

        const resNotif = await fetch('/api/notifications');
        if (resNotif.ok) {
          const notifData = await resNotif.json();
          const items = notifData.data || [];
          
          const groups = {};
          items.forEach(item => {
            let safeDate = item.created_at;
            if (typeof safeDate === 'string' && !safeDate.includes('Z')) {
              safeDate = safeDate.replace(' ', 'T') + 'Z';
            }
            const date = new Date(safeDate);
            const now = new Date();
            const yesterday = new Date(now.getTime() - 86400000);
            
            let storeDateStr = date.toLocaleDateString('en-US', { timeZone, month: 'short', day: 'numeric', year: 'numeric' });
            const storeTodayStr = now.toLocaleDateString('en-US', { timeZone, month: 'short', day: 'numeric', year: 'numeric' });
            const storeYesterdayStr = yesterday.toLocaleDateString('en-US', { timeZone, month: 'short', day: 'numeric', year: 'numeric' });
            
            let dateLabel = storeDateStr;
            if (storeDateStr === storeTodayStr) {
              dateLabel = 'Today — ' + storeDateStr;
            } else if (storeDateStr === storeYesterdayStr) {
              dateLabel = 'Yesterday — ' + storeDateStr;
            }

            if (!groups[dateLabel]) groups[dateLabel] = { dateLabel, items: [] };
            groups[dateLabel].items.push({
              id: item.id,
              severity: item.severity || 'info',
              title: item.title,
              category: item.category,
              message: item.message,
              time: date.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }),
              actionText: item.action_text || 'View details',
            });
          });
          setGroupedNotifications(Object.values(groups));
        }
      } catch (e) {
        console.error(e);
      }
      setIsLoaded(true);
    }
    loadData();
  }, [fetch, timeZone]);

  const saveReadIds = async (ids) => {
    setReadIds(ids);
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readIds: ids })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // groupedNotifications loaded from API

  const markAsRead = (id) => {
    if (!readIds.includes(id)) {
      saveReadIds([...readIds, id]);
    }
  };

  const markAllAsRead = () => {
    const allIds = groupedNotifications.flatMap(group => group.items.map(item => item.id));
    saveReadIds(allIds);
  };

  const allNotificationCount = groupedNotifications.reduce((acc, group) => acc + group.items.length, 0);
  const unreadCount = groupedNotifications.flatMap(group => group.items).filter(item => !readIds.includes(item.id)).length;

  const [sessionUnreadIds, setSessionUnreadIds] = useState([]);
  useEffect(() => {
    if (selectedTab === 1) {
      const allIds = groupedNotifications.flatMap(group => group.items.map(item => item.id));
      setSessionUnreadIds(allIds.filter(id => !readIds.includes(id)));
    }
  }, [selectedTab]);

  const displayedGroups = selectedTab === 0 ? groupedNotifications.map(g => ({ ...g, count: g.items.length })) : groupedNotifications.map(group => {
    const unreadItems = group.items.filter(item => sessionUnreadIds.includes(item.id));
    return {
      ...group,
      items: unreadItems,
      count: unreadItems.length
    };
  }).filter(group => group.count > 0);

  const getIconProps = (severity) => {
    switch (severity) {
      case 'error': return { source: CircleAlertMajor, bg: '#e32929' };
      case 'warning': return { source: AlertMinor, bg: '#c46313' };
      case 'success': return { source: CircleTickMajor, bg: '#008060' };
      case 'info':
      default: return { source: CircleInformationMajor, bg: '#2c6ecb' };
    }
  };

  if (!isLoaded) return <Page><TitleBar title="Notifications" /></Page>;

  return (
    <div style={{ minHeight: "100vh" }}>
      <TitleBar title="Notifications" />
      <div style={{ padding: "40px 24px", maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 1px 3px 0 rgba(0,0,0,0.15)", overflow: "hidden" }}>
          
          {/* Custom Tabs */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #dfe3e8", padding: "0 20px" }}>
            <div style={{ display: "flex", gap: "24px" }}>
              <div 
                style={{
                  padding: "16px 0",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  borderBottom: selectedTab === 0 ? "3px solid #008060" : "3px solid transparent",
                  color: selectedTab === 0 ? "#008060" : "#5c5f62",
                  fontWeight: selectedTab === 0 ? "600" : "500",
                }}
                onClick={() => setSelectedTab(0)}
              >
                All
                <span style={{ background: selectedTab === 0 ? "#e1f5ec" : "#f4f6f8", color: selectedTab === 0 ? "#008060" : "#5c5f62", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>{allNotificationCount}</span>
              </div>
              <div 
                style={{
                  padding: "16px 0",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  borderBottom: selectedTab === 1 ? "3px solid #008060" : "3px solid transparent",
                  color: selectedTab === 1 ? "#008060" : "#5c5f62",
                  fontWeight: selectedTab === 1 ? "600" : "500",
                }}
                onClick={() => setSelectedTab(1)}
              >
                Unread
                {unreadCount > 0 && <span style={{ background: selectedTab === 1 ? "#e1f5ec" : "#f4f6f8", color: selectedTab === 1 ? "#008060" : "#5c5f62", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>{unreadCount}</span>}
              </div>
            </div>
            
            <div 
              style={{ cursor: "pointer", color: "#202223", fontWeight: "600", fontSize: "14px" }}
              onClick={markAllAsRead}
            >
              Mark all as read
            </div>
          </div>

          {/* List */}
          <div>
            {displayedGroups.map((group, groupIndex) => (
              <div key={groupIndex}>
                <div style={{ padding: "12px 20px", background: "#f9fafb", borderBottom: "1px solid #dfe3e8", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Text variant="bodyMd" fontWeight="bold" as="span">{group.dateLabel}</Text>
                  <span style={{ color: "#8a8f96", fontSize: "14px", fontWeight: "500" }}>{group.count}</span>
                </div>

                {group.items.map((item, itemIndex) => {
                  const isUnread = !readIds.includes(item.id);
                  const iconConfig = getIconProps(item.severity);
                  return (
                    <div 
                      key={item.id} 
                      style={{
                        padding: "16px 20px",
                        borderBottom: "1px solid #dfe3e8",
                        backgroundColor: isUnread ? "#f3fbf7" : "#ffffff",
                        borderLeft: isUnread ? "3px solid #008060" : "3px solid transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "16px"
                      }}
                      onClick={() => markAsRead(item.id)}
                    >
                      {/* Read Status Dot */}
                      <div style={{ marginTop: "12px", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: isUnread ? "#008060" : "transparent", flexShrink: 0 }} />
                      
                      {/* Icon */}
                      <div style={{ 
                        marginTop: "2px",
                        width: "32px", 
                        height: "32px", 
                        borderRadius: "50%", 
                        backgroundColor: iconConfig.bg, 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        flexShrink: 0 
                      }}>
                        <div style={{ color: "white", width: "20px", height: "20px", fill: "white" }}>
                          <Icon source={iconConfig.source} />
                        </div>
                      </div>

                      {/* Content */}
                      <div style={{ flexGrow: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <Text variant="bodyMd" fontWeight="bold" as="span">{item.title}</Text>
                          <span style={{ border: "1px solid #dfe3e8", borderRadius: "12px", padding: "2px 8px", fontSize: "12px", color: "#5c5f62", backgroundColor: "#f9fafb" }}>
                            {item.category}
                          </span>
                        </div>
                        <Text variant="bodyMd" color="subdued" as="span">{item.message}</Text>
                      </div>

                      {/* Actions/Time */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px" }}>
                        <span style={{ color: "#8a8f96", fontSize: "13px" }}>{item.time}</span>
                        
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            {displayedGroups.length === 0 && (
              <div style={{ padding: "40px", textAlign: "center" }}>
                <Text color="subdued">No notifications to display.</Text>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
