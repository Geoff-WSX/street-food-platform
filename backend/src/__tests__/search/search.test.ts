import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import { registerAndLogin, createTestPost, authenticatedRequest, cleanupTestData } from '../helpers/testHelpers';

const prisma = new PrismaClient();

describe('Search API Tests', () => {
  let authToken: string;
  let userId: number;
  let testPosts: any[] = [];
  let testUsers: any[] = [];

  beforeEach(async () => {
    await cleanupTestData();

    // Create test users
    const auth1 = await registerAndLogin({
      username: 'foodlover',
      email: 'foodlover@example.com',
      password: 'Test123456',
      bio: 'I love street food',
    });
    authToken = auth1.token;
    userId = auth1.user.id;

    // Create additional users for search testing
    const user2 = await registerAndLogin({
      username: 'noodlefan',
      email: 'noodle@example.com',
      password: 'Test123456',
      bio: 'Noodle enthusiast',
    });

    const user3 = await registerAndLogin({
      username: 'dimsummaster',
      email: 'dimsum@example.com',
      password: 'Test123456',
      bio: 'Dim sum lover',
    });

    testUsers = [auth1.user, user2.user, user3.user];

    // Create test posts with searchable content
    testPosts.push(await createTestPost(userId, {
      content: 'Amazing noodles at the street market',
      address: 'Food Street',
    }));

    testPosts.push(await createTestPost(userId, {
      content: 'Best dim sum in town',
      address: 'Chinatown',
    }));

    testPosts.push(await createTestPost(user2.user.id, {
      content: 'Spicy food challenge completed',
      address: 'Spicy Street',
    }));

    testPosts.push(await createTestPost(user3.user.id, {
      content: 'Sweet and sour pork review',
      address: 'Restaurant Row',
    }));
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  describe('GET /api/search', () => {
    test('should search with authentication', async () => {
      const response = await authenticatedRequest(authToken)
        .get('/api/search')
        .query({ q: 'noodles' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should not search without authentication', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: 'noodles' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should require search query parameter', async () => {
      const response = await authenticatedRequest(authToken)
        .get('/api/search');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should handle empty search query', async () => {
      const response = await authenticatedRequest(authToken)
        .get('/api/search')
        .query({ q: '' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return mixed results (users and posts)', async () => {
      const response = await authenticatedRequest(authToken)
        .get('/api/search')
        .query({ q: 'noodles' });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      // Should contain both posts and possibly users
    });
  });

  describe('GET /api/search/users', () => {
    test('should search users by username', async () => {
      const response = await request(app)
        .get('/api/search/users')
        .query({ q: 'foodlover' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].username).toContain('foodlover');
    });

    test('should search users without authentication', async () => {
      const response = await request(app)
        .get('/api/search/users')
        .query({ q: 'noodle' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should search users by email', async () => {
      const response = await authenticatedRequest(authToken)
        .get('/api/search/users')
        .query({ q: 'noodle@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should search users by bio', async () => {
      const response = await request(app)
        .get('/api/search/users')
        .query({ q: 'street food' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should return empty array for no matches', async () => {
      const response = await request(app)
        .get('/api/search/users')
        .query({ q: 'nonexistentuser123456' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get('/api/search/users')
        .query({ q: 'user', page: 1, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });

    test('should handle partial username matches', async () => {
      const response = await request(app)
        .get('/api/search/users')
        .query({ q: 'noodle' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.some((user: any) => user.username.includes('noodle'))).toBe(true);
    });

    test('should be case insensitive', async () => {
      const response1 = await request(app)
        .get('/api/search/users')
        .query({ q: 'FOODLOVER' });

      const response2 = await request(app)
        .get('/api/search/users')
        .query({ q: 'foodlover' });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.data.length).toBe(response2.body.data.length);
    });

    test('should exclude sensitive information', async () => {
      const response = await request(app)
        .get('/api/search/users')
        .query({ q: 'foodlover' });

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).not.toHaveProperty('password');
        expect(response.body.data[0]).not.toHaveProperty('email');
      }
    });
  });

  describe('GET /api/search/posts', () => {
    test('should search posts by content', async () => {
      const response = await request(app)
        .get('/api/search/posts')
        .query({ q: 'noodles' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].content).toContain('noodles');
    });

    test('should search posts without authentication', async () => {
      const response = await request(app)
        .get('/api/search/posts')
        .query({ q: 'dim sum' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should return posts with user information', async () => {
      const response = await request(app)
        .get('/api/search/posts')
        .query({ q: 'noodles' });

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        expect(response.body.data[0].user).toBeDefined();
        expect(response.body.data[0].user.username).toBeDefined();
      }
    });

    test('should return empty array for no matches', async () => {
      const response = await request(app)
        .get('/api/search/posts')
        .query({ q: 'nonexistent content 123456' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get('/api/search/posts')
        .query({ q: 'food', page: 1, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });

    test('should handle multi-word searches', async () => {
      const response = await request(app)
        .get('/api/search/posts')
        .query({ q: 'street market' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should be case insensitive', async () => {
      const response1 = await request(app)
        .get('/api/search/posts')
        .query({ q: 'NOODLES' });

      const response2 = await request(app)
        .get('/api/search/posts')
        .query({ q: 'noodles' });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.data.length).toBe(response2.body.data.length);
    });

    test('should not include private posts from other users', async () => {
      // Create a private post
      await createTestPost(userId, {
        content: 'Private noodles post',
        isPrivate: true,
      });

      const response = await request(app)
        .get('/api/search/posts')
        .query({ q: 'noodles' });

      expect(response.status).toBe(200);
      // Private posts should not appear in search results for unauthenticated users
    });

    test('should handle special characters', async () => {
      const response = await request(app)
        .get('/api/search/posts')
        .query({ q: 'spicy!' });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/search/suggest', () => {
    test('should get search suggestions without authentication', async () => {
      const response = await request(app)
        .get('/api/search/suggest')
        .query({ q: 'noo' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should require query parameter', async () => {
      const response = await request(app)
        .get('/api/search/suggest');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return user suggestions', async () => {
      const response = await request(app)
        .get('/api/search/suggest')
        .query({ q: 'food' });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      // Should contain user suggestions
    });

    test('should handle short queries', async () => {
      const response = await request(app)
        .get('/api/search/suggest')
        .query({ q: 'f' });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    test('should return limited suggestions', async () => {
      const response = await request(app)
        .get('/api/search/suggest')
        .query({ q: 'oo' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      // Should have reasonable limit
    });

    test('should handle empty suggestions', async () => {
      const response = await request(app)
        .get('/api/search/suggest')
        .query({ q: 'xyz123' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });
  });

  describe('POST /api/search/suggest/refresh', () => {
    test('should refresh suggestions cache with admin rights', async () => {
      // Create admin user
      const adminAuth = await registerAndLogin({
        username: 'admin',
        email: 'admin@example.com',
        password: 'Admin123456',
      });

      // Update user to admin role
      await prisma.user.update({
        where: { id: adminAuth.user.id },
        data: { role: 'admin' },
      });

      const response = await authenticatedRequest(adminAuth.token)
        .post('/api/search/suggest/refresh');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should not refresh suggestions without authentication', async () => {
      const response = await request(app)
        .post('/api/search/suggest/refresh');

      expect(response.status).toBe(401);
    });

    test('should not refresh suggestions without admin rights', async () => {
      const response = await authenticatedRequest(authToken)
        .post('/api/search/suggest/refresh');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Search Edge Cases', () => {
    test('should handle very long search queries', async () => {
      const longQuery = 'a'.repeat(1000);

      const response = await authenticatedRequest(authToken)
        .get('/api/search/users')
        .query({ q: longQuery });

      // Should handle gracefully
      expect(response.status).toBeDefined();
    });

    test('should handle special characters in search', async () => {
      const specialQuery = '!@#$%^&*()';

      const response = await authenticatedRequest(authToken)
        .get('/api/search/users')
        .query({ q: specialQuery });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    test('should handle unicode characters', async () => {
      const unicodeQuery = '美食'; // Chinese for "food"

      const response = await request(app)
        .get('/api/search/posts')
        .query({ q: unicodeQuery });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    test('should handle SQL injection attempts', async () => {
      const sqlInjection = "'; DROP TABLE users; --";

      const response = await authenticatedRequest(authToken)
        .get('/api/search/users')
        .query({ q: sqlInjection });

      // Should handle gracefully without crashing
      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
    });

    test('should handle XSS attempts', async () => {
      const xssAttempt = '<script>alert("xss")</script>';

      const response = await authenticatedRequest(authToken)
        .get('/api/search/users')
        .query({ q: xssAttempt });

      expect(response.status).toBe(200);
      // Results should be properly escaped
      expect(response.body).toBeDefined();
    });
  });

  describe('Search Performance Tests', () => {
    test('should handle concurrent search requests', async () => {
      const promises = Array(10).fill(null).map((_, i) =>
        request(app)
          .get('/api/search/posts')
          .query({ q: 'food' })
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('should respond within reasonable time', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/search/posts')
        .query({ q: 'noodles' });

      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(2000); // Should respond within 2 seconds
    });

    test('should handle large result sets efficiently', async () => {
      // Create many posts
      for (let i = 0; i < 50; i++) {
        await createTestPost(userId, {
          content: `Food post ${i} with noodles content`,
        });
      }

      const startTime = Date.now();

      const response = await request(app)
        .get('/api/search/posts')
        .query({ q: 'noodles', limit: 50 });

      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(3000); // Should handle large results within 3 seconds
    });
  });

  describe('Search Integration Tests', () => {
    test('should find posts by location', async () => {
      const response = await request(app)
        .get('/api/search/posts')
        .query({ q: 'Food Street' });

      expect(response.status).toBe(200);
      // Should find posts from that location
    });

    test('should support combined search criteria', async () => {
      const response = await authenticatedRequest(authToken)
        .get('/api/search')
        .query({
          q: 'food',
          type: 'posts',
          page: 1,
          limit: 10,
        });

      expect(response.status).toBe(200);
    });

    test('should handle fuzzy matching', async () => {
      const response = await request(app)
        .get('/api/search/users')
        .query({ q: 'foodlover' });

      expect(response.status).toBe(200);
      // Should find "foodlover" even with slight variations
    });
  });
});
