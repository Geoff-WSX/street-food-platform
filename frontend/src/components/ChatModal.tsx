import { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Input, Button, message, Avatar, Typography, Space, Empty, Spin, Tag, Dropdown, type MenuProps, Tooltip, Switch } from 'antd';
import { SendOutlined, UserOutlined, ArrowLeftOutlined, WarningOutlined, MoreOutlined, StopOutlined, DeleteOutlined, SearchOutlined, CloseOutlined, RobotOutlined, MessageOutlined } from '@ant-design/icons';
import { getMessages, sendMessage, checkCanSendMessage, markAsRead, deleteMessage, recallMessage, blockUser, getConversations, searchMessages, type Message, type SearchResult } from '../api/message';
import { useAuthStore } from '../store/auth';
import { getErrorMessage } from '../utils/error';
import { useMessageStore } from '../store/message';
import { getAvatarUrl } from '../utils/images';
import ReportModal from './ReportModal';
import { useNavigate } from 'react-router-dom';
import { chatWithAI, type ChatMessage } from '../api/ai';
import { getPosts } from '../api/post';
import { parseImages } from '../utils/images';
import type { Post } from '../types';

const { Text } = Typography;

// 聊天模式类型
type ChatMode = 'user' | 'ai';

// 消息发送状态
type MessageStatus = 'sending' | 'success' | 'error';

// 扩展的AI消息类型，包含状态信息
interface MessageWithStatus extends ChatMessage {
  status?: MessageStatus;
  errorMessage?: string;
}

// AI模式欢迎消息
const aiWelcomeMessage: ChatMessage = {
  role: 'assistant',
  content: '你好呀！我是小边 🍜 你的食遇美食助手！\n\n我可以帮你：\n🔍 搜索附近的美食\n🍜 查找特定类型的街头美食\n📍 根据地点推荐美食聚集地\n🔥 查看热门美食榜单\n\n试试这样问我：\n• "杭州有什么好吃的？"\n• "推荐辣味美食"\n• "上海哪里有小吃？"\n\n说说你想了解什么吧～',
};

// 打字动画样式
const typingAnimationStyle = `
  @keyframes typing {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-4px); }
  }
`;

// 系统提示词
const createFoodieSystemPrompt = (): string => {
  return `你是小边，一个热情的食遇美食助手！你热爱美食，喜欢探索城市的街头美食。
你可以推荐美食聚集地、查找特定类型的小吃、给出旅游美食攻略、搜索热门美食。
回答时要用轻松友好的语气，多使用表情符号，让对话更有趣。
当你需要搜索美食时，可以使用 search_posts 工具来查找相关内容。`;
};

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

  // 聊天模式状态
  const [chatMode, setChatMode] = useState<ChatMode>('user');

  // 用户聊天状态
  const [userMessages, setUserMessages] = useState<Message[]>([]);
  const [userInputValue, setUserInputValue] = useState('');
  const [userSending, setUserSending] = useState(false);
  const [canSend, setCanSend] = useState<{ canSend: boolean; reason?: string; isInitial?: boolean; isAdmin?: boolean } | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  // AI聊天状态
  const [aiMessages, setAiMessages] = useState<MessageWithStatus[]>([aiWelcomeMessage]);
  const [aiInputValue, setAiInputValue] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [suggestedPosts, setSuggestedPosts] = useState<Post[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const quickQuestions = [
    '杭州有什么好吃的？',
    '推荐成都的美食',
    '上海哪里有小吃？',
    '推荐辣味美食',
    '给个旅游美食攻略',
  ];

  // 共享状态
  const [loading, setLoading] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadMessages = async () => {
    if (!visible || !isLoggedIn || !otherUser.id) return;

    // 只在用户聊天模式下加载消息
    if (chatMode === 'user') {
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
        setUserMessages(msgs);
        setCanSend(checkResult);
        if (!checkResult.canSend && checkResult.reason === '你已被对方拉黑') {
          setIsBlocked(true);
        }
      } catch (error: unknown) {
        void message.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, otherUser.id, chatMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [userMessages, aiMessages]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 切换聊天模式
  const handleModeSwitch = useCallback((newMode: ChatMode) => {
    setChatMode(newMode);
    if (newMode === 'ai') {
      // 切换到AI模式时的初始化
      setShowSuggestions(false);
      setSuggestedPosts([]);
    }
    // 清空搜索状态
    setSearchMode(false);
    setSearchKeyword('');
    setSearchResults([]);
  }, []);

  // 用户聊天发送
  const handleUserSend = async () => {
    if (!userInputValue.trim() || !canSend?.canSend) {
      if (!canSend?.canSend) void message.warning(canSend?.reason || '无法发送消息');
      return;
    }

    const content = userInputValue.trim();
    setUserSending(true);
    setUserInputValue('');

    try {
      await sendMessage(otherUser.id, content);
      const msgs = await getMessages(otherUser.id);
      setUserMessages(msgs);
      setCanSend(await checkCanSendMessage(otherUser.id));
    } catch (error: unknown) {
      void message.error(getErrorMessage(error));
    } finally {
      setUserSending(false);
    }
  };

  // AI聊天发送
  const handleAISend = async (msg?: string) => {
    const userMessage = msg || aiInputValue.trim();
    if (!userMessage) return;

    // 添加用户消息（带状态）
    const newUserMessage: MessageWithStatus = {
      role: 'user',
      content: userMessage,
      status: 'sending'
    };
    setAiMessages((prev) => [...prev, newUserMessage]);
    setAiInputValue('');
    setAiLoading(true);
    setShowTypingIndicator(true);
    setShowSuggestions(false);
    setSuggestedPosts([]);

    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();

    try {
      const systemPrompt = createFoodieSystemPrompt();
      const conversationHistory = [...aiMessages.map(({ status, errorMessage, ...msg }) => msg), { role: 'user' as const, content: userMessage }];

      const res = await chatWithAI({
        message: userMessage,
        conversationHistory,
        systemPrompt,
        mode: 'foodie',
      }, abortControllerRef.current.signal);

      // 更新用户消息状态为成功
      setAiMessages((prev) =>
        prev.map((msg, index) =>
          index === prev.length - 1 ? { ...msg, status: 'success' as const } : msg
        )
      );

      const aiMessage: MessageWithStatus = {
        role: 'assistant',
        content: res.data.data.message,
        status: 'success',
      };
      setAiMessages((prev) => [...prev, aiMessage]);

      // 获取推荐的动态
      const suggestedIds = res.data.data.suggestedPosts || [];
      if (suggestedIds.length > 0) {
        const allPosts = await getPosts({ page: 1, pageSize: 100 });
        const postsData = allPosts.data || [];
        const suggested = postsData.filter((p: Post) => suggestedIds.includes(p.id));
        if (suggested.length > 0) {
          setSuggestedPosts(suggested);
          setShowSuggestions(true);
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '网络连接失败，请检查网络后重试';

      // 更新用户消息状态为失败
      setAiMessages((prev) =>
        prev.map((msg, index) =>
          index === prev.length - 1 ? {
            ...msg,
            status: 'error' as const,
            errorMessage
          } : msg
        )
      );

      // 显示友好的错误提示
      void message.error({
        content: errorMessage,
        duration: 5,
        key: 'ai-error'
      });
    } finally {
      setAiLoading(false);
      setShowTypingIndicator(false);
    }
  };

  // 重发失败的消息
  const handleResendMessage = useCallback(async (messageContent: string) => {
    await handleAISend(messageContent);
  }, [handleAISend]);

  // 根据模式处理发送
  const handleSend = async () => {
    if (chatMode === 'user') {
      await handleUserSend();
    } else {
      await handleAISend();
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
      setUserMessages(prev => prev.filter(m => m.id !== messageId));
      void message.success('已删除');
    } catch (error: unknown) {
      void message.error(getErrorMessage(error));
    }
  };

  const handleRecallMessage = async (messageId: number) => {
    try {
      await recallMessage(messageId);
      const msgs = await getMessages(otherUser.id);
      setUserMessages(msgs);
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

  // 处理推荐动态点击
  const handlePostClick = (postId: number) => {
    navigate(`/post/${postId}`);
  };

  // 清空AI聊天
  const clearAIChat = () => {
    setAiMessages([aiWelcomeMessage]);
    setSuggestedPosts([]);
    setShowSuggestions(false);
    void message.success('已清空AI对话');
  };

  return (
    <>
      <style>{typingAnimationStyle}</style>
      <Modal
        open={visible}
        onCancel={onClose}
        closeIcon={null}
        title={null}
        footer={null}
        width={chatMode === 'ai' ? 800 : 420}
        style={{ top: 24, zIndex: 1050 }}
        styles={{
          body: { padding: 0, height: 560, display: 'flex', flexDirection: 'column' },
          wrapper: { borderRadius: 16, overflow: 'hidden' },
          mask: { zIndex: 1050 },
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            type="text"
            onClick={onClose}
            style={{ fontSize: 16, padding: '4px 8px' }}
          />
          {chatMode === 'user' ? (
            <>
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
                {canSend?.isAdmin && <Tag color="blue" style={{ marginLeft: 8, fontSize: 11 }}>管理员</Tag>}
              </div>
            </>
          ) : (
            <>
              <Avatar
                size={40}
                src="https://api.dicebear.com/7.x/bottts/svg?seed=Xiaobian"
                icon={<RobotOutlined />}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ fontSize: 15 }}>小边 🍜</Text>
                <Tag color="orange" style={{ marginLeft: 8, fontSize: 11 }}>美食助手</Tag>
              </div>
            </>
          )}

          {/* 模式切换 */}
          <Tooltip title={chatMode === 'user' ? '切换到AI助手' : '切换到用户聊天'}>
            <Switch
              checked={chatMode === 'ai'}
              onChange={(checked) => handleModeSwitch(checked ? 'ai' : 'user')}
              checkedChildren={<RobotOutlined />}
              unCheckedChildren={<MessageOutlined />}
              style={{ marginRight: 8 }}
            />
          </Tooltip>

          {chatMode === 'user' && (
            <>
              <Button icon={searchMode ? <CloseOutlined /> : <SearchOutlined />} type="text" onClick={toggleSearchMode} />
              <Dropdown menu={{ items: menuItems }} trigger={['click']}><Button icon={<MoreOutlined />} type="text" /></Dropdown>
            </>
          )}
          {chatMode === 'ai' && aiMessages.length > 1 && (
            <Button type="text" size="small" onClick={clearAIChat} style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              清空对话
            </Button>
          )}
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
        {chatMode === 'user' ? (
          // 用户聊天模式
          searchMode ? (
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
          ) : userMessages.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Text type="secondary">暂无消息</Text>} style={{ marginTop: 60 }} />
          ) : (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {userMessages.map(msg => {
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
          )
        ) : (
          // AI聊天模式
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {aiMessages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const status = msg.status;
              return (
                <div key={index} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-start' }}>
                  {!isUser && (
                    <Avatar
                      size={32}
                      src="https://api.dicebear.com/7.x/bottts/svg?seed=Xiaobian"
                      icon={<RobotOutlined />}
                    />
                  )}
                  <div style={{
                    maxWidth: '75%',
                    padding: '12px 16px',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isUser ? '#ff6b35' : 'var(--card-bg)',
                    color: isUser ? '#fff' : 'var(--text-primary)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  }}>
                    {status === 'error' ? (
                      <>
                        <div style={{ fontSize: 14, marginBottom: 8 }}>{msg.content}</div>
                        <Text type="danger" style={{ fontSize: 12 }}>发送失败: {msg.errorMessage}</Text>
                        <Button size="small" type="primary" onClick={() => handleResendMessage(msg.content)} style={{ marginLeft: 8, fontSize: 11 }}>
                          重试
                        </Button>
                      </>
                    ) : (
                      <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    )}
                    {status === 'sending' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 11, opacity: 0.7 }}>
                        <Spin size="small" /> 发送中...
                      </div>
                    )}
                  </div>
                  {isUser && <Avatar src={getAvatarUrl(currentUser)} icon={<UserOutlined />} size={32} />}
                  {!isUser && <div style={{ width: 32 }} />}
                </div>
              );
            })}
            {showTypingIndicator && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Avatar size={32} src="https://api.dicebear.com/7.x/bottts/svg?seed=Xiaobian" icon={<RobotOutlined />} />
                <div style={{ padding: '12px 16px', background: 'var(--card-bg)', borderRadius: '16px 16px 16px 4px', display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ animation: 'typing 1.4s infinite', animationDelay: '0s' }}>●</span>
                  <span style={{ animation: 'typing 1.4s infinite', animationDelay: '0.2s' }}>●</span>
                  <span style={{ animation: 'typing 1.4s infinite', animationDelay: '0.4s' }}>●</span>
                </div>
              </div>
            )}
            {/* 推荐动态 */}
            {showSuggestions && suggestedPosts.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>🍜 推荐动态</Text>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {suggestedPosts.map(post => (
                    <div
                      key={post.id}
                      onClick={() => handlePostClick(post.id)}
                      style={{
                        padding: 10,
                        background: 'var(--card-bg)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        border: '1px solid var(--border-color)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#ff6b35'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                    >
                      <div style={{ display: 'flex', gap: 8 }}>
                        {post.images && post.images.length > 0 && (
                          <img
                            src={parseImages(post.images)[0]}
                            alt={post.content}
                            style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6 }}
                          />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {post.content}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {post.user?.username} · {post.address || '未知地点'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </Space>
              </div>
            )}
            {/* 快捷问题 */}
            {aiMessages.length === 1 && !aiLoading && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>💡 快捷问题</Text>
                <Space wrap>
                  {quickQuestions.map((q, i) => (
                    <Tag
                      key={i}
                      style={{ cursor: 'pointer', fontSize: 12, padding: '4px 10px' }}
                      onClick={() => handleAISend(q)}
                    >
                      {q}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}
            <div ref={messagesEndRef} />
          </Space>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: 12, borderTop: '1px solid var(--border-color)', background: 'var(--card-bg)', display: 'flex', gap: 8 }}>
        <Input.TextArea
          value={chatMode === 'user' ? userInputValue : aiInputValue}
          onChange={e => { chatMode === 'user' ? setUserInputValue(e.target.value) : setAiInputValue(e.target.value); }}
          onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); handleSend(); }}}
          placeholder={chatMode === 'user' ? (isBlocked ? '已屏蔽' : canSend?.canSend ? '输入消息...' : canSend?.reason || '无法发送') : '问我任何关于美食的问题...'}
          autoSize={{ minRows: 1, maxRows: 3 }}
          disabled={chatMode === 'user' && (isBlocked || !canSend?.canSend)}
          style={{ borderRadius: 20, resize: 'none' }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={chatMode === 'user' ? userSending : aiLoading}
          disabled={chatMode === 'user' ? (!userInputValue.trim() || !canSend?.canSend || isBlocked) : !aiInputValue.trim()}
          style={{ borderRadius: 20, width: 40, height: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ff6b35', border: 'none' }}
        />
      </div>

      {chatMode === 'user' && (
        <ReportModal
          open={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          reportedUserId={otherUser.id}
          reportedUsername={otherUser.username}
          chatRecords={userMessages.map((msg, i) => ({
            id: i, senderId: msg.senderId, senderUsername: isMe(msg) ? currentUser?.username || '我' : otherUser.username, content: msg.content, createdAt: msg.createdAt,
          }))}
        />
      )}
    </Modal>
    </>
  );
}
