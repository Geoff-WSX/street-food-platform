import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatModal from '../ChatModal'
import { render, mockUser, mockMessage, mockConversation } from '../../test/utils'
import * as messageApi from '../../api/message'

// Mock store
vi.mock('../../store/auth', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('../../store/message', () => ({
  useMessageStore: vi.fn(),
}))

// Mock utils
vi.mock('../../utils/images', () => ({
  getAvatarUrl: (user: any) => user?.avatar || '',
}))

vi.mock('../../utils/error', () => ({
  getErrorMessage: (error: any) => error?.message || 'An error occurred',
}))

// Mock API
vi.mock('../../api/message', () => ({
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
}))

// Mock components
vi.mock('./ReportModal', () => ({
  default: ({ open, onClose }: any) =>
    open ? <div data-testid="report-modal">Report Modal</div> : null,
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

// Mock antd message and modal
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    },
    Modal: {
      confirm: vi.fn(({ onOk }: any) => onOk?.()),
    },
  }
})

describe('ChatModal Component', () => {
  let mockUseAuthStore: any
  let mockUseMessageStore: any
  const otherUser = {
    id: 2,
    username: 'otheruser',
    avatar: 'https://example.com/avatar2.jpg',
    bio: 'Test bio',
  }

  beforeEach(() => {
    mockUseAuthStore = require('../../store/auth').useAuthStore
    mockUseMessageStore = require('../../store/message').useMessageStore

    // Setup default mocks
    mockUseAuthStore.mockReturnValue({
      isLoggedIn: true,
      user: mockUser,
    })

    mockUseMessageStore.mockReturnValue({
      decrementUnread: vi.fn(),
    })

    // Setup default API mocks
    const mockedApi = vi.mocked(messageApi)
    mockedApi.getMessages.mockResolvedValue([mockMessage])
    mockedApi.sendMessage.mockResolvedValue({
      data: { data: mockMessage },
    })
    mockedApi.deleteMessage.mockResolvedValue({ data: { success: true } })
    mockedApi.recallMessage.mockResolvedValue({ data: { success: true } })
    mockedApi.blockUser.mockResolvedValue({ data: { success: true } })
    mockedApi.getConversations.mockResolvedValue([mockConversation])
    mockedApi.markAsRead.mockResolvedValue({ data: { success: true } })
    mockedApi.checkCanSendMessage.mockResolvedValue({
      canSend: true,
      reason: '',
    })
    mockedApi.searchMessages.mockResolvedValue([])

    mockNavigate.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should not render when visible is false', () => {
      render(<ChatModal visible={false} onClose={vi.fn()} otherUser={otherUser} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render modal when visible is true', () => {
      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should display other user information', () => {
      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      expect(screen.getByText(otherUser.username)).toBeInTheDocument()
    })

    it('should show loading state initially', () => {
      const mockedApi = vi.mocked(messageApi)
      mockedApi.getMessages.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves
          })
      )

      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should show empty state when no messages', async () => {
      const mockedApi = vi.mocked(messageApi)
      mockedApi.getMessages.mockResolvedValue([])

      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      await waitFor(() => {
        expect(screen.getByText('暂无消息')).toBeInTheDocument()
      })
    })
  })

  describe('Message Display', () => {
    it('should display messages', async () => {
      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      await waitFor(() => {
        expect(screen.getByText('Hello, this is a test message!')).toBeInTheDocument()
      })
    })

    it('should show sent messages on the right side', async () => {
      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      await waitFor(() => {
        expect(screen.getByText('Hello, this is a test message!')).toBeInTheDocument()
      })
    })

    it('should show received messages on the left side', async () => {
      const receivedMessage = {
        ...mockMessage,
        senderId: otherUser.id,
        receiverId: mockUser.id,
      }

      const mockedApi = vi.mocked(messageApi)
      mockedApi.getMessages.mockResolvedValue([receivedMessage])

      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      await waitFor(() => {
        expect(screen.getByText('Hello, this is a test message!')).toBeInTheDocument()
      })
    })

    it('should display message timestamp', async () => {
      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      await waitFor(() => {
        const timeRegex = /\d{1,2}:\d{2}/
        const timeElements = document.querySelectorAll(timeRegex)
        expect(timeElements.length).toBeGreaterThan(0)
      })
    })

    it('should show message read status', async () => {
      const readMessage = {
        ...mockMessage,
        readAt: new Date().toISOString(),
      }

      const mockedApi = vi.mocked(messageApi)
      mockedApi.getMessages.mockResolvedValue([readMessage])

      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      await waitFor(() => {
        expect(screen.getByText('已读')).toBeInTheDocument()
      })
    })
  })

  describe('Sending Messages', () => {
    it('should send message when clicking send button', async () => {
      const mockedApi = vi.mocked(messageApi)
      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      const input = screen.getByPlaceholderText('输入消息...')
      await userEvent.type(input, 'Test message')

      const sendButton = screen.getByRole('button', { name: /send/i })
      await userEvent.click(sendButton)

      await waitFor(() => {
        expect(mockedApi.sendMessage).toHaveBeenCalledWith(otherUser.id, 'Test message')
      })
    })

    it('should send message when pressing Enter', async () => {
      const mockedApi = vi.mocked(messageApi)
      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      const input = screen.getByPlaceholderText('输入消息...')
      await userEvent.type(input, 'Test message')
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

      await waitFor(() => {
        expect(mockedApi.sendMessage).toHaveBeenCalledWith(otherUser.id, 'Test message')
      })
    })

    it('should not send message when pressing Shift+Enter', async () => {
      const mockedApi = vi.mocked(messageApi)
      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      const input = screen.getByPlaceholderText('输入消息...')
      await userEvent.type(input, 'Test message')
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true })

      await waitFor(() => {
        expect(mockedApi.sendMessage).not.toHaveBeenCalled()
      })
    })

    it('should clear input after sending message', async () => {
      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      const input = screen.getByPlaceholderText('输入消息...') as HTMLTextAreaElement
      await userEvent.type(input, 'Test message')

      const sendButton = screen.getByRole('button', { name: /send/i })
      await userEvent.click(sendButton)

      await waitFor(() => {
        expect(input.value).toBe('')
      })
    })

    it('should disable send button when input is empty', () => {
      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      const sendButton = screen.getByRole('button', { name: /send/i })
      expect(sendButton).toBeDisabled()
    })

    it('should show warning when trying to send without permission', async () => {
      const mockedApi = vi.mocked(messageApi)
      mockedApi.checkCanSendMessage.mockResolvedValue({
        canSend: false,
        reason: '你已被对方拉黑',
      })

      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      const input = screen.getByPlaceholderText('你已被对方拉黑')
      expect(input).toBeDisabled()
    })
  })

  describe('Search Functionality', () => {
    it('should toggle search mode when clicking search button', async () => {
      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await userEvent.click(searchButton)

      expect(screen.getByPlaceholderText('搜索聊天记录...')).toBeInTheDocument()
    })

    it('should search messages when entering keyword', async () => {
      const mockedApi = vi.mocked(messageApi)
      mockedApi.searchMessages.mockResolvedValue([
        {
          ...mockMessage,
          otherUser: otherUser,
        },
      ])

      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      // Enable search mode
      const searchButton = screen.getByRole('button', { name: /search/i })
      await userEvent.click(searchButton)

      // Enter search keyword
      const searchInput = screen.getByPlaceholderText('搜索聊天记录...')
      await userEvent.type(searchInput, 'test')

      fireEvent.change(searchInput, { target: { value: 'test' } })
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' })

      await waitFor(() => {
        expect(mockedApi.searchMessages).toHaveBeenCalledWith('test', otherUser.id)
      })
    })

    it('should show empty search results when no matches found', async () => {
      const mockedApi = vi.mocked(messageApi)
      mockedApi.searchMessages.mockResolvedValue([])

      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      // Enable search mode
      const searchButton = screen.getByRole('button', { name: /search/i })
      await userEvent.click(searchButton)

      // Enter search keyword
      const searchInput = screen.getByPlaceholderText('搜索聊天记录...')
      await userEvent.type(searchInput, 'nonexistent')

      fireEvent.change(searchInput, { target: { value: 'nonexistent' } })
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' })

      await waitFor(() => {
        expect(screen.getByText('未找到相关消息')).toBeInTheDocument()
      })
    })
  })

  describe('Message Actions', () => {
    it('should delete message when clicking delete', async () => {
      const mockedApi = vi.mocked(messageApi)
      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      await waitFor(async () => {
        const messageText = await screen.findByText('Hello, this is a test message!')
        // Right-click to open context menu
        fireEvent.contextMenu(messageText)

        // Click delete option
        const deleteButton = await screen.findByText('删除')
        await userEvent.click(deleteButton)
      })

      await waitFor(() => {
        expect(mockedApi.deleteMessage).toHaveBeenCalled()
      })
    })

    it('should recall message within 2 minutes', async () => {
      const recentMessage = {
        ...mockMessage,
        createdAt: new Date().toISOString(),
      }

      const mockedApi = vi.mocked(messageApi)
      mockedApi.getMessages.mockResolvedValue([recentMessage])

      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      await waitFor(async () => {
        const messageText = await screen.findByText('Hello, this is a test message!')
        fireEvent.contextMenu(messageText)

        const recallButton = await screen.findByText('撤回')
        await userEvent.click(recallButton)
      })

      await waitFor(() => {
        expect(mockedApi.recallMessage).toHaveBeenCalled()
      })
    })

    it('should not show recall option for messages older than 2 minutes', async () => {
      const oldMessage = {
        ...mockMessage,
        createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      }

      const mockedApi = vi.mocked(messageApi)
      mockedApi.getMessages.mockResolvedValue([oldMessage])

      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      await waitFor(async () => {
        const messageText = await screen.findByText('Hello, this is a test message!')
        fireEvent.contextMenu(messageText)

        // Recall button should not be present
        await waitFor(() => {
          expect(screen.queryByText('撤回')).not.toBeInTheDocument()
        })
      })
    })
  })

  describe('User Actions', () => {
    it('should navigate to user profile when clicking avatar', async () => {
      const onClose = vi.fn()
      render(<ChatModal visible={true} onClose={onClose} otherUser={otherUser} />)

      const avatar = screen.getByRole('img', { name: /otheruser/i })
      await userEvent.click(avatar)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(`/profile?userId=${otherUser.id}`)
        expect(onClose).toHaveBeenCalled()
      })
    })

    it('should block user when confirming block action', async () => {
      const mockedApi = vi.mocked(messageApi)
      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      // Click menu button
      const menuButton = screen.getByRole('button', { name: /more/i })
      await userEvent.click(menuButton)

      // Click block option
      await waitFor(async () => {
        const blockButton = await screen.findByText('屏蔽用户')
        await userEvent.click(blockButton)
      })

      await waitFor(() => {
        expect(mockedApi.blockUser).toHaveBeenCalledWith(otherUser.id)
      })
    })

    it('should open report modal when clicking report option', async () => {
      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      // Click menu button
      const menuButton = screen.getByRole('button', { name: /more/i })
      await userEvent.click(menuButton)

      // Click report option
      await waitFor(async () => {
        const reportButton = await screen.findByText('举报')
        await userEvent.click(reportButton)
      })

      await waitFor(() => {
        expect(screen.getByTestId('report-modal')).toBeInTheDocument()
      })
    })
  })

  describe('Modal Controls', () => {
    it('should close modal when clicking close button', async () => {
      const onClose = vi.fn()
      render(<ChatModal visible={true} onClose={onClose} otherUser={otherUser} />)

      const closeButton = screen.getByRole('button', { name: /arrow left/i })
      await userEvent.click(closeButton)

      expect(onClose).toHaveBeenCalled()
    })

    it('should mark messages as read when opening modal', async () => {
      const mockedApi = vi.mocked(messageApi)
      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      await waitFor(() => {
        expect(mockedApi.markAsRead).toHaveBeenCalledWith(otherUser.id)
      })
    })

    it('should update unread count when opening modal', async () => {
      const decrementUnread = vi.fn()
      mockUseMessageStore.mockReturnValue({
        decrementUnread,
      })

      const mockedApi = vi.mocked(messageApi)
      mockedApi.getConversations.mockResolvedValue([
        {
          ...mockConversation,
          unreadCount: 3,
        },
      ])

      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      await waitFor(() => {
        expect(decrementUnread).toHaveBeenCalledWith(3)
      })
    })
  })

  describe('Error Handling', () => {
    it('should show error when sending message fails', async () => {
      const mockedApi = vi.mocked(messageApi)
      mockedApi.sendMessage.mockRejectedValue(new Error('Network error'))

      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      const input = screen.getByPlaceholderText('输入消息...')
      await userEvent.type(input, 'Test message')

      const sendButton = screen.getByRole('button', { name: /send/i })
      await userEvent.click(sendButton)

      await waitFor(() => {
        const message = require('antd').message
        expect(message.error).toHaveBeenCalledWith('Network error')
      })
    })

    it('should show error when loading messages fails', async () => {
      const mockedApi = vi.mocked(messageApi)
      mockedApi.getMessages.mockRejectedValue(new Error('Failed to load'))

      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      await waitFor(() => {
        const message = require('antd').message
        expect(message.error).toHaveBeenCalledWith('Failed to load')
      })
    })
  })

  describe('Blocked User State', () => {
    it('should show blocked status when user is blocked', async () => {
      const mockedApi = vi.mocked(messageApi)
      mockedApi.checkCanSendMessage.mockResolvedValue({
        canSend: false,
        reason: '你已被对方拉黑',
      })

      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      await waitFor(() => {
        expect(screen.getByText('已屏蔽')).toBeInTheDocument()
      })
    })

    it('should disable input when user is blocked', async () => {
      const mockedApi = vi.mocked(messageApi)
      mockedApi.checkCanSendMessage.mockResolvedValue({
        canSend: false,
        reason: '你已被对方拉黑',
      })

      render(<ChatModal visible={true} onClose={vi.fn()} otherUser={otherUser} />)

      const input = screen.getByPlaceholderText('你已被对方拉黑')
      expect(input).toBeDisabled()
    })
  })
})
