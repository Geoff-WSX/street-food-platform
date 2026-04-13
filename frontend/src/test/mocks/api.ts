import { vi } from 'vitest'
import {
  mockPost,
  mockComment,
  mockNotification,
  mockMessage,
  mockConversation,
  createMockPosts,
  createMockComments,
  createMockNotifications,
  createMockResponse,
} from '../utils'

// Mock API functions
export const mockPostApi = {
  toggleLike: vi.fn(),
  toggleFavorite: vi.fn(),
  getPosts: vi.fn(),
  getPost: vi.fn(),
  createPost: vi.fn(),
  updatePost: vi.fn(),
  deletePost: vi.fn(),
}

export const mockCommentApi = {
  getComments: vi.fn(),
  createComment: vi.fn(),
  deleteComment: vi.fn(),
  toggleCommentLike: vi.fn(),
  getCommentReplies: vi.fn(),
  checkContent: vi.fn(),
}

export const mockNotificationApi = {
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  deleteNotification: vi.fn(),
}

export const mockMessageApi = {
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
  deleteMessage: vi.fn(),
  recallMessage: vi.fn(),
  blockUser: vi.fn(),
  getConversations: vi.fn(),
  getUnreadCount: vi.fn(),
  markAsRead: vi.fn(),
  checkCanSendMessage: vi.fn(),
  searchMessages: vi.fn(),
}

export const mockFollowApi = {
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  getFollowers: vi.fn(),
  getFollowing: vi.fn(),
}

export const mockAuthApi = {
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
}

// Setup default mock implementations
export const setupDefaultMocks = () => {
  // Post API mocks
  mockPostApi.toggleLike.mockResolvedValue({
    liked: true,
    likeCount: 11,
  })
  mockPostApi.toggleFavorite.mockResolvedValue({
    favorited: true,
    favoriteCount: 4,
  })
  mockPostApi.getPosts.mockResolvedValue({
    data: {
      data: createMockPosts(10),
      pagination: {
        page: 1,
        pageSize: 10,
        total: 100,
        totalPages: 10,
      },
    },
  })
  mockPostApi.getPost.mockResolvedValue({
    data: { data: mockPost },
  })

  // Comment API mocks
  mockCommentApi.getComments.mockResolvedValue({
    data: {
      data: createMockComments(5),
      pagination: {
        page: 1,
        pageSize: 10,
        total: 5,
        totalPages: 1,
      },
    },
  })
  mockCommentApi.createComment.mockResolvedValue({
    data: { data: mockComment },
  })
  mockCommentApi.deleteComment.mockResolvedValue({ data: { success: true } })
  mockCommentApi.toggleCommentLike.mockResolvedValue({
    data: { liked: true, likeCount: 3 },
  })
  mockCommentApi.getCommentReplies.mockResolvedValue({
    data: {
      data: [],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 1,
      },
    },
  })
  mockCommentApi.checkContent.mockResolvedValue({
    data: { valid: true, message: '' },
  })

  // Notification API mocks
  mockNotificationApi.getNotifications.mockResolvedValue({
    data: {
      data: createMockNotifications(10),
      pagination: {
        page: 1,
        pageSize: 20,
        total: 10,
        totalPages: 1,
      },
    },
  })
  mockNotificationApi.getUnreadCount.mockResolvedValue({
    data: { count: 5 },
  })
  mockNotificationApi.markAsRead.mockResolvedValue({ data: { success: true } })
  mockNotificationApi.markAllAsRead.mockResolvedValue({ data: { success: true } })
  mockNotificationApi.deleteNotification.mockResolvedValue({
    data: { success: true },
  })

  // Message API mocks
  mockMessageApi.getMessages.mockResolvedValue([mockMessage])
  mockMessageApi.sendMessage.mockResolvedValue({
    data: { data: mockMessage },
  })
  mockMessageApi.deleteMessage.mockResolvedValue({ data: { success: true } })
  mockMessageApi.recallMessage.mockResolvedValue({ data: { success: true } })
  mockMessageApi.blockUser.mockResolvedValue({ data: { success: true } })
  mockMessageApi.getConversations.mockResolvedValue([mockConversation])
  mockMessageApi.getUnreadCount.mockResolvedValue({ count: 3 })
  mockMessageApi.markAsRead.mockResolvedValue({ data: { success: true } })
  mockMessageApi.checkCanSendMessage.mockResolvedValue({
    canSend: true,
    reason: '',
  })
  mockMessageApi.searchMessages.mockResolvedValue([])

  // Follow API mocks
  mockFollowApi.followUser.mockResolvedValue({ data: { success: true } })
  mockFollowApi.unfollowUser.mockResolvedValue({ data: { success: true } })
  mockFollowApi.getFollowers.mockResolvedValue({
    data: { data: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 } },
  })
  mockFollowApi.getFollowing.mockResolvedValue({
    data: { data: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 } },
  })

  // Auth API mocks
  mockAuthApi.login.mockResolvedValue({
    data: {
      data: {
        user: mockPost.user,
        token: 'mock-token',
      },
    },
  })
  mockAuthApi.getCurrentUser.mockResolvedValue({
    data: { data: mockPost.user },
  })
}

// Reset all mocks
export const resetAllMocks = () => {
  Object.values(mockPostApi).forEach(mock => mock.mockReset?.())
  Object.values(mockCommentApi).forEach(mock => mock.mockReset?.())
  Object.values(mockNotificationApi).forEach(mock => mock.mockReset?.())
  Object.values(mockMessageApi).forEach(mock => mock.mockReset?.())
  Object.values(mockFollowApi).forEach(mock => mock.mockReset?.())
  Object.values(mockAuthApi).forEach(mock => mock.mockReset?.())
}

// Setup error scenarios
export const setupErrorScenarios = () => {
  mockPostApi.toggleLike.mockRejectedValue(new Error('Failed to like'))
  mockCommentApi.createComment.mockRejectedValue(new Error('Failed to comment'))
  mockMessageApi.sendMessage.mockRejectedValue(new Error('Failed to send message'))
  mockNotificationApi.getNotifications.mockRejectedValue(
    new Error('Failed to load notifications')
  )
}
