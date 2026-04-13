import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import { registerAndLogin, createTestPost, authenticatedRequest, cleanupTestData } from '../helpers/testHelpers';

const prisma = new PrismaClient();

describe('Posts API Tests', () => {
  let authToken: string;
  let userId: number;
  let anotherAuthToken: string;
  let anotherUserId: number;

  beforeEach(async () => {
    await cleanupTestData();

    // Create test users
    const auth1 = await registerAndLogin({
      username: 'postcreator',
      email: 'creator@example.com',
      password: 'Test123456',
    });
    authToken = auth1.token;
    userId = auth1.user.id;

    const auth2 = await registerAndLogin({
      username: 'anotheruser',
      email: 'another@example.com',
      password: 'Test123456',
    });
    anotherAuthToken = auth2.token;
    anotherUserId = auth2.user.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  describe('GET /api/posts', () => {
    test('should get posts list without authentication', async () => {
      // Create some test posts
      await createTestPost(userId, { content: 'Public post 1' });
      await createTestPost(userId, { content: 'Public post 2' });

      const response = await request(app)
        .get('/api/posts');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should get posts list with authentication', async () => {
      await createTestPost(userId, { content: 'Test post' });

      const response = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should support pagination', async () => {
      // Create multiple posts
      for (let i = 0; i < 15; i++) {
        await createTestPost(userId, { content: `Post ${i}` });
      }

      const response = await request(app)
        .get('/api/posts?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });

    test('should filter by user', async () => {
      await createTestPost(userId, { content: 'User 1 post' });
      await createTestPost(anotherUserId, { content: 'User 2 post' });

      const response = await request(app)
        .get(`/api/posts/user/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every((post: any) => post.userId === userId)).toBe(true);
    });

    test('should not include private posts from other users', async () => {
      await createTestPost(userId, { content: 'Public post', isPrivate: false });
      await createTestPost(anotherUserId, { content: 'Private post', isPrivate: true });

      const response = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const privatePosts = response.body.data.filter((post: any) => post.isPrivate);
      expect(privatePosts.length).toBe(0);
    });
  });

  describe('GET /api/posts/:id', () => {
    test('should get single post by id', async () => {
      const post = await createTestPost(userId, { content: 'Test post' });

      const response = await request(app)
        .get(`/api/posts/${post.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(post.id);
      expect(response.body.data.content).toBe('Test post');
    });

    test('should return 404 for non-existent post', async () => {
      const response = await request(app)
        .get('/api/posts/999999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('should include user information', async () => {
      const post = await createTestPost(userId, { content: 'Test post' });

      const response = await request(app)
        .get(`/api/posts/${post.id}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.id).toBe(userId);
    });

    test('should include like and favorite status for authenticated user', async () => {
      const post = await createTestPost(userId, { content: 'Test post' });

      // Like the post
      await request(app)
        .post(`/api/posts/${post.id}/like`)
        .set('Authorization', `Bearer ${authToken}`);

      const response = await request(app)
        .get(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.isLiked).toBe(true);
    });
  });

  describe('POST /api/posts', () => {
    test('should create post with valid data', async () => {
      const postData = {
        content: 'Delicious street food found today!',
        images: '[]',
        address: 'Test Location',
        latitude: 39.9042,
        longitude: 116.4074,
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(postData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(postData.content);
      expect(response.body.data.userId).toBe(userId);
    });

    test('should not create post without authentication', async () => {
      const response = await request(app)
        .post('/api/posts')
        .send({
          content: 'Test post',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should validate required content field', async () => {
      const response = await authenticatedRequest(authToken)
        .post('/api/posts')
        .send({
          images: '[]',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should handle post with images', async () => {
      const postData = {
        content: 'Food with images',
        images: JSON.stringify(['image1.jpg', 'image2.jpg']),
      };

      const response = await authenticatedRequest(authToken)
        .post('/api/posts')
        .send(postData);

      expect(response.status).toBe(201);
      expect(response.body.data.images).toBeDefined();
    });

    test('should handle post with location data', async () => {
      const postData = {
        content: 'Food at specific location',
        address: '123 Food Street',
        latitude: 39.9042,
        longitude: 116.4074,
      };

      const response = await authenticatedRequest(authToken)
        .post('/api/posts')
        .send(postData);

      expect(response.status).toBe(201);
      expect(response.body.data.address).toBe(postData.address);
      expect(response.body.data.latitude).toBe(postData.latitude);
      expect(response.body.data.longitude).toBe(postData.longitude);
    });

    test('should create private post when specified', async () => {
      const postData = {
        content: 'Private post',
        isPrivate: true,
      };

      const response = await authenticatedRequest(authToken)
        .post('/api/posts')
        .send(postData);

      expect(response.status).toBe(201);
      expect(response.body.data.isPrivate).toBe(true);
    });
  });

  describe('PUT /api/posts/:id', () => {
    test('should update own post', async () => {
      const post = await createTestPost(userId, { content: 'Original content' });

      const response = await authenticatedRequest(authToken)
        .put(`/api/posts/${post.id}`)
        .send({
          content: 'Updated content',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.content).toBe('Updated content');
    });

    test('should not update another user post', async () => {
      const post = await createTestPost(anotherUserId, { content: 'Original content' });

      const response = await authenticatedRequest(authToken)
        .put(`/api/posts/${post.id}`)
        .send({
          content: 'Updated content',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test('should not update post without authentication', async () => {
      const post = await createTestPost(userId, { content: 'Original content' });

      const response = await request(app)
        .put(`/api/posts/${post.id}`)
        .send({
          content: 'Updated content',
        });

      expect(response.status).toBe(401);
    });

    test('should validate update data', async () => {
      const post = await createTestPost(userId, { content: 'Original content' });

      const response = await authenticatedRequest(authToken)
        .put(`/api/posts/${post.id}`)
        .send({
          content: '', // Empty content
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    test('should delete own post', async () => {
      const post = await createTestPost(userId, { content: 'Test post' });

      const response = await authenticatedRequest(authToken)
        .delete(`/api/posts/${post.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify post is deleted
      const deletedPost = await prisma.post.findUnique({
        where: { id: post.id },
      });
      expect(deletedPost).toBeNull();
    });

    test('should not delete another user post', async () => {
      const post = await createTestPost(anotherUserId, { content: 'Test post' });

      const response = await authenticatedRequest(authToken)
        .delete(`/api/posts/${post.id}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      // Verify post still exists
      const existingPost = await prisma.post.findUnique({
        where: { id: post.id },
      });
      expect(existingPost).not.toBeNull();
    });

    test('should not delete post without authentication', async () => {
      const post = await createTestPost(userId, { content: 'Test post' });

      const response = await request(app)
        .delete(`/api/posts/${post.id}`);

      expect(response.status).toBe(401);
    });

    test('should return 404 for non-existent post', async () => {
      const response = await authenticatedRequest(authToken)
        .delete('/api/posts/999999');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/posts/:id/like', () => {
    test('should like post', async () => {
      const post = await createTestPost(userId, { content: 'Test post' });

      const response = await authenticatedRequest(anotherAuthToken)
        .post(`/api/posts/${post.id}/like`);

      expect(response.status).toBe(200);
      expect(response.body.data.isLiked).toBe(true);
      expect(response.body.data.likeCount).toBe(1);
    });

    test('should unlike already liked post', async () => {
      const post = await createTestPost(userId, { content: 'Test post' });

      // First like
      await authenticatedRequest(anotherAuthToken)
        .post(`/api/posts/${post.id}/like`);

      // Unlike
      const response = await authenticatedRequest(anotherAuthToken)
        .post(`/api/posts/${post.id}/like`);

      expect(response.status).toBe(200);
      expect(response.body.data.isLiked).toBe(false);
      expect(response.body.data.likeCount).toBe(0);
    });

    test('should not like post without authentication', async () => {
      const post = await createTestPost(userId, { content: 'Test post' });

      const response = await request(app)
        .post(`/api/posts/${post.id}/like`);

      expect(response.status).toBe(401);
    });

    test('should update like count correctly', async () => {
      const post = await createTestPost(userId, { content: 'Test post' });

      // Multiple likes
      await authenticatedRequest(anotherAuthToken)
        .post(`/api/posts/${post.id}/like`);

      // Create more users and like
      const auth3 = await registerAndLogin({
        username: 'user3',
        email: 'user3@example.com',
      });

      await authenticatedRequest(auth3.token)
        .post(`/api/posts/${post.id}/like`);

      const response = await request(app)
        .get(`/api/posts/${post.id}`);

      expect(response.body.data.likeCount).toBe(2);
    });
  });

  describe('POST /api/posts/:id/favorite', () => {
    test('should favorite post', async () => {
      const post = await createTestPost(userId, { content: 'Test post' });

      const response = await authenticatedRequest(anotherAuthToken)
        .post(`/api/posts/${post.id}/favorite`);

      expect(response.status).toBe(200);
      expect(response.body.data.isFavorited).toBe(true);
      expect(response.body.data.favoriteCount).toBe(1);
    });

    test('should unfavorite already favorited post', async () => {
      const post = await createTestPost(userId, { content: 'Test post' });

      // First favorite
      await authenticatedRequest(anotherAuthToken)
        .post(`/api/posts/${post.id}/favorite`);

      // Unfavorite
      const response = await authenticatedRequest(anotherAuthToken)
        .post(`/api/posts/${post.id}/favorite`);

      expect(response.status).toBe(200);
      expect(response.body.data.isFavorited).toBe(false);
      expect(response.body.data.favoriteCount).toBe(0);
    });

    test('should not favorite post without authentication', async () => {
      const post = await createTestPost(userId, { content: 'Test post' });

      const response = await request(app)
        .post(`/api/posts/${post.id}/favorite`);

      expect(response.status).toBe(401);
    });

    test('should get user favorites', async () => {
      const post1 = await createTestPost(userId, { content: 'Post 1' });
      const post2 = await createTestPost(userId, { content: 'Post 2' });

      // Favorite posts
      await authenticatedRequest(anotherAuthToken)
        .post(`/api/posts/${post1.id}/favorite`);
      await authenticatedRequest(anotherAuthToken)
        .post(`/api/posts/${post2.id}/favorite`);

      const response = await authenticatedRequest(anotherAuthToken)
        .get('/api/posts/favorites');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
    });
  });

  describe('Posts Performance Tests', () => {
    test('should handle large content without error', async () => {
      const largeContent = 'A'.repeat(10000);

      const response = await authenticatedRequest(authToken)
        .post('/api/posts')
        .send({
          content: largeContent,
        });

      expect(response.status).toBe(201);
    });

    test('should handle concurrent post creation', async () => {
      const promises = Array(10).fill(null).map((_, i) =>
        authenticatedRequest(authToken)
          .post('/api/posts')
          .send({
            content: `Concurrent post ${i}`,
          })
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect([200, 201]).toContain(response.status);
      });
    });
  });
});
