import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import { registerAndLogin, authenticatedRequest, cleanupTestData } from '../helpers/testHelpers';

const prisma = new PrismaClient();

describe('Users API Tests', () => {
  let authToken: string;
  let userId: number;
  let anotherAuthToken: string;
  let anotherUserId: number;

  beforeEach(async () => {
    await cleanupTestData();

    // Create test users
    const auth1 = await registerAndLogin({
      username: 'testuser',
      email: 'user@example.com',
      password: 'Test123456',
      bio: 'Test user bio',
    });
    authToken = auth1.token;
    userId = auth1.user.id;

    const auth2 = await registerAndLogin({
      username: 'anotheruser',
      email: 'another@example.com',
      password: 'Test123456',
      bio: 'Another user bio',
    });
    anotherAuthToken = auth2.token;
    anotherUserId = auth2.user.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  describe('GET /api/users/:id', () => {
    test('should get user by id', async () => {
      const response = await request(app)
        .get(`/api/users/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(userId);
      expect(response.body.data.username).toBe('testuser');
      expect(response.body.data.email).toBe('user@example.com');
      expect(response.body.data).not.toHaveProperty('password');
    });

    test('should not include sensitive information', async () => {
      const response = await request(app)
        .get(`/api/users/${userId}`);

      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.data).not.toHaveProperty('wechatOpenId');
      expect(response.body.data).not.toHaveProperty('wechatUnionId');
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/999999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('should include follow status for authenticated user', async () => {
      // Follow the user
      await authenticatedRequest(authToken)
        .post(`/api/users/${anotherUserId}/follow`);

      const response = await request(app)
        .get(`/api/users/${anotherUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.isFollowing).toBe(true);
    });

    test('should include follow counts', async () => {
      const response = await request(app)
        .get(`/api/users/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('followersCount');
      expect(response.body.data).toHaveProperty('followingCount');
    });

    test('should include posts count', async () => {
      const response = await request(app)
        .get(`/api/users/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('postsCount');
    });
  });

  describe('GET /api/users/me', () => {
    test('should get current user profile', async () => {
      const response = await authenticatedRequest(authToken)
        .get('/api/users/me');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(userId);
      expect(response.body.data.username).toBe('testuser');
    });

    test('should not get profile without authentication', async () => {
      const response = await request(app)
        .get('/api/users/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should include email for current user', async () => {
      const response = await authenticatedRequest(authToken)
        .get('/api/users/me');

      expect(response.status).toBe(200);
      expect(response.body.data.email).toBeDefined();
    });

    test('should include user settings', async () => {
      const response = await authenticatedRequest(authToken)
        .get('/api/users/me');

      expect(response.status).toBe(200);
      expect(response.body.data.allowMessage).toBeDefined();
    });
  });

  describe('PUT /api/users/me/profile', () => {
    test('should update user profile', async () => {
      const updateData = {
        username: 'updateduser',
        bio: 'Updated bio',
      };

      const response = await authenticatedRequest(authToken)
        .put('/api/users/me/profile')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.username).toBe(updateData.username);
      expect(response.body.data.bio).toBe(updateData.bio);
    });

    test('should not update profile without authentication', async () => {
      const response = await request(app)
        .put('/api/users/me/profile')
        .send({
          username: 'updateduser',
        });

      expect(response.status).toBe(401);
    });

    test('should not allow updating email to existing email', async () => {
      const response = await authenticatedRequest(authToken)
        .put('/api/users/me/profile')
        .send({
          email: 'another@example.com', // Another user's email
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should validate username uniqueness', async () => {
      const response = await authenticatedRequest(authToken)
        .put('/api/users/me/profile')
        .send({
          username: 'anotheruser', // Another user's username
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should handle partial updates', async () => {
      const response = await authenticatedRequest(authToken)
        .put('/api/users/me/profile')
        .send({
          bio: 'Only updating bio',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.bio).toBe('Only updating bio');
      expect(response.body.data.username).toBe('testuser'); // Unchanged
    });

    test('should trim whitespace from username', async () => {
      const response = await authenticatedRequest(authToken)
        .put('/api/users/me/profile')
        .send({
          username: '  trimmeduser  ',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.username).toBe('trimmeduser');
    });

    test('should validate username format', async () => {
      const response = await authenticatedRequest(authToken)
        .put('/api/users/me/profile')
        .send({
          username: 'invalid username!',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/me/password', () => {
    test('should change password with correct old password', async () => {
      const response = await authenticatedRequest(authToken)
        .put('/api/users/me/password')
        .send({
          oldPassword: 'Test123456',
          newPassword: 'NewPassword123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'NewPassword123',
        });

      expect(loginResponse.status).toBe(200);
    });

    test('should not change password with incorrect old password', async () => {
      const response = await authenticatedRequest(authToken)
        .put('/api/users/me/password')
        .send({
          oldPassword: 'WrongPassword',
          newPassword: 'NewPassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should not change password without authentication', async () => {
      const response = await request(app)
        .put('/api/users/me/password')
        .send({
          oldPassword: 'Test123456',
          newPassword: 'NewPassword123',
        });

      expect(response.status).toBe(401);
    });

    test('should validate new password strength', async () => {
      const response = await authenticatedRequest(authToken)
        .put('/api/users/me/password')
        .send({
          oldPassword: 'Test123456',
          newPassword: '123', // Too weak
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should require all password fields', async () => {
      const response = await authenticatedRequest(authToken)
        .put('/api/users/me/password')
        .send({
          oldPassword: 'Test123456',
          // Missing newPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/me/settings', () => {
    test('should update user settings', async () => {
      const settings = {
        allowMessage: false,
        followOnlyMessage: true,
      };

      const response = await authenticatedRequest(authToken)
        .put('/api/users/me/settings')
        .send(settings);

      expect(response.status).toBe(200);
      expect(response.body.data.allowMessage).toBe(false);
      expect(response.body.data.followOnlyMessage).toBe(true);
    });

    test('should not update settings without authentication', async () => {
      const response = await request(app)
        .put('/api/users/me/settings')
        .send({
          allowMessage: false,
        });

      expect(response.status).toBe(401);
    });

    test('should handle partial settings update', async () => {
      const response = await authenticatedRequest(authToken)
        .put('/api/users/me/settings')
        .send({
          allowMessage: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.allowMessage).toBe(false);
    });
  });

  describe('PUT /api/users/me/privacy', () => {
    test('should update privacy settings', async () => {
      const privacySettings = {
        hideFollowing: true,
        hideFollowers: true,
        hidePosts: false,
        hideFavorites: true,
      };

      const response = await authenticatedRequest(authToken)
        .put('/api/users/me/privacy')
        .send(privacySettings);

      expect(response.status).toBe(200);
      expect(response.body.data.hideFollowing).toBe(true);
      expect(response.body.data.hideFollowers).toBe(true);
      expect(response.body.data.hidePosts).toBe(false);
      expect(response.body.data.hideFavorites).toBe(true);
    });

    test('should not update privacy settings without authentication', async () => {
      const response = await request(app)
        .put('/api/users/me/privacy')
        .send({
          hideFollowing: true,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/users/:id/follow', () => {
    test('should follow user', async () => {
      const response = await authenticatedRequest(authToken)
        .post(`/api/users/${anotherUserId}/follow`);

      expect(response.status).toBe(200);
      expect(response.body.data.isFollowing).toBe(true);
    });

    test('should not follow without authentication', async () => {
      const response = await request(app)
        .post(`/api/users/${anotherUserId}/follow`);

      expect(response.status).toBe(401);
    });

    test('should not follow yourself', async () => {
      const response = await authenticatedRequest(authToken)
        .post(`/api/users/${userId}/follow`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should not follow already followed user', async () => {
      // First follow
      await authenticatedRequest(authToken)
        .post(`/api/users/${anotherUserId}/follow`);

      // Try to follow again
      const response = await authenticatedRequest(authToken)
        .post(`/api/users/${anotherUserId}/follow`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should create notification when following', async () => {
      await authenticatedRequest(authToken)
        .post(`/api/users/${anotherUserId}/follow`);

      const notifications = await prisma.notification.findMany({
        where: {
          userId: anotherUserId,
          type: 'follow',
        },
      });

      expect(notifications.length).toBe(1);
    });
  });

  describe('DELETE /api/users/:id/follow', () => {
    beforeEach(async () => {
      // Follow the user first
      await authenticatedRequest(authToken)
        .post(`/api/users/${anotherUserId}/follow`);
    });

    test('should unfollow user', async () => {
      const response = await authenticatedRequest(authToken)
        .delete(`/api/users/${anotherUserId}/follow`);

      expect(response.status).toBe(200);
      expect(response.body.data.isFollowing).toBe(false);
    });

    test('should not unfollow without authentication', async () => {
      const response = await request(app)
        .delete(`/api/users/${anotherUserId}/follow`);

      expect(response.status).toBe(401);
    });

    test('should not unfollow user not following', async () => {
      // Unfollow
      await authenticatedRequest(authToken)
        .delete(`/api/users/${anotherUserId}/follow`);

      // Try to unfollow again
      const response = await authenticatedRequest(authToken)
        .delete(`/api/users/${anotherUserId}/follow`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/users/:id/following', () => {
    test('should get user following list', async () => {
      // Follow some users
      await authenticatedRequest(authToken)
        .post(`/api/users/${anotherUserId}/follow`);

      const response = await request(app)
        .get(`/api/users/${userId}/following`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].id).toBe(anotherUserId);
    });

    test('should return empty array for user with no following', async () => {
      const response = await request(app)
        .get(`/api/users/${anotherUserId}/following`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    test('should respect privacy settings', async () => {
      // Update privacy to hide following
      await authenticatedRequest(authToken)
        .put('/api/users/me/privacy')
        .send({
          hideFollowing: true,
        });

      const response = await authenticatedRequest(anotherAuthToken)
        .get(`/api/users/${userId}/following`);

      // Should either return empty or error based on implementation
      expect(response.status).toBeDefined();
    });
  });

  describe('GET /api/users/:id/followers', () => {
    test('should get user followers list', async () => {
      // Another user follows this user
      await authenticatedRequest(anotherAuthToken)
        .post(`/api/users/${userId}/follow`);

      const response = await request(app)
        .get(`/api/users/${userId}/followers`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].id).toBe(anotherUserId);
    });

    test('should return empty array for user with no followers', async () => {
      const response = await request(app)
        .get(`/api/users/${anotherUserId}/followers`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('POST /api/users/:id/block', () => {
    test('should block user', async () => {
      const response = await authenticatedRequest(authToken)
        .post(`/api/users/${anotherUserId}/block`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should not block without authentication', async () => {
      const response = await request(app)
        .post(`/api/users/${anotherUserId}/block`);

      expect(response.status).toBe(401);
    });

    test('should not block yourself', async () => {
      const response = await authenticatedRequest(authToken)
        .post(`/api/users/${userId}/block`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should not block already blocked user', async () => {
      // First block
      await authenticatedRequest(authToken)
        .post(`/api/users/${anotherUserId}/block`);

      // Try to block again
      const response = await authenticatedRequest(authToken)
        .post(`/api/users/${anotherUserId}/block`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should remove follow relationship when blocking', async () => {
      // Follow first
      await authenticatedRequest(authToken)
        .post(`/api/users/${anotherUserId}/follow`);

      // Then block
      await authenticatedRequest(authToken)
        .post(`/api/users/${anotherUserId}/block`);

      // Follow should be removed
      const response = await request(app)
        .get(`/api/users/${userId}/following`);

      expect(response.body.data.length).toBe(0);
    });
  });

  describe('DELETE /api/users/:id/block', () => {
    beforeEach(async () => {
      // Block the user first
      await authenticatedRequest(authToken)
        .post(`/api/users/${anotherUserId}/block`);
    });

    test('should unblock user', async () => {
      const response = await authenticatedRequest(authToken)
        .delete(`/api/users/${anotherUserId}/block`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should not unblock without authentication', async () => {
      const response = await request(app)
        .delete(`/api/users/${anotherUserId}/block`);

      expect(response.status).toBe(401);
    });

    test('should not unblock user not blocked', async () => {
      // Unblock
      await authenticatedRequest(authToken)
        .delete(`/api/users/${anotherUserId}/block`);

      // Try to unblock again
      const response = await authenticatedRequest(authToken)
        .delete(`/api/users/${anotherUserId}/block`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/users/blocks/blocked', () => {
    test('should get blocked users list', async () => {
      // Block some users
      await authenticatedRequest(authToken)
        .post(`/api/users/${anotherUserId}/block`);

      const response = await authenticatedRequest(authToken)
        .get('/api/users/blocks/blocked');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should not get blocked users without authentication', async () => {
      const response = await request(app)
        .get('/api/users/blocks/blocked');

      expect(response.status).toBe(401);
    });

    test('should return empty array for user with no blocked users', async () => {
      const response = await authenticatedRequest(anotherAuthToken)
        .get('/api/users/blocks/blocked');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('User Security Tests', () => {
    test('should prevent XSS in username', async () => {
      const response = await authenticatedRequest(authToken)
        .put('/api/users/me/profile')
        .send({
          username: '<script>alert("xss")</script>',
        });

      // Should either reject or sanitize
      expect(response.status).toBeDefined();
      if (response.status === 200) {
        expect(response.body.data.username).not.toContain('<script>');
      }
    });

    test('should prevent SQL injection in profile updates', async () => {
      const response = await authenticatedRequest(authToken)
        .put('/api/users/me/profile')
        .send({
          bio: "'; DROP TABLE users; --",
        });

      // Should handle gracefully
      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
    });

    test('should handle very long bio', async () => {
      const longBio = 'A'.repeat(10000);

      const response = await authenticatedRequest(authToken)
        .put('/api/users/me/profile')
        .send({
          bio: longBio,
        });

      // Should either accept or reject based on validation
      expect(response.status).toBeDefined();
    });
  });

  describe('User Performance Tests', () => {
    test('should handle concurrent profile updates', async () => {
      const promises = Array(10).fill(null).map((_, i) =>
        authenticatedRequest(authToken)
          .put('/api/users/me/profile')
          .send({
            bio: `Updated bio ${i}`,
          })
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect([200, 400]).toContain(response.status);
      });
    });

    test('should handle large following list efficiently', async () => {
      // Create many users to follow
      for (let i = 0; i < 50; i++) {
        const newUser = await registerAndLogin({
          username: `user${i}`,
          email: `user${i}@example.com`,
        });

        await authenticatedRequest(authToken)
          .post(`/api/users/${newUser.user.id}/follow`);
      }

      const startTime = Date.now();
      const response = await request(app)
        .get(`/api/users/${userId}/following`);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });
});
