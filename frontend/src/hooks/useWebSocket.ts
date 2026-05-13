import { useState, useEffect, useCallback } from 'react';
import { wsService, requestNotificationPermission } from '../services/websocket';
import type { ConnectionStatus } from '../services/websocket';

interface UseWebSocketReturn {
  isConnected: boolean;
  isReconnecting: boolean;
  connectionStatus: ConnectionStatus;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnect: () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [maxReconnectAttempts] = useState(5);

  useEffect(() => {
    // 请求通知权限
    requestNotificationPermission();

    // 监听连接状态变化
    const unsubscribe = wsService.addConnectionListener((event) => {
      setConnectionStatus(event.status);
      if (event.reconnectAttempts !== undefined) {
        setReconnectAttempts(event.reconnectAttempts);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const reconnect = useCallback(() => {
    const token = localStorage.getItem('sf_token');
    if (token) {
      wsService.connect(token);
    }
  }, []);

  return {
    isConnected: connectionStatus === 'connected',
    isReconnecting: connectionStatus === 'reconnecting',
    connectionStatus,
    reconnectAttempts,
    maxReconnectAttempts,
    reconnect,
  };
}
