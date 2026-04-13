import { render, type RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { vi } from 'vitest'

// Test wrappers
interface TestProvidersProps {
  children: React.ReactNode
}

const TestProviders = ({ children }: TestProvidersProps) => {
  return (
    <BrowserRouter>
      <ConfigProvider locale={zhCN}>
        {children}
      </ConfigProvider>
    </BrowserRouter>
  )
}

// Custom render function with providers
const customRender = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => {
  return render(ui, { wrapper: TestProviders, ...options })
}

// Mock data generators
export const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  avatar: 'https://example.com/avatar.jpg',
  role: 'user',
  bio: 'Test user bio',
  createdAt: new Date().toISOString(),
}

export const mockPost = {
  id: 1,
  content: 'This is a test post about delicious street food!',
  images: ['https://example.com/food1.jpg', 'https://example.com/food2.jpg'],
  address: '123 Food Street, Food City',
  userId: 1,
  user: mockUser,
  likeCount: 10,
  commentCount: 5,
  favoriteCount: 3,
  isLiked: false,
  isFavorited: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const mockComment = {
  id: 1,
  content: 'This is a test comment!',
  postId: 1,
  userId: 1,
  user: mockUser,
  parentId: null,
  replyToUserId: null,
  replyToUser: null,
  likeCount: 2,
  isLiked: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  replies: [],
  replyCount: 0,
}

export const mockNotification = {
  id: 1,
  type: 'LIKE',
  actorId: 2,
  actor: {
    id: 2,
    username: 'follower',
    avatar: 'https://example.com/avatar2.jpg',
  },
  entityId: 1,
  entityType: 'POST',
  isRead: false,
  createdAt: new Date().toISOString(),
  comment: null,
}

export const mockMessage = {
  id: 1,
  senderId: 1,
  receiverId: 2,
  content: 'Hello, this is a test message!',
  readAt: null,
  recalled: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const mockConversation = {
  otherUser: {
    id: 2,
    username: 'otheruser',
    avatar: 'https://example.com/avatar2.jpg',
  },
  lastMessage: {
    content: 'Last message content',
    createdAt: new Date().toISOString(),
  },
  unreadCount: 3,
}

// API response mock factory
export const createMockResponse = <T,>(data: T, status = 200) => {
  return {
    data: {
      data,
      status,
      message: 'Success',
    },
  }
}

// Create multiple mock items
export const createMockPosts = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    ...mockPost,
    id: i + 1,
    content: `Test post ${i + 1}`,
  }))
}

export const createMockComments = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    ...mockComment,
    id: i + 1,
    content: `Test comment ${i + 1}`,
  }))
}

export const createMockNotifications = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    ...mockNotification,
    id: i + 1,
    isRead: i > 0, // First one is unread
  }))
}

// Store mock helpers
export const createMockAuthStore = (overrides = {}) => {
  return {
    isLoggedIn: true,
    user: mockUser,
    login: vi.fn(),
    logout: vi.fn(),
    setUser: vi.fn(),
    ...overrides,
  }
}

export const createMockFollowStore = (overrides = {}) => {
  return {
    followStatus: {},
    setFollowStatus: vi.fn(),
    checkAndCacheStatus: vi.fn(),
    ...overrides,
  }
}

export const createMockNotificationStore = (overrides = {}) => {
  return {
    notifications: [],
    unreadCount: 0,
    setNotifications: vi.fn(),
    setUnreadCount: vi.fn(),
    addNotification: vi.fn(),
    markAsRead: vi.fn(),
    clearUnread: vi.fn(),
    ...overrides,
  }
}

export const createMockMessageStore = (overrides = {}) => {
  return {
    conversations: [],
    unreadCount: 0,
    setConversations: vi.fn(),
    setUnreadCount: vi.fn(),
    decrementUnread: vi.fn(),
    ...overrides,
  }
}

export const createMockThemeStore = (overrides = {}) => {
  return {
    mode: 'light',
    toggleTheme: vi.fn(),
    setMode: vi.fn(),
    ...overrides,
  }
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }
