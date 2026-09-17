import { useNavigate } from "react-router-dom";
import React, { useState } from 'react';
import {
  Page,
  Card,
  Stack,
  Text,
  Button,
  Badge,
  Icon,
  Tabs,
  Popover,
  ActionList,
  Select,
  ButtonGroup
} from '@shopify/polaris';
import {
  CircleAlertMajor,
  AlertMinor,
  CircleInformationMajor,
  CircleTickMajor,
  HorizontalDotsMinor,
  FilterMinor,
  EmailMajor
} from '@shopify/polaris-icons';
import { TitleBar } from '@shopify/app-bridge-react';

export default function Notifications() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState(0);



  const groupedNotifications = [
    {
      dateLabel: 'Today \u2013 May 15, 2025',
      count: 5,
      items: [
        {
          id: 1,
          severity: 'error',
          title: 'Inventory sync failed',
          category: 'Inventory',
          message: 'Failed to sync 23 SKUs from "Warehouse 7". See errors for details.',
          time: '9:41 AM',
          actionText: 'View errors'
        },
        {
          id: 2,
          severity: 'warning',
          title: 'Low stock alert',
          category: 'Inventory',
          message: '8 SKUs are below your low stock threshold.',
          time: '9:18 AM',
          actionText: 'View items'
        },
        {
          id: 3,
          severity: 'info',
          title: 'Catalog import completed',
          category: 'Catalog',
          message: '"Spring Collection 2025.csv" imported successfully. 312 products updated.',
          time: '8:02 AM',
          actionText: 'View results'
        },
        {
          id: 4,
          severity: 'success',
          title: 'Image optimization completed',
          category: 'Images',
          message: 'Optimized 1,248 images.',
          time: '7:45 AM',
          actionText: 'View report'
        },
        {
          id: 5,
          severity: 'info',
          title: 'SEO scan completed',
          category: 'SEO',
          message: 'No critical issues found. 12 improvements available.',
          time: '7:12 AM',
          actionText: 'View report'
        }
      ]
    },
    {
      dateLabel: 'Yesterday \u2013 May 14, 2025',
      count: 4,
      items: [
        {
          id: 6,
          severity: 'error',
          title: 'Image upload failed',
          category: 'Images',
          message: '12 images failed to upload.',
          time: '4:32 PM',
          actionText: 'View errors'
        },
        {
          id: 7,
          severity: 'warning',
          title: 'Duplicate SKUs detected',
          category: 'Catalog',
          message: '5 duplicate SKUs found.',
          time: '2:11 PM',
          actionText: 'Review'
        },
        {
          id: 8,
          severity: 'success',
          title: 'Inventory sync completed',
          category: 'Inventory',
          message: 'Warehouse "Main" synced successfully.',
          time: '11:47 AM',
          actionText: 'View details'
        },
        {
          id: 9,
          severity: 'info',
          title: 'System maintenance scheduled',
          category: 'System',
          message: 'Scheduled for May 17, 2025 2:00 AM \u2013 4:00 AM UTC.',
          time: '9:00 AM',
          actionText: 'Learn more'
        }
      ]
    },
    {
      dateLabel: 'May 13, 2025',
      count: 3,
      items: [
        {
          id: 10,
          severity: 'info',
          title: 'SEO meta update completed',
          category: 'SEO',
          message: 'Updated meta for 842 products.',
          time: '6:23 PM',
          actionText: 'View report'
        },
        {
          id: 11,
          severity: 'success',
          title: 'Catalog export completed',
          category: 'Catalog',
          message: '"Active Products Export.csv" is ready.',
          time: '3:14 PM',
          actionText: 'Download'
        },
        {
          id: 12,
          severity: 'warning',
          title: 'Missing attributes detected',
          category: 'Catalog',
          message: '14 products are missing required attributes.',
          time: '10:05 AM',
          actionText: 'View items'
        }
      ]
    }
  ];

  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('notifications_readIds');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    localStorage.setItem('notifications_readIds', JSON.stringify(readIds));
  }, [readIds]);

  const markAsRead = (id) => {
    if (!readIds.includes(id)) {
      setReadIds([...readIds, id]);
    }
  };

  const markAllAsRead = () => {
    const allIds = groupedNotifications.flatMap(group => group.items.map(item => item.id));
    setReadIds(allIds);
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error': return <Icon source={CircleAlertMajor} color="critical" />;
      case 'warning': return <Icon source={AlertMinor} color="warning" />;
      case 'info': return <Icon source={CircleInformationMajor} color="interactive" />;
      case 'success': return <Icon source={CircleTickMajor} color="success" />;
      default: return <Icon source={CircleInformationMajor} color="interactive" />;
    }
  };

  const getCategoryBadgeColor = (category) => {
    switch (category) {
      case 'Inventory': return 'info';
      case 'Catalog': return 'new';
      case 'Images': return 'info';
      case 'SEO': return 'info';
      case 'System': return 'info';
      default: return 'info';
    }
  };

  const allNotificationCount = groupedNotifications.reduce((acc, group) => acc + group.items.length, 0);
  const unreadCount = allNotificationCount - readIds.length;

  const tabs = [
    { id: 'all', content: <span>All <Badge status="info">{allNotificationCount}</Badge></span> },
    { id: 'unread', content: <span>Unread {unreadCount > 0 && <Badge status="info">{unreadCount}</Badge>}</span> },
  ];

  const displayedGroups = selectedTab === 0 ? groupedNotifications : groupedNotifications.map(group => {
    const unreadItems = group.items.filter(item => !readIds.includes(item.id));
    return {
      ...group,
      items: unreadItems,
      count: unreadItems.length
    };
  }).filter(group => group.count > 0);

  return (
    <Page>
      <TitleBar title="Notifications" />

      <Card>
        <div style={{ borderBottom: '1px solid #dfe3e8', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab} fitted={false} />
          <div 
            style={{ cursor: 'pointer', padding: '12px 16px', color: '#5c5f62', fontSize: '14px', fontWeight: 500 }} 
            onClick={markAllAsRead}
          >
            Mark all as read
          </div>
        </div>


        <div>
          {displayedGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              <div style={{ padding: '16px 20px', background: '#f9fafb', display: 'flex', alignItems: 'center' }}>
                <Text variant="bodyMd" fontWeight="bold">{group.dateLabel}</Text>
                <div style={{ marginLeft: '12px' }}>
                  <Badge status="info">{group.count}</Badge>
                </div>
              </div>

              {group.items.map((item, itemIndex) => {
                const isUnread = !readIds.includes(item.id);
                return (
                <div key={item.id} style={{
                  padding: '16px 20px',
                  borderBottom: itemIndex === group.items.length - 1 ? 'none' : '1px solid #dfe3e8',
                  backgroundColor: isUnread ? '#ebf5fa' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start'
                }} onClick={() => markAsRead(item.id)}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isUnread ? '#2c6ecb' : 'transparent', marginTop: '6px', marginRight: '16px', flexShrink: 0 }}></div>
                  <div style={{ marginRight: '16px', flexShrink: 0 }}>
                    {getSeverityIcon(item.severity)}
                  </div>

                  <div style={{ flexGrow: 1 }}>
                    <Stack alignment="center" spacing="tight">
                      <Text variant="bodyMd" fontWeight="bold">{item.title}</Text>
                      <Badge status={getCategoryBadgeColor(item.category)}>{item.category}</Badge>
                    </Stack>
                    <div style={{ marginTop: '4px' }}>
                      <Text variant="bodyMd" color="subdued">{item.message}</Text>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', marginLeft: '16px' }}>
                    <div style={{ marginRight: '24px' }}>
                      <Text variant="bodySm" color="subdued">{item.time}</Text>
                    </div>
                    <ButtonGroup>
                      <Button size="slim">{item.actionText}</Button>
                    </ButtonGroup>
                  </div>
                </div>
                );
              })}
              <div style={{ borderBottom: '1px solid #dfe3e8' }}></div>
            </div>
          ))}
        </div>

        <div style={{ padding: '20px', textAlign: 'center', background: '#f9fafb' }}>
          <Text variant="bodySm" color="subdued">End of notifications</Text>
        </div>
      </Card>
    </Page>
  );
}
