import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, List, Avatar, Typography, Tag, Empty, Badge, Space, Skeleton, Modal, message, Button } from 'antd';
import { UserOutlined, MailOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { getConversations, deleteConversation, markAsRead, type Conversation } from '../api/message';
import ChatModal from '../components/ChatModal';
import { useAuthStore } from '../store/auth';
import { useMessageStore } from '../store/message';
import { getErrorMessage } from '../utils/error';

const { Text, Title } = Typography;

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
  const [selectedChat, setSelectedChat] = useState<{ id: number; username: string; avatar?: string } | null>(null);

  const loadConversations = useCallback(async () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const data = await getConversations();
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
    loadConversations(); // 刷新列表以更新未读数
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
    <>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 0 80px', background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)', minHeight: '80vh' }}>
        {/* 页面标题 */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
            }}>
              <MailOutlined style={{ fontSize: 24, color: '#fff' }} />
            </div>
            <Title level={2} style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              私信消息
            </Title>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <Text type="secondary" style={{ fontSize: 15 }}>
              💬 与其他美食爱好者交流互动
            </Text>
            {!loading && conversations.some(c => c.unreadCount > 0) && (
              <Button
                type="link"
                icon={<CheckCircleOutlined />}
                onClick={handleMarkAllAsRead}
                style={{ padding: 0, fontSize: 14 }}
              >
                全部已读
              </Button>
            )}
          </div>
        </div>

        <Card
          style={{
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid #f0f0f0',
            background: '#fff'
          }}
          bodyStyle={{ padding: 0 }}
        >
          {loading ? (
            <div>
              {[1, 2, 3, 4, 5].map(i => <ConversationSkeleton key={i} />)}
            </div>
          ) : conversations.length === 0 ? (
            <Empty
              imageStyle={{ height: 100 }}
              description={
                <Space direction="vertical" style={{ gap: 12 }}>
                  <div style={{ fontSize: 48 }}>📩</div>
                  <Text style={{ fontSize: 16, color: '#595959' }}>暂无私信对话</Text>
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
                    padding: '20px 24px',
                    cursor: 'pointer',
                    borderBottom: index === conversations.length - 1 ? 'none' : '1px solid #f0f0f0',
                    transition: 'all 0.3s ease',
                    animation: `fadeInUp 0.5s ease ${index * 0.1}s both`
                  }}
                  className="conversation-item"
                  onClick={() => handleOpenChat(item)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.05)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge count={item.unreadCount} offset={[-4, 4]}>
                        <Avatar
                          src={item.otherUser.avatar}
                          icon={<UserOutlined />}
                          size={56}
                          style={{
                            border: item.unreadCount > 0 ? '3px solid #667eea' : '2px solid #f0f0f0',
                            boxShadow: item.unreadCount > 0 ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none'
                          }}
                        />
                      </Badge>
                    }
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <Text strong style={{
                          fontSize: 16,
                          color: item.unreadCount > 0 ? '#262626' : '#595959',
                          fontWeight: item.unreadCount > 0 ? 600 : 500
                        }}>
                          {item.otherUser.username}
                        </Text>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Text type="secondary" style={{ fontSize: 12, color: '#8c8c8c' }}>
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
                        </div>
                        <Text strong style={{
                          fontSize: 16,
                          color: item.unreadCount > 0 ? '#262626' : '#595959',
                          fontWeight: item.unreadCount > 0 ? 600 : 500
                        }}>
                          {item.otherUser.username}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12, color: '#8c8c8c' }}>
                          {item.lastMessage
                            ? new Date(item.lastMessage.createdAt).toLocaleDateString('zh-CN')
                            : new Date(item.updatedAt).toLocaleDateString('zh-CN')}
                        </Text>
                      </div>
                    }
                    description={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text
                          ellipsis
                          style={{
                            fontSize: 14,
                            maxWidth: 400,
                            color: item.unreadCount > 0 ? '#262626' : '#8c8c8c',
                            fontWeight: item.unreadCount > 0 ? 500 : 'normal'
                          }}
                        >
                          {item.lastMessage?.content || '暂无消息'}
                        </Text>
                        {item.unreadCount > 0 && (
                          <Tag
                            color="blue"
                            style={{
                              marginLeft: 12,
                              borderRadius: 12,
                              padding: '2px 10px',
                              fontWeight: 500,
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              border: 'none'
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
        </Card>

        {/* 统计信息 */}
        {!loading && conversations.length > 0 && (
          <div style={{
            marginTop: 24,
            textAlign: 'center',
            padding: '16px 0',
            background: 'linear-gradient(to right, transparent, rgba(102, 126, 234, 0.1), transparent)'
          }}>
            <Space size={12}>
              <div style={{ width: 40, height: 1, background: 'linear-gradient(to right, transparent, #d9d9d9, transparent)' }} />
              <Text type="secondary" style={{ fontSize: 14, color: '#8c8c8c' }}>
                共有 <Text strong style={{ color: '#667eea' }}>{conversations.length}</Text> 个对话
                {conversations.some(c => c.unreadCount > 0) && (
                  <>，<Text strong style={{ color: '#ff4d4f' }}> {conversations.reduce((sum, c) => sum + c.unreadCount, 0)}</Text> 条未读消息</>
                )}
              </Text>
              <div style={{ width: 40, height: 1, background: 'linear-gradient(to right, transparent, #d9d9d9, transparent)' }} />
            </Space>
          </div>
        )}
      </div>

      {selectedChat && (
        <ChatModal
          visible={!!selectedChat}
          onClose={handleChatClose}
          otherUser={selectedChat}
        />
      )}

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
