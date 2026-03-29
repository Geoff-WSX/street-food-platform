import { useState, useEffect } from 'react';
import { Badge, Dropdown, List, Avatar, Button, Empty, Spin, Typography } from 'antd';
import { BellOutlined, CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../store/notification';
import { getNotifications, getUnreadCount, markAsRead as markAsReadApi, markAllAsRead, deleteNotification } from '../api/notification';
import type { Notification as NotificationType } from '../types';

const { Text } = Typography;

export default function NotificationBell() {
  const navigate = useNavigate();
  const { unreadCount, notifications, setUnreadCount, setNotifications, markAsRead, clearUnread } = useNotificationStore();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // 加载未读数量（每30秒轮询）
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const { data } = await getUnreadCount();
        setUnreadCount(data.count);
      } catch {
        // 忽略错误
      }
    };

    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [setUnreadCount]);

  // 打开下拉框时加载通知列表
  const handleDropdownOpenChange = async (visible: boolean) => {
    if (visible && notifications.length === 0) {
      setLoading(true);
      try {
        const { data } = await getNotifications({ page: 1, pageSize: 20 });
        setNotifications(data.data || []);
      } catch {
        // 忽略错误
      } finally {
        setLoading(false);
      }
    }
    setOpen(visible);
  };

  // 处理点击通知
  const handleNotificationClick = async (notification: NotificationType) => {
    try {
      // 标记为已读
      if (!notification.isRead) {
        await markAsReadApi(notification.id);
        markAsRead(notification.id);
      }

      // 关闭下拉框
      setOpen(false);

      // 根据通知类型跳转
      if (notification.type === 'COMMENT' || notification.type === 'REPLY') {
        // 跳转到动态详情页，并定位到评论
        const postId = notification.comment?.post.id || notification.entityId;
        navigate(`/post/${postId}`, {
          state: {
            highlightCommentId: notification.entityId,
          },
        });
      } else if (notification.type === 'LIKE' || notification.type === 'FAVORITE') {
        // 跳转到动态详情页
        navigate(`/post/${notification.entityId}`);
      } else if (notification.type === 'COMMENT_LIKE') {
        // 跳转到动态详情页，并定位到评论
        const postId = notification.comment?.post.id;
        if (postId) {
          navigate(`/post/${postId}`, {
            state: {
              highlightCommentId: notification.entityId,
            },
          });
        }
      } else if (notification.type === 'FOLLOW') {
        // 跳转到用户主页
        navigate(`/profile?userId=${notification.actorId}`);
      }
    } catch {
      // 忽略错误
    }
  };

  // 标记所有为已读
  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      clearUnread();
      setNotifications(
        notifications.map((n) => ({ ...n, isRead: true }))
      );
    } catch {
      // 忽略错误
    }
  };

  // 删除通知
  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      const updatedNotifications = notifications.filter((n) => n.id !== id);
      setNotifications(updatedNotifications);
      // 如果删除的是未读通知，减少未读数
      const deletedNotif = notifications.find((n) => n.id === id);
      if (deletedNotif && !deletedNotif.isRead) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch {
      // 忽略错误
    }
  };

  // 渲染通知内容
  const renderNotificationContent = (notification: NotificationType) => {
    const actorName = notification.actor.username;

    switch (notification.type) {
      case 'COMMENT':
        return `${actorName} 评论了你的动态`;
      case 'REPLY':
        return `${actorName} 回复了你的评论`;
      case 'LIKE':
        return `${actorName} 赞了你的动态`;
      case 'COMMENT_LIKE':
        return `${actorName} 赞了你的评论`;
      case 'FAVORITE':
        return `${actorName} 收藏了你的动态`;
      case 'FOLLOW':
        return `${actorName} 关注了你`;
      default:
        return '新通知';
    }
  };

  // 渲染通知图标
  const renderNotificationIcon = (type: string) => {
    switch (type) {
      case 'COMMENT':
        return '💬';
      case 'REPLY':
        return '↩️';
      case 'LIKE':
      case 'COMMENT_LIKE':
        return '❤️';
      case 'FAVORITE':
        return '⭐';
      case 'FOLLOW':
        return '👤';
      default:
        return '🔔';
    }
  };

  return (
    <Dropdown
      open={open}
      onOpenChange={handleDropdownOpenChange}
      trigger={['click']}
      dropdownRender={() => (
        <div style={{ width: 380, maxHeight: 500, overflow: 'auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ fontSize: 15 }}>通知</Text>
              {unreadCount > 0 && (
                <Button
                  type="link"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={handleMarkAllRead}
                  style={{ padding: 0 }}
                >
                  全部已读
                </Button>
              )}
            </div>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Spin />
            </div>
          ) : notifications.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无通知"
              style={{ padding: 40 }}
            />
          ) : (
            <List
              dataSource={notifications}
              renderItem={(item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  onMouseEnter={(e) => {
                    if (!item.isRead) {
                      e.currentTarget.style.background = '#f5f5f5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = item.isRead ? 'transparent' : '#fafafa';
                  }}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: item.isRead ? 'transparent' : '#fafafa',
                    borderBottom: '1px solid #f0f0f0',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <Avatar
                      src={item.actor.avatar}
                      size={40}
                      style={{
                        border: item.isRead ? 'none' : '2px solid #1890ff',
                        flexShrink: 0,
                      }}
                    >
                      {item.actor.username.charAt(0).toUpperCase()}
                    </Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <Text style={{ fontSize: 14, fontWeight: item.isRead ? 400 : 500 }}>
                          {renderNotificationIcon(item.type)} {renderNotificationContent(item)}
                        </Text>
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={(e) => handleDelete(e, item.id)}
                          style={{ color: '#ff4d4f', flexShrink: 0, marginLeft: 8 }}
                        />
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(item.createdAt).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </div>
                  </div>
                </div>
              )}
            />
          )}
        </div>
      )}
    >
      <Badge count={unreadCount} size="small" offset={[-4, 4]}>
        <Button
          icon={<BellOutlined />}
          style={{
            borderRadius: '50%',
            width: 40,
            height: 40,
            transition: 'all 0.3s ease',
            border: '1px solid #e8e8e8',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#667eea';
            e.currentTarget.style.color = '#667eea';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e8e8e8';
            e.currentTarget.style.color = undefined;
          }}
        />
      </Badge>
    </Dropdown>
  );
}
