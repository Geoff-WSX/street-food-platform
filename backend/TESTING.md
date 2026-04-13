# Backend API Testing Guide

## Overview

Comprehensive API testing suite for the Street Food Platform backend using Jest and Supertest. The test suite covers authentication, posts, comments, users, and search functionality with security, performance, and edge case testing.

## Test Structure

```
backend/src/__tests__/
├── setup.ts                          # Test environment setup and teardown
├── helpers/
│   └── testHelpers.ts               # Reusable test utilities and helpers
├── auth/
│   └── auth.test.ts                 # Authentication API tests
├── posts/
│   └── posts.test.ts                # Posts API tests
├── comments/
│   └── comments.test.ts             # Comments API tests
├── users/
│   └── users.test.ts                # Users API tests
└── search/
    └── search.test.ts               # Search API tests
```

## Test Coverage

### Authentication Tests (`auth.test.ts`)

#### POST /api/auth/register
- ✅ Register new user with valid data
- ✅ Reject duplicate email
- ✅ Reject duplicate username
- ✅ Validate required fields
- ✅ Validate email format
- ✅ Validate password strength
- ✅ Trim whitespace from inputs
- ✅ Hash passwords securely
- ✅ Generate valid JWT tokens

#### POST /api/auth/login
- ✅ Login with valid credentials
- ✅ Reject invalid email
- ✅ Reject invalid password
- ✅ Handle missing credentials
- ✅ Case-insensitive email handling
- ✅ Generate new token on each login

#### Security Tests
- ✅ SQL injection prevention
- ✅ XSS prevention
- ✅ Long input handling
- ✅ Special character handling

### Posts Tests (`posts.test.ts`)

#### GET /api/posts
- ✅ Get posts without authentication
- ✅ Get posts with authentication
- ✅ Pagination support
- ✅ Filter by user
- ✅ Privacy filtering

#### GET /api/posts/:id
- ✅ Get single post by ID
- ✅ Return 404 for non-existent post
- ✅ Include user information
- ✅ Include like/favorite status for authenticated users

#### POST /api/posts
- ✅ Create post with valid data
- ✅ Require authentication
- ✅ Validate required fields
- ✅ Handle posts with images
- ✅ Handle posts with location data
- ✅ Create private posts

#### PUT /api/posts/:id
- ✅ Update own post
- ✅ Reject updating other user's post
- ✅ Require authentication
- ✅ Validate update data

#### DELETE /api/posts/:id
- ✅ Delete own post
- ✅ Reject deleting other user's post
- ✅ Require authentication
- ✅ Return 404 for non-existent post

#### POST /api/posts/:id/like
- ✅ Like post
- ✅ Unlike post
- ✅ Require authentication
- ✅ Update like count correctly

#### POST /api/posts/:id/favorite
- ✅ Favorite post
- ✅ Unfavorite post
- ✅ Require authentication
- ✅ Get user favorites

#### Performance Tests
- ✅ Handle large content
- ✅ Handle concurrent post creation

### Comments Tests (`comments.test.ts`)

#### POST /api/comments
- ✅ Create comment on post
- ✅ Require authentication
- ✅ Validate required fields
- ✅ Handle non-existent posts
- ✅ Handle comments with mentions
- ✅ Handle long comments
- ✅ Trim whitespace

#### GET /api/posts/:postId/comments
- ✅ Get comments for post
- ✅ Include user information
- ✅ Support pagination
- ✅ Handle posts with no comments
- ✅ Return 404 for non-existent post

#### Comment Replies
- ✅ Create reply to comment
- ✅ Handle non-existent parent comments
- ✅ Handle nested replies

#### DELETE /api/comments/:commentId
- ✅ Delete own comment
- ✅ Reject deleting other user's comment
- ✅ Require authentication
- ✅ Return 404 for non-existent comment
- ✅ Delete comment and replies

#### POST /api/comments/:commentId/like
- ✅ Like comment
- ✅ Unlike comment
- ✅ Require authentication
- ✅ Update like count correctly

#### Security Tests
- ✅ XSS prevention
- ✅ SQL injection prevention
- ✅ Special character handling

#### Performance Tests
- ✅ Handle concurrent comment creation
- ✅ Handle many comments retrieval efficiently

### Users Tests (`users.test.ts`)

#### GET /api/users/:id
- ✅ Get user by ID
- ✅ Exclude sensitive information
- ✅ Return 404 for non-existent user
- ✅ Include follow status
- ✅ Include follow counts
- ✅ Include posts count

#### GET /api/users/me
- ✅ Get current user profile
- ✅ Require authentication
- ✅ Include email for current user
- ✅ Include user settings

#### PUT /api/users/me/profile
- ✅ Update user profile
- ✅ Require authentication
- ✅ Validate email uniqueness
- ✅ Validate username uniqueness
- ✅ Handle partial updates
- ✅ Trim whitespace
- ✅ Validate username format

#### PUT /api/users/me/password
- ✅ Change password with correct old password
- ✅ Reject incorrect old password
- ✅ Require authentication
- ✅ Validate new password strength
- ✅ Require all password fields

#### PUT /api/users/me/settings
- ✅ Update user settings
- ✅ Require authentication
- ✅ Handle partial updates

#### PUT /api/users/me/privacy
- ✅ Update privacy settings
- ✅ Require authentication

#### Follow/Unfollow
- ✅ Follow user
- ✅ Require authentication
- ✅ Reject self-follow
- ✅ Reject duplicate follows
- ✅ Create notifications
- ✅ Unfollow user
- ✅ Reject unfollowing non-followed users

#### Block/Unblock
- ✅ Block user
- ✅ Require authentication
- ✅ Reject self-block
- ✅ Reject duplicate blocks
- ✅ Remove follow relationship when blocking
- ✅ Unblock user
- ✅ Get blocked users list

#### Security Tests
- ✅ XSS prevention in username
- ✅ SQL injection prevention
- ✅ Handle long bio

#### Performance Tests
- ✅ Handle concurrent profile updates
- ✅ Handle large following lists efficiently

### Search Tests (`search.test.ts`)

#### GET /api/search
- ✅ Search with authentication
- ✅ Require authentication
- ✅ Require search query parameter
- ✅ Handle empty search query
- ✅ Return mixed results

#### GET /api/search/users
- ✅ Search users by username
- ✅ Search without authentication
- ✅ Search users by email
- ✅ Search users by bio
- ✅ Return empty array for no matches
- ✅ Support pagination
- ✅ Handle partial matches
- ✅ Case insensitive search
- ✅ Exclude sensitive information

#### GET /api/search/posts
- ✅ Search posts by content
- ✅ Search without authentication
- ✅ Return posts with user information
- ✅ Return empty array for no matches
- ✅ Support pagination
- ✅ Handle multi-word searches
- ✅ Case insensitive search
- ✅ Exclude private posts from other users
- ✅ Handle special characters

#### GET /api/search/suggest
- ✅ Get suggestions without authentication
- ✅ Require query parameter
- ✅ Return user suggestions
- ✅ Handle short queries
- ✅ Return limited suggestions
- ✅ Handle empty suggestions

#### POST /api/search/suggest/refresh
- ✅ Refresh suggestions with admin rights
- ✅ Require authentication
- ✅ Require admin rights

#### Edge Cases
- ✅ Handle very long queries
- ✅ Handle special characters
- ✅ Handle unicode characters
- ✅ Handle SQL injection attempts
- ✅ Handle XSS attempts

#### Performance Tests
- ✅ Handle concurrent search requests
- ✅ Respond within reasonable time
- ✅ Handle large result sets efficiently

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test -- auth.test.ts
```

### Run tests matching pattern
```bash
npm test -- --testPathPattern=auth
```

## Test Environment

### Database Configuration
Tests use the same database as development but automatically clean up test data before and after each test run. Test data is identified by email patterns containing 'test'.

### Environment Variables
Tests use the following environment variables (set in `setup.ts`):
- `NODE_ENV=test`
- `JWT_SECRET=test_secret_key`
- `DATABASE_URL=mysql://test:test@localhost:3306/street_food_test`

### Test Data Cleanup
Each test automatically cleans up:
- Comments and likes
- Posts and tags
- Follow relationships
- Notifications
- Test users (identified by email containing 'test')

## Test Helpers

### createTestUser(userData?)
Create a test user in the database with optional custom data.

### createTestPost(userId, postData?)
Create a test post for a specific user.

### createTestComment(postId, userId, content?)
Create a test comment for a specific post and user.

### registerAndLogin(userData?)
Register and login a user, returning auth tokens.

### authenticatedRequest(token)
Create authenticated request helpers with pre-set authorization headers.

### cleanupTestData()
Clean up all test data from the database.

## Writing New Tests

### Test Template

```typescript
describe('Feature Name', () => {
  beforeEach(async () => {
    // Setup test data
    await cleanupTestData();
  });

  afterAll(async () => {
    // Cleanup
    await prisma.$disconnect();
  });

  test('should do something specific', async () => {
    // Arrange
    const testData = { /* test data */ };

    // Act
    const response = await request(app)
      .post('/api/endpoint')
      .send(testData);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### Best Practices

1. **Isolation**: Each test should be independent and clean up after itself
2. **Descriptive names**: Test names should clearly describe what they test
3. **Arrange-Act-Assert**: Structure tests in three clear phases
4. **Test both success and failure cases**: Cover both positive and negative scenarios
5. **Test security**: Always test for security vulnerabilities
6. **Test edge cases**: Test boundary conditions and unusual inputs
7. **Performance testing**: Test how the API handles load and concurrent requests

## CI/CD Integration

### GitHub Actions Example

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: test
          MYSQL_DATABASE: street_food_test
        ports:
          - 3306:3306

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run prisma:generate
      - run: npm test
```

## Troubleshooting

### Common Issues

1. **Database connection errors**
   - Ensure MySQL is running
   - Check DATABASE_URL in .env
   - Verify database exists

2. **Port already in use**
   - Stop other instances of the server
   - Use different PORT in .env

3. **Test timeout**
   - Increase testTimeout in jest.config.js
   - Check for infinite loops or hanging promises

4. **Cleanup not working**
   - Verify foreign key constraints
   - Check cleanup order (delete children before parents)

## Coverage Goals

Target coverage metrics:
- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

## Security Testing Checklist

- ✅ SQL injection prevention
- ✅ XSS prevention
- ✅ CSRF protection
- ✅ Authentication required where appropriate
- ✅ Authorization checks
- ✅ Input validation
- ✅ Output sanitization
- ✅ Rate limiting
- ✅ Password hashing
- ✅ JWT token validation

## Performance Benchmarks

- API response time: < 200ms for 95th percentile
- Database query time: < 100ms average
- Concurrent request handling: 50+ simultaneous requests
- Large dataset handling: 1000+ records efficiently

## Future Improvements

- [ ] Add integration tests for WebSocket functionality
- [ ] Add performance/load testing with k6
- [ ] Add API contract testing
- [ ] Add visual regression testing for UI responses
- [ ] Add chaos engineering tests
- [ ] Add monitoring and alerting integration
