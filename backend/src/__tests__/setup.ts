import { PrismaClient } from '@prisma/client';

// 设置测试环境变量（必须在导入 PrismaClient 之前）
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key';
process.env.DATABASE_URL = 'mysql://root:root123456@localhost:3306/street_food_db';
process.env.PORT = '3002';  // 使用 3002 避免与小程序项目的 3001 端口冲突

const prisma = new PrismaClient();

// Mock console 方法以减少测试输出噪音
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // 保留 error 以便调试
  error: console.error,
};

beforeAll(async () => {
  // Test database setup
  console.error('Setting up test environment...');
});

afterAll(async () => {
  // Clean up test database
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean up test data before each test
  // This ensures tests are isolated
  try {
    await cleanupTestData();
  } catch (error) {
    // 如果数据库连接失败，只记录错误但不中断测试
    console.error('Cleanup failed:', error);
  }

  // 清理 WebSocket 连接
  try {
    const wsModule = require('../websocket');
    if (wsModule.getClients) {
      const clients = wsModule.getClients();
      if (clients && typeof clients.clear === 'function') {
        clients.clear();
      }
    }
  } catch (error) {
    // WebSocket 模块可能不存在或无法加载
  }
});

// 在所有测试前清理一次
beforeAll(async () => {
  // Test database setup
  console.error('Setting up test environment...');

  // 清理所有测试用户
  try {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { username: { contains: 'testuser' } },
          { email: { contains: 'test_' } },
          { email: { contains: 'test@' } },
        ],
      },
    });
  } catch (error) {
    console.error('Initial cleanup failed:', error);
  }
});

afterEach(() => {
  // 清理定时器
  jest.clearAllTimers();
});

async function cleanupTestData() {
  // Delete test data in the correct order due to foreign key constraints
  // 清理所有数据，使用更宽松的条件确保清理彻底
  await prisma.commentLike.deleteMany({});
  await prisma.mention.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.like.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.postTag.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.follow.deleteMany({});
  await prisma.notification.deleteMany({});

  // 删除所有测试用户（更全面的清理）
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { contains: 'test' } },
        { email: { contains: 'example.com' } },
        { username: { startsWith: 'testuser' } },
        { username: { startsWith: 'foodlover' } },
        { username: { startsWith: 'noodle' } },
        { username: { startsWith: 'dimsum' } },
      ],
    },
  });
}
