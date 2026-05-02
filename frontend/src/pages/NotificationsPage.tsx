import { useState, useEffect } from 'react';
import { List, Avatar, Button, Space, Typography, Empty, Card, Tabs, Badge, Popconfirm } from 'antd';
import { CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useNotificationStore } from '../store/notification';
import { getNotifications, markAsRead as markAsReadApi, markAllAsRead, deleteNotification } from '../api/notification';
import { PageLayout } from '../components/layout';
import { getAvatarUrl } from '../utils/images';
import type { Notification as NotificationType } from '../types';

const { Title, Text } = Typography;

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthStore();
  const { notifications, unreadCount, setUnreadCount, setNotifications, markAsRead, clearUnread } = useNotificationStore();
  const [loading, setLoading] = useState(false);
  const [page] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, navigate, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await getNotifications({ page, pageSize: 20 });
      const notifs = data.data || [];
      setNotifications(notifs);
      setTotal(data.pagination?.total || 0);
      setUnreadCount(unreadCount); // Keep current unread count
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      clearUnread();
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    } catch {
      // ignore
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsReadApi(id);
      markAsRead(id);
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteNotification(id);
      const updated = notifications.filter((n) => n.id !== id);
      setNotifications(updated);
      const deleted = notifications.find((n) => n.id === id);
      if (deleted && !deleted.isRead) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = async (notification: NotificationType) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }

    switch (notification.type) {
      case 'COMMENT':
      case 'REPLY':
        navigate(`/post/${notification.comment?.post.id || notification.entityId}`);
        break;
      case 'LIKE':
      case 'FAVORITE':
        navigate(`/post/${notification.entityId}`);
        break;
      case 'FOLLOW':
        navigate(`/profile?userId=${notification.actorId}`);
        break;
      case 'FRIEND_REQUEST':
        navigate('/friends/requests');
        break;
      case 'FRIEND_ACCEPTED':
        navigate(`/profile?userId=${notification.actorId}`);
        break;
    }
  };

  const renderNotificationIcon = (type: string) => {
    switch (type) {
      case 'COMMENT': return '💬';
      case 'REPLY': return '↩️';
      case 'LIKE':
      case 'COMMENT_LIKE': return '❤️';
      case 'FAVORITE': return '⭐';
      case 'FOLLOW': return '👤';
      case 'FRIEND_REQUEST': return '🤝';
      case 'FRIEND_ACCEPTED': return '✅';
      default: return '🔔';
    }
  };

  const renderNotificationContent = (notification: NotificationType) => {
    const actorName = notification.actor.username;
    switch (notification.type) {
      case 'COMMENT': return `${actorName} 评论了你的动态`;
      case 'REPLY': return `${actorName} 回复了你的评论`;
      case 'LIKE': return `${actorName} 赞了你的动态`;
      case 'COMMENT_LIKE': return `${actorName} 赞了你的评论`;
      case 'FAVORITE': return `${actorName} 收藏了你的动态`;
      case 'FOLLOW': return `${actorName} 关注了你`;
      case 'FRIEND_REQUEST': return `${actorName} 请求添加你为好友`;
      case 'FRIEND_ACCEPTED': return `${actorName} 已接受你的好友请求`;
      default: return '新通知';
    }
  };

  const tabItems = [
    {
      key: 'all',
      label: <span>全部 {total > 0 && <Badge count={unreadCount} size="small" />}</span>,
      children: (
        <List
          loading={loading}
          dataSource={notifications}
          locale={{ emptyText: <Empty description="暂无通知" /> }}
          renderItem={(item) => (
            <List.Item
              key={item.id}
              style={{
                padding: '12px 16px',
                background: item.isRead ? 'transparent' : 'var(--bg-tertiary)',
                cursor: 'pointer',
              }}
              onClick={() => handleNotificationClick(item)}
              actions={[
                !item.isRead && (
                  <Button
                    key="read"
                    type="text"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(item.id);
                    }}
                    style={{ color: '#52c41a' }}
                  />
                ),
                <Popconfirm
                  key="delete"
                  title="确定删除这条通知？"
                  onConfirm={(e) => {
                    e?.stopPropagation();
                    handleDelete(item.id);
                  }}
                  onCancel={(e) => e?.stopPropagation()}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: '#ff4d4f' }}
                  />
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    src={getAvatarUrl(item.actor)}
                    size={48}
                    style={{
                      border: item.isRead ? 'none' : '2px solid var(--color-info)',
                    }}
                  />
                }
                title={
                  <Space>
                    {renderNotificationIcon(item.type)}
                    <Text strong={!item.isRead}>{renderNotificationContent(item)}</Text>
                  </Space>
                }
                description={
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(item.createdAt).toLocaleString('zh-CN')}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      ),
    },
  ];

  if (!isLoggedIn) return null;

  return (
    <PageLayout background="light" className="page-content" maxWidth={800}>
      <Card style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>通知</Title>
          {unreadCount > 0 && (
            <Button
              type="link"
              icon={<CheckCircleOutlined />}
              onClick={handleMarkAllRead}
            >
              全部已读
            </Button>
          )}
        </div>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>
    </PageLayout>
  );
}
