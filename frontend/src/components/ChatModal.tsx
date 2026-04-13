import { useState, useEffect, useRef } from 'react';
import { Modal, Input, Button, message, Avatar, Typography, Space, Empty, Spin, Tag, Dropdown, type MenuProps } from 'antd';
import { SendOutlined, UserOutlined, ArrowLeftOutlined, WarningOutlined, MoreOutlined, StopOutlined, DeleteOutlined, SearchOutlined, CloseOutlined } from '@ant-design/icons';
import { getMessages, sendMessage, checkCanSendMessage, markAsRead, deleteMessage, recallMessage, blockUser, getConversations, searchMessages, type Message, type SearchResult } from '../api/message';
import { useAuthStore } from '../store/auth';
import { getErrorMessage } from '../utils/error';
import { useMessageStore } from '../store/message';
import { getAvatarUrl } from '../utils/images';
import ReportModal from './ReportModal';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

interface Props {
  visible: boolean;
  onClose: () => void;
  otherUser: { id: number; username: string; avatar?: string; avatarData?: string; bio?: string };
}

export default function ChatModal({ visible, onClose, otherUser }: Props) {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const currentUser = useAuthStore((s) => s.user);
  const { decrementUnread } = useMessageStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [canSend, setCanSend] = useState<{ canSend: boolean; reason?: string; isInitial?: boolean } | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    if (!visible || !isLoggedIn || !otherUser.id) return;
    setLoading(true);

    try {
      await markAsRead(otherUser.id);
      const conversations = await getConversations();
      const currentConv = conversations.find(c => c.otherUser.id === otherUser.id);
      if (currentConv && currentConv.unreadCount > 0) {
        decrementUnread(currentConv.unreadCount);
      }
    } catch { /* ignore */ }

    try {
      const [msgs, checkResult] = await Promise.all([
        getMessages(otherUser.id),
        checkCanSendMessage(otherUser.id),
      ]);
      setMessages(msgs);
      setCanSend(checkResult);
      if (!checkResult.canSend && checkResult.reason === '你已被对方拉黑') {
        setIsBlocked(true);
      }
    } catch (error: unknown) {
      void message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, otherUser.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || !canSend?.canSend) {
      if (!canSend?.canSend) void message.warning(canSend?.reason || '无法发送消息');
      return;
    }

    const content = inputValue.trim();
    setSending(true);
    setInputValue('');

    try {
      await sendMessage(otherUser.id, content);
      const msgs = await getMessages(otherUser.id);
      setMessages(msgs);
      setCanSend(await checkCanSendMessage(otherUser.id));
    } catch (error: unknown) {
      void message.error(getErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const isMe = (msg: Message) => msg.senderId === currentUser?.id;

  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchMessages(searchKeyword.trim(), otherUser.id);
      setSearchResults(results);
    } catch (error: unknown) {
      void message.error(getErrorMessage(error));
    } finally {
      setSearching(false);
    }
  };

  const toggleSearchMode = () => {
    setSearchMode(!searchMode);
    setSearchKeyword('');
    setSearchResults([]);
  };

  const handleDeleteMessage = async (messageId: number) => {
    try {
      await deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      void message.success('已删除');
    } catch (error: unknown) {
      void message.error(getErrorMessage(error));
    }
  };

  const handleRecallMessage = async (messageId: number) => {
    try {
      await recallMessage(messageId);
      const msgs = await getMessages(otherUser.id);
      setMessages(msgs);
      void message.success('已撤回');
    } catch (error: unknown) {
      void message.error(getErrorMessage(error));
    }
  };

  const handleBlockUser = async () => {
    try {
      await blockUser(otherUser.id);
      setIsBlocked(true);
      setCanSend({ canSend: false, reason: '已屏蔽' });
      void message.success('已屏蔽该用户');
      onClose();
    } catch (error: unknown) {
      void message.error(getErrorMessage(error));
    }
  };

  const menuItems: MenuProps['items'] = [
    { key: 'block', icon: <StopOutlined />, label: '屏蔽用户', danger: true, onClick: () => {
      Modal.confirm({ title: '屏蔽用户', content: `确定屏蔽 ${otherUser.username}？屏蔽后将无法互相发送消息。`, okText: '确定', okType: 'danger', cancelText: '取消', onOk: handleBlockUser });
    }},
    { type: 'divider' },
    { key: 'report', icon: <WarningOutlined />, label: '举报', danger: true, onClick: () => setReportModalOpen(true) },
  ];

  const getMsgMenu = (msg: Message): MenuProps['items'] => {
    if (msg.recalled) return [];
    const menuItems: MenuProps['items'] = [];
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    if (isMe(msg) && new Date(msg.createdAt).getTime() > twoMinutesAgo) {
      menuItems.push({ key: 'recall', icon: <DeleteOutlined />, label: '撤回', onClick: () => handleRecallMessage(msg.id) });
    }
    if (isMe(msg)) {
      menuItems.push({ key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true, onClick: () => handleDeleteMessage(msg.id) });
    }
    return menuItems;
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      closeIcon={<ArrowLeftOutlined style={{ fontSize: 16 }} />}
      title={null}
      footer={null}
      width={420}
      style={{ top: 24 }}
      styles={{
        body: { padding: 0, height: 560, display: 'flex', flexDirection: 'column' },
        wrapper: { borderRadius: 16, overflow: 'hidden' },
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
        <Avatar
          src={getAvatarUrl(otherUser)}
          icon={<UserOutlined />}
          size={40}
          style={{ cursor: 'pointer' }}
          onClick={() => { onClose(); navigate(`/profile?userId=${otherUser.id}`); }}
        />
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => { onClose(); navigate(`/profile?userId=${otherUser.id}`); }}>
          <Text strong style={{ fontSize: 15 }}>{otherUser.username}</Text>
          {isBlocked && <Tag color="red" style={{ marginLeft: 8, fontSize: 11 }}>已屏蔽</Tag>}
          {canSend && !canSend.canSend && !isBlocked && <Tag color="orange" style={{ marginLeft: 8, fontSize: 11 }}>{canSend.reason}</Tag>}
        </div>
        <Button icon={searchMode ? <CloseOutlined /> : <SearchOutlined />} type="text" onClick={toggleSearchMode} />
        <Dropdown menu={{ items: menuItems }} trigger={['click']}><Button icon={<MoreOutlined />} type="text" /></Dropdown>
      </div>

      {/* Search Bar */}
      {searchMode && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
          <Input.Search
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索聊天记录..."
            onSearch={handleSearch}
            loading={searching}
            enterButton
            allowClear
          />
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16, background: 'var(--bg-secondary)' }}>
        {searchMode ? (
          searchResults.length === 0 ? (
            searchKeyword ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Text type="secondary">未找到相关消息</Text>} style={{ marginTop: 60 }} />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Text type="secondary">输入关键词搜索</Text>} style={{ marginTop: 60 }} />
            )
          ) : (
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>找到 {searchResults.length} 条相关消息</Text>
              {searchResults.map(result => {
                const mine = result.senderId === currentUser?.id;
                return (
                  <div key={result.id} style={{
                    padding: 10,
                    background: 'var(--card-bg)',
                    borderRadius: 8,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>{mine ? '我' : result.otherUser.username}</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>{new Date(result.createdAt).toLocaleString('zh-CN')}</Text>
                    </div>
                    <div style={{ fontSize: 14 }} dangerouslySetInnerHTML={{ __html: result.content.replace(new RegExp(`(${searchKeyword})`, 'gi'), '<mark style="background:#ff6b35;color:#fff;padding:0 2px;border-radius:2px">$1</mark>') }} />
                  </div>
                );
              })}
            </Space>
          )
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : messages.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Text type="secondary">暂无消息</Text>} style={{ marginTop: 60 }} />
        ) : (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {messages.map(msg => {
              const mine = isMe(msg);
              const isRecalled = msg.recalled;
              return (
                <Dropdown key={msg.id} menu={{ items: getMsgMenu(msg) }} trigger={mine && !isRecalled ? ['contextMenu'] : []}>
                  <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
                    {!mine && !isRecalled && <Avatar src={getAvatarUrl(otherUser)} icon={<UserOutlined />} size={32} />}
                    {isRecalled && <div style={{ width: 32 }} />}
                    <div style={{
                      maxWidth: '70%',
                      padding: '10px 14px',
                      borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isRecalled ? 'var(--bg-tertiary)' : mine ? '#ff6b35' : 'var(--card-bg)',
                      color: isRecalled ? 'var(--text-tertiary)' : mine ? '#fff' : 'var(--text-primary)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                    }}>
                      <div style={{ fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word' }}>
                        {isRecalled ? '消息已撤回' : msg.content}
                      </div>
                      {!isRecalled && (
                        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                          <span>{new Date(msg.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                          {mine && <span style={{ color: msg.readAt ? '#e6f7ff' : 'rgba(255,255,255,0.7)' }}>{msg.readAt ? '已读' : '送达'}</span>}
                        </div>
                      )}
                    </div>
                    {mine && !isRecalled && <Avatar src={getAvatarUrl(currentUser)} icon={<UserOutlined />} size={32} />}
                    {!mine && <div style={{ width: 32 }} />}
                  </div>
                </Dropdown>
              );
            })}
            <div ref={messagesEndRef} />
          </Space>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: 12, borderTop: '1px solid var(--border-color)', background: 'var(--card-bg)', display: 'flex', gap: 8 }}>
        <Input.TextArea
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); handleSend(); }}}
          placeholder={isBlocked ? '已屏蔽' : canSend?.canSend ? '输入消息...' : canSend?.reason || '无法发送'}
          autoSize={{ minRows: 1, maxRows: 3 }}
          disabled={isBlocked || !canSend?.canSend}
          style={{ borderRadius: 20, resize: 'none' }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={sending}
          disabled={!inputValue.trim() || !canSend?.canSend || isBlocked}
          style={{ borderRadius: 20, width: 40, height: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ff6b35', border: 'none' }}
        />
      </div>

      <ReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        reportedUserId={otherUser.id}
        reportedUsername={otherUser.username}
        chatRecords={messages.map((msg, i) => ({
          id: i, senderId: msg.senderId, senderUsername: isMe(msg) ? currentUser?.username || '我' : otherUser.username, content: msg.content, createdAt: msg.createdAt,
        }))}
      />
    </Modal>
  );
}
