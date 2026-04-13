import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, List, Avatar, Typography, Tag, Empty, Badge, Space, Skeleton, Modal, message, Button } from 'antd';
import { UserOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { getConversations, deleteConversation, markAsRead, type Conversation } from '../api/message';
import ChatModal from '../components/ChatModal';
import { useAuthStore } from '../store/auth';
import { useMessageStore } from '../store/message';
import { getErrorMessage } from '../utils/error';
import { getAvatarUrl } from '../utils/images';
import { PageLayout, PageHeader } from '../components/layout';

const { Text } = Typography;

// 加载骨架屏
const ConversationSkeleton = () => (
  <List.Item style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
    <List.Item.Meta
      avatar={<Skeleton.Avatar active size={48} />}
      title={<Skeleton.Input active size="small" style={{ width: 150 }} />}
      description={<Skeleton.Input active size="small" style={{ width: 300 }} />}
    />
  </List.Item>
);

export default function MessagesPage() {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const { clearUnread, decrementUnread } = useMessageStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Conversation['otherUser'] | null>(null);

  const loadConversations = useCallback(async () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const data = await getConversations();
      console.log('对话列表数据:', data);
      if (data.length > 0) {
        console.log('第一个对话的用户信息:', data[0].otherUser);
      }
      setConversations(data);
    } catch {
      // 忽略错误
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    loadConversations();
    // 进入消息页面时清除未读数
    if (isLoggedIn) {
      clearUnread();
    }
  }, [isLoggedIn, clearUnread, loadConversations]);

  const handleChatClose = () => {
    setSelectedChat(null);
    loadConversations(); // 刷新列表以更新未读数和用户信息
  };

  const handleOpenChat = (conversation: Conversation) => {
    // 如果有未读消息，减少全局未读数
    if (conversation.unreadCount > 0) {
      decrementUnread(conversation.unreadCount);
    }
    setSelectedChat(conversation.otherUser);
  };

  // 删除对话
  const handleDeleteConversation = (conversation: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();

    Modal.confirm({
      title: '确认删除对话',
      content: `删除后，与 ${conversation.otherUser.username} 的所有聊天记录将被清空且无法恢复。确定要删除吗？`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteConversation(conversation.otherUser.id);
          void message.success('删除成功');
          loadConversations();
        } catch (error: unknown) {
          void message.error(getErrorMessage(error));
        }
      },
    });
  };

  // 一键清除所有未读消息
  const handleMarkAllAsRead = async () => {
    const hasUnread = conversations.some(c => c.unreadCount > 0);
    if (!hasUnread) {
      void message.info('暂无未读消息');
      return;
    }

    Modal.confirm({
      title: '标记所有消息为已读',
      content: '确定要将所有对话的未读消息标记为已读吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 遍历所有有未读消息的对话，标记为已读
          const unreadConversations = conversations.filter(c => c.unreadCount > 0);
          await Promise.all(
            unreadConversations.map(conv => markAsRead(conv.otherUser.id))
          );
          void message.success('已将所有消息标记为已读');
          clearUnread();
          loadConversations();
        } catch (error: unknown) {
          void message.error(getErrorMessage(error));
        }
      },
    });
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <PageLayout maxWidth={900}>
      {/* 页面标题 */}
      <PageHeader
        title="私信消息"
        subtitle="与其他美食爱好者交流互动"
        decorations={['💬', '✨', '🍜']}
      />

      <Card
        className="food-card-enhanced"
        style={{ marginBottom: 16 }}
        bodyStyle={{ padding: 0 }}
      >
        {loading ? (
          <div>
            {[1, 2, 3, 4, 5].map(i => <ConversationSkeleton key={i} />)}
          </div>
        ) : conversations.length === 0 ? (
          <Empty
            imageStyle={{ height: 80 }}
            description={
              <Space direction="vertical" style={{ gap: 12 }}>
                <div style={{ fontSize: 48 }}>📩</div>
                <Text style={{ fontSize: 16, color: 'var(--text-secondary)' }}>暂无私信对话</Text>
                <Text type="secondary" style={{ fontSize: 14 }}>
                  去关注一些美食爱好者，开始聊天吧！
                </Text>
              </Space>
            }
            style={{ padding: '60px 0' }}
          />
        ) : (
          <List
            dataSource={conversations}
            renderItem={(item, index) => (
              <List.Item
                style={{
                  padding: '18px 24px',
                  cursor: 'pointer',
                  borderBottom: index === conversations.length - 1 ? 'none' : '1px solid rgba(255, 107, 53, 0.1)',
                  transition: 'all 0.3s ease',
                  borderRadius: index === 0 ? '12px 12px 0 0' : index === conversations.length - 1 ? '0 0 12px 12px' : '0',
                }}
                onClick={() => handleOpenChat(item)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-primary-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Badge count={item.unreadCount} offset={[-4, 4]}>
                      <Avatar
                        src={getAvatarUrl(item.otherUser)}
                        icon={<UserOutlined />}
                        size={52}
                        style={{
                          border: item.unreadCount > 0 ? '3px solid #ff6b35' : '2px solid #fff',
                          boxShadow: item.unreadCount > 0 ? '0 4px 12px rgba(255, 107, 53, 0.25)' : '0 2px 8px rgba(255, 107, 53, 0.15)',
                        }}
                        onError={() => {
                          console.log('头像加载失败，使用默认头像');
                          return false;
                        }}
                      />
                    </Badge>
                  }
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong style={{
                        fontSize: 15,
                        color: item.unreadCount > 0 ? '#262626' : '#595959',
                        fontWeight: item.unreadCount > 0 ? 600 : 500
                      }}>
                        {item.otherUser.username}
                      </Text>
                      <Space size={8}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {item.lastMessage
                            ? new Date(item.lastMessage.createdAt).toLocaleDateString('zh-CN')
                            : new Date(item.updatedAt).toLocaleDateString('zh-CN')}
                        </Text>
                        <Button
                          type="text"
                          icon={<DeleteOutlined />}
                          size="small"
                          danger
                          onClick={(e: React.MouseEvent) => handleDeleteConversation(item, e)}
                          style={{ padding: '4px 8px' }}
                        />
                      </Space>
                    </div>
                  }
                  description={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <Text
                        ellipsis
                        style={{
                          fontSize: 13,
                          maxWidth: '70%',
                          color: item.unreadCount > 0 ? '#595959' : '#8c8c8c',
                          fontWeight: item.unreadCount > 0 ? 500 : 'normal'
                        }}
                      >
                        {item.lastMessage?.content || '暂无消息'}
                      </Text>
                      {item.unreadCount > 0 && (
                        <Tag
                          style={{
                            borderRadius: 10,
                            padding: '2px 8px',
                            fontWeight: 500,
                            background: 'linear-gradient(135deg, #ff6b35 0%, #ff8e53 100%)',
                            border: 'none',
                            color: '#fff',
                            fontSize: 12
                          }}
                        >
                          {item.unreadCount}条新消息
                        </Tag>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}

        {/* 全部已读按钮 */}
        {!loading && conversations.some(c => c.unreadCount > 0) && (
          <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255, 107, 53, 0.1)', textAlign: 'right' }}>
            <Button
              type="link"
              icon={<CheckCircleOutlined />}
              onClick={handleMarkAllAsRead}
              style={{ color: '#ff6b35' }}
            >
              全部标记为已读
            </Button>
          </div>
        )}
      </Card>

      {/* 统计信息 */}
      {!loading && conversations.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            共有 <Text strong style={{ color: '#ff6b35' }}>{conversations.length}</Text> 个对话
            {conversations.some(c => c.unreadCount > 0) && (
              <>，<Text strong style={{ color: '#ff4d4f' }}>{conversations.reduce((sum, c) => sum + c.unreadCount, 0)}</Text> 条未读消息</>
            )}
          </Text>
        </div>
      )}

      {selectedChat && (
        <ChatModal
          visible={!!selectedChat}
          onClose={handleChatClose}
          otherUser={selectedChat}
        />
      )}
    </PageLayout>
  );
}