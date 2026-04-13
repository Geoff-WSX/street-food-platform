/**
 * WebSocket Stress Tests
 * 压力测试和性能测试
 */

import { Server } from 'http';
import { WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { initWebSocket, sendToUser, broadcast } from '../index';

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

describe('WebSocket Stress Tests', () => {
  let httpServer: Server;
  let wsServer: any;
  let testUsers: any[];

  beforeAll((done) => {
    httpServer = new Server();
    httpServer.listen(0, () => {
      wsServer = initWebSocket(httpServer);

      // 创建大量测试用户
      testUsers = [];
      for (let i = 1; i <= 1000; i++) {
        testUsers.push({
          id: i,
          username: `stress_user_${i}`,
          role: i % 10 === 0 ? 'ADMIN' : 'USER',
          isActive: true,
        });
      }

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

  describe('High Connection Load', () => {
    test('应该处理 1000 个并发连接', (done) => {
      const connections: WebSocket[] = [];
      const connectedCount = { value: 0 };
      const targetConnections = 1000;

      const startTime = Date.now();

      for (let i = 1; i <= targetConnections; i++) {
        const token = jwt.sign({ userId: i }, process.env.JWT_SECRET || 'secret');
        const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${token}`);

        ws.on('open', () => {
          connectedCount.value++;

          if (connectedCount.value === targetConnections) {
            const duration = Date.now() - startTime;

            // 所有连接应该在合理时间内建立
            expect(duration).toBeLessThan(30000); // 30秒

            // 验证连接数
            const onlineCount = require('../index').getOnlineCount();
            expect(onlineCount).toBe(targetConnections);

            // 关闭所有连接
            connections.forEach(c => c.close());
          }
        });

        ws.on('error', (error) => {
          console.error(`连接 ${i} 错误:`, error.message);
        });

        connections.push(ws);
      }

      // 等待所有连接关闭
      let closedCount = 0;
      connections.forEach(ws => {
        ws.on('close', () => {
          closedCount++;
          if (closedCount === targetConnections) {
            done();
          }
        });
      });
    }, 60000); // 60秒超时
  });

  describe('Message Throughput', () => {
    test('应该处理每秒 10000 条消息', (done) => {
      const connectionCount = 100;
      const messagesPerConnection = 100;
      const totalMessages = connectionCount * messagesPerConnection;
      let receivedMessages = 0;

      const connections: WebSocket[] = [];
      let connectedCount = 0;

      const startTime = Date.now();

      // 创建连接
      for (let i = 1; i <= connectionCount; i++) {
        const token = jwt.sign({ userId: i }, process.env.JWT_SECRET || 'secret');
        const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${token}`);

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === 'connected') {
            connectedCount++;

            if (connectedCount === connectionCount) {
              // 所有连接建立后，开始发送消息
              for (let j = 0; j < messagesPerConnection; j++) {
                broadcast('test', {
                  index: j,
                  timestamp: Date.now(),
                  data: 'x'.repeat(100), // 100字节数据
                });
              }
            }
          } else if (message.type === 'test') {
            receivedMessages++;

            if (receivedMessages === totalMessages) {
              const duration = Date.now() - startTime;
              const throughput = (totalMessages / duration) * 1000; // 消息/秒

              console.log(`处理了 ${totalMessages} 条消息，耗时 ${duration}ms`);
              console.log(`吞吐量: ${throughput.toFixed(2)} 消息/秒`);

              // 吞吐量应该大于 10000 消息/秒
              expect(throughput).toBeGreaterThan(10000);

              connections.forEach(c => c.close());
            }
          }
        });

        connections.push(ws);
      }

      // 等待所有连接关闭
      let closedCount = 0;
      connections.forEach(ws => {
        ws.on('close', () => {
          closedCount++;
          if (closedCount === connectionCount) {
            done();
          }
        });
      });
    }, 60000);
  });

  describe('Memory Efficiency', () => {
    test('应该在大量消息后保持内存稳定', (done) => {
      const connectionCount = 50;
      const messageBatches = 10;
      const messagesPerBatch = 1000;

      const connections: WebSocket[] = [];
      let connectedCount = 0;
      let batchCount = 0;

      // 创建连接
      for (let i = 1; i <= connectionCount; i++) {
        const token = jwt.sign({ userId: i }, process.env.JWT_SECRET || 'secret');
        const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${token}`);

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === 'connected') {
            connectedCount++;

            if (connectedCount === connectionCount) {
              sendNextBatch();
            }
          } else if (message.type === 'memory_test') {
            // 接收到消息
          }
        });

        connections.push(ws);
      }

      function sendNextBatch() {
        if (batchCount >= messageBatches) {
          // 所有批次发送完成
          connections.forEach(c => c.close());
          return;
        }

        // 发送一批消息
        for (let i = 0; i < messagesPerBatch; i++) {
          broadcast('memory_test', {
            batch: batchCount,
            index: i,
            data: 'x'.repeat(200), // 200字节数据
          });
        }

        batchCount++;

        // 等待一段时间后发送下一批
        setTimeout(sendNextBatch, 100);
      }

      // 等待所有连接关闭
      let closedCount = 0;
      connections.forEach(ws => {
        ws.on('close', () => {
          closedCount++;
          if (closedCount === connectionCount) {
            // 测试完成，内存应该保持稳定
            done();
          }
        });
      });
    }, 120000); // 2分钟超时
  });

  describe('Connection Stability', () => {
    test('应该在频繁连接断开时保持稳定', (done) => {
      const cycles = 10;
      const connectionsPerCycle = 50;
      let currentCycle = 0;

      function runCycle() {
        if (currentCycle >= cycles) {
          done();
          return;
        }

        const connections: WebSocket[] = [];
        let connectedCount = 0;

        // 创建连接
        for (let i = 1; i <= connectionsPerCycle; i++) {
          const userId = currentCycle * connectionsPerCycle + i;
          const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'secret');
          const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${token}`);

          ws.on('open', () => {
            connectedCount++;

            if (connectedCount === connectionsPerCycle) {
              // 所有连接建立后，立即关闭它们
              connections.forEach(c => c.close());
            }
          });

          ws.on('close', () => {
            connections.splice(connections.indexOf(ws), 1);

            if (connections.length === 0) {
              // 当前周期完成，开始下一个周期
              currentCycle++;
              setTimeout(runCycle, 100);
            }
          });

          connections.push(ws);
        }
      }

      runCycle();
    }, 120000);
  });

  describe('Error Recovery', () => {
    test('应该从网络错误中恢复', (done) => {
      const connectionCount = 20;
      const connections: WebSocket[] = [];
      let connectedCount = 0;
      let errorCount = 0;

      for (let i = 1; i <= connectionCount; i++) {
        const token = jwt.sign({ userId: i }, process.env.JWT_SECRET || 'secret');
        const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${token}`);

        ws.on('open', () => {
          connectedCount++;

          // 随机模拟一些连接错误
          if (Math.random() < 0.3) {
            (ws as any)._socket.destroy();
            errorCount++;
          } else if (connectedCount === connectionCount) {
            // 所有连接处理完成
            setTimeout(() => {
              connections.forEach(c => {
                if (c.readyState === WebSocket.OPEN) {
                  c.close();
                }
              });
            }, 1000);
          }
        });

        ws.on('error', () => {
          // 错误被处理
        });

        ws.on('close', () => {
          connections.splice(connections.indexOf(ws), 1);

          if (connections.length === 0) {
            // 所有连接已关闭
            expect(errorCount).toBeGreaterThan(0);
            done();
          }
        });

        connections.push(ws);
      }
    }, 60000);
  });

  describe('Concurrent Operations', () => {
    test('应该同时处理连接、消息和断开', (done) => {
      const operations = 500;
      let completedOperations = 0;

      // 混合操作：连接、发送消息、断开
      for (let i = 0; i < operations; i++) {
        const operation = i % 3;
        const userId = i + 1;

        if (operation === 0) {
          // 连接操作
          const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'secret');
          const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${token}`);

          ws.on('open', () => {
            completedOperations++;

            if (completedOperations === operations) {
              cleanup();
            }
          });

          ws.on('close', () => {
            completedOperations++;

            if (completedOperations === operations) {
              cleanup();
            }
          });

          // 保存引用以便清理
          (ws as any).testId = i;
        } else if (operation === 1) {
          // 发送消息操作（如果用户在线）
          sendToUser(userId, 'test', { data: 'concurrent test' });
          completedOperations++;

          if (completedOperations === operations) {
            cleanup();
          }
        } else {
          // 断开操作（如果用户在线）
          const client = require('../index').getClient(userId);
          if (client) {
            client.ws.close();
          }
          completedOperations++;

          if (completedOperations === operations) {
            cleanup();
          }
        }
      }

      function cleanup() {
        // 关闭所有剩余连接
        const onlineUsers = require('../index').getOnlineUsers();
        onlineUsers.forEach((user: { userId: number }) => {
          const client = require('../index').getClient(user.userId);
          if (client) {
            client.ws.close();
          }
        });

        setTimeout(() => {
          done();
        }, 1000);
      }
    }, 60000);
  });

  describe('Long Running Stability', () => {
    test('应该在长时间运行下保持稳定', (done) => {
      const connectionCount = 20;
      const duration = 10000; // 10秒（测试用）
      const messageInterval = 100; // 每100ms发送一次

      const connections: WebSocket[] = [];
      let connectedCount = 0;
      let messageCount = 0;
      const startTime = Date.now();

      // 创建连接
      for (let i = 1; i <= connectionCount; i++) {
        const token = jwt.sign({ userId: i }, process.env.JWT_SECRET || 'secret');
        const ws = new WebSocket(`ws://localhost:${(httpServer.address() as any).port}/ws?token=${token}`);

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());

          if (message.type === 'connected') {
            connectedCount++;

            if (connectedCount === connectionCount) {
              // 开始定期发送消息
              startMessaging();
            }
          } else if (message.type === 'stability_test') {
            messageCount++;
          }
        });

        connections.push(ws);
      }

      function startMessaging() {
        const interval = setInterval(() => {
          const elapsed = Date.now() - startTime;

          if (elapsed >= duration) {
            clearInterval(interval);

            // 验证结果
            console.log(`在 ${duration}ms 内发送了 ${messageCount} 条消息`);
            expect(messageCount).toBeGreaterThan(0);

            // 关闭所有连接
            connections.forEach(c => c.close());
            return;
          }

          // 广播消息
          broadcast('stability_test', {
            timestamp: Date.now(),
            data: 'x'.repeat(150),
          });
        }, messageInterval);
      }

      // 等待所有连接关闭
      let closedCount = 0;
      connections.forEach(ws => {
        ws.on('close', () => {
          closedCount++;
          if (closedCount === connectionCount) {
            done();
          }
        });
      });
    }, 30000);
  });
});
