import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import prisma from '../services/db/prisma';

interface Client {
  ws: WebSocket;
  userId: number;
  username: string;
  role: string;
}

// 存储所有连接的客户端
const clients = new Map<number, Client>();

let wss: WebSocketServer;

// 初始化 WebSocket 服务器
export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  console.log('🔌 WebSocket 服务器已启动');

  wss.on('connection', async (ws, req) => {
    try {
      // 从 URL 参数获取 token
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        ws.send(JSON.stringify({ type: 'error', message: '未提供认证令牌' }));
        ws.close();
        return;
      }

      // 验证 JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: number };
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true, role: true, isActive: true },
      });

      if (!user || !user.isActive) {
        ws.send(JSON.stringify({ type: 'error', message: '用户不存在或已禁用' }));
        ws.close();
        return;
      }

      // 存储客户端连接
      const client: Client = {
        ws,
        userId: user.id,
        username: user.username,
        role: user.role,
      };
      clients.set(user.id, client);

      console.log(`✅ 用户 ${user.username} (${user.id}) 已连接 WebSocket`);

      // 发送连接成功消息
      ws.send(JSON.stringify({
        type: 'connected',
        data: { userId: user.id, username: user.username },
      }));

      // 心跳检测
      const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);

      // 监听消息
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'pong') {
            // 心跳响应
          }
        } catch {
          // 忽略无效消息
        }
      });

      // 监听关闭
      ws.on('close', () => {
        clearInterval(heartbeat);
        clients.delete(user.id);
        console.log(`❌ 用户 ${user.username} (${user.id}) 已断开 WebSocket`);
      });

      // 监听错误
      ws.on('error', (error) => {
        console.error(`WebSocket 错误 (${user.username}):`, error.message);
        clients.delete(user.id);
      });

    } catch (error: any) {
      console.error('WebSocket 连接错误:', error.message);
      ws.send(JSON.stringify({ type: 'error', message: '认证失败' }));
      ws.close();
    }
  });

  return wss;
}

// 获取用户的 WebSocket 连接
export function getClient(userId: number): Client | undefined {
  return clients.get(userId);
}

// 向指定用户发送消息
export function sendToUser(userId: number, type: string, data: any) {
  const client = clients.get(userId);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify({ type, data }));
    return true;
  }
  return false;
}

// 向多个用户发送消息
export function sendToUsers(userIds: number[], type: string, data: any) {
  userIds.forEach(userId => sendToUser(userId, type, data));
}

// 广播消息给所有在线用户
export function broadcast(type: string, data: any) {
  const message = JSON.stringify({ type, data });
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
}

// 获取在线用户列表
export function getOnlineUsers() {
  return Array.from(clients.values()).map(client => ({
    userId: client.userId,
    username: client.username,
    role: client.role,
  }));
}

// 获取在线用户数量
export function getOnlineCount() {
  return clients.size;
}

export default {
  initWebSocket,
  sendToUser,
  sendToUsers,
  broadcast,
  getOnlineUsers,
  getOnlineCount,
  getClient,
};