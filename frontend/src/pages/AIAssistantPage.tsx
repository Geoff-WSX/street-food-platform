import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Card, Input, Button, Space, Typography, Avatar, Spin, Tag, message, Badge, List, Modal, Switch, Tooltip, Alert
} from 'antd';
import {
  SendOutlined, RobotOutlined, UserOutlined, BulbOutlined,
  EnvironmentOutlined, FireOutlined, StarOutlined, CloseOutlined,
  PlusOutlined, CarOutlined, CompassOutlined, MessageOutlined,
  DeleteOutlined, HistoryOutlined, ArrowLeftOutlined,
  SafetyOutlined, ReloadOutlined
} from '@ant-design/icons';
import { chatWithAI, type ChatMessage } from '../api/ai';
import { getPosts } from '../api/post';
import { parseImages, getAvatarUrl } from '../utils/images';
import type { Post } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

const { Text, Paragraph } = Typography;

// 小边身份模式
type XiaobianMode = 'foodie' | 'admin';

// 聊天会话类型
interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  suggestedPosts: Post[];
  excludedPostIds: number[];
  mode: XiaobianMode;
  createdAt: number;
  updatedAt: number;
}

// localStorage 键名
const STORAGE_KEYS = {
  SESSIONS: 'xiaobian_sessions',
  CURRENT_SESSION: 'xiaobian_current_session',
};

// 消息发送状态
type MessageStatus = 'sending' | 'success' | 'error';

// 扩展的消息类型，包含状态信息
interface MessageWithStatus extends ChatMessage {
  status?: MessageStatus;
  errorMessage?: string;
}

// 美食模式欢迎消息
const foodieWelcomeMessage: ChatMessage = {
  role: 'assistant',
  content: '你好呀！我是小边 🍜 你的食遇美食助手！\n\n我可以帮你：\n🔍 搜索附近的美食\n🍜 查找特定类型的街头美食\n📍 根据地点推荐美食聚集地\n🔥 查看热门美食榜单\n\n试试这样问我：\n• "杭州有什么好吃的？"\n• "推荐辣味美食"\n• "上海哪里有小吃？"\n\n说说你想了解什么吧～',
};

// 管理模式欢迎消息
const adminWelcomeMessage: ChatMessage = {
  role: 'assistant',
  content: '小边管理系统已启动 🛠️\n\n我可以帮你：\n🔍 排查项目中的 Bug 和问题\n📊 查看平台数据统计\n🛠️ 执行代码修复\n✅ 验证修复结果\n📋 审核举报内容\n\n当前技能：\n• Bug 排查/审核/解决/验证\n• 举报审核与处理\n• 平台数据统计\n• 系统状态监控\n• 代码分析与修改\n\n试试这样问我：\n• "查看平台数据"\n• "排查前端报错"\n• "有哪些待处理的举报？"\n\n请告诉我需要做什么～',
};

// 系统提示词生成器
const createSystemPrompt = (mode: XiaobianMode): string => {
  if (mode === 'admin') {
    return `你是小边管理系统，具有以下技能：
1. Bug 排查技能 (bug-detection) - 排查项目中的问题
2. Bug 审核技能 (bug-review) - 审核问题并给出方案
3. Bug 解决技能 (bug-solution) - 执行代码修复
4. Bug 验证技能 (bug-verification) - 验证修复结果
5. 审核员技能 (review-guide) - 审核举报内容
6. 证据分析技能 (evidence-analysis) - 分析证据材料
7. 违规判断技能 (violation-judgment) - 判断是否违规

新增能力：
- 平台数据统计 (get_dashboard_stats) - 查看用户、动态、评论等统计数据
- 系统状态监控 (get_system_info) - 查看CPU、内存、数据库连接等系统信息
- 动态搜索 (search_posts) - 按关键词和地点搜索美食动态
- 评论查询 (get_comments) - 查看评论详情

你有权限访问和分析项目代码、查看数据库、执行命令。请根据用户需求使用合适的技能。`;
  }

  return `你是小边，一个热情的食遇美食助手！你热爱美食，喜欢探索城市的街头美食。
你可以推荐美食聚集地、查找特定类型的小吃、给出旅游美食攻略、搜索热门美食。
回答时要用轻松友好的语气，多使用表情符号，让对话更有趣。
当你需要搜索美食时，可以使用 search_posts 工具来查找相关内容。`;
};

// 生成会话标题
const generateSessionTitle = (messages: ChatMessage[]): string => {
  const userMessages = messages.filter(m => m.role === 'user');
  if (userMessages.length === 0) return '新对话';
  const firstMessage = userMessages[0].content;
  return firstMessage.length > 15 ? firstMessage.substring(0, 15) + '...' : firstMessage;
};

// 添加打字动画样式
const typingAnimationStyle = `
  @keyframes typing {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-4px); }
  }
`;

export default function AIAssistantPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string } | null)?.from || '/';
  const { user } = useAuthStore();

  // 小边身份模式
  const [xiaobianMode, setXiaobianMode] = useState<XiaobianMode>('foodie');

  // 会话管理
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
    } catch {
      return null;
    }
  });
  const [showSessionPanel, setShowSessionPanel] = useState(true);

  // 当前会话状态 - 从保存的会话中初始化
  const getInitialState = () => {
    const savedSessionId = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
    const storedSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);

    if (savedSessionId && storedSessions) {
      try {
        const allSessions: ChatSession[] = JSON.parse(storedSessions);
        const currentSession = allSessions.find(s => s.id === savedSessionId);
        if (currentSession) {
          return {
            messages: currentSession.messages,
            suggestedPosts: currentSession.suggestedPosts,
            excludedPostIds: new Set(currentSession.excludedPostIds),
            showSuggestions: currentSession.suggestedPosts.length > 0,
            mode: currentSession.mode || 'foodie' as XiaobianMode,
          };
        }
      } catch (e) {
        // 静默处理错误，使用默认状态
      }
    }

    return {
      messages: [foodieWelcomeMessage],
      suggestedPosts: [],
      excludedPostIds: new Set<number>(),
      showSuggestions: false,
      mode: 'foodie' as XiaobianMode,
    };
  };

  const initialState = getInitialState();
  const [messages, setMessages] = useState<MessageWithStatus[]>(initialState.messages);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedPosts, setSuggestedPosts] = useState<Post[]>(initialState.suggestedPosts);
  const [excludedPostIds, setExcludedPostIds] = useState<Set<number>>(initialState.excludedPostIds);
  const [showSuggestions, setShowSuggestions] = useState(initialState.showSuggestions);
  const [showMap, setShowMap] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 使用 ref 来确保总是获取最新的模式值
  const xiaobianModeRef = useRef<XiaobianMode>(initialState.mode);

  // 更新 ref 当模式变化时
  useEffect(() => {
    xiaobianModeRef.current = xiaobianMode;
  }, [xiaobianMode]);

  // 初始化模式状态
  useEffect(() => {
    setXiaobianMode(initialState.mode);
  }, []);

  // 根据模式获取推荐问题
  const getQuickQuestions = useCallback((mode: XiaobianMode) => {
    if (mode === 'foodie') {
      return [
        '杭州有什么好吃的？',
        '推荐成都的美食',
        '上海哪里有小吃？',
        '推荐辣味美食',
        '给个旅游美食攻略',
      ];
    } else {
      return [
        '查看平台数据统计',
        '查看系统状态',
        '排查前端问题',
        '检查 API 错误',
        '查看待处理举报',
      ];
    }
  }, []);

  // 动态推荐的快捷问题
  const [quickQuestions, setQuickQuestions] = useState<string[]>(getQuickQuestions(xiaobianMode));

  // 切换小边身份模式
  const handleModeSwitch = useCallback((newMode: XiaobianMode) => {
    setXiaobianMode(newMode);

    // 清空当前会话并切换欢迎消息
    const welcomeMessage = newMode === 'foodie' ? foodieWelcomeMessage : adminWelcomeMessage;
    setMessages([welcomeMessage]);
    setSuggestedPosts([]);
    setExcludedPostIds(new Set<number>());
    setShowSuggestions(false);
    setInputValue('');

    // 立即更新推荐问题
    setQuickQuestions(getQuickQuestions(newMode));

    // 保存状态
    localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);

    // 显示切换提示
    void message.success(
      newMode === 'foodie' ? '已切换到美食助手模式' : '已切换到管理模式'
    );
  }, [getQuickQuestions]);

  // 更新快捷问题（当模式切换时）
  useEffect(() => {
    setQuickQuestions(getQuickQuestions(xiaobianMode));
  }, [xiaobianMode, getQuickQuestions]);

  // 根据对话内容生成推荐的后续问题
  const generateFollowUpQuestions = useCallback((userMessage: string, aiResponse: string): string[] => {
    // 使用 ref 获取最新的模式值
    const currentMode = xiaobianModeRef.current;

    // 管理模式下不生成后续问题
    if (currentMode === 'admin') {
      return [
        '查看详细数据',
        '继续排查问题',
        '执行修复操作',
        '验证修复结果',
      ];
    }

    const lowerMessage = userMessage.toLowerCase();
    const lowerResponse = aiResponse.toLowerCase();

    // 城市相关
    const cityMatch = lowerMessage.match(/(北京|上海|广州|深圳|杭州|成都|重庆|西安|武汉|南京|苏州|天津|青岛|大连|厦门|长沙|郑州)/);
    const city = cityMatch ? cityMatch[1] : null;

    // 美食类型
    const foodTypes = ['火锅', '烧烤', '小龙虾', '面食', '米粉', '川菜', '粤菜', '湘菜', '鲁菜', '甜点', '奶茶', '炸鸡'];
    const mentionedFood = foodTypes.find(type => lowerMessage.includes(type) || lowerResponse.includes(type));

    const questions: string[] = [];

    if (city) {
      questions.push(`${city}有什么必吃的美食？`);
      questions.push(`${city}哪里有夜市？`);
      questions.push(`推荐${city}的街头小吃`);
    }

    if (mentionedFood) {
      questions.push(`推荐好吃的${mentionedFood}`);
      questions.push(`${mentionedFood}哪家店最正宗？`);
    }

    if (lowerMessage.includes('推荐') || lowerMessage.includes('哪里')) {
      questions.push('给我具体的地址');
      questions.push('这些地方营业到几点？');
      questions.push('人均消费多少？');
    }

    if (lowerMessage.includes('攻略') || lowerMessage.includes('旅游')) {
      questions.push('有哪些网红打卡地？');
      questions.push('本地人常去的地方');
      questions.push('适合拍照的美食店');
    }

    if (lowerMessage.includes('辣') || lowerMessage.includes('重口味')) {
      questions.push('有什么不辣的推荐？');
      questions.push('适合带外地朋友去的');
    }

    // 如果没有生成足够的问题，使用默认问题
    if (questions.length < 3) {
      questions.push('还有其他推荐吗？');
      questions.push('附近有什么好吃的？');
    }

    // 返回前4个不重复的问题
    return Array.from(new Set(questions)).slice(0, 4);
  }, []);

  // 保存会话到 localStorage（优化性能）
  const saveSessions = useCallback((newSessions: ChatSession[]) => {
    try {
      // 清理防抖定时器
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // 使用防抖避免频繁保存
      saveTimerRef.current = setTimeout(() => {
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(newSessions));
      }, 300);
    } catch (e) {
      // 静默处理存储错误
    }
  }, []);

  // 加载会话（不依赖 sessions，避免循环更新）
  const loadSession = useCallback((sessionId: string, sessionsList: ChatSession[]) => {
    const session = sessionsList.find(s => s.id === sessionId);
    if (session) {
      setMessages(session.messages);
      setSuggestedPosts(session.suggestedPosts);
      setExcludedPostIds(new Set(session.excludedPostIds));
      setShowSuggestions(session.suggestedPosts.length > 0);
      setQuickQuestions(getQuickQuestions(session.mode || 'foodie')); // 重置推荐问题
      return true;
    }
    return false;
  }, [getQuickQuestions]);

  // 初始化时加载当前会话（只在 currentSessionId 变化时触发）
  useEffect(() => {
    if (currentSessionId) {
      loadSession(currentSessionId, sessions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId]);

  // 滚动到最新消息
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // 自动聚焦输入框
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 取消正在进行的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 组件挂载时重置 loading 状态
  useEffect(() => {
    setLoading(false);
  }, []);

  // 保存当前会话状态（优化性能）
  const saveCurrentSession = useCallback(() => {
    if (!currentSessionId) {
      return;
    }

    // 清理状态消息（移除临时状态信息）
    const cleanMessages = messages.map(({ status, errorMessage, ...msg }) => msg);

    // 直接从 localStorage 读取最新数据
    const storedSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    let allSessions: ChatSession[] = storedSessions ? JSON.parse(storedSessions) : [];

    // 查找并更新当前会话
    const sessionIndex = allSessions.findIndex(s => s.id === currentSessionId);

    if (sessionIndex >= 0) {
      // 更新现有会话
      allSessions[sessionIndex] = {
        ...allSessions[sessionIndex],
        messages: cleanMessages,
        suggestedPosts,
        excludedPostIds: Array.from(excludedPostIds),
        title: generateSessionTitle(cleanMessages),
        updatedAt: Date.now(),
      };
    } else {
      // 创建新会话（不应该发生，但作为备用）
      const newSession: ChatSession = {
        id: currentSessionId,
        mode: xiaobianMode,
        title: generateSessionTitle(cleanMessages),
        messages: cleanMessages,
        suggestedPosts,
        excludedPostIds: Array.from(excludedPostIds),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      allSessions = [newSession, ...allSessions];
    }

    // 保存到 localStorage
    saveSessions(allSessions);

    // 更新 React 状态
    setSessions(allSessions);
  }, [currentSessionId, messages, suggestedPosts, excludedPostIds, saveSessions, xiaobianMode]);

  // 在消息、推荐或排除状态变化时保存当前会话（优化防抖）
  useEffect(() => {
    if (currentSessionId && messages.length >= 1) {
      const timer = setTimeout(() => {
        saveCurrentSession();
      }, 800); // 800ms 防抖，减少保存频率
      return () => clearTimeout(timer);
    }
  }, [messages, suggestedPosts, excludedPostIds, currentSessionId, saveCurrentSession]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // 保存当前会话ID到localStorage
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, currentSessionId);
    }
  }, [currentSessionId]);

  // 创建新会话
  const handleNewChat = useCallback(() => {
    // 先保存当前会话（如果有内容）
    if (currentSessionId && messages.length > 1) {
      saveCurrentSession();
    }

    // 使用 ref 获取最新的模式值
    const currentMode = xiaobianModeRef.current;

    // 创建新会话
    const welcomeMessage = currentMode === 'foodie' ? foodieWelcomeMessage : adminWelcomeMessage;
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: '新对话',
      messages: [welcomeMessage],
      suggestedPosts: [],
      excludedPostIds: [],
      mode: currentMode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setSessions(prev => {
      const updated = [newSession, ...prev];
      saveSessions(updated);
      return updated;
    });
    setCurrentSessionId(newSession.id);
    setMessages([welcomeMessage]);
    setSuggestedPosts([]);
    setExcludedPostIds(new Set());
    setShowSuggestions(false);
    setQuickQuestions(getQuickQuestions(currentMode)); // 重置推荐问题
  }, [currentSessionId, messages, saveCurrentSession, saveSessions, getQuickQuestions]);

  // 切换会话
  const handleSelectSession = useCallback((sessionId: string) => {
    // 先保存当前会话
    if (currentSessionId && currentSessionId !== sessionId && messages.length > 1) {
      saveCurrentSession();
    }

    // 切换到目标会话
    setCurrentSessionId(sessionId);
    loadSession(sessionId, sessions);
  }, [currentSessionId, messages, saveCurrentSession, sessions, loadSession]);

  // 删除会话
  const handleDeleteSession = useCallback((sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // 先保存当前会话
    if (currentSessionId && messages.length > 1) {
      saveCurrentSession();
    }

    const updated = sessions.filter(s => s.id !== sessionId);
    setSessions(updated);
    saveSessions(updated);

    if (currentSessionId === sessionId) {
      // 如果删除的是当前会话，切换到第一个会话或创建新会话
      if (updated.length > 0) {
        handleSelectSession(updated[0].id);
      } else {
        handleNewChat();
      }
    }
  }, [currentSessionId, messages, sessions, saveCurrentSession, saveSessions, handleSelectSession, handleNewChat]);

  // 删除所有会话
  const handleDeleteAllSessions = useCallback(() => {
    setSessions([]);
    saveSessions([]);
    handleNewChat();
    setShowDeleteModal(false);
  }, [handleNewChat, saveSessions]);

  const handleSend = async (msg?: string) => {
    const userMessage = msg || inputValue.trim();
    if (!userMessage) return;

    // 确保有当前会话
    let sessionId = currentSessionId;

    // 使用 ref 获取最新的模式值
    const currentMode = xiaobianModeRef.current;

    if (!sessionId) {
      // 创建新会话
      const welcomeMessage = currentMode === 'foodie' ? foodieWelcomeMessage : adminWelcomeMessage;
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: '新对话',
        messages: [welcomeMessage],
        suggestedPosts: [],
        excludedPostIds: [],
        mode: currentMode,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 直接从 localStorage 读取并保存
      const storedSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      const allSessions: ChatSession[] = storedSessions ? JSON.parse(storedSessions) : [];
      const updated = [newSession, ...allSessions];

      saveSessions(updated);
      setSessions(updated);
      setCurrentSessionId(newSession.id);
      localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, newSession.id);

      sessionId = newSession.id;
    }

    // 添加用户消息（带状态）
    const newUserMessage: MessageWithStatus = {
      role: 'user',
      content: userMessage,
      status: 'sending'
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue('');
    setLoading(true);
    setShowTypingIndicator(true);
    setShowSuggestions(false);
    setExcludedPostIds(new Set());
    setLastFailedMessage(null);

    // 立即保存用户消息到会话（修复首次消息不保存的问题）
    try {
      const storedSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      const allSessions: ChatSession[] = storedSessions ? JSON.parse(storedSessions) : [];
      const sessionIndex = allSessions.findIndex(s => s.id === sessionId);
      if (sessionIndex >= 0) {
        const cleanUserMessage = { role: 'user' as const, content: userMessage };
        allSessions[sessionIndex] = {
          ...allSessions[sessionIndex],
          messages: [...allSessions[sessionIndex].messages, cleanUserMessage],
          title: userMessage.length > 15 ? userMessage.substring(0, 15) + '...' : userMessage,
          updatedAt: Date.now(),
        };
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(allSessions));

        // 更新会话标题
        setSessions(allSessions);
      }
    } catch (e) {
      // 静默处理存储错误
    }

    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();

    try {
      // 使用预构建的系统提示词
      const systemPrompt = createSystemPrompt(currentMode);

      // 获取当前消息历史（不包含状态信息）
      const cleanMessages = messages.map(({ status, errorMessage, ...msg }) => msg);
      const conversationHistory = [...cleanMessages, { role: 'user' as const, content: userMessage }];

      const res = await chatWithAI({
        message: userMessage,
        conversationHistory,
        systemPrompt,
        mode: currentMode,
      }, abortControllerRef.current.signal);

      // 更新用户消息状态为成功
      setMessages((prev) =>
        prev.map((msg, index) =>
          index === prev.length - 1 ? { ...msg, status: 'success' as const } : msg
        )
      );

      const aiMessage: MessageWithStatus = {
        role: 'assistant',
        content: res.data.data.message,
        status: 'success',
      };
      setMessages((prev) => [...prev, aiMessage]);

      // 根据对话内容生成推荐的后续问题
      const followUpQuestions = generateFollowUpQuestions(userMessage, aiMessage.content);
      setQuickQuestions(followUpQuestions);

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
      setMessages((prev) =>
        prev.map((msg, index) =>
          index === prev.length - 1 ? {
            ...msg,
            status: 'error' as const,
            errorMessage
          } : msg
        )
      );

      // 保存失败的消息以便重发
      setLastFailedMessage(userMessage);

      // 显示友好的错误提示
      void message.error({
        content: errorMessage,
        duration: 5,
        key: 'ai-error'
      });
    } finally {
      setLoading(false);
      setShowTypingIndicator(false);
    }
  };

  // 重发失败的消息
  const handleResendMessage = useCallback(async (messageContent: string) => {
    setLastFailedMessage(null);
    await handleSend(messageContent);
  }, [handleSend]);

  const handlePostClick = (postId: number) => {
    navigate(`/post/${postId}`);
  };

  const handleExcludePost = (postId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExcluded = new Set(excludedPostIds);
    if (newExcluded.has(postId)) {
      newExcluded.delete(postId);
      void message.success('已恢复推荐');
    } else {
      newExcluded.add(postId);
      void message.success('已排除此推荐');
    }
    setExcludedPostIds(newExcluded);
  };

  // 根据排除/恢复的动态重新规划
  const handleReplan = async () => {
    if (suggestedPosts.filter(p => !excludedPostIds.has(p.id)).length === 0) {
      void message.warning('请先恢复至少一个推荐动态');
      return;
    }

    setLoading(true);

    const excludedList = suggestedPosts
      .filter(p => excludedPostIds.has(p.id))
      .map(p => `"${p.content.substring(0, 20)}"`)
      .join('、');

    const replanPrompt = excludedList.length > 0
      ? `我已经排除了 ${excludedList}，请根据剩余的推荐重新给我一个美食建议`
      : `请根据当前的推荐给我一个详细的美食建议`;

    const newUserMessage: ChatMessage = { role: 'user', content: replanPrompt };
    setMessages((prev) => [...prev, newUserMessage]);

    const aiMessageContent = `根据当前保留的推荐，我为你整理了以下建议：

${suggestedPosts.filter(p => !excludedPostIds.has(p.id)).map((p, i) => `${i + 1}. ${p.content.substring(0, 40)}... 📍${p.address || '未知'}`).join('\n')}

希望这些建议对你有帮助！如需调整，随时告诉我～`;

    const aiMessage: ChatMessage = {
      role: 'assistant',
      content: aiMessageContent,
    };
    setMessages((prev) => [...prev, aiMessage]);

    setLoading(false);
  };

  // 清空当前聊天记录
  const clearChat = () => {
    const currentMode = xiaobianModeRef.current;
    const welcomeMessage = currentMode === 'foodie' ? foodieWelcomeMessage : adminWelcomeMessage;
    setMessages([welcomeMessage]);
    setSuggestedPosts([]);
    setExcludedPostIds(new Set());
    setShowSuggestions(false);
    setLastFailedMessage(null);
    void message.success('已清空当前对话');
  };

  // 地图组件
  const MapView = ({ posts }: { posts: Post[] }) => {
    const hasAddresses = posts.some(p => p.address);

    if (!hasAddresses) {
      return (
        <div style={{ width: '100%', height: '200px', borderRadius: '12px', background: 'var(--bg-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          <CompassOutlined style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }} />
          <div>暂无位置信息</div>
        </div>
      );
    }

    return (
      <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
        <div style={{ padding: '16px', background: 'var(--gradient-primary)', color: '#fff' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CarOutlined style={{ fontSize: 18 }} />
              <span style={{ fontWeight: 600, fontSize: 15 }}>美食路线推荐</span>
            </div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>为您推荐 {posts.length} 个美食地点</div>
          </Space>
        </div>
        <div style={{ padding: '12px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {posts.map((post, index) => (
              <div key={post.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px', background: index % 2 === 0 ? 'var(--bg-tertiary)' : 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => handlePostClick(post.id)}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gradient-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {post.content.substring(0, 25)}
                  </div>
                  {post.address && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <EnvironmentOutlined />
                      {post.address}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-error)', fontWeight: 500, flexShrink: 0 }}>
                  👍 {post.likeCount || 0}
                </div>
              </div>
            ))}
          </Space>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', textAlign: 'center', fontSize: 11, color: 'var(--text-secondary)' }}>
          点击地点查看详情，可排除不感兴趣的推荐
        </div>
      </div>
    );
  };

  const visiblePosts = suggestedPosts.filter(p => !excludedPostIds.has(p.id));

  return (
    <>
      <style>{typingAnimationStyle}</style>
      <div style={{
        position: 'fixed',
        top: 70, // Offset by Navbar height (70px) to avoid being covered
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
        zIndex: 1000
      }}>
      {/* 顶部导航栏 */}
      <div style={{ height: 50, background: 'var(--navbar-bg)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(fromPath)} style={{ color: 'var(--text-primary)' }} title="返回" />
        <Button type="text" icon={<HistoryOutlined />} onClick={() => setShowSessionPanel(!showSessionPanel)} style={{ color: 'var(--text-primary)' }} />
        <Avatar
          size={32}
          src="https://api.dicebear.com/7.x/bottts/svg?seed=Xiaobian"
          icon={<RobotOutlined />}
          style={{ cursor: 'pointer' }}
          onClick={() => setShowSessionPanel(!showSessionPanel)}
        />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
            小边 {xiaobianMode === 'foodie' ? '🍜' : '🛠️'}
          </span>
          <Tag color={xiaobianMode === 'foodie' ? 'orange' : 'blue'} style={{ fontSize: 11 }}>
            {xiaobianMode === 'foodie' ? '美食助手' : '管理模式'}
          </Tag>
        </div>

        {/* 模式切换开关 - 只有管理员可见 */}
        {(user?.role === 'admin' || user?.role === 'super_admin') && (
          <Tooltip title={xiaobianMode === 'foodie' ? '切换到管理模式' : '切换到美食模式'}>
            <Switch
              checked={xiaobianMode === 'admin'}
              onChange={(checked) => handleModeSwitch(checked ? 'admin' : 'foodie')}
              checkedChildren={<SafetyOutlined />}
              unCheckedChildren={<RobotOutlined />}
              style={{ marginRight: 8 }}
            />
          </Tooltip>
        )}

        {messages.length > 1 && (
          <Button type="text" size="small" onClick={clearChat} style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
            清空对话
          </Button>
        )}
      </div>

      {/* 主内容区域 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 左侧会话列表 */}
        <div style={{ width: showSessionPanel ? 260 : 0, background: 'var(--bg-secondary)', borderRight: showSessionPanel ? '1px solid var(--border-color)' : 'none', transition: 'width 0.2s', overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '12px' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleNewChat} style={{ width: '100%', height: 36, background: 'var(--navbar-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}>
              新建对话
            </Button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
            <List
              dataSource={sessions}
              renderItem={(session) => {
                const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
                  if (session.id !== currentSessionId) {
                    e.currentTarget.style.background = 'var(--color-primary-bg)';
                  }
                };
                const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
                  if (session.id !== currentSessionId) {
                    e.currentTarget.style.background = 'transparent';
                  }
                };
                const handleDeleteMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.opacity = '1';
                };
                const handleDeleteMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.opacity = '0';
                };

                return (
                  <div
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    style={{ padding: '8px 12px', marginBottom: 4, borderRadius: 6, cursor: 'pointer', background: session.id === currentSessionId ? 'var(--bg-tertiary)' : 'transparent', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, transition: 'background 0.2s' }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                      <MessageOutlined style={{ marginRight: 8, opacity: 0.6 }} />
                      {session.title}
                    </div>
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      size="small"
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      style={{ color: 'var(--text-secondary)', opacity: 0, transition: 'opacity 0.2s', minWidth: 'auto' }}
                      onMouseEnter={handleDeleteMouseEnter}
                      onMouseLeave={handleDeleteMouseLeave}
                    />
                  </div>
                );
              }}
            />
          </div>

          <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
            <Button type="text" icon={<DeleteOutlined />} onClick={() => setShowDeleteModal(true)} style={{ width: '100%', color: 'var(--text-secondary)', textAlign: 'left', fontSize: 13, height: 36 }}>
              清空所有对话
            </Button>
          </div>
        </div>

        {/* 中间聊天区域 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg-primary)', overflow: 'hidden' }}>
          <div ref={messagesContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((msg, index) => {
              const messageStatus = (msg as MessageWithStatus).status;
              const showStatus = messageStatus && messageStatus !== 'success';

              return (
                <div key={index} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg.role === 'assistant' && (
                    <Avatar size={28} src="https://api.dicebear.com/7.x/bottts/svg?seed=Xiaobian" icon={<RobotOutlined />} style={{ marginRight: 10, flexShrink: 0 }} />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--card-bg)',
                      color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.5,
                      fontSize: 14,
                      opacity: messageStatus === 'sending' ? 0.7 : 1,
                      border: messageStatus === 'error' ? '1px solid var(--color-error)' : 'none'
                    }}>
                      {msg.content}
                    </div>

                    {showStatus && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {messageStatus === 'sending' && (
                          <>
                            <Spin size="small" />
                            <span>发送中...</span>
                          </>
                        )}
                        {messageStatus === 'error' && (
                          <>
                            <span style={{ color: 'var(--color-error)' }}>发送失败</span>
                            <Button
                              type="link"
                              size="small"
                              icon={<ReloadOutlined />}
                              onClick={() => handleResendMessage(msg.content)}
                              style={{ padding: 0, height: 'auto', fontSize: 11 }}
                            >
                              重试
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <Avatar
                      size={28}
                      src={getAvatarUrl(user)}
                      icon={<UserOutlined />}
                      style={{ marginLeft: 10, flexShrink: 0 }}
                    />
                  )}
                </div>
              );
            })}

            {showTypingIndicator && (
              <div style={{ display: 'flex', marginLeft: 38 }}>
                <Space>
                  <div style={{
                    padding: '8px 12px',
                    background: 'var(--card-bg)',
                    borderRadius: 12,
                    display: 'flex',
                    gap: 4,
                    alignItems: 'center'
                  }}>
                    <div style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--color-primary)',
                      animation: 'typing 1.4s infinite'
                    }} />
                    <div style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--color-primary)',
                      animation: 'typing 1.4s infinite 0.2s'
                    }} />
                    <div style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--color-primary)',
                      animation: 'typing 1.4s infinite 0.4s'
                    }} />
                  </div>
                </Space>
              </div>
            )}

            {lastFailedMessage && (
              <Alert
                message="消息发送失败"
                description="您可以点击重试按钮重新发送消息"
                type="error"
                closable
                onClose={() => setLastFailedMessage(null)}
                action={
                  <Button size="small" danger onClick={() => handleResendMessage(lastFailedMessage)}>
                    重试
                  </Button>
                }
                style={{ margin: '8px 0' }}
              />
            )}

            <div ref={messagesEndRef} />
          </div>

          {!loading && quickQuestions.length > 0 && (
            <div style={{ padding: '0 16px 12px', flexShrink: 0 }}>
              <Space wrap>
                {quickQuestions.map((q, i) => (
                  <Tag key={i} style={{ cursor: 'pointer', borderRadius: 12, padding: '3px 10px', fontSize: 12, background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={() => handleSend(q)}>
                    {q}
                  </Tag>
                ))}
              </Space>
            </div>
          )}

          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', background: 'var(--navbar-bg)', flexShrink: 0 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Input ref={inputRef} size="large" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onPressEnter={() => handleSend()} placeholder="问问小边..." disabled={loading} style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px 0 0 6px', fontSize: 14 }} />
              <Button type="primary" size="large" icon={<SendOutlined />} onClick={() => handleSend()} loading={loading} style={{ background: 'var(--color-primary)', border: 'none', borderRadius: '0 6px 6px 0' }}>
                发送
              </Button>
            </Space.Compact>
          </div>
        </div>

        {/* 右侧推荐区域 */}
        {showSuggestions ? (
          <div style={{ width: 360, background: 'var(--card-bg)', borderLeft: '1px solid var(--border-color)', transition: 'width 0.3s', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', flexShrink: 0 }}>
              <Space>
                <BulbOutlined style={{ color: 'var(--color-warning)' }} />
                <span style={{ fontWeight: 500, fontSize: 13 }}>相关推荐</span>
                <Badge count={visiblePosts.length} style={{ backgroundColor: 'var(--color-success)' }} />
                <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setShowSuggestions(false)} style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>
                  收起
                </Button>
              </Space>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              <div style={{ marginBottom: 12 }}>
                <Space wrap>
                  <Tag icon={<FireOutlined />} color="red" style={{ fontSize: 11 }}>热门推荐</Tag>
                  <Tag icon={<StarOutlined />} color="gold" style={{ fontSize: 11 }}>精选动态</Tag>
                  {excludedPostIds.size > 0 && (
                    <Tag icon={<CloseOutlined />} color="default" style={{ cursor: 'pointer', fontSize: 11 }} onClick={() => { setExcludedPostIds(new Set()); void message.success('已恢复所有推荐'); }}>
                      清除排除
                    </Tag>
                  )}
                  {visiblePosts.length >= 1 && (
                    <Tag icon={<CarOutlined />} color="blue" style={{ cursor: 'pointer', fontSize: 11 }} onClick={() => setShowMap(!showMap)}>
                      {showMap ? '隐藏地图' : '显示地图'}
                    </Tag>
                  )}
                  {excludedPostIds.size > 0 && (
                    <Tag icon={<BulbOutlined />} color="purple" style={{ cursor: 'pointer', fontSize: 11 }} onClick={handleReplan}>
                      重新规划
                    </Tag>
                  )}
                </Space>
              </div>

              {visiblePosts.length >= 1 && showMap && (
                <div style={{ marginBottom: 12 }}>
                  <MapView posts={visiblePosts} />
                </div>
              )}

              <Space direction="vertical" style={{ width: '100%' }}>
                {suggestedPosts.map((post) => {
                  const isExcluded = excludedPostIds.has(post.id);
                  const processedImages = parseImages(post.images);
                  const firstImage = processedImages.length > 0 ? processedImages[0] : null;

                  return (
                    <Card key={post.id} size="small" hoverable={!isExcluded} onClick={() => !isExcluded && handlePostClick(post.id)} style={{ borderRadius: 10, opacity: isExcluded ? 0.5 : 1, background: isExcluded ? 'var(--bg-tertiary)' : 'var(--card-bg)', border: isExcluded ? '1px dashed var(--border-color)' : '1px solid var(--border-color)', cursor: isExcluded ? 'not-allowed' : 'pointer' }} bodyStyle={{ padding: 10 }}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          {firstImage && (
                            <div style={{ width: 50, height: 50, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                              <img src={firstImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 2, fontSize: 12 }}>
                              {post.content}
                            </Paragraph>
                            {post.address && (
                              <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                <EnvironmentOutlined />
                                {post.address}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-secondary)' }}>
                          <Space>
                            <span>{post.user.username}</span>
                            <span>👍 {post.likeCount || 0}</span>
                          </Space>
                          <Button type={isExcluded ? 'primary' : 'text'} size="small" icon={isExcluded ? <PlusOutlined /> : <CloseOutlined />} onClick={(e) => handleExcludePost(post.id, e)} style={{ fontSize: 10, height: 22, padding: '0 6px' }}>
                            {isExcluded ? '恢复' : '排除'}
                          </Button>
                        </div>
                      </Space>
                    </Card>
                  );
                })}
              </Space>

              {excludedPostIds.size > 0 && visiblePosts.length > 0 && (
                <div style={{ marginTop: 12, padding: '10px', background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      已排除 {excludedPostIds.size} 个推荐，剩余 {visiblePosts.length} 个
                    </Text>
                    <Button type="primary" icon={<BulbOutlined />} onClick={handleReplan} loading={loading} style={{ width: '100%', background: 'var(--gradient-primary)', border: 'none', borderRadius: 6, fontSize: 13 }}>
                      让小边重新规划
                    </Button>
                  </Space>
                </div>
              )}

              {visiblePosts.length === 0 && suggestedPosts.length > 0 && (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>所有推荐已被排除，点击"恢复"按钮重新显示</Text>
                </div>
              )}

              {suggestedPosts.length === 0 && (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>暂无相关推荐</Text>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ width: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {suggestedPosts.length > 0 && (
              <Tooltip title="展开推荐列表" placement="left">
                <Button
                  type="primary"
                  icon={<BulbOutlined />}
                  onClick={() => setShowSuggestions(true)}
                  style={{
                    height: 100,
                    width: 48,
                    borderRadius: '0 8px 8px 0',
                    background: 'var(--gradient-primary)',
                    border: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    boxShadow: '-2px 0 8px rgba(0,0,0,0.15)',
                  }}
                >
                  <span style={{ writingMode: 'vertical-rl', fontSize: 12, fontWeight: 500 }}>
                    {suggestedPosts.length} 推荐
                  </span>
                </Button>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      <Modal title="确认删除" open={showDeleteModal} onOk={handleDeleteAllSessions} onCancel={() => setShowDeleteModal(false)} okText="确认删除" cancelText="取消">
        <p>确定要清空所有对话记录吗？此操作不可恢复。</p>
      </Modal>
    </div>
    </>
  );
}
