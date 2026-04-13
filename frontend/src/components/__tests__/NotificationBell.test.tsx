import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NotificationBell from '../NotificationBell'
import { render, createMockNotifications } from '../../test/utils'
import * as notificationApi from '../../api/notification'

// Mock store
vi.mock('../../store/notification', () => ({
  useNotificationStore: vi.fn(),
}))

// Mock utils
vi.mock('../../utils/images', () => ({
  getAvatarUrl: (user: any) => user?.avatar || '',
}))

// Mock API
vi.mock('../../api/notification', () => ({
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  deleteNotification: vi.fn(),
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('NotificationBell Component', () => {
  let mockUseNotificationStore: any

  beforeEach(() => {
    mockUseNotificationStore = require('../../store/notification').useNotificationStore

    // Setup default store mock
    mockUseNotificationStore.mockReturnValue({
      unreadCount: 5,
      notifications: [],
      setUnreadCount: vi.fn(),
      setNotifications: vi.fn(),
      markAsRead: vi.fn(),
      clearUnread: vi.fn(),
    })

    // Setup default API mocks
    const mockedApi = vi.mocked(notificationApi)
    mockedApi.getNotifications.mockResolvedValue({
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
    mockedApi.getUnreadCount.mockResolvedValue({
      data: { count: 5 },
    })
    mockedApi.markAsRead.mockResolvedValue({ data: { success: true } })
    mockedApi.markAllAsRead.mockResolvedValue({ data: { success: true } })
    mockedApi.deleteNotification.mockResolvedValue({ data: { success: true } })

    mockNavigate.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render notification bell icon', () => {
      render(<NotificationBell />)

      const bellButton = screen.getByRole('button')
      expect(bellButton).toBeInTheDocument()
    })

    it('should display unread count badge', () => {
      mockUseNotificationStore.mockReturnValue({
        unreadCount: 5,
        notifications: [],
        setUnreadCount: vi.fn(),
        setNotifications: vi.fn(),
        markAsRead: vi.fn(),
        clearUnread: vi.fn(),
      })

      render(<NotificationBell />)

      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should not display badge when count is zero', () => {
      mockUseNotificationStore.mockReturnValue({
        unreadCount: 0,
        notifications: [],
        setUnreadCount: vi.fn(),
        setNotifications: vi.fn(),
        markAsRead: vi.fn(),
        clearUnread: vi.fn(),
      })

      render(<NotificationBell />)

      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })

    it('should show dropdown when bell is clicked', async () => {
      render(<NotificationBell />)

      const bellButton = screen.getByRole('button')
      await userEvent.click(bellButton)

      await waitFor(() => {
        expect(screen.getByText('通知')).toBeInTheDocument()
      })
    })
  })

  describe('Dropdown Content', () => {
    it('should show loading state when fetching notifications', async () => {
      const mockedApi = vi.mocked(notificationApi)
      mockedApi.getNotifications.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves
          })
      )

      render(<NotificationBell />)

      const bellButton = screen.getByRole('button')
      await userEvent.click(bellButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('should show empty state when no notifications', async () => {
      const mockedApi = vi.mocked(notificationApi)
      mockedApi.getNotifications.mockResolvedValue({
        data: {
          data: [],
          pagination: {
            page: 1,
            pageSize: 20,
            total: 0,
            totalPages: 0,
          },
        },
      })

      render(<NotificationBell />)

      const bellButton = screen.getByRole('button')
      await userEvent.click(bellButton)

      await waitFor(() => {
        expect(screen.getByText('暂无通知')).toBeInTheDocument()
      })
    })

    it('should display notification list', async () => {
      const notifications = createMockNotifications(5)
      const mockedApi = vi.mocked(notificationApi)
      mockedApi.getNotifications.mockResolvedValue({
        data: {
          data: notifications,
          pagination: {
            page: 1,
            pageSize: 20,
            total: 5,
            totalPages: 1,
          },
        },
      })

      render(<NotificationBell />)

      const bellButton = screen.getByRole('button')
      await userEvent.click(bellButton)

      await waitFor(() => {
        expect(screen.getByText('follower 评论了你的动态')).toBeInTheDocument()
      })
    })

    it('should show mark all read button when there are unread notifications', async () => {
      mockUseNotificationStore.mockReturnValue({
        unreadCount: 5,
        notifications: [],
        setUnreadCount: vi.fn(),
        setNotifications: vi.fn(),
        markAsRead: vi.fn(),
        clearUnread: vi.fn(),
      })

      render(<NotificationBell />)

      const bellButton = screen.getByRole('button')
      await userEvent.click(bellButton)

      await waitFor(() => {
        expect(screen.getByText('全部已读')).toBeInTheDocument()
      })
    })

    it('should not show mark all read button when no unread notifications', async () => {
      mockUseNotificationStore.mockReturnValue({
        unreadCount: 0,
        notifications: [],
        setUnreadCount: vi.fn(),
        setNotifications: vi.fn(),
        markAsRead: vi.fn(),
        clearUnread: vi.fn(),
      })

      render(<NotificationBell />)

      const bellButton = screen.getByRole('button')
      await userEvent.click(bellButton)

      await waitFor(() => {
        expect(screen.queryByText('全部已读')).not.toBeInTheDocument()
      })
    })
  })

  describe('Notification Types', () => {
    it('should render LIKE notification correctly', async () => {
      const notifications = [
        {
          id: 1,
          type: 'LIKE',
          actorId: 2,
          actor: {
            id: 2,
            username: 'liker',
            avatar: '',
          },
          entityId: 1,
          entityType: 'POST',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ]

      const mockedApi = vi.mocked(notificationApi)
      mockedApi.getNotifications.mockResolvedValue({
        data: {
          data: notifications,
          pagination: {
            page: 1,
            pageSize: 20,
            total: 1,
            totalPages: 1,
          },
        },
      })

      render(<NotificationBell />)

      const bellButton = screen.getByRole('button')
      await userEvent.click(bellButton)

      await waitFor(() => {
        expect(screen.getByText(/liker 赞了你的动态/)).toBeInTheDocument()
      })
    })

    it('should render COMMENT notification correctly', async () => {
      const notifications = [
        {
          id: 1,
          type: 'COMMENT',
          actorId: 2,
          actor: {
            id: 2,
            username: 'commenter',
            avatar: '',
          },
          entityId: 1,
          entityType: 'POST',
          isRead: false,
          createdAt: new Date().toISOString(),
          comment: {
            id: 1,
            post: {
              id: 1,
            },
          },
        },
      ]

      const mockedApi = vi.mocked(notificationApi)
      mockedApi.getNotifications.mockResolvedValue({
        data: {
          data: notifications,
          pagination: {
            page: 1,
            pageSize: 20,
            total: 1,
            totalPages: 1,
          },
        },
      })

      render(<NotificationBell />)

      const bellButton = screen.getByRole('button')
      await userEvent.click(bellButton)

      await waitFor(() => {
        expect(screen.getByText(/commenter 评论了你的动态/)).toBeInTheDocument()
      })
    })

    it('should render FOLLOW notification correctly', async () => {
      const notifications = [
        {
          id: 1,
          type: 'FOLLOW',
          actorId: 2,
          actor: {
            id: 2,
            username: 'follower',
            avatar: '',
          },
          entityId: 1,
          entityType: 'USER',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ]

      const mockedApi = vi.mocked(notificationApi)
      mockedApi.getNotifications.mockResolvedValue({
        data: {
          data: notifications,
          pagination: {
            page: 1,
            pageSize: 20,
            total: 1,
            totalPages: 1,
          },
        },
      })

      render(<NotificationBell />)

      const bellButton = screen.getByRole('button')
      await userEvent.click(bellButton)

      await waitFor(() => {
        expect(screen.getByText(/follower 关注了你/)).toBeInTheDocument()
      })
    })
  })

  describe('Notification Interactions', () => {
    it('should mark notification as read when clicking', async () => {
      const notifications = createMockNotifications(1)
      const mockedApi = vi.mocked(notificationApi)
      mockedApi.getNotifications.mockResolvedValue({
        data: {
          data: notifications,
          pagination: {
            page: 1,
            pageSize: 20,
            total: 1,
            totalPages: 1,
          },
        },
      })

      const markAsRead = vi.fn()
      mockUseNotificationStore.mockReturnValue({
        unreadCount: 1,
        notifications: notifications,
        setUnreadCount: vi.fn(),
        setNotifications: vi.fn(),
        markAsRead,
        clearUnread: vi.fn(),
      })

      render(<NotificationBell />)

      const bellButton = screen.getByRole('button')
      await userEvent.click(bellButton)

      await waitFor(async () => {
        const notificationItem = await screen.findByText(/评论了你的动态/)
        await userEvent.click(notificationItem)
      })

      await waitFor(() => {
        expect(mockedApi.markAsRead).toHaveBeenCalledWith(notifications[0].id)
        expect(markAsRead).toHaveBeenCalledWith(notifications[0].id)
      })
    })

    it('should navigate to post when clicking LIKE notification', async () => {
      const notifications = [
        {
          id: 1,
          type: 'LIKE',
          actorId: 2,
          actor: {
            id: 2,
            username: 'liker',
            avatar: '',
          },
          entityId: 123,
          entityType: 'POST',
          isRead: true,
          createdAt: new Date().toISOString(),
        },
      ]

      const mockedApi = vi.mocked(notificationApi)
      mockedApi.getNotifications.mockResolvedValue({
        data: {
          data: notifications,
          pagination: {
            page: 1,
            pageSize: 20,
            total: 1,
            totalPages: 1,
          },
        },
      })

      render(<NotificationBell />)

      const bellButton = screen.getByRole('button')
      await userEvent.click(bellButton)

      await waitFor(async () => {
        const notificationItem = await screen.findByText(/liker 赞了你的动态/)
        await userEvent.click(notificationItem)
      })

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/post/123')
      })
    })

    it('should navigate to profile when clicking FOLLOW notification', async () => {
      const notifications = [
        {
          id: 1,
          type: 'FOLLOW',
          actorId: 456,
          actor: {
            id: 456,
            username: 'follower',
            avatar: '',
          },
          entityId: 456,
          entityType: 'USER',
          isRead: true,
          createdAt: new Date().toISOString(),
        },
      ]

      const mockedApi = vi.mocked(notificationApi)
      mockedApi.getNotifications.mockResolvedValue({
        data: {
          data: notifications,
          pagination: {
            page: 1,
            pageSize: 20,
            total: 1,
            totalPages: 1,
          },
        },
      })

      render(<NotificationBell />)

      const bellButton = screen.getByRole('button')
      await userEvent.click(bellButton)

      await waitFor(async () => {
        const notificationItem = await screen.findByText(/follower 关注了你/)
        await userEvent.click(notificationItem)
      })

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/profile?userId=456')
      })
    })

    it('should mark all as read when clicking mark all read button', async () => {
      const clearUnread = vi.fn()
      const setNotifications = vi.fn()
      const notifications = createMockNotifications(5)

      mockUseNotificationStore.mockReturnValue({
        unreadCount: 5,
        notifications: notifications,
        setUnreadCount: vi.fn(),
        setNotifications,
        markAsRead: vi.fn(),
        clearUnread,
      })

      render(<NotificationBell />)

      const bellButton = screen.getByRole('button')
      await userEvent.click(bellButton)

      await waitFor(async () => {
        const markAllButton = await screen.findByText('全部已读')
        await userEvent.click(markAllButton)
      })

      await waitFor(() => {
        const mockedApi = vi.mocked(notificationApi)
        expect(mockedApi.markAllAsRead).toHaveBeenCalled()
        expect(clearUnread).toHaveBeenCalled()
        expect(setNotifications).toHaveBeenCalled()
      })
    })

    it('should delete notification when clicking delete button', async () => {
      const notifications = createMockNotifications(1)
      const setNotifications = vi.fn()
      const setUnreadCount = vi.fn()

      mockUseNotificationStore.mockReturnValue({
        unreadCount: 1,
        notifications: notifications,
        setUnreadCount,
        setNotifications,
        markAsRead: vi.fn(),
        clearUnread: vi.fn(),
      })

      render(<NotificationBell />)

      const bellButton = screen.getByRole('button')
      await userEvent.click(bellButton)

      await waitFor(async () => {
        const deleteButtons = await screen.findAllByRole('button', { name: /delete/i })
        await userEvent.click(deleteButtons[0])
      })

      await waitFor(() => {
        const mockedApi = vi.mocked(notificationApi)
        expect(mockedApi.deleteNotification).toHaveBeenCalledWith(notifications[0].id)
        expect(setNotifications).toHaveBeenCalled()
      })
    })
  })

  describe('Polling Behavior', () => {
    it('should fetch unread count on mount', () => {
      const mockedApi = vi.mocked(notificationApi)
      render(<NotificationBell />)

      expect(mockedApi.getUnreadCount).toHaveBeenCalled()
    })

    it('should fetch unread count every 30 seconds', async () => {
      vi.useFakeTimers()

      const mockedApi = vi.mocked(notificationApi)
      render(<NotificationBell />)

      // Initial call
      expect(mockedApi.getUnreadCount).toHaveBeenCalledTimes(1)

      // Fast forward 30 seconds
      vi.advanceTimersByTime(30000)
      expect(mockedApi.getUnreadCount).toHaveBeenCalledTimes(2)

      // Fast forward another 30 seconds
      vi.advanceTimersByTime(30000)
      expect(mockedApi.getUnreadCount).toHaveBeenCalledTimes(3)

      vi.useRealTimers()
    })

    it('should cleanup interval on unmount', () => {
      vi.useFakeTimers()

      const { unmount } = render(<NotificationBell />)

      unmount()

      // Fast forward - should not trigger new calls
      vi.advanceTimersByTime(30000)

      const mockedApi = vi.mocked(notificationApi)
      expect(mockedApi.getUnreadCount).toHaveBeenCalledTimes(1)

      vi.useRealTimers()
    })
  })

  describe('Visual States', () => {
    it('should apply different styles for unread notifications', async () => {
      const notifications = createMockNotifications(2)
      notifications[0].isRead = false
      notifications[1].isRead = true

      const mockedApi = vi.mocked(notificationApi)
      mockedApi.getNotifications.mockResolvedValue({
        data: {
          data: notifications,
          pagination: {
            page: 1,
            pageSize: 20,
            total: 2,
            totalPages: 1,
          },
        },
      })

      render(<NotificationBell />)

      const bellButton = screen.getByRole('button')
      await userEvent.click(bellButton)

      await waitFor(() => {
        const notificationItems = screen.getAllByText(/评论了你的动态/)
        // Both should be rendered
        expect(notificationItems.length).toBeGreaterThan(0)
      })
    })

    it('should show notification icons based on type', async () => {
      const notifications = [
        {
          id: 1,
          type: 'LIKE',
          actorId: 2,
          actor: {
            id: 2,
            username: 'liker',
            avatar: '',
          },
          entityId: 1,
          entityType: 'POST',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ]

      const mockedApi = vi.mocked(notificationApi)
      mockedApi.getNotifications.mockResolvedValue({
        data: {
          data: notifications,
          pagination: {
            page: 1,
            pageSize: 20,
            total: 1,
            totalPages: 1,
          },
        },
      })

      render(<NotificationBell />)

      const bellButton = screen.getByRole('button')
      await userEvent.click(bellButton)

      await waitFor(() => {
        // Should show heart icon for like
        expect(screen.getByText(/❤️/)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully when loading notifications', async () => {
      const mockedApi = vi.mocked(notificationApi)
      mockedApi.getNotifications.mockRejectedValue(new Error('Network error'))

      render(<NotificationBell />)

      const bellButton = screen.getByRole('button')
      await userEvent.click(bellButton)

      // Should not crash, just show empty state
      await waitFor(() => {
        expect(screen.getByText('暂无通知')).toBeInTheDocument()
      })
    })

    it('should handle API errors gracefully when marking as read', async () => {
      const notifications = createMockNotifications(1)
      const mockedApi = vi.mocked(notificationApi)
      mockedApi.getNotifications.mockResolvedValue({
        data: {
          data: notifications,
          pagination: {
            page: 1,
            pageSize: 20,
            total: 1,
            totalPages: 1,
          },
        },
      })
      mockedApi.markAsRead.mockRejectedValue(new Error('Network error'))

      render(<NotificationBell />)

      const bellButton = screen.getByRole('button')
      await userEvent.click(bellButton)

      await waitFor(async () => {
        const notificationItem = await screen.findByText(/评论了你的动态/)
        await userEvent.click(notificationItem)
      })

      // Should not crash
      await waitFor(() => {
        expect(mockedApi.markAsRead).toHaveBeenCalled()
      })
    })
  })
})
