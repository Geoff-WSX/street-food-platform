import { useState, useEffect, useRef } from 'react';
import { Modal, Input, Button, message, Avatar, Typography, Space, Empty, Spin, Tag, Dropdown } from 'antd';
import { SendOutlined, UserOutlined, ArrowLeftOutlined, WarningOutlined, MoreOutlined } from '@ant-design/icons';
import { getMessages, sendMessage, checkCanSendMessage, markAsRead, type Message } from '../api/message';
import { useAuthStore } from '../store/auth';
import { useMessageStore } from '../store/message';
import ReportModal from './ReportModal';
import type { MenuProps } from 'antd';

const { Text } = Typography;

interface Props {
  visible: boolean;
  onClose: () => void;
  otherUser: { id: number; username: string; avatar?: string };
}

export default function ChatModal({ visible, onClose, otherUser }: Props) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const currentUser = useAuthStore((s) => s.user);
  const { decrementUnread } = useMessageStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [canSend, setCanSend] = useState<{ canSend: boolean; reason?: string; isInitial?: boolean } | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 加载消息
  const loadMessages = async () => {
    if (!visible || !isLoggedIn || !otherUser.id) return;
    setLoading(true);
    try {
      const [msgs, checkResult] = await Promise.all([
        getMessages(otherUser.id),
        checkCanSendMessage(otherUser.id),
      ]);
      setMessages(msgs);
      setCanSend(checkResult);

      // 计算并减少未读消息数
      const unreadMessages = msgs.filter((msg) => msg.senderId !== currentUser?.id && !msg.readAt);
      if (unreadMessages.length > 0) {
        decrementUnread(unreadMessages.length);
      }

      // 标记消息为已读
      await markAsRead(otherUser.id);
    } catch (error: any) {
      void message.error(error.response?.data?.message || '加载消息失败');
    } finally {
      setLoading(false);
    }
  };

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadMessages();
  }, [visible, otherUser.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    if (!canSend?.canSend) {
      void message.warning(canSend?.reason || '无法发送消息');
      return;
    }

    setSending(true);
    try {
      const newMessage = await sendMessage(otherUser.id, inputValue.trim());
      setMessages((prev) => [...prev, newMessage]);
      setInputValue('');
      // 重新检查是否可以继续发送
      const checkResult = await checkCanSendMessage(otherUser.id);
      setCanSend(checkResult);
    } catch (error: any) {
      void message.error(error.response?.data?.message || '发送失败');
    } finally {
      setSending(false);
    }
  };

  const isMe = (msg: Message) => msg.senderId === currentUser?.id;

  // 更多操作菜单
  const moreMenuItems: MenuProps['items'] = [
    {
      key: 'report',
      icon: <WarningOutlined />,
      label: '举报用户',
      onClick: () => setReportModalOpen(true),
      danger: true,
    },
  ];

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      closeIcon={<ArrowLeftOutlined />}
      title={null}
      footer={null}
      width={500}
      style={{ top: 20 }}
      bodyStyle={{ padding: 0, height: 600, display: 'flex', flexDirection: 'column' }}
    >
      {/* 头部 */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <Avatar
          src={otherUser.avatar}
          icon={<UserOutlined />}
          size={40}
        />
        <div style={{ flex: 1 }}>
          <Text strong style={{ fontSize: 16 }}>{otherUser.username}</Text>
          {canSend && !canSend.canSend && (
            <Tag color="warning" style={{ marginLeft: 8, fontSize: 12 }}>
              {canSend.reason}
            </Tag>
          )}
        </div>
        <Dropdown menu={{ items: moreMenuItems }} placement="bottomRight" trigger={['click']}>
          <Button icon={<MoreOutlined />} shape="circle" type="text" />
        </Dropdown>
      </div>

      {/* 消息列表 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 24px',
        backgroundColor: '#fafafa'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : messages.length === 0 ? (
          <Empty
            description={
              <div>
                <div>暂无消息</div>
                {canSend?.isInitial && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    你可以发送第一条消息
                  </Text>
                )}
              </div>
            }
            style={{ marginTop: 60 }}
          />
        ) : (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isMe(msg) ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{
                  maxWidth: '70%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  backgroundColor: isMe(msg) ? '#1890ff' : '#fff',
                  color: isMe(msg) ? '#fff' : '#333',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}>
                  <div style={{ fontSize: 14, wordBreak: 'break-word' }}>
                    {msg.content}
                  </div>
                  <div style={{
                    fontSize: 11,
                    opacity: 0.7,
                    marginTop: 4,
                    textAlign: 'right'
                  }}>
                    {new Date(msg.createdAt).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </Space>
        )}
      </div>

      {/* 输入框 */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        gap: 8,
        alignItems: 'flex-end'
      }}>
        <div style={{ flex: 1 }}>
          <Input.TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              canSend?.isInitial
                ? `发送第一条消息给${otherUser.username}...`
                : canSend?.canSend
                ? '输入消息...'
                : canSend?.reason || '输入消息...'
            }
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={!canSend?.canSend}
            style={{ borderRadius: 20 }}
          />
          {canSend && !canSend.canSend && (
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              {canSend.reason}
            </Text>
          )}
        </div>
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={sending}
          disabled={!inputValue.trim() || !canSend?.canSend}
          style={{
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        />
      </div>

      {/* 举报弹窗 */}
      <ReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        reportedUserId={otherUser.id}
        reportedUsername={otherUser.username}
        chatRecords={messages.map(msg => ({
          senderId: msg.senderId,
          senderUsername: isMe(msg) ? currentUser?.username || '我' : otherUser.username,
          content: msg.content,
          createdAt: msg.createdAt,
        }))}
      />
    </Modal>
  );
}
