import request from 'supertest';
import app from '../../app';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma, cleanupPrismaClient } from './prisma';

export interface TestUser {
  id: number;
  username: string;
  email: string;
  password: string;
  token?: string;
  bio?: string;
  avatar?: string | null;
}

export interface AuthTokens {
  user: TestUser;
  token: string;
}

/**
 * Create a test user in the database
 */
export async function createTestUser(userData?: Partial<TestUser>): Promise<TestUser> {
  const hashedPassword = await bcrypt.hash(userData?.password || 'Test123456', 10);

  const user = await prisma.user.create({
    data: {
      username: userData?.username || `testuser_${Date.now()}`,
      email: userData?.email || `test_${Date.now()}@example.com`,
      password: hashedPassword,
      bio: userData?.bio || 'Test user bio',
      avatar: userData?.avatar || null,
    },
  });

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    password: userData?.password || 'Test123456',
  };
}

/**
 * Create a test post
 */
export async function createTestPost(userId: number, postData?: any) {
  return await prisma.post.create({
    data: {
      userId,
      content: postData?.content || 'This is a test post about street food',
      images: postData?.images || '[]',
      address: postData?.address || 'Test Street Food Location',
      latitude: postData?.latitude || 39.9042,
      longitude: postData?.longitude || 116.4074,
      isPrivate: postData?.isPrivate || false,
    },
  });
}

/**
 * Create a test comment
 */
export async function createTestComment(postId: number, userId: number, content?: string) {
  return await prisma.comment.create({
    data: {
      postId,
      userId,
      content: content || 'This is a test comment',
    },
  });
}

/**
 * Generate JWT token for a user
 */
export function generateAuthToken(userId: number): string {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    { expiresIn: '7d' }
  );
}

/**
 * 测试数据计数器（用于生成唯一标识）
 */
let testCounter = 0;

/**
 * 生成唯一的测试ID
 */
export function generateTestId(): string {
  return `${process.pid}-${Date.now()}-${testCounter++}`;
}

/**
 * Register and login a user, return auth tokens
 */
export async function registerAndLogin(userData?: Partial<TestUser>): Promise<AuthTokens> {
  const uniqueId = generateTestId();

  // Register user
  const registerResponse = await request(app)
    .post('/api/auth/register')
    .send({
      username: userData?.username || `testuser_${uniqueId}`,
      email: userData?.email || `test_${uniqueId}@example.com`,
      password: userData?.password || 'Test123456',
    });

  if (registerResponse.status !== 201) {
    throw new Error(`Registration failed: ${JSON.stringify(registerResponse.body)}`);
  }

  // Login user
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      email: userData?.email || registerResponse.body.data.email,
      password: userData?.password || 'Test123456',
    });

  if (loginResponse.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(loginResponse.body)}`);
  }

  return {
    user: loginResponse.body.data.user,
    token: loginResponse.body.data.token,
  };
}

/**
 * Create authenticated request
 */
export function authenticatedRequest(token: string) {
  return {
    get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => request(app).post(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) => request(app).put(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
  };
}

/**
 * Clean up all test data
 */
export async function cleanupTestData() {
  // Delete in correct order due to foreign keys
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

/**
 * 清理所有资源
 */
export async function cleanupAllResources(): Promise<void> {
  await cleanupTestData();
  await cleanupPrismaClient();
}

/**
 * Wait for async operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
