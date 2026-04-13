/**
 * WebSocket Integration Tests
 * 测试 WebSocket 与其他系统的集成
 */

import { Server } from 'http';
import { WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { initWebSocket, sendToUser, broadcast } from '../index';
import * as notificationFunctions from '../notification';
import { NotificationType, EntityType } from '../../services/notification.service';

// Mock Prisma
jest.mock('../../services/db/prisma', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  };

  return {
    __esModule: true,
    default: mockPrisma,
  };
});

import prisma from '../../services/db/prisma';

describe('WebSocket Integration Tests', () => {
  let httpServer: Server;
  let wsServer: any;
  let testTokens: { [key: string]: string };
  let testUsers: any[];

  beforeAll((done) => {
    httpServer = new Server();
    httpServer.listen(0, () => {
      const port = (httpServer.address() as any).port;
      wsServer = initWebSocket(httpServer);

      testUsers = [
        { id: 1, username: 'user1', role: 'USER', isActive: true },
        { id: 2, username: 'user2', role: 'USER', isActive: true },
      ];

      testTokens = {};
      testUsers.forEach(user => {
        testTokens[user.username] = jwt.sign(
          { userId: user.id },
          process.env.JWT_SECRET || 'secret'
        );
      });

      (prisma.user.findUnique as jest.Mock).mockImplementation(({ where }) => {
        return Promise.resolve(testUsers.find(u => u.id === where.id));
      });

      done();
    });
  });

  afterAll((done) => {
    wsServer?.close();
    httpServer?.close(done);
  });

  describe('Notification Integration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('应该集成通知系统推送实时通知', (done) => {
      const mockNotification = {
        id: 1,
        userId: 1,
        type: NotificationType.LIKE,
        actorId: 2,
        entityId: 123,
        entityType: EntityType.POST,
        createdAt: new Date(),
        isRead: false,
        actor: {
          id: 2,
          username: 'user2',
          avatar: null,
          avatarData: null,
        },
      };

      (prisma.notification.create as jest.Mock).mockResolvedValue(mockNotification);

      const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.user1}`);

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connected') {
          // 模拟推送通知
          void notificationFunctions.pushNotification({
            type: NotificationType.LIKE,
            actorId: 2,
            targetUserId: 1,
            entityId: 123,
            entityType: EntityType.POST,
          });
        } else if (message.type === 'notification') {
          expect(message.data.type).toBe(NotificationType.LIKE);
          expect(message.data.actor.username).toBe('user2');

          // 验证通知已创建
          expect(prisma.notification.create).toHaveBeenCalledWith({
            data: {
              userId: 1,
              type: NotificationType.LIKE,
              actorId: 2,
              entityId: 123,
              entityType: EntityType.POST,
            },
            include: {
              actor: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                  avatarData: true,
                },
              },
            },
          });

          ws.close();
        }
      });

      ws.on('close', () => {
        done();
      });
    });

    test('应该集成消息系统推送实时消息', (done) => {
      const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.user1}`);

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connected') {
          // 推送新消息通知
          notificationFunctions.pushMessage(1, {
            conversationId: 1,
            senderId: 2,
            senderName: 'user2',
            senderAvatar: null,
            content: 'Hello from user2!',
          });
        } else if (message.type === 'message') {
          expect(message.data.conversationId).toBe(1);
          expect(message.data.senderName).toBe('user2');
          expect(message.data.content).toBe('Hello from user2!');
          ws.close();
        }
      });

      ws.on('close', () => {
        done();
      });
    });

    test('应该推送好友请求通知', (done) => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        username: 'user2',
        avatar: null,
        avatarData: null,
      });

      const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.user1}`);

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connected') {
          void notificationFunctions.pushFriendRequestNotification(1, 2, 'Let\'s be friends!');
        } else if (message.type === 'friend_request') {
          expect(message.data.type).toBe('FRIEND_REQUEST');
          expect(message.data.actor.username).toBe('user2');
          expect(message.data.message).toBe('Let\'s be friends!');
          ws.close();
        }
      });

      ws.on('close', () => {
        done();
      });
    });

    test('应该推送好友请求接受通知', (done) => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        username: 'user2',
        avatar: null,
        avatarData: null,
      });

      const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.user1}`);

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connected') {
          void notificationFunctions.pushFriendAcceptedNotification(1, 2);
        } else if (message.type === 'friend_accepted') {
          expect(message.data.type).toBe('FRIEND_ACCEPTED');
          expect(message.data.actor.username).toBe('user2');
          ws.close();
        }
      });

      ws.on('close', () => {
        done();
      });
    });

    test('应该防止向自己发送通知', (done) => {
      const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.user1}`);

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connected') {
          // 尝试向自己发送通知
          void notificationFunctions.pushNotification({
            type: NotificationType.LIKE,
            actorId: 1,
            targetUserId: 1,
            entityId: 123,
            entityType: EntityType.POST,
          }).then(result => {
            expect(result).toBeNull();
            expect(prisma.notification.create).not.toHaveBeenCalled();
            ws.close();
          });
        }
      });

      ws.on('close', () => {
        done();
      });
    });
  });

  describe('Concurrent Connection Handling', () => {
    test('应该处理多个并发连接', (done) => {
      const connections: WebSocket[] = [];
      const connectedUsers: string[] = [];
      const totalUsers = 10;

      // 创建多个测试用户
      for (let i = 1; i <= totalUsers; i++) {
        const user = { id: i, username: `user${i}`, role: 'USER', isActive: true };
        testUsers.push(user);
        testTokens[user.username] = jwt.sign(
          { userId: user.id },
          process.env.JWT_SECRET || 'secret'
        );
      }

      let connectedCount = 0;

      const onConnected = (username: string) => {
        connectedUsers.push(username);
        connectedCount++;

        if (connectedCount === totalUsers) {
          // 验证所有用户都已连接
          expect(connectedUsers).toHaveLength(totalUsers);

          // 广播测试消息
          broadcast('test', { message: 'Hello everyone' });

          // 关闭所有连接
          connections.forEach(ws => ws.close());
        }
      };

      // 创建多个并发连接
      for (let i = 1; i <= totalUsers; i++) {
        const ws = new WebSocket(
          `ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens[`user${i}`]}`
        );

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'connected') {
            onConnected(`user${i}`);
          }
        });

        ws.on('close', () => {
          if (connectedUsers.length === totalUsers) {
            done();
          }
        });

        connections.push(ws);
      }
    });
  });

  describe('Network Simulation', () => {
    test('应该处理网络中断后重连', (done) => {
      let reconnectAttempts = 0;
      const maxAttempts = 3;

      const createConnection = () => {
        const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.user1}`);

        ws.on('open', () => {
          reconnectAttempts++;
          console.log(`重连尝试 ${reconnectAttempts}/${maxAttempts}`);

          if (reconnectAttempts === 1) {
            // 模拟网络中断
            setTimeout(() => {
              ws._socket.destroy();
            }, 100);
          } else if (reconnectAttempts >= maxAttempts) {
            ws.close();
            done();
          }
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'connected') {
            console.log('连接已建立');
          }
        });

        ws.on('close', (code) => {
          console.log(`连接关闭: ${code}`);

          if (reconnectAttempts < maxAttempts) {
            // 模拟客户端重连逻辑
            setTimeout(() => {
              createConnection();
            }, 1000);
          }
        });

        ws.on('error', (error) => {
          console.error('WebSocket 错误:', error.message);
        });
      };

      createConnection();
    });
  });

  describe('Message Persistence', () => {
    test('应该在数据库中持久化通知', async (done) => {
      const mockNotification = {
        id: 1,
        userId: 1,
        type: 'COMMENT',
        actorId: 2,
        entityId: 456,
        entityType: 'post',
        createdAt: new Date(),
        isRead: false,
        actor: {
          id: 2,
          username: 'user2',
          avatar: null,
          avatarData: null,
        },
      };

      (prisma.notification.create as jest.Mock).mockResolvedValue(mockNotification);

      const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.user1}`);

      ws.on('message', async (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connected') {
          await notificationFunctions.pushNotification({
            type: 'COMMENT',
            actorId: 2,
            targetUserId: 1,
            entityId: 456,
            entityType: 'post',
          });
        } else if (message.type === 'notification') {
          // 验证通知已持久化到数据库
          expect(prisma.notification.create).toHaveBeenCalled();
          expect(prisma.notification.create).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                userId: 1,
                type: 'COMMENT',
                actorId: 2,
                entityId: 456,
                entityType: 'post',
              }),
            })
          );

          ws.close();
        }
      });

      ws.on('close', () => {
        done();
      });
    });
  });

  describe('Performance Tests', () => {
    test('应该处理大量消息而不崩溃', (done) => {
      const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens.user1}`);
      let messageCount = 0;
      const totalMessages = 1000;

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connected') {
          // 发送大量消息
          for (let i = 0; i < totalMessages; i++) {
            sendToUser(1, 'test', { index: i, timestamp: Date.now() });
          }
        } else if (message.type === 'test') {
          messageCount++;

          if (messageCount === totalMessages) {
            expect(messageCount).toBe(totalMessages);
            ws.close();
            done();
          }
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket 错误:', error);
      });
    });

    test('应该在高并发下保持稳定', (done) => {
      const connections: WebSocket[] = [];
      const connectionCount = 50;
      let connectedCount = 0;
      let messageReceivedCount = 0;

      // 创建多个测试用户
      for (let i = 3; i <= connectionCount + 2; i++) {
        const user = { id: i, username: `user${i}`, role: 'USER', isActive: true };
        testUsers.push(user);
        testTokens[user.username] = jwt.sign(
          { userId: user.id },
          process.env.JWT_SECRET || 'secret'
        );
      }

      for (let i = 3; i <= connectionCount + 2; i++) {
        const ws = new WebSocket(
          `ws://localhost:${(httpServer.address() as any).port}/ws?token=${testTokens[`user${i}`]}`
        );

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === 'connected') {
            connectedCount++;

            if (connectedCount === connectionCount) {
              // 所有连接建立后，广播消息
              broadcast('performance_test', { timestamp: Date.now() });
            }
          } else if (message.type === 'performance_test') {
            messageReceivedCount++;
          }
        });

        ws.on('close', () => {
          if (messageReceivedCount === connectionCount) {
            expect(messageReceivedCount).toBe(connectionCount);
            connections.forEach(c => c.close());
            done();
          }
        });

        connections.push(ws);
      }
    }, 30000); // 30秒超时
  });
});
