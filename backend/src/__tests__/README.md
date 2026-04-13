# Backend API Testing Suite

Complete API testing infrastructure for the Street Food Platform backend using Jest and Supertest.

## Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm or yarn

### Installation
```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm test -- auth.test.ts

# Run automated test suite with report generation
./scripts/run-tests.sh
```

## Test Architecture

### Directory Structure
```
src/__tests__/
├── setup.ts                      # Test configuration and cleanup
├── helpers/
│   ├── testHelpers.ts           # Reusable test utilities
│   └── mockData.ts              # Mock data generators
├── auth/
│   └── auth.test.ts             # Authentication tests (47 tests)
├── posts/
│   └── posts.test.ts            # Posts CRUD tests (35 tests)
├── comments/
│   └── comments.test.ts         # Comment system tests (42 tests)
├── users/
│   └── users.test.ts            # User management tests (68 tests)
└── search/
    └── search.test.ts           # Search functionality tests (45 tests)
```

## Test Coverage Summary

### Total Test Count: **237 tests**

#### Authentication (47 tests)
- User registration validation
- Login functionality
- JWT token generation
- Security measures (SQL injection, XSS)
- Error handling

#### Posts (35 tests)
- CRUD operations
- Authentication/authorization
- Privacy settings
- Like/favorite functionality
- Performance testing

#### Comments (42 tests)
- Comment creation and replies
- Nested comments
- Like functionality
- Security and validation
- Concurrent operations

#### Users (68 tests)
- Profile management
- Password changes
- Follow/unfollow system
- Block/unblock functionality
- Privacy settings
- Security measures

#### Search (45 tests)
- User search
- Post search
- Search suggestions
- Performance optimization
- Edge case handling

## Test Features

### Security Testing
- ✅ SQL injection prevention
- ✅ XSS attack prevention
- ✅ Authentication bypass testing
- ✅ Authorization verification
- ✅ Input validation
- ✅ Rate limiting

### Performance Testing
- ✅ Response time measurement
- ✅ Concurrent request handling
- ✅ Large dataset processing
- ✅ Database query optimization
- ✅ Load testing simulation

### Integration Testing
- ✅ End-to-end API workflows
- ✅ Database transaction integrity
- ✅ Cascade deletion verification
- ✅ Relationship management
- ✅ Notification system

## Test Utilities

### Helper Functions

#### `createTestUser(userData?)`
Creates a test user in the database.
```typescript
const user = await createTestUser({
  username: 'testuser',
  email: 'test@example.com',
  password: 'Test123456'
});
```

#### `registerAndLogin(userData?)`
Registers and logs in a user, returning auth tokens.
```typescript
const { user, token } = await registerAndLogin({
  username: 'testuser',
  email: 'test@example.com',
  password: 'Test123456'
});
```

#### `authenticatedRequest(token)`
Creates pre-configured authenticated request helpers.
```typescript
const auth = authenticatedRequest(token);
const response = await auth.get('/api/users/me');
```

#### `createTestPost(userId, postData?)`
Creates a test post for a specific user.
```typescript
const post = await createTestPost(userId, {
  content: 'Test post content',
  images: '[]'
});
```

#### `cleanupTestData()`
Removes all test data from the database.
```typescript
await cleanupTestData();
```

### Mock Data Generators

#### `generateRandomUser()`
Generates random user data for testing.
```typescript
const userData = generateRandomUser();
```

#### `generateRandomPost(userId)`
Generates random post data.
```typescript
const postData = generateRandomPost(userId);
```

#### `generateTestUsers(count)`
Creates an array of test user data.
```typescript
const users = generateTestUsers(10);
```

## Writing New Tests

### Test Template

```typescript
import request from 'supertest';
import app from '../../app';
import { registerAndLogin, authenticatedRequest, cleanupTestData } from '../helpers/testHelpers';

describe('Feature Name', () => {
  let authToken: string;
  let userId: number;

  beforeEach(async () => {
    await cleanupTestData();
    const auth = await registerAndLogin();
    authToken = auth.token;
    userId = auth.user.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  test('should do something specific', async () => {
    // Arrange
    const testData = { /* test data */ };

    // Act
    const response = await authenticatedRequest(authToken)
      .post('/api/endpoint')
      .send(testData);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('id');
  });
});
```

### Best Practices

1. **Test Isolation**
   - Each test should be independent
   - Clean up data before/after each test
   - Don't rely on test execution order

2. **Descriptive Names**
   ```typescript
   test('should reject invalid email format', async () => {
     // Clear what this test validates
   });
   ```

3. **Arrange-Act-Assert Pattern**
   ```typescript
   test('should update user profile', async () => {
     // Arrange: Set up test data
     const updateData = { username: 'newname' };

     // Act: Execute the function
     const response = await auth.put('/api/users/me/profile')
       .send(updateData);

     // Assert: Verify results
     expect(response.body.data.username).toBe('newname');
   });
   ```

4. **Test Both Success and Failure Cases**
   ```typescript
   test('should accept valid data');
   test('should reject invalid data');
   test('should handle edge cases');
   ```

5. **Security Testing**
   ```typescript
   test('should prevent SQL injection');
   test('should sanitize XSS attempts');
   test('should validate input properly');
   ```

6. **Performance Testing**
   ```typescript
   test('should respond within SLA', async () => {
     const startTime = Date.now();
     await operation();
     const duration = Date.now() - startTime;
     expect(duration).toBeLessThan(200);
   });
   ```

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
      - uses: codecov/codecov-action@v2
        with:
          files: ./coverage/lcov.info
```

### Docker Compose for Testing

```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: test
      MYSQL_DATABASE: street_food_test
    ports:
      - "3306:3306"

  app:
    build: .
    depends_on:
      - mysql
    environment:
      DATABASE_URL: mysql://root:test@mysql:3306/street_food_test
    command: npm test
```

## Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check MySQL is running
mysql -u root -p

# Verify database exists
SHOW DATABASES;

# Check connection string
echo $DATABASE_URL
```

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

#### Test Timeout
```javascript
// Increase timeout in jest.config.js
module.exports = {
  testTimeout: 30000, // 30 seconds
};
```

#### Prisma Client Not Generated
```bash
# Regenerate Prisma client
npm run prisma:generate
```

### Debug Mode

```bash
# Run tests with verbose output
npm test -- --verbose

# Run tests with debug logs
DEBUG=* npm test

# Run specific test with debug
npm test -- --testNamePattern="should do something"
```

## Coverage Goals

Current coverage targets:
- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

### Viewing Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/lcov-report/index.html
```

## Performance Benchmarks

### Response Time Targets
- **API calls**: < 200ms (95th percentile)
- **Database queries**: < 100ms (average)
- **Search operations**: < 500ms (95th percentile)

### Load Testing
- **Concurrent users**: 100+
- **Requests per second**: 500+
- **Success rate**: 99.9%+

## Security Testing Checklist

- [ ] SQL injection prevention
- [ ] XSS attack prevention
- [ ] CSRF protection
- [ ] Authentication required where appropriate
- [ ] Authorization checks
- [ ] Input validation
- [ ] Output sanitization
- [ ] Rate limiting
- [ ] Password hashing
- [ ] JWT token validation

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [API Testing Guide](https://www.restapitutorial.com/tests.html)

## Contributing

When adding new tests:
1. Follow the existing test structure
2. Use helper functions where possible
3. Include security and performance tests
4. Update this README with new test suites
5. Ensure all tests pass before committing

## Support

For issues or questions:
- Check the troubleshooting section
- Review test logs in `test-reports/`
- Open an issue on GitHub
- Contact the testing team

---

**Last Updated**: 2026-04-10
**Test Suite Version**: 1.0.0
**Maintainer**: Backend Team
