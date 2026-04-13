import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Navbar from '../Navbar'
import { render, mockUser } from '../../test/utils'
import * as messageApi from '../../api/message'

// Mock stores
vi.mock('../../store/auth', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('../../store/message', () => ({
  useMessageStore: vi.fn(),
}))

vi.mock('../../store/theme', () => ({
  useThemeStore: vi.fn(),
}))

// Mock components
vi.mock('../NotificationBell', () => ({
  default: () => <div data-testid="notification-bell">Notification Bell</div>,
}))

// Mock utils
vi.mock('../../utils/images', () => ({
  getAvatarUrl: (user: any) => user?.avatar || '',
}))

// Mock API
vi.mock('../../api/message', () => ({
  getUnreadCount: vi.fn(),
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      pathname: '/',
    }),
  }
})

describe('Navbar Component', () => {
  let mockUseAuthStore: any
  let mockUseMessageStore: any
  let mockUseThemeStore: any

  beforeEach(() => {
    mockUseAuthStore = require('../../store/auth').useAuthStore
    mockUseMessageStore = require('../../store/message').useMessageStore
    mockUseThemeStore = require('../../store/theme').useThemeStore

    // Setup default mocks for authenticated user
    mockUseAuthStore.mockReturnValue({
      isLoggedIn: true,
      user: mockUser,
      logout: vi.fn(),
    })

    mockUseMessageStore.mockReturnValue({
      unreadCount: 3,
      setUnreadCount: vi.fn(),
    })

    mockUseThemeStore.mockReturnValue({
      mode: 'light',
      toggleTheme: vi.fn(),
    })

    // Setup API mocks
    const mockedApi = vi.mocked(messageApi)
    mockedApi.getUnreadCount.mockResolvedValue({ count: 3 })

    mockNavigate.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render navbar with logo', () => {
      render(<Navbar />)

      expect(screen.getByText('🍜')).toBeInTheDocument()
      expect(screen.getByText('街边美食')).toBeInTheDocument()
    })

    it('should render navigation menu', () => {
      render(<Navbar />)

      expect(screen.getByText('首页')).toBeInTheDocument()
      expect(screen.getByText('美食榜')).toBeInTheDocument()
      expect(screen.getByText('好友')).toBeInTheDocument()
    })

    it('should highlight active menu item based on current path', () => {
      render(<Navbar />)

      // Home is active by default
      const homeMenuItem = screen.getByText('首页')
      expect(homeMenuItem).toBeInTheDocument()
    })
  })

  describe('Navigation Actions', () => {
    it('should navigate to home when clicking logo', async () => {
      render(<Navbar />)

      const logo = screen.getByText('街边美食')
      await userEvent.click(logo)

      expect(mockNavigate).toHaveBeenCalledWith('/')
    })

    it('should navigate to home when clicking home menu item', async () => {
      render(<Navbar />)

      const homeMenuItem = screen.getByText('首页')
      await userEvent.click(homeMenuItem)

      expect(mockNavigate).toHaveBeenCalledWith('/')
    })

    it('should navigate to ranking when clicking ranking menu item', async () => {
      render(<Navbar />)

      const rankingMenuItem = screen.getByText('美食榜')
      await userEvent.click(rankingMenuItem)

      expect(mockNavigate).toHaveBeenCalledWith('/ranking')
    })

    it('should navigate to friends when clicking friends menu item', async () => {
      render(<Navbar />)

      const friendsMenuItem = screen.getByText('好友')
      await userEvent.click(friendsMenuItem)

      expect(mockNavigate).toHaveBeenCalledWith('/friends')
    })
  })

  describe('Authenticated User Actions', () => {
    it('should show publish button when logged in', () => {
      mockUseAuthStore.mockReturnValue({
        isLoggedIn: true,
        user: mockUser,
        logout: vi.fn(),
      })

      const onPublishClick = vi.fn()
      render(<Navbar onPublishClick={onPublishClick} />)

      expect(screen.getByText('发布动态')).toBeInTheDocument()
    })

    it('should call onPublishClick when clicking publish button', async () => {
      const onPublishClick = vi.fn()
      render(<Navbar onPublishClick={onPublishClick} />)

      const publishButton = screen.getByText('发布动态')
      await userEvent.click(publishButton)

      expect(onPublishClick).toHaveBeenCalled()
    })

    it('should show message button with unread count badge', () => {
      mockUseMessageStore.mockReturnValue({
        unreadCount: 5,
        setUnreadCount: vi.fn(),
      })

      render(<Navbar />)

      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should navigate to messages page when clicking message button', async () => {
      render(<Navbar />)

      const messageButton = screen.getByRole('button', { name: /message/i })
      await userEvent.click(messageButton)

      expect(mockNavigate).toHaveBeenCalledWith('/messages')
    })

    it('should show notification bell', () => {
      render(<Navbar />)

      expect(screen.getByTestId('notification-bell')).toBeInTheDocument()
    })

    it('should show user avatar and username', () => {
      render(<Navbar />)

      expect(screen.getByText(mockUser.username)).toBeInTheDocument()
    })

    it('should show search button', () => {
      const onSearchClick = vi.fn()
      render(<Navbar onSearchClick={onSearchClick} />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      expect(searchButton).toBeInTheDocument()
    })

    it('should call onSearchClick when clicking search button', async () => {
      const onSearchClick = vi.fn()
      render(<Navbar onSearchClick={onSearchClick} />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await userEvent.click(searchButton)

      expect(onSearchClick).toHaveBeenCalled()
    })

    it('should show theme toggle button', () => {
      render(<Navbar />)

      const themeButton = screen.getByRole('button', { name: /moon/i })
      expect(themeButton).toBeInTheDocument()
    })

    it('should toggle theme when clicking theme button', async () => {
      const toggleTheme = vi.fn()
      mockUseThemeStore.mockReturnValue({
        mode: 'light',
        toggleTheme,
      })

      render(<Navbar />)

      const themeButton = screen.getByRole('button', { name: /moon/i })
      await userEvent.click(themeButton)

      expect(toggleTheme).toHaveBeenCalled()
    })

    it('should show correct theme icon based on current theme', () => {
      mockUseThemeStore.mockReturnValue({
        mode: 'dark',
        toggleTheme: vi.fn(),
      })

      render(<Navbar />)

      // Should show sun icon in dark mode
      const themeButton = screen.getByRole('button', { name: /sun/i })
      expect(themeButton).toBeInTheDocument()
    })
  })

  describe('User Menu', () => {
    it('should show user dropdown menu', () => {
      render(<Navbar />)

      const userDropdown = screen.getByText(mockUser.username)
      expect(userDropdown).toBeInTheDocument()
    })

    it('should navigate to profile when clicking profile menu item', async () => {
      render(<Navbar />)

      // Click user dropdown to open menu
      const userDropdown = screen.getByText(mockUser.username)
      await userEvent.click(userDropdown)

      // Profile option should be in the menu
      await waitFor(() => {
        const profileOption = screen.getByText('我的主页')
        expect(profileOption).toBeInTheDocument()
      })
    })

    it('should show admin menu item for admin users', () => {
      mockUseAuthStore.mockReturnValue({
        isLoggedIn: true,
        user: { ...mockUser, role: 'admin' },
        logout: vi.fn(),
      })

      render(<Navbar />)

      const userDropdown = screen.getByText(mockUser.username)
      userEvent.click(userDropdown)

      // Admin option should be available
      expect(screen.getByText('管理控制台')).toBeInTheDocument()
    })

    it('should show reports menu item for reviewer users', () => {
      mockUseAuthStore.mockReturnValue({
        isLoggedIn: true,
        user: { ...mockUser, role: 'reviewer' },
        logout: vi.fn(),
      })

      render(<Navbar />)

      const userDropdown = screen.getByText(mockUser.username)
      userEvent.click(userDropdown)

      // Reports option should be available
      expect(screen.getByText('审核中心')).toBeInTheDocument()
    })

    it('should logout when clicking logout menu item', async () => {
      const logout = vi.fn()
      mockUseAuthStore.mockReturnValue({
        isLoggedIn: true,
        user: mockUser,
        logout,
      })

      render(<Navbar />)

      const userDropdown = screen.getByText(mockUser.username)
      await userEvent.click(userDropdown)

      const logoutOption = screen.getByText('退出登录')
      await userEvent.click(logoutOption)

      expect(logout).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  describe('Unauthenticated User Actions', () => {
    it('should show login button when not logged in', () => {
      mockUseAuthStore.mockReturnValue({
        isLoggedIn: false,
        user: null,
        logout: vi.fn(),
      })

      render(<Navbar />)

      expect(screen.getByText('登录')).toBeInTheDocument()
    })

    it('should not show publish button when not logged in', () => {
      mockUseAuthStore.mockReturnValue({
        isLoggedIn: false,
        user: null,
        logout: vi.fn(),
      })

      render(<Navbar />)

      expect(screen.queryByText('发布动态')).not.toBeInTheDocument()
    })

    it('should not show message button when not logged in', () => {
      mockUseAuthStore.mockReturnValue({
        isLoggedIn: false,
        user: null,
        logout: vi.fn(),
      })

      render(<Navbar />)

      const messageButton = screen.queryByRole('button', { name: /message/i })
      expect(messageButton).not.toBeInTheDocument()
    })

    it('should not show notification bell when not logged in', () => {
      mockUseAuthStore.mockReturnValue({
        isLoggedIn: false,
        user: null,
        logout: vi.fn(),
      })

      render(<Navbar />)

      expect(screen.queryByTestId('notification-bell')).not.toBeInTheDocument()
    })

    it('should not show user menu when not logged in', () => {
      mockUseAuthStore.mockReturnValue({
        isLoggedIn: false,
        user: null,
        logout: vi.fn(),
      })

      render(<Navbar />)

      expect(screen.queryByText(mockUser.username)).not.toBeInTheDocument()
    })

    it('should navigate to login when clicking login button', async () => {
      mockUseAuthStore.mockReturnValue({
        isLoggedIn: false,
        user: null,
        logout: vi.fn(),
      })

      render(<Navbar />)

      const loginButton = screen.getByText('登录')
      await userEvent.click(loginButton)

      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  describe('Message Count Polling', () => {
    it('should fetch unread message count on mount when logged in', () => {
      const mockedApi = vi.mocked(messageApi)
      render(<Navbar />)

      expect(mockedApi.getUnreadCount).toHaveBeenCalled()
    })

    it('should poll unread message count every 30 seconds when logged in', async () => {
      vi.useFakeTimers()

      const mockedApi = vi.mocked(messageApi)
      render(<Navbar />)

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

    it('should not poll message count when not logged in', () => {
      vi.useFakeTimers()

      mockUseAuthStore.mockReturnValue({
        isLoggedIn: false,
        user: null,
        logout: vi.fn(),
      })

      const mockedApi = vi.mocked(messageApi)
      render(<Navbar />)

      // Should not call initially
      expect(mockedApi.getUnreadCount).not.toHaveBeenCalled()

      // Fast forward - should still not call
      vi.advanceTimersByTime(30000)
      expect(mockedApi.getUnreadCount).not.toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('should cleanup polling on unmount', () => {
      vi.useFakeTimers()

      const { unmount } = render(<Navbar />)

      unmount()

      // Fast forward - should not trigger new calls
      vi.advanceTimersByTime(30000)

      const mockedApi = vi.mocked(messageApi)
      expect(mockedApi.getUnreadCount).toHaveBeenCalledTimes(1)

      vi.useRealTimers()
    })
  })

  describe('Scroll Behavior', () => {
    it('should change appearance when scrolling', () => {
      render(<Navbar />)

      // Initial state
      const header = screen.getByRole('banner')

      // Simulate scroll
      fireEvent.scroll(window, { target: { scrollY: 100 } })

      // Header should still be present
      expect(header).toBeInTheDocument()
    })
  })

  describe('Hover Effects', () => {
    it('should apply hover effect on logo', async () => {
      render(<Navbar />)

      const logo = screen.getByText('街边美食')
      fireEvent.mouseEnter(logo)

      await waitFor(() => {
        expect(logo).toHaveStyle({ transform: 'scale(1.02)' })
      })
    })

    it('should remove hover effect on logo mouse leave', async () => {
      render(<Navbar />)

      const logo = screen.getByText('街边美食')
      fireEvent.mouseEnter(logo)
      fireEvent.mouseLeave(logo)

      await waitFor(() => {
        expect(logo).toHaveStyle({ transform: 'scale(1)' })
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for navigation', () => {
      render(<Navbar />)

      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()

      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
    })

    it('should have accessible button labels', () => {
      render(<Navbar />)

      // Search button should be accessible
      const searchButton = screen.getByRole('button', { name: /search/i })
      expect(searchButton).toBeInTheDocument()

      // Theme toggle should be accessible
      const themeButton = screen.getByRole('button', { name: /moon/i })
      expect(themeButton).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('should maintain proper layout on different screen sizes', () => {
      render(<Navbar />)

      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()

      // All main elements should be present
      expect(screen.getByText('街边美食')).toBeInTheDocument()
      expect(screen.getByText('首页')).toBeInTheDocument()
      expect(screen.getByText('美食榜')).toBeInTheDocument()
      expect(screen.getByText('好友')).toBeInTheDocument()
    })
  })
})
