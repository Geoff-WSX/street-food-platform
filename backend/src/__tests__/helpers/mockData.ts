/**
 * Mock data generators for testing
 */

export const mockUsers = {
  valid: {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Test123456',
    bio: 'Test user bio',
    avatar: null,
  },
  invalid: {
    username: '',
    email: 'invalid-email',
    password: '123',
    bio: '',
    avatar: null,
  },
  duplicate: {
    username: 'existinguser',
    email: 'existing@example.com',
    password: 'Test123456',
    bio: '',
    avatar: null,
  },
};

export const mockPosts = {
  valid: {
    content: 'Amazing street food found today!',
    images: '[]',
    address: '123 Food Street',
    latitude: 39.9042,
    longitude: 116.4074,
    isPrivate: false,
  },
  invalid: {
    content: '',
    images: 'invalid-json',
  },
  private: {
    content: 'Private post content',
    isPrivate: true,
  },
  withImages: {
    content: 'Food with multiple images',
    images: JSON.stringify(['image1.jpg', 'image2.jpg', 'image3.jpg']),
  },
  withLocation: {
    content: 'Food at specific location',
    address: 'Chinatown, San Francisco',
    latitude: 37.7949,
    longitude: -122.4094,
  },
  longContent: {
    content: 'A'.repeat(10000),
  },
};

export const mockComments = {
  valid: {
    content: 'This is a great food post!',
  },
  invalid: {
    content: '',
  },
  withMention: {
    content: 'Hey @username, check this out!',
  },
  longContent: {
    content: 'A'.repeat(5000),
  },
  withSpecialChars: {
    content: 'Great food! 🍜🔥 Test @user #hashtag https://example.com',
  },
};

export const mockSearchQueries = {
  valid: ['noodles', 'dim sum', 'spicy food', 'street food'],
  invalid: ['', '   ', '!!!', 'xyz123nonexistent'],
  special: ['<script>alert("xss")</script>', "'; DROP TABLE users; --", '美食'],
  long: 'a'.repeat(1000),
};

export const mockAuthTokens = {
  valid: 'valid.jwt.token',
  expired: 'expired.jwt.token',
  invalid: 'invalid-token-format',
};

export const mockPagination = {
  firstPage: { page: 1, limit: 10 },
  secondPage: { page: 2, limit: 10 },
  largePage: { page: 1, limit: 100 },
  invalid: { page: -1, limit: 0 },
};

export const mockSettings = {
  valid: {
    allowMessage: true,
    followOnlyMessage: false,
  },
  privacy: {
    hideFollowing: true,
    hideFollowers: true,
    hidePosts: false,
    hideFavorites: true,
  },
};

export const mockLocationData = {
  beijing: {
    address: 'Beijing, China',
    latitude: 39.9042,
    longitude: 116.4074,
  },
  shanghai: {
    address: 'Shanghai, China',
    latitude: 31.2304,
    longitude: 121.4737,
  },
  sanFrancisco: {
    address: 'San Francisco, CA',
    latitude: 37.7749,
    longitude: -122.4194,
  },
};

export const mockTags = [
  'noodles',
  'dim sum',
  'spicy',
  'street food',
  'chinese cuisine',
  'asian food',
];

export const mockErrorResponses = {
  unauthorized: {
    success: false,
    error: 'Unauthorized',
    code: 'UNAUTHORIZED',
  },
  notFound: {
    success: false,
    error: 'Resource not found',
    code: 'NOT_FOUND',
  },
  validationError: {
    success: false,
    error: 'Validation error',
    code: 'VALIDATION_ERROR',
  },
  forbidden: {
    success: false,
    error: 'Forbidden',
    code: 'FORBIDDEN',
  },
};

/**
 * Generate random test data
 */
export function generateRandomUser() {
  const timestamp = Date.now();
  return {
    username: `user_${timestamp}`,
    email: `user_${timestamp}@example.com`,
    password: 'Test123456',
    bio: `Test user ${timestamp}`,
  };
}

export function generateRandomPost(userId: number) {
  const timestamp = Date.now();
  return {
    userId,
    content: `Test post ${timestamp}`,
    images: '[]',
    address: `Test Location ${timestamp}`,
    latitude: 39.9042 + Math.random() * 0.1,
    longitude: 116.4074 + Math.random() * 0.1,
  };
}

export function generateRandomComment(postId: number, userId: number) {
  const timestamp = Date.now();
  return {
    postId,
    userId,
    content: `Test comment ${timestamp}`,
  };
}

/**
 * Generate array of test items
 */
export function generateTestUsers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    username: `testuser_${i}_${Date.now()}`,
    email: `testuser_${i}_${Date.now()}@example.com`,
    password: 'Test123456',
    bio: `Test user ${i}`,
  }));
}

export function generateTestPosts(userId: number, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    userId,
    content: `Test post ${i}`,
    images: '[]',
    address: `Test Location ${i}`,
  }));
}

/**
 * Delay for testing async operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for flaky tests
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await delay(delayMs);
      }
    }
  }

  throw lastError!;
}

/**
 * Mock response validator
 */
export function expectSuccessResponse(response: any) {
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(300);
  expect(response.body.success).toBe(true);
  expect(response.body.data).toBeDefined();
}

export function expectErrorResponse(response: any, expectedStatus: number = 400) {
  expect(response.status).toBe(expectedStatus);
  expect(response.body.success).toBe(false);
  expect(response.body.error).toBeDefined();
}

/**
 * Performance test helpers
 */
export async function measurePerformance<T>(
  fn: () => Promise<T>,
  maxDuration: number
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await fn();
  const duration = Date.now() - startTime;

  if (duration > maxDuration) {
    throw new Error(`Performance test failed: took ${duration}ms, expected < ${maxDuration}ms`);
  }

  return { result, duration };
}

/**
 * Load test helper
 */
export async function loadTest<T>(
  fn: () => Promise<T>,
  concurrency: number,
  maxDuration: number
): Promise<{ results: T[]; duration: number; successRate: number }> {
  const startTime = Date.now();
  const promises = Array.from({ length: concurrency }, () => fn());

  try {
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;

    return {
      results,
      duration,
      successRate: 100,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const failedCount = (error as any).length || 1;

    return {
      results: [],
      duration,
      successRate: ((concurrency - failedCount) / concurrency) * 100,
    };
  }
}
