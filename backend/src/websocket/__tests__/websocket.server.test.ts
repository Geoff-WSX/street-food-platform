/**
 * WebSocket Server Tests
 * 测试服务端 WebSocket 功能
 */

import { Server } from 'http';
import { WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { initWebSocket, sendToUser, sendToUsers, broadcast, getOnlineUsers, getOnlineCount, getClient } from '../index';

// Mock Prisma
jest.mock('../../services/db/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

import prisma from '../../services/db/prisma';

describe('WebSocket Server', () => {
  let httpServer: Server;
  let wsServer: any;
  let testTokens: { [key: string]: string };
  let testUsers: any[];

  beforeAll((done) => {
    // 创建测试 HTTP 服务器
    httpServer = new Server();
    httpServer.listen(0, () => {
      const port = (httpServer.address() as any).port;

      // 初始化 WebSocket 服务器
      wsServer = initWebSocket(httpServer);

      // 创建测试用户和令牌
      testUsers = [
        { id: 1, username: 'user1', role: 'USER', isActive: true },
        { id: 2, username: 'user2', role: 'USER', isActive: true },
        { id: 3, username: 'admin1', role: 'ADMIN', isActive: true },
        { id: 4, username: 'inactive', role: 'USER', isActive: false },
      ];

      testTokens = {};
      testUsers.forEach(user => {
        testTokens[user.username] = jwt.sign(
          { userId: user.id },
          process.env.JWT_SECRET || 'secret'
        );
      });

      // Mock Prisma 响应
      (prisma.user.findUnique as jest.Mock).mockImplementation(({ where }) => {
        return Promise.resolve(testUsers.find(u => u.id === where.id));
      });

      done();
    });
  });

  afterAll((done) => {
    // 正确关闭 WebSocket 服务器和 HTTP 服务器
    if (wsServer) {
      wsServer.close(() => {
        if (httpServer) {
          httpServer.close(done);
        } else {
          done();
        }
      });
    } else {
      httpServer?.close(done);
    }
  });

  afterEach(() => {
    // 清理所有连接
    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    test('应该成功建立连接并返回 connected 消息', (done) => {
      const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.user1}`);

      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'ping' }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connected') {
          expect(message.data).toEqual({
            userId: 1,
            username: 'user1',
          });

          // 验证客户端已存储
          const client = getClient(1);
          expect(client).toBeDefined();
          expect(client?.userId).toBe(1);
          expect(client?.username).toBe('user1');

          ws.close();
        }
      });

      ws.on('close', () => {
        done();
      });
    });

    test('应该拒绝无效 token 的连接', (done) => {
      const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=invalid_token`);

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        expect(message.type).toBe('error');
        expect(message.message).toContain('认证');
      });

      ws.on('close', () => {
        done();
      });
    });

    test('应该拒绝不存在的用户连接', (done) => {
      const invalidToken = jwt.sign({ userId: 999 }, process.env.JWT_SECRET || 'secret');
      const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${invalidToken}`);

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        expect(message.type).toBe('error');
        expect(message.message).toContain('用户不存在');
      });

      ws.on('close', () => {
        done();
      });
    });

    test('应该拒绝已禁用的用户连接', (done) => {
      const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.inactive}`);

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        expect(message.type).toBe('error');
        expect(message.message).toContain('已禁用');
      });

      ws.on('close', () => {
        done();
      });
    });

    test('应该拒绝没有 token 的连接', (done) => {
      const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws`);

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        expect(message.type).toBe('error');
        expect(message.message).toContain('未提供认证令牌');
      });

      ws.on('close', () => {
        done();
      });
    });
  });

  describe('Heartbeat Detection', () => {
    test('应该接收并响应心跳 ping 消息', (done) => {
      const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.user1}`);
      let pingReceived = false;

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'ping') {
          pingReceived = true;
          // 响应 pong
          ws.send(JSON.stringify({ type: 'pong' }));
        }

        if (message.type === 'connected') {
          // 等待心跳消息
          setTimeout(() => {
            expect(pingReceived).toBe(true);
            ws.close();
          }, 35000); // 心跳间隔是 30 秒
        }
      });

      ws.on('close', () => {
        done();
      });

      // 增加测试超时时间
    }, 40000);
  });

  describe('Message Sending', () => {
    test('应该向指定用户发送消息', (done) => {
      const ws1 = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.user1}`);
      const ws2 = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.user2}`);

      let ws1Connected = false;
      let ws2Connected = false;

      const testMessage = { type: 'test', data: { text: 'Hello User 2' } };

      ws1.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'connected') {
          ws1Connected = true;
          if (ws1Connected && ws2Connected) {
            // 向 user2 发送消息
            sendToUser(2, 'test', { text: 'Hello User 2' });
          }
        }
      });

      ws2.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'connected') {
          ws2Connected = true;
        } else if (message.type === 'test') {
          expect(message.data).toEqual({ text: 'Hello User 2' });
          ws1.close();
          ws2.close();
        }
      });

      ws2.on('close', () => {
        done();
      });
    });

    test('应该向多个用户发送消息', (done) => {
      const ws1 = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.user1}`);
      const ws2 = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.user2}`);
      const ws3 = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.admin1}`);

      const connectedUsers: string[] = [];
      const testMessage = { type: 'broadcast', data: { text: 'Hello All' } };

      const onMessage = (data: any, username: string) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'connected') {
          connectedUsers.push(username);

          if (connectedUsers.length === 3) {
            // 向所有用户广播消息
            broadcast('broadcast', { text: 'Hello All' });
          }
        } else if (message.type === 'broadcast') {
          expect(message.data).toEqual({ text: 'Hello All' });

          if (connectedUsers.length === 3) {
            ws1.close();
            ws2.close();
            ws3.close();
          }
        }
      };

      ws1.on('message', (data) => onMessage(data, 'user1'));
      ws2.on('message', (data) => onMessage(data, 'user2'));
      ws3.on('message', (data) => onMessage(data, 'admin1'));

      ws3.on('close', () => {
        done();
      });
    });

    test('应该处理向离线用户发送消息的情况', () => {
      // user999 不在线
      const result = sendToUser(999, 'test', { text: 'Hello' });
      expect(result).toBe(false);
    });
  });

  describe('Connection Tracking', () => {
    test('应该正确跟踪在线用户', (done) => {
      const ws1 = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.user1}`);
      const ws2 = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.user2}`);

      let connectedCount = 0;

      const onConnected = () => {
        connectedCount++;

        if (connectedCount === 2) {
          const onlineUsers = getOnlineUsers();
          const onlineCount = getOnlineCount();

          expect(onlineCount).toBe(2);
          expect(onlineUsers).toHaveLength(2);
          expect(onlineUsers.some(u => u.username === 'user1')).toBe(true);
          expect(onlineUsers.some(u => u.username === 'user2')).toBe(true);

          ws1.close();
          ws2.close();
        }
      };

      ws1.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'connected') onConnected();
      });

      ws2.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'connected') onConnected();
      });

      ws2.on('close', () => {
        done();
      });
    });

    test('应该在用户断开连接时更新在线用户列表', (done) => {
      const ws1 = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.user1}`);

      ws1.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'connected') {
          expect(getOnlineCount()).toBe(1);

          ws1.on('close', () => {
            setTimeout(() => {
              expect(getOnlineCount()).toBe(0);
              expect(getOnlineUsers()).toHaveLength(0);
              done();
            }, 100);
          });

          ws1.close();
        }
      });
    });
  });

  describe('Error Handling', () => {
    test('应该处理无效的 JSON 消息', (done) => {
      const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.user1}`);

      ws.on('open', () => {
        // 发送无效的 JSON
        ws.send('invalid json{{{');
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'connected') {
          // 服务器应该忽略无效消息而不崩溃
          ws.send(JSON.stringify({ type: 'ping' }));
          setTimeout(() => {
            ws.close();
          }, 100);
        }
      });

      ws.on('close', () => {
        done();
      });
    });

    test('应该处理 WebSocket 错误', (done) => {
      const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.user1}`);

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'connected') {
          // 模拟网络错误
          (ws as any)._socket.destroy();
        }
      });

      ws.on('error', () => {
        // 错误被正确处理
      });

      ws.on('close', () => {
        done();
      });
    });
  });

  describe('Message Queue and Retry', () => {
    test('应该处理连接关闭时的消息发送', (done) => {
      const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.user1}`);
      let userId = 0;

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'connected') {
          userId = message.data.userId;

          // 关闭连接
          ws.close();

          // 尝试向已关闭的连接发送消息
          setTimeout(() => {
            const result = sendToUser(userId, 'test', { text: 'After close' });
            expect(result).toBe(false);
            done();
          }, 100);
        }
      });
    });
  });

  describe('Real-time Notification Push', () => {
    test('应该推送实时通知', (done) => {
      const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.user1}`);

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connected') {
          // 模拟发送通知
          sendToUser(1, 'notification', {
            id: 1,
            type: 'LIKE',
            actor: {
              id: 2,
              username: 'user2',
              avatar: null,
            },
            entityId: 123,
            entityType: 'post',
            createdAt: new Date().toISOString(),
            isRead: false,
          });
        } else if (message.type === 'notification') {
          expect(message.data.type).toBe('LIKE');
          expect(message.data.actor.username).toBe('user2');
          expect(message.data.entityId).toBe(123);
          ws.close();
        }
      });

      ws.on('close', () => {
        done();
      });
    });

    test('应该推送实时消息', (done) => {
      const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.user1}`);

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connected') {
          // 模拟发送新消息通知
          sendToUser(1, 'message', {
            conversationId: 1,
            senderId: 2,
            senderName: 'user2',
            senderAvatar: null,
            content: 'Hello there!',
          });
        } else if (message.type === 'message') {
          expect(message.data.senderName).toBe('user2');
          expect(message.data.content).toBe('Hello there!');
          ws.close();
        }
      });

      ws.on('close', () => {
        done();
      });
    });
  });
});
