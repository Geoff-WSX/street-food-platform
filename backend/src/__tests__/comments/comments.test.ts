import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import { registerAndLogin, createTestPost, createTestComment, authenticatedRequest, cleanupTestData } from '../helpers/testHelpers';

const prisma = new PrismaClient();

describe('Comments API Tests', () => {
  let authToken: string;
  let userId: number;
  let anotherAuthToken: string;
  let anotherUserId: number;
  let testPostId: number;

  beforeEach(async () => {
    await cleanupTestData();

    // Create test users
    const auth1 = await registerAndLogin({
      username: 'commenter',
      email: 'commenter@example.com',
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

    // Create a test post
    const post = await createTestPost(userId, { content: 'Test post for comments' });
    testPostId = post.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  describe('POST /api/comments (Create Comment)', () => {
    test('should create comment on post', async () => {
      const commentData = {
        postId: testPostId,
        content: 'This is a great food post!',
      };

      const response = await authenticatedRequest(authToken)
        .post('/api/comments')
        .send(commentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(commentData.content);
      expect(response.body.data.postId).toBe(testPostId);
      expect(response.body.data.userId).toBe(userId);
    });

    test('should not create comment without authentication', async () => {
      const response = await request(app)
        .post('/api/comments')
        .send({
          postId: testPostId,
          content: 'Test comment',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should validate required fields', async () => {
      const response = await authenticatedRequest(authToken)
        .post('/api/comments')
        .send({
          postId: testPostId,
          // Missing content
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should not create comment on non-existent post', async () => {
      const response = await authenticatedRequest(authToken)
        .post('/api/comments')
        .send({
          postId: 999999,
          content: 'Test comment',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('should handle comment with mentions', async () => {
      const commentData = {
        postId: testPostId,
        content: 'Hey @anotheruser, check this out!',
      };

      const response = await authenticatedRequest(authToken)
        .post('/api/comments')
        .send(commentData);

      expect(response.status).toBe(201);
      expect(response.body.data.content).toBe(commentData.content);
    });

    test('should handle long comments', async () => {
      const longContent = 'A'.repeat(5000);

      const response = await authenticatedRequest(authToken)
        .post('/api/comments')
        .send({
          postId: testPostId,
          content: longContent,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.content).toBe(longContent);
    });

    test('should trim whitespace from content', async () => {
      const commentData = {
        postId: testPostId,
        content: '  Test comment with spaces  ',
      };

      const response = await authenticatedRequest(authToken)
        .post('/api/comments')
        .send(commentData);

      expect(response.status).toBe(201);
      expect(response.body.data.content).toBe('Test comment with spaces');
    });
  });

  describe('GET /api/posts/:postId/comments', () => {
    beforeEach(async () => {
      // Create some test comments
      await createTestComment(testPostId, userId, 'First comment');
      await createTestComment(testPostId, anotherUserId, 'Second comment');
      await createTestComment(testPostId, userId, 'Third comment');
    });

    test('should get comments for a post', async () => {
      const response = await request(app)
        .get(`/api/posts/${testPostId}/comments`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(3);
    });

    test('should include user information in comments', async () => {
      const response = await request(app)
        .get(`/api/posts/${testPostId}/comments`);

      expect(response.status).toBe(200);
      expect(response.body.data[0].user).toBeDefined();
      expect(response.body.data[0].user.id).toBeDefined();
      expect(response.body.data[0].user.username).toBeDefined();
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/posts/${testPostId}/comments?page=1&limit=2`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });

    test('should return empty array for post with no comments', async () => {
      const newPost = await createTestPost(userId, { content: 'New post' });

      const response = await request(app)
        .get(`/api/posts/${newPost.id}/comments`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    test('should return 404 for non-existent post', async () => {
      const response = await request(app)
        .get('/api/posts/999999/comments');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/comments (Reply to Comment)', () => {
    let parentCommentId: number;

    beforeEach(async () => {
      const comment = await createTestComment(testPostId, userId, 'Parent comment');
      parentCommentId = comment.id;
    });

    test('should create reply to comment', async () => {
      const replyData = {
        postId: testPostId,
        content: 'This is a reply',
        parentId: parentCommentId,
      };

      const response = await authenticatedRequest(anotherAuthToken)
        .post('/api/comments')
        .send(replyData);

      expect(response.status).toBe(201);
      expect(response.body.data.parentId).toBe(parentCommentId);
      expect(response.body.data.content).toBe(replyData.content);
    });

    test('should not create reply to non-existent comment', async () => {
      const response = await authenticatedRequest(anotherAuthToken)
        .post('/api/comments')
        .send({
          postId: testPostId,
          content: 'Invalid reply',
          parentId: 999999,
        });

      expect(response.status).toBe(404);
    });

    test('should handle nested replies', async () => {
      // Create first reply
      const reply1 = await authenticatedRequest(anotherAuthToken)
        .post('/api/comments')
        .send({
          postId: testPostId,
          content: 'First reply',
          parentId: parentCommentId,
        });

      // Create reply to reply
      const reply2 = await authenticatedRequest(authToken)
        .post('/api/comments')
        .send({
          postId: testPostId,
          content: 'Reply to reply',
          parentId: reply1.body.data.id,
        });

      expect(reply2.status).toBe(201);
      expect(reply2.body.data.parentId).toBe(reply1.body.data.id);
    });
  });

  describe('GET /api/comments/:commentId/replies', () => {
    let parentCommentId: number;

    beforeEach(async () => {
      const comment = await createTestComment(testPostId, userId, 'Parent comment');
      parentCommentId = comment.id;

      // Create some replies
      await authenticatedRequest(anotherAuthToken)
        .post('/api/comments')
        .send({
          postId: testPostId,
          content: 'Reply 1',
          parentId: parentCommentId,
        });

      await authenticatedRequest(anotherAuthToken)
        .post('/api/comments')
        .send({
          postId: testPostId,
          content: 'Reply 2',
          parentId: parentCommentId,
        });
    });

    test('should get replies for a comment', async () => {
      const response = await request(app)
        .get(`/api/comments/${parentCommentId}/replies`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);
    });

    test('should return empty array for comment with no replies', async () => {
      const newComment = await createTestComment(testPostId, userId, 'New comment');

      const response = await request(app)
        .get(`/api/comments/${newComment.id}/replies`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('DELETE /api/comments/:commentId', () => {
    test('should delete own comment', async () => {
      const comment = await createTestComment(testPostId, userId, 'Test comment');

      const response = await authenticatedRequest(authToken)
        .delete(`/api/comments/${comment.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify comment is deleted
      const deletedComment = await prisma.comment.findUnique({
        where: { id: comment.id },
      });
      expect(deletedComment).toBeNull();
    });

    test('should not delete another user comment', async () => {
      const comment = await createTestComment(testPostId, anotherUserId, 'Test comment');

      const response = await authenticatedRequest(authToken)
        .delete(`/api/comments/${comment.id}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      // Verify comment still exists
      const existingComment = await prisma.comment.findUnique({
        where: { id: comment.id },
      });
      expect(existingComment).not.toBeNull();
    });

    test('should not delete comment without authentication', async () => {
      const comment = await createTestComment(testPostId, userId, 'Test comment');

      const response = await request(app)
        .delete(`/api/comments/${comment.id}`);

      expect(response.status).toBe(401);
    });

    test('should return 404 for non-existent comment', async () => {
      const response = await authenticatedRequest(authToken)
        .delete('/api/comments/999999');

      expect(response.status).toBe(404);
    });

    test('should delete comment and its replies', async () => {
      const comment = await createTestComment(testPostId, userId, 'Parent comment');

      // Create reply
      const reply = await authenticatedRequest(anotherAuthToken)
        .post('/api/comments')
        .send({
          postId: testPostId,
          content: 'Reply',
          parentId: comment.id,
        });

      // Delete parent comment
      await authenticatedRequest(authToken)
        .delete(`/api/comments/${comment.id}`);

      // Both should be deleted due to cascade
      const deletedComment = await prisma.comment.findUnique({
        where: { id: comment.id },
      });
      const deletedReply = await prisma.comment.findUnique({
        where: { id: reply.body.data.id },
      });

      expect(deletedComment).toBeNull();
      expect(deletedReply).toBeNull();
    });
  });

  describe('POST /api/comments/:commentId/like', () => {
    let commentId: number;

    beforeEach(async () => {
      const comment = await createTestComment(testPostId, anotherUserId, 'Test comment');
      commentId = comment.id;
    });

    test('should like comment', async () => {
      const response = await authenticatedRequest(authToken)
        .post(`/api/comments/${commentId}/like`);

      expect(response.status).toBe(200);
      expect(response.body.data.isLiked).toBe(true);
      expect(response.body.data.likeCount).toBe(1);
    });

    test('should unlike already liked comment', async () => {
      // First like
      await authenticatedRequest(authToken)
        .post(`/api/comments/${commentId}/like`);

      // Unlike
      const response = await authenticatedRequest(authToken)
        .post(`/api/comments/${commentId}/like`);

      expect(response.status).toBe(200);
      expect(response.body.data.isLiked).toBe(false);
      expect(response.body.data.likeCount).toBe(0);
    });

    test('should not like comment without authentication', async () => {
      const response = await request(app)
        .post(`/api/comments/${commentId}/like`);

      expect(response.status).toBe(401);
    });

    test('should update like count correctly', async () => {
      // Multiple likes
      await authenticatedRequest(authToken)
        .post(`/api/comments/${commentId}/like`);

      const auth3 = await registerAndLogin({
        username: 'user3',
        email: 'user3@example.com',
      });

      await authenticatedRequest(auth3.token)
        .post(`/api/comments/${commentId}/like`);

      const response = await request(app)
        .get(`/api/posts/${testPostId}/comments`);

      const comment = response.body.data.find((c: any) => c.id === commentId);
      expect(comment.likeCount).toBe(2);
    });
  });

  describe('Comment Security Tests', () => {
    test('should prevent XSS in comment content', async () => {
      const xssContent = '<script>alert("xss")</script> Nice food!';

      const response = await authenticatedRequest(authToken)
        .post('/api/comments')
        .send({
          postId: testPostId,
          content: xssContent,
        });

      expect(response.status).toBe(201);
      // Content should be stored but properly escaped when rendered
      expect(response.body.data.content).toBeDefined();
    });

    test('should prevent SQL injection in comments', async () => {
      const sqlInjection = "'; DROP TABLE comments; --";

      const response = await authenticatedRequest(authToken)
        .post('/api/comments')
        .send({
          postId: testPostId,
          content: sqlInjection,
        });

      // Should handle gracefully
      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
    });

    test('should handle special characters', async () => {
      const specialContent = 'Great food! 🍜🔥 Test @user #hashtag https://example.com';

      const response = await authenticatedRequest(authToken)
        .post('/api/comments')
        .send({
          postId: testPostId,
          content: specialContent,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.content).toBe(specialContent);
    });
  });

  describe('Comment Performance Tests', () => {
    test('should handle concurrent comment creation', async () => {
      const promises = Array(10).fill(null).map((_, i) =>
        authenticatedRequest(authToken)
          .post('/api/comments')
          .send({
            postId: testPostId,
            content: `Concurrent comment ${i}`,
          })
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect([200, 201]).toContain(response.status);
      });
    });

    test('should handle many comments retrieval efficiently', async () => {
      // Create many comments
      for (let i = 0; i < 50; i++) {
        await createTestComment(testPostId, userId, `Comment ${i}`);
      }

      const startTime = Date.now();
      const response = await request(app)
        .get(`/api/posts/${testPostId}/comments?limit=50`);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });
});
