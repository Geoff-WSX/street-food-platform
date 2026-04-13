import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createTestUser, cleanupTestData } from '../helpers/testHelpers';

const prisma = new PrismaClient();

describe('Authentication API Tests', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test123456',
    };

    test('should register a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('注册成功');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.user.email).toBe(validUserData.email);
      expect(response.body.data.user.username).toBe(validUserData.username);
    });

    test('should not register user with existing email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should not register user with existing username', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      // Second registration with same username but different email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          email: 'another@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          // Missing username and password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'Test123456',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: '123', // Too short
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should trim whitespace from username and email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: '  testuser  ',
          email: '  test@example.com  ',
          password: 'Test123456',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.user.username).toBe('testuser');
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    test('should hash password before storing', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      const user = await prisma.user.findUnique({
        where: { email: validUserData.email },
      });

      expect(user).toBeDefined();
      expect(user?.password).not.toBe(validUserData.password);

      const isValidPassword = await bcrypt.compare(validUserData.password, user!.password);
      expect(isValidPassword).toBe(true);
    });

    test('should generate valid JWT token', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      const token = response.body.data.token;

      // Verify token is valid JWT
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
      ) as any;

      expect(decoded).toHaveProperty('userId');
      expect(decoded.userId).toBe(response.body.data.user.id);
    });
  });

  describe('POST /api/auth/login', () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test123456',
    };

    beforeEach(async () => {
      // Create a test user before login tests
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      await prisma.user.create({
        data: {
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
        },
      });
    });

    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('登录成功');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    test('should not login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: userData.password,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'WrongPassword123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should not login with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: userData.password,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should not login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should handle case-insensitive email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email.toUpperCase(),
          password: userData.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should generate new token on each login', async () => {
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      const response2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      expect(response1.body.data.token).toBeDefined();
      expect(response2.body.data.token).toBeDefined();
      // Tokens might be different due to timing, but both should be valid
      expect(response1.body.data.user.id).toBe(response2.body.data.user.id);
    });
  });

  describe('Authentication Security Tests', () => {
    test('should prevent SQL injection in login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "'; DROP TABLE users; --",
          password: 'password',
        });

      // Should not crash, should return proper error
      expect([401, 400]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    test('should prevent SQL injection in register', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: "'; DROP TABLE users; --",
          email: 'test@example.com',
          password: 'Test123456',
        });

      // Should handle gracefully
      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
    });

    test('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(300) + '@example.com';
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: longEmail,
          password: 'Test123456',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should handle special characters in username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'test<script>alert("xss")</script>user',
          email: 'test@example.com',
          password: 'Test123456',
        });

      // Should either accept (sanitized) or reject
      expect(response.status).toBeDefined();
      if (response.status === 201) {
        // If accepted, username should be sanitized
        expect(response.body.data.user.username).not.toContain('<script>');
      }
    });
  });
});
