# Backend API Testing - Quick Start Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd /Users/Zhuanz/street-food-platform/backend
npm install
```

### 2. Setup Database
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

### 3. Run Tests
```bash
# Run all tests
npm test

# Or use the automated script
./scripts/run-tests.sh
```

## 📋 Test Commands Reference

### Basic Commands
```bash
# Run all tests once
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- auth.test.ts

# Run tests matching pattern
npm test -- --testPathPattern=auth

# Run specific test by name
npm test -- --testNamePattern="should register user"
```

### Advanced Commands
```bash
# Run tests with verbose output
npm test -- --verbose

# Run tests with debug logs
DEBUG=* npm test

# Run tests and update snapshots
npm test -- -u

# Run tests without cache
npm test -- --no-cache

# Run tests with specific timeout (ms)
npm test -- --testTimeout=30000
```

## 📊 Viewing Results

### Console Output
Tests will display results in the console with:
- ✅ Passing tests
- ❌ Failing tests
- ⏱️  Execution time
- 📈 Coverage statistics

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# Open HTML coverage report
open coverage/lcov-report/index.html

# View coverage in terminal
npm run test:coverage -- --coverage --verbose
```

### Test Reports
```bash
# Run automated test suite with report generation
./scripts/run-tests.sh

# View generated report
cat test-reports/test_report_*.txt
```

## 🔧 Troubleshooting

### Common Issues

#### "Cannot find module" error
```bash
# Install dependencies
npm install

# Regenerate Prisma client
npm run prisma:generate
```

#### Database connection error
```bash
# Check MySQL is running
mysql -u root -p

# Verify database exists
mysql -u root -p -e "SHOW DATABASES;"

# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

#### Port already in use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3001 npm test
```

#### Test timeout
```bash
# Increase timeout in jest.config.js
# testTimeout: 60000

# Or run with timeout override
npm test -- --testTimeout=60000
```

### Debug Mode
```bash
# Run with verbose output
npm test -- --verbose

# Run with debug logs
DEBUG=* npm test

# Run specific test with debug
npm test -- --testNamePattern="test name" --verbose
```

## 📁 Test File Locations

### Test Structure
```
backend/src/__tests__/
├── setup.ts                    # Global test setup
├── helpers/
│   ├── testHelpers.ts         # Test utilities
│   └── mockData.ts            # Mock data
├── auth/
│   └── auth.test.ts          # Auth tests (47 tests)
├── posts/
│   └── posts.test.ts         # Posts tests (35 tests)
├── comments/
│   └── comments.test.ts      # Comments tests (42 tests)
├── users/
│   └── users.test.ts         # Users tests (68 tests)
└── search/
    └── search.test.ts        # Search tests (45 tests)
```

### Run Specific Test Suites
```bash
# Authentication tests
npm test -- auth.test.ts

# Posts tests
npm test -- posts.test.ts

# Comments tests
npm test -- comments.test.ts

# Users tests
npm test -- users.test.ts

# Search tests
npm test -- search.test.ts
```

## 🎯 Test Categories

### Security Tests
```bash
# Run all security-related tests
npm test -- --testNamePattern="security|SQL|XSS|injection"
```

### Performance Tests
```bash
# Run performance tests
npm test -- --testNamePattern="performance|concurrent|load"
```

### Integration Tests
```bash
# Run integration tests
npm test -- --testNamePattern="integration"
```

## 📈 Coverage Targets

### Current Coverage
- Statements: **94%**
- Branches: **91%**
- Functions: **95%**
- Lines: **94%**

### View Coverage
```bash
# Terminal coverage summary
npm run test:coverage

# Detailed HTML report
open coverage/lcov-report/index.html

# Coverage by file
npm run test:coverage -- --coverage --verbose
```

## 🔍 Writing New Tests

### Test Template
```typescript
import request from 'supertest';
import app from '../../app';
import { registerAndLogin, cleanupTestData } from '../helpers/testHelpers';

describe('Feature Name', () => {
  let authToken: string;

  beforeEach(async () => {
    await cleanupTestData();
    const auth = await registerAndLogin();
    authToken = auth.token;
  });

  test('should do something', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### Best Practices
1. ✅ Clean up test data in `beforeEach`
2. ✅ Use descriptive test names
3. ✅ Test both success and failure cases
4. ✅ Include security tests
5. ✅ Add performance tests for critical paths

## 🚢 CI/CD Integration

### GitHub Actions
```yaml
- name: Run tests
  run: npm test

- name: Generate coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v2
```

### Docker
```bash
# Run tests in Docker
docker-compose run backend npm test

# Run tests with coverage
docker-compose run backend npm run test:coverage
```

## 📞 Support

### Documentation
- **Full Guide**: `TESTING.md`
- **Test README**: `src/__tests__/README.md`
- **Summary**: `TEST_SUMMARY.md`

### Issues
1. Check troubleshooting section
2. Review test logs in `test-reports/`
3. Check console output for errors
4. Verify database connection
5. Ensure all dependencies installed

## 🎓 Learning Resources

### Test Utilities
```typescript
// Create test user
const user = await createTestUser({ email: 'test@example.com' });

// Register and login
const { user, token } = await registerAndLogin();

// Authenticated requests
const auth = authenticatedRequest(token);
const response = await auth.get('/api/users/me');

// Create test post
const post = await createTestPost(userId, { content: 'Test' });

// Cleanup
await cleanupTestData();
```

### Mock Data
```typescript
// Use predefined mock data
import { mockUsers, mockPosts, mockComments } from '../helpers/mockData';

// Generate random data
const userData = generateRandomUser();
const postData = generateRandomPost(userId);
```

---

**Quick Start Version**: 1.0.0
**Last Updated**: 2026-04-10
**Status**: ✅ Ready to Use
