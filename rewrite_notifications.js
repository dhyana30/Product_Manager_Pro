const fs = require('fs');

const code = `import { useNavigate } from "react-router-dom";
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

export default function Notifications() {
  const navigate = useNavigate();
  const fetch = useAuthenticatedFetch();
  const [selectedTab, setSelectedTab] = useState(0);
  const [readIds, setReadIds] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadRead() {
      try {
        const res = await fetch('/api/notifications/read');
        if (res.ok) {
          const data = await res.json();
          setReadIds(data || []);
        }
      } catch (e) {
        console.error(e);
      }
      setIsLoaded(true);
    }
    loadRead();
  }, [fetch]);

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

  const groupedNotifications = [
    {
      dateLabel: 'Today — May 15, 2025',
      items: [
        { id: 1, severity: 'error', title: 'Inventory sync failed', category: 'Inventory', message: 'Failed to sync 23 SKUs from "Warehouse 7". See errors for details.', time: '9:41 AM', actionText: 'View errors' },
        { id: 2, severity: 'warning', title: 'Low stock alert', category: 'Inventory', message: '8 SKUs are below your low stock threshold.', time: '9:18 AM', actionText: 'View items' },
        { id: 3, severity: 'info', title: 'Catalog import completed', category: 'Catalog', message: '"Spring Collection 2025.csv" imported successfully. 312 products updated.', time: '8:02 AM', actionText: 'View results' },
        { id: 4, severity: 'success', title: 'Image optimization completed', category: 'Images', message: 'Optimized 1,248 images.', time: '7:45 AM', actionText: 'View report' },
        { id: 5, severity: 'info', title: 'SEO scan completed', category: 'SEO', message: 'No critical issues found. 12 improvements available.', time: '7:12 AM', actionText: 'View report' }
      ]
    },
    {
      dateLabel: 'Yesterday — May 14, 2025',
      items: [
        { id: 6, severity: 'error', title: 'Image upload failed', category: 'Images', message: '12 images failed to upload.', time: '4:32 PM', actionText: 'View errors' },
        { id: 7, severity: 'warning', title: 'Duplicate SKUs detected', category: 'Catalog', message: '5 duplicate SKUs found.', time: '2:11 PM', actionText: 'Review' },
        { id: 8, severity: 'success', title: 'Inventory sync completed', category: 'Inventory', message: 'Warehouse "Main" synced successfully.', time: '11:47 AM', actionText: 'View details' },
        { id: 9, severity: 'info', title: 'System maintenance scheduled', category: 'System', message: 'Scheduled for May 17, 2025 2:00 AM — 4:00 AM UTC.', time: '9:00 AM', actionText: 'Learn more' }
      ]
    },
    {
      dateLabel: 'May 13, 2025',
      items: [
        { id: 10, severity: 'info', title: 'SEO meta update completed', category: 'SEO', message: 'Updated meta for 842 products.', time: '6:23 PM', actionText: 'View report' },
        { id: 11, severity: 'success', title: 'Catalog export completed', category: 'Catalog', message: '"Active Products Export.csv" is ready.', time: '3:14 PM', actionText: 'Download' },
        { id: 12, severity: 'warning', title: 'Missing attributes detected', category: 'Catalog', message: '14 products are missing required attributes.', time: '10:05 AM', actionText: 'View items' }
      ]
    }
  ];

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
  const unreadCount = allNotificationCount - readIds.length;

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
                          <Icon source={iconConfig.source} color="base" />
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
                        <button style={{ 
                          background: "#ffffff", 
                          border: "1px solid #c9cccf", 
                          borderRadius: "4px", 
                          padding: "6px 12px", 
                          fontSize: "13px", 
                          fontWeight: "600",
                          color: "#202223",
                          cursor: "pointer",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                        }}>
                          {item.actionText}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('web/frontend/pages/notifications.jsx', code);
console.log('Rewrote notifications.jsx');
