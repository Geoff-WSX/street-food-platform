import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CommentSection from '../CommentSection'
import { render, mockComment, createMockComments } from '../../test/utils'
import * as commentApi from '../../api/comment'

// Mock store
vi.mock('../../store/auth', () => ({
  useAuthStore: vi.fn(),
}))

// Mock utils
vi.mock('../../utils/images', () => ({
  getAvatarUrl: (user: any) => user?.avatar || '',
}))

vi.mock('../../utils/error', () => ({
  getErrorMessage: (error: any) => error?.message || 'An error occurred',
}))

// Mock API
vi.mock('../../api/comment', () => ({
  getComments: vi.fn(),
  createComment: vi.fn(),
  deleteComment: vi.fn(),
  toggleCommentLike: vi.fn(),
  getCommentReplies: vi.fn(),
  checkContent: vi.fn(),
}))

// Mock antd message
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
  }
})

describe('CommentSection Component', () => {
  let mockUseAuthStore: any

  beforeEach(() => {
    mockUseAuthStore = require('../../store/auth').useAuthStore

    // Setup authenticated user by default
    mockUseAuthStore.mockReturnValue({
      isLoggedIn: true,
      user: { id: 1, username: 'testuser', avatar: '' },
    })

    // Setup default API mocks
    const mockedApi = vi.mocked(commentApi)
    mockedApi.getComments.mockResolvedValue({
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
    mockedApi.createComment.mockResolvedValue({
      data: { data: mockComment },
    })
    mockedApi.deleteComment.mockResolvedValue({ data: { success: true } })
    mockedApi.toggleCommentLike.mockResolvedValue({
      data: { liked: true, likeCount: 3 },
    })
    mockedApi.getCommentReplies.mockResolvedValue({
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
    mockedApi.checkContent.mockResolvedValue({
      data: { valid: true, message: '' },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render comment section header', () => {
      render(<CommentSection postId={1} />)

      expect(screen.getByText(/💬 评论区/)).toBeInTheDocument()
    })

    it('should render comment input for authenticated users', () => {
      render(<CommentSection postId={1} />)

      const textarea = screen.getByPlaceholderText('写下你的评论...')
      expect(textarea).toBeInTheDocument()
      expect(textarea).not.toBeDisabled()
    })

    it('should show login prompt for unauthenticated users', () => {
      mockUseAuthStore.mockReturnValue({
        isLoggedIn: false,
        user: null,
      })

      render(<CommentSection postId={1} />)

      expect(screen.getByText('登录后即可发表评论')).toBeInTheDocument()
      expect(screen.getByText('请先登录')).toBeInTheDocument()
    })

    it('should disable comment input for unauthenticated users', () => {
      mockUseAuthStore.mockReturnValue({
        isLoggedIn: false,
        user: null,
      })

      render(<CommentSection postId={1} />)

      const textarea = screen.getByPlaceholderText('请先登录后再发表评论')
      expect(textarea).toBeDisabled()
    })

    it('should show loading state initially', () => {
      const mockedApi = vi.mocked(commentApi)
      mockedApi.getComments.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves to keep loading state
          })
      )

      render(<CommentSection postId={1} />)

      expect(screen.getByText('加载评论中...')).toBeInTheDocument()
    })

    it('should show empty state when no comments', async () => {
      const mockedApi = vi.mocked(commentApi)
      mockedApi.getComments.mockResolvedValue({
        data: {
          data: [],
          pagination: {
            page: 1,
            pageSize: 10,
            total: 0,
            totalPages: 0,
          },
        },
      })

      render(<CommentSection postId={1} />)

      await waitFor(() => {
        expect(screen.getByText(/还没有评论/)).toBeInTheDocument()
      })
    })
  })

  describe('Comment List', () => {
    it('should render list of comments', async () => {
      render(<CommentSection postId={1} />)

      await waitFor(() => {
        expect(screen.getByText('Test comment 1')).toBeInTheDocument()
      })
    })

    it('should show comment author username', async () => {
      render(<CommentSection postId={1} />)

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument()
      })
    })

    it('should show comment timestamp', async () => {
      render(<CommentSection postId={1} />)

      await waitFor(() => {
        const timestamps = screen.getAllByText(/\d{4}\/\d{1,2}\/\d{1,2}/)
        expect(timestamps.length).toBeGreaterThan(0)
      })
    })

    it('should show comment like count', async () => {
      render(<CommentSection postId={1} />)

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument()
      })
    })
  })

  describe('Creating Comments', () => {
    it('should submit comment when clicking submit button', async () => {
      const onCommentCountChange = vi.fn()
      render(<CommentSection postId={1} onCommentCountChange={onCommentCountChange} />)

      const textarea = screen.getByPlaceholderText('写下你的评论...')
      await userEvent.type(textarea, 'This is a test comment')

      const submitButton = screen.getByText('发表评论')
      await userEvent.click(submitButton)

      await waitFor(() => {
        const mockedApi = vi.mocked(commentApi)
        expect(mockedApi.createComment).toHaveBeenCalledWith({
          postId: 1,
          content: 'This is a test comment',
        })
        expect(onCommentCountChange).toHaveBeenCalled()
      })
    })

    it('should validate comment content before submission', async () => {
      render(<CommentSection postId={1} />)

      const submitButton = screen.getByText('发表评论')
      await userEvent.click(submitButton)

      await waitFor(() => {
        const message = require('antd').message
        expect(message.warning).toHaveBeenCalledWith('请输入评论内容')
      })
    })

    it('should validate comment length limit', async () => {
      render(<CommentSection postId={1} />)

      const textarea = screen.getByPlaceholderText('写下你的评论...')
      const longComment = 'A'.repeat(501)
      await userEvent.type(textarea, longComment)

      const submitButton = screen.getByText('发表评论')
      await userEvent.click(submitButton)

      await waitFor(() => {
        const message = require('antd').message
        expect(message.warning).toHaveBeenCalledWith('评论内容不能超过500字')
      })
    })

    it('should show character count', async () => {
      render(<CommentSection postId={1} />)

      const textarea = screen.getByPlaceholderText('写下你的评论...')
      await userEvent.type(textarea, 'Test comment')

      expect(screen.getByText('13/500')).toBeInTheDocument()
    })

    it('should clear input after successful submission', async () => {
      render(<CommentSection postId={1} />)

      const textarea = screen.getByPlaceholderText('写下你的评论...') as HTMLTextAreaElement
      await userEvent.type(textarea, 'This is a test comment')

      const submitButton = screen.getByText('发表评论')
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(textarea.value).toBe('')
      })
    })
  })

  describe('Comment Interactions', () => {
    it('should like comment when clicking like button', async () => {
      render(<CommentSection postId={1} />)

      await waitFor(async () => {
        const likeButtons = await screen.findAllByText('点赞')
        await userEvent.click(likeButtons[0])
      })

      await waitFor(() => {
        const mockedApi = vi.mocked(commentApi)
        expect(mockedApi.toggleCommentLike).toHaveBeenCalled()
      })
    })

    it('should show reply input when clicking reply button', async () => {
      render(<CommentSection postId={1} />)

      await waitFor(async () => {
        const replyButtons = await screen.findAllByText('回复')
        await userEvent.click(replyButtons[0])
      })

      expect(screen.getByPlaceholderText(/回复 @testuser/)).toBeInTheDocument()
    })

    it('should submit reply when clicking send button', async () => {
      render(<CommentSection postId={1} />)

      await waitFor(async () => {
        const replyButtons = await screen.findAllByText('回复')
        await userEvent.click(replyButtons[0])
      })

      const replyInput = screen.getByPlaceholderText(/回复 @testuser/)
      await userEvent.type(replyInput, 'This is a test reply')

      const sendButton = screen.getByText('发送')
      await userEvent.click(sendButton)

      await waitFor(() => {
        const mockedApi = vi.mocked(commentApi)
        expect(mockedApi.createComment).toHaveBeenCalledWith(
          expect.objectContaining({
            content: 'This is a test reply',
            parentId: expect.any(Number),
          })
        )
      })
    })

    it('should cancel reply when clicking cancel button', async () => {
      render(<CommentSection postId={1} />)

      await waitFor(async () => {
        const replyButtons = await screen.findAllByText('回复')
        await userEvent.click(replyButtons[0])
      })

      const cancelButton = screen.getByText('取消')
      await userEvent.click(cancelButton)

      expect(screen.queryByPlaceholderText(/回复 @/)).not.toBeInTheDocument()
    })
  })

  describe('Deleting Comments', () => {
    it('should show delete button for own comments', async () => {
      render(<CommentSection postId={1} />)

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument()
      })

      // Delete button should be visible for own comments
      const deleteButtons = screen.queryAllByText('删除')
      expect(deleteButtons.length).toBeGreaterThan(0)
    })

    it('should confirm before deleting comment', async () => {
      render(<CommentSection postId={1} />)

      await waitFor(async () => {
        const deleteButtons = await screen.findAllByText('删除')
        // First click should show confirmation
        await userEvent.click(deleteButtons[0])
      })

      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByText('确定删除这条评论？')).toBeInTheDocument()
      })
    })

    it('should delete comment after confirmation', async () => {
      const onCommentCountChange = vi.fn()
      render(<CommentSection postId={1} onCommentCountChange={onCommentCountChange} />)

      await waitFor(async () => {
        const deleteButtons = await screen.findAllByText('删除')
        await userEvent.click(deleteButtons[0])
      })

      // Click confirm in the confirmation dialog
      const confirmButton = screen.getByText('删除') // This is the confirm button in Popconfirm
      await userEvent.click(confirmButton)

      await waitFor(() => {
        const mockedApi = vi.mocked(commentApi)
        expect(mockedApi.deleteComment).toHaveBeenCalled()
      })
    })
  })

  describe('Content Moderation', () => {
    it('should check content before submission', async () => {
      render(<CommentSection postId={1} />)

      const textarea = screen.getByPlaceholderText('写下你的评论...')
      await userEvent.type(textarea, 'This is a test comment')

      const submitButton = screen.getByText('发表评论')
      await userEvent.click(submitButton)

      await waitFor(() => {
        const mockedApi = vi.mocked(commentApi)
        expect(mockedApi.checkContent).toHaveBeenCalledWith('This is a test comment')
      })
    })

    it('should block submission if content check fails', async () => {
      const mockedApi = vi.mocked(commentApi)
      mockedApi.checkContent.mockResolvedValue({
        data: { valid: false, message: '内容包含违规词汇' },
      })

      render(<CommentSection postId={1} />)

      const textarea = screen.getByPlaceholderText('写下你的评论...')
      await userEvent.type(textarea, 'Inappropriate content')

      const submitButton = screen.getByText('发表评论')
      await userEvent.click(submitButton)

      await waitFor(() => {
        const message = require('antd').message
        expect(message.error).toHaveBeenCalledWith('内容包含违规词汇')
      })
    })
  })

  describe('Load More', () => {
    it('should show load more button when there are more comments', async () => {
      const manyComments = createMockComments(15)
      const mockedApi = vi.mocked(commentApi)
      mockedApi.getComments.mockResolvedValue({
        data: {
          data: manyComments.slice(0, 10),
          pagination: {
            page: 1,
            pageSize: 10,
            total: 15,
            totalPages: 2,
          },
        },
      })

      render(<CommentSection postId={1} />)

      await waitFor(() => {
        expect(screen.getByText('加载更多评论')).toBeInTheDocument()
      })
    })

    it('should load more comments when clicking load more button', async () => {
      const firstPage = createMockComments(10)
      const secondPage = createMockComments(5).map((c, i) => ({
        ...c,
        id: 10 + i,
      }))

      const mockedApi = vi.mocked(commentApi)
      mockedApi.getComments
        .mockResolvedValueOnce({
          data: {
            data: firstPage,
            pagination: {
              page: 1,
              pageSize: 10,
              total: 15,
              totalPages: 2,
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            data: secondPage,
            pagination: {
              page: 2,
              pageSize: 10,
              total: 15,
              totalPages: 2,
            },
          },
        })

      render(<CommentSection postId={1} />)

      await waitFor(async () => {
        const loadMoreButton = await screen.findByText('加载更多评论')
        await userEvent.click(loadMoreButton)
      })

      await waitFor(() => {
        expect(mockedApi.getComments).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Highlight Feature', () => {
    it('should scroll to highlighted comment when highlightCommentId is provided', async () => {
      const highlightCommentId = 3
      render(<CommentSection postId={1} highlightCommentId={highlightCommentId} />)

      // Wait for comments to load
      await waitFor(() => {
        expect(screen.getByText('Test comment 1')).toBeInTheDocument()
      })

      // Check if the highlighted comment element exists
      const highlightedComment = document.getElementById(`comment-${highlightCommentId}`)
      expect(highlightedComment).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should show error message when comment submission fails', async () => {
      const mockedApi = vi.mocked(commentApi)
      mockedApi.createComment.mockRejectedValue(new Error('Network error'))

      render(<CommentSection postId={1} />)

      const textarea = screen.getByPlaceholderText('写下你的评论...')
      await userEvent.type(textarea, 'This is a test comment')

      const submitButton = screen.getByText('发表评论')
      await userEvent.click(submitButton)

      await waitFor(() => {
        const message = require('antd').message
        expect(message.error).toHaveBeenCalledWith('Network error')
      })
    })

    it('should show error message when loading comments fails', async () => {
      const mockedApi = vi.mocked(commentApi)
      mockedApi.getComments.mockRejectedValue(new Error('Failed to load'))

      render(<CommentSection postId={1} />)

      await waitFor(() => {
        const message = require('antd').message
        expect(message.error).toHaveBeenCalledWith('加载评论失败')
      })
    })
  })
})
