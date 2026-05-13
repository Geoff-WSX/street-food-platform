import { useNotificationStore } from '../store/notification';
import { useMessageStore } from '../store/message';
import { useFriendStore } from '../store/friend';
import { message } from 'antd';

type MessageType = 'notification' | 'message' | 'ping' | 'connected' | 'error' | 'friend_request' | 'friend_accepted';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'reconnect_failed';

interface ConnectionEvent {
  status: ConnectionStatus;
  reconnectAttempts?: number;
  maxReconnectAttempts?: number;
}

type ConnectionListener = (event: ConnectionEvent) => void;

interface NotificationData {
  id: number;
  type: string;
  actor?: {
    id: number;
    username: string;
    avatar?: string;
  };
  entityId: number;
  entityType: string;
  createdAt: string;
  content?: string;
}

interface MessageData {
  senderName: string;
  senderAvatar: string;
  content: string;
}

interface WebSocketMessage {
  type: MessageType;
  data?: NotificationData | MessageData | { message: string };
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 8;
  private reconnectDelay = 1000;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private isConnecting = false;
  private connectionListeners: Set<ConnectionListener> = new Set();

  // 添加连接状态监听器
  addConnectionListener(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  // 触发连接状态事件
  private emitConnectionStatus(status: ConnectionStatus) {
    const event: ConnectionEvent = {
      status,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
    };
    this.connectionListeners.forEach((listener) => listener(event));
  }

  // 初始化 WebSocket 连接
  connect(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.emitConnectionStatus('connecting');

    // 构建 WebSocket URL
    const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = wsBaseUrl
      ? `${wsBaseUrl}/ws?token=${token}`
      : `${protocol}//${host}/ws?token=${token}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('🔌 WebSocket 已连接');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.emitConnectionStatus('connected');
        this.startPingInterval();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('WebSocket 消息解析错误:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('❌ WebSocket 已断开:', event.code, event.reason);
        this.isConnecting = false;
        this.stopPingInterval();
        this.emitConnectionStatus('disconnected');
        this.attemptReconnect(token);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket 错误:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('WebSocket 连接失败:', error);
      this.isConnecting = false;
      this.attemptReconnect(token);
    }
  }

  // 处理收到的消息
  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'notification':
        if (message.data) {
          this.handleNotification(message.data as NotificationData);
        }
        break;
      case 'message':
        if (message.data) {
          this.handleMessage_(message.data as MessageData);
        }
        break;
      case 'friend_request':
        if (message.data) {
          this.handleFriendRequest(message.data as NotificationData);
        }
        break;
      case 'friend_accepted':
        if (message.data) {
          this.handleFriendAccepted(message.data as NotificationData);
        }
        break;
      case 'ping':
        this.send({ type: 'pong' });
        break;
      case 'connected':
        console.log('✅ WebSocket 认证成功:', message.data);
        break;
      case 'error':
        console.error('WebSocket 服务器错误:', message.data);
        break;
    }
  }

  // 处理通知
  private handleNotification(data: NotificationData) {
    const notificationStore = useNotificationStore.getState();

    // 添加通知到 store
    notificationStore.addNotification({
      id: data.id,
      userId: 0, // 不需要
      type: data.type as any, // 类型断言以处理字符串类型
      actorId: data.actor?.id || 0,
      entityId: data.entityId,
      entityType: data.entityType as any, // 类型断言以处理字符串类型
      createdAt: data.createdAt,
      isRead: false,
      actor: data.actor || { id: 0, username: '未知用户' }, // 提供默认值
    });

    // 增加未读计数
    notificationStore.incrementUnread();

    // 显示任务完成或升级的轻提示
    if (data.type === 'TASK_COMPLETE' || data.type === 'LEVEL_UP') {
      if (data.content) {
        message.success(data.content);
      }
    }

    // 显示浏览器通知
    this.showBrowserNotification(data);
  }

  // 处理私信
  private handleMessage_(data: MessageData) {
    const { incrementUnread: incrementMessageUnread } = useMessageStore.getState();
    incrementMessageUnread();

    // 显示浏览器通知
    this.showBrowserNotification({
      type: 'MESSAGE',
      actor: { username: data.senderName, avatar: data.senderAvatar },
      content: data.content?.slice(0, 50),
    });
  }

  // 处理好友请求
  private handleFriendRequest(data: NotificationData) {
    const friendStore = useFriendStore.getState();
    // 刷新收到的好友请求列表
    friendStore.fetchReceivedRequests();

    // 显示浏览器通知
    this.showBrowserNotification({
      type: 'FRIEND_REQUEST',
      actor: data.actor,
      content: data.content || '请求添加你为好友',
    });
  }

  // 处理好友请求接受
  private handleFriendAccepted(data: NotificationData) {
    const friendStore = useFriendStore.getState();
    // 刷新好友列表和发出的请求列表
    friendStore.fetchFriends();
    friendStore.fetchSentRequests();

    // 显示浏览器通知
    this.showBrowserNotification({
      type: 'FRIEND_ACCEPTED',
      actor: data.actor,
      content: data.content || '已接受你的好友请求',
    });
  }

  // 显示浏览器通知
  private showBrowserNotification(data: NotificationData | { type: string; actor?: { username: string; avatar?: string }; content?: string }) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const title = data.type === 'MESSAGE'
        ? `新消息来自 ${data.actor?.username}`
        : '新通知';
      const body = data.content || `来自 ${data.actor?.username}`;

      new Notification(title, {
        body,
        icon: data.actor?.avatar || '/favicon.ico',
      });
    }
  }

  // 发送消息
  send(message: { type: string; [key: string]: unknown }) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // 心跳检测
  private startPingInterval() {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000);
  }

  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // 断线重连
  private attemptReconnect(token: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('WebSocket 重连次数已达上限');
      this.emitConnectionStatus('reconnect_failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`WebSocket 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})，等待 ${delay}ms`);
    this.emitConnectionStatus('reconnecting');

    setTimeout(() => {
      this.connect(token);
    }, delay);
  }

  // 断开连接
  disconnect() {
    this.stopPingInterval();
    this.reconnectAttempts = this.maxReconnectAttempts; // 防止重连
    if (this.ws) {
      this.ws.close(1000, '用户断开连接');
      this.ws = null;
    }
    this.emitConnectionStatus('disconnected');
  }

  // 获取连接状态
  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// 单例导出
export const wsService = new WebSocketService();

// 请求浏览器通知权限
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}