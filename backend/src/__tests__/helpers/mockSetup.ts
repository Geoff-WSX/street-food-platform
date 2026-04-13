/**
 * Mock 配置工具
 * 确保 Mock 在测试间正确重置
 */

import { PrismaClient } from '@prisma/client';

/**
 * 创建完整的 Prisma Mock
 */
export function createPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    post: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    comment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    notification: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
  };
}

/**
 * 设置测试前的 Mock 配置
 */
export function setupPriskaMock(prismaMock: any, testUsers: any[]) {
  beforeEach(() => {
    // 重置所有 Mock
    jest.clearAllMocks();

    // 设置 findUnique Mock
    (prismaMock.user.findUnique as jest.Mock).mockImplementation(({ where }) => {
      return Promise.resolve(testUsers.find((u: any) => u.id === where.id));
    });
  });

  afterEach(() => {
    // 清理 Mock
    jest.restoreAllMocks();
  });
}

/**
 * 创建测试数据 Mock
 */
export function createMockTestUsers() {
  return [
    { id: 1, username: 'user1', role: 'USER', isActive: true },
    { id: 2, username: 'user2', role: 'USER', isActive: true },
    { id: 3, username: 'admin1', role: 'ADMIN', isActive: true },
    { id: 4, username: 'inactive', role: 'USER', isActive: false },
  ];
}

/**
 * Mock WebSocket 服务
 */
export function createWebSocketMock() {
  return {
    clients: new Map(),
    sendToUser: jest.fn(),
    sendToUsers: jest.fn(),
    broadcast: jest.fn(),
    getOnlineUsers: jest.fn(() => []),
    getOnlineCount: jest.fn(() => 0),
    close: jest.fn(),
  };
}
