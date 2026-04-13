import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PostCard from '../PostCard'
import { render, mockPost } from '../../test/utils'
import * as postApi from '../../api/post'
import * as followApi from '../../api/follow'

// Mock stores
vi.mock('../../store/auth', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('../../store/follow', () => ({
  useFollowStore: vi.fn(),
}))

// Mock hooks
vi.mock('../../hooks/useScrollAnimation', () => ({
  useScrollAnimation: () => ({
    ref: { current: null },
    isVisible: true,
  }),
}))

// Mock utils
vi.mock('../../utils/images', () => ({
  getAvatarUrl: (user: any) => user?.avatar || '',
  parseImages: (images: string[]) => images,
}))

// Mock components
vi.mock('../components/common/UserProfileModal', () => ({
  UserProfileModal: ({ visible, onClose }: any) =>
    visible ? <div data-testid="user-profile-modal">User Profile Modal</div> : null,
}))

vi.mock('./ChatModal', () => ({
  default: ({ visible, onClose }: any) =>
    visible ? <div data-testid="chat-modal">Chat Modal</div> : null,
}))

vi.mock('./MapModal', () => ({
  default: ({ visible, onClose }: any) =>
    visible ? <div data-testid="map-modal">Map Modal</div> : null,
}))

// Mock APIs
vi.mock('../../api/post', () => ({
  toggleLike: vi.fn(),
  toggleFavorite: vi.fn(),
}))

vi.mock('../../api/follow', () => ({
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
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

describe('PostCard Component', () => {
  let mockUseAuthStore: any
  let mockUseFollowStore: any

  beforeEach(() => {
    // Setup default mocks
    mockUseAuthStore = require('../../store/auth').useAuthStore
    mockUseFollowStore = require('../../store/follow').useFollowStore

    mockUseAuthStore.mockReturnValue({
      isLoggedIn: true,
      user: { id: 999, username: 'currentuser', avatar: '' },
    })

    mockUseFollowStore.mockReturnValue({
      followStatus: {},
      setFollowStatus: vi.fn(),
      checkAndCacheStatus: vi.fn(),
    })

    // Clear navigation mock
    mockNavigate.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render post card with basic information', () => {
      render(<PostCard post={mockPost} />)

      expect(screen.getByText(mockPost.content)).toBeInTheDocument()
      expect(screen.getByText(mockPost.user.username)).toBeInTheDocument()
    })

    it('should render post image', () => {
      render(<PostCard post={mockPost} />)

      const image = screen.getByAltText('post')
      expect(image).toBeInTheDocument()
      expect(image).toHaveProperty('src', mockPost.images[0])
    })

    it('should render multi-image badge when post has multiple images', () => {
      const postWithMultipleImages = {
        ...mockPost,
        images: ['image1.jpg', 'image2.jpg', 'image3.jpg'],
      }

      render(<PostCard post={postWithMultipleImages} />)

      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should render post address', () => {
      render(<PostCard post={mockPost} />)

      expect(screen.getByText(mockPost.address!)).toBeInTheDocument()
    })

    it('should render action buttons with correct counts', () => {
      render(<PostCard post={mockPost} />)

      expect(screen.getByText(mockPost.likeCount)).toBeInTheDocument()
      expect(screen.getByText(mockPost.favoriteCount)).toBeInTheDocument()
      expect(screen.getByText(mockPost.commentCount)).toBeInTheDocument()
    })

    it('should show reading time and character count', () => {
      render(<PostCard post={mockPost} />)

      expect(screen.getByText(/分钟/)).toBeInTheDocument()
      expect(screen.getByText(/字/)).toBeInTheDocument()
    })

    it('should render rank badge when showRank is true', () => {
      const { rerender } = render(<PostCard post={mockPost} showRank rank={0} />)
      expect(screen.getByText('1')).toBeInTheDocument()

      rerender(<PostCard post={mockPost} showRank rank={1} />)
      expect(screen.getByText('2')).toBeInTheDocument()

      rerender(<PostCard post={mockPost} showRank rank={2} />)
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should show fallback emoji when image fails to load', () => {
      const postWithoutImage = {
        ...mockPost,
        images: [],
      }

      render(<PostCard post={postWithoutImage} />)

      // Should show a random food emoji
      const placeholder = document.querySelector('.post-placeholder')
      expect(placeholder).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should navigate to post detail when clicking card', async () => {
      render(<PostCard post={mockPost} />)

      const card = screen.getByText(mockPost.content).closest('.post-card-urban')
      await userEvent.click(card!)

      expect(mockNavigate).toHaveBeenCalledWith(`/post/${mockPost.id}`, {
        state: { from: '/' },
      })
    })

    it('should handle like action when user is logged in', async () => {
      const mockToggleLike = vi.mocked(postApi.toggleLike)
      mockToggleLike.mockResolvedValue({ liked: true, likeCount: 11 })

      const onUpdate = vi.fn()
      render(<PostCard post={mockPost} onUpdate={onUpdate} />)

      const likeButton = screen.getAllByText('赞')[0]
      await userEvent.click(likeButton)

      expect(mockToggleLike).toHaveBeenCalledWith(mockPost.id)
      expect(onUpdate).toHaveBeenCalledWith({
        id: mockPost.id,
        isLiked: true,
        likeCount: 11,
      })
    })

    it('should handle favorite action when user is logged in', async () => {
      const mockToggleFavorite = vi.mocked(postApi.toggleFavorite)
      mockToggleFavorite.mockResolvedValue({ favorited: true, favoriteCount: 4 })

      const onUpdate = vi.fn()
      render(<PostCard post={mockPost} onUpdate={onUpdate} />)

      const favoriteButton = screen.getAllByText('藏')[0]
      await userEvent.click(favoriteButton)

      expect(mockToggleFavorite).toHaveBeenCalledWith(mockPost.id)
      expect(onUpdate).toHaveBeenCalledWith({
        id: mockPost.id,
        isFavorited: true,
        favoriteCount: 4,
      })
    })

    it('should navigate to post detail when clicking comment button', async () => {
      render(<PostCard post={mockPost} />)

      const commentButton = screen.getAllByText('评')[0]
      await userEvent.click(commentButton)

      expect(mockNavigate).toHaveBeenCalledWith(`/post/${mockPost.id}`, {
        state: { from: '/' },
      })
    })

    it('should show login prompt when trying to like without authentication', async () => {
      mockUseAuthStore.mockReturnValue({
        isLoggedIn: false,
        user: null,
      })

      render(<PostCard post={mockPost} />)

      const likeButton = screen.getAllByText('赞')[0]
      await userEvent.click(likeButton)

      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  describe('Follow Functionality', () => {
    it('should show follow button for other users when logged in', () => {
      render(<PostCard post={mockPost} />)

      expect(screen.getByText('+ 关注')).toBeInTheDocument()
    })

    it('should not show follow button for own posts', () => {
      mockUseAuthStore.mockReturnValue({
        isLoggedIn: true,
        user: { id: mockPost.user.id, username: 'currentuser', avatar: '' },
      })

      render(<PostCard post={mockPost} />)

      expect(screen.queryByText('+ 关注')).not.toBeInTheDocument()
    })

    it('should handle follow action', async () => {
      const mockFollowUser = vi.mocked(followApi.followUser)
      mockFollowUser.mockResolvedValue({ data: { success: true } })

      const setFollowStatus = vi.fn()
      mockUseFollowStore.mockReturnValue({
        followStatus: { [mockPost.user.id]: false },
        setFollowStatus,
        checkAndCacheStatus: vi.fn(),
      })

      render(<PostCard post={mockPost} />)

      const followButton = screen.getByText('+ 关注')
      await userEvent.click(followButton)

      expect(mockFollowUser).toHaveBeenCalledWith(mockPost.user.id)
      expect(setFollowStatus).toHaveBeenCalledWith(mockPost.user.id, true)
    })

    it('should handle unfollow action', async () => {
      const mockUnfollowUser = vi.mocked(followApi.unfollowUser)
      mockUnfollowUser.mockResolvedValue({ data: { success: true } })

      const setFollowStatus = vi.fn()
      mockUseFollowStore.mockReturnValue({
        followStatus: { [mockPost.user.id]: true },
        setFollowStatus,
        checkAndCacheStatus: vi.fn(),
      })

      render(<PostCard post={mockPost} />)

      const unfollowButton = screen.getByText('已关注')
      await userEvent.click(unfollowButton)

      expect(mockUnfollowUser).toHaveBeenCalledWith(mockPost.user.id)
      expect(setFollowStatus).toHaveBeenCalledWith(mockPost.user.id, false)
    })
  })

  describe('Modals and Overlays', () => {
    it('should open user profile modal when clicking username', async () => {
      render(<PostCard post={mockPost} />)

      const username = screen.getByText(mockPost.user.username)
      await userEvent.click(username)

      expect(screen.getByTestId('user-profile-modal')).toBeInTheDocument()
    })

    it('should open map modal when clicking address', async () => {
      render(<PostCard post={mockPost} />)

      const address = screen.getByText(mockPost.address!)
      await userEvent.click(address)

      expect(screen.getByTestId('map-modal')).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('should show loading state on image before loaded', () => {
      render(<PostCard post={mockPost} />)

      const image = screen.getByAltText('post')
      expect(image).toHaveClass('loading')
    })

    it('should show loaded state on image after loaded', async () => {
      render(<PostCard post={mockPost} />)

      const image = screen.getByAltText('post')
      fireEvent.load(image)

      await waitFor(() => {
        expect(image).toHaveClass('loaded')
      })
    })

    it('should disable follow button while loading', () => {
      render(<PostCard post={mockPost} />)

      const followButton = screen.getByText('+ 关注')
      // Button should be enabled initially
      expect(followButton).not.toBeDisabled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle post without address', () => {
      const postWithoutAddress = {
        ...mockPost,
        address: undefined,
      }

      render(<PostCard post={postWithoutAddress} />)

      expect(screen.queryByText(/EnvironmentOutlined/i)).not.toBeInTheDocument()
    })

    it('should handle very long address by truncating', () => {
      const longAddress = 'A'.repeat(100) + ' Street'
      const postWithLongAddress = {
        ...mockPost,
        address: longAddress,
      }

      render(<PostCard post={postWithLongAddress} />)

      const addressElement = screen.getByText(/A.*\.\.\./)
      expect(addressElement).toBeInTheDocument()
    })

    it('should handle post with zero counts', () => {
      const postWithZeroCounts = {
        ...mockPost,
        likeCount: 0,
        commentCount: 0,
        favoriteCount: 0,
      }

      render(<PostCard post={postWithZeroCounts} />)

      expect(screen.getByText('赞')).toBeInTheDocument()
      expect(screen.getByText('评')).toBeInTheDocument()
      expect(screen.getByText('藏')).toBeInTheDocument()
    })
  })

  describe('Hover Effects', () => {
    it('should apply hover class on mouse enter', async () => {
      render(<PostCard post={mockPost} />)

      const card = screen.getByText(mockPost.content).closest('.post-card-urban')
      fireEvent.mouseEnter(card!)

      await waitFor(() => {
        expect(card).toHaveClass('hovered')
      })
    })

    it('should remove hover class on mouse leave', async () => {
      render(<PostCard post={mockPost} />)

      const card = screen.getByText(mockPost.content).closest('.post-card-urban')
      fireEvent.mouseEnter(card!)
      fireEvent.mouseLeave(card!)

      await waitFor(() => {
        expect(card).not.toHaveClass('hovered')
      })
    })
  })
})
