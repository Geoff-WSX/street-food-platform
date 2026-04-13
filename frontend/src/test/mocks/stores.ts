import { vi } from 'vitest'
import {
  mockUser,
  createMockAuthStore,
  createMockFollowStore,
  createMockNotificationStore,
  createMockMessageStore,
  createMockThemeStore,
} from '../utils'

// Mock Zustand stores
export const mockUseAuthStore = vi.fn()
export const mockUseFollowStore = vi.fn()
export const mockUseNotificationStore = vi.fn()
export const mockUseMessageStore = vi.fn()
export const mockUseThemeStore = vi.fn()

// Setup default store mocks
export const setupDefaultStoreMocks = () => {
  mockUseAuthStore.mockReturnValue(createMockAuthStore())
  mockUseFollowStore.mockReturnValue(createMockFollowStore())
  mockUseNotificationStore.mockReturnValue(createMockNotificationStore())
  mockUseMessageStore.mockReturnValue(createMockMessageStore())
  mockUseThemeStore.mockReturnValue(createMockThemeStore())
}

// Setup authenticated state
export const setupAuthenticatedState = () => {
  mockUseAuthStore.mockReturnValue(
    createMockAuthStore({
      isLoggedIn: true,
      user: mockUser,
    })
  )
}

// Setup unauthenticated state
export const setupUnauthenticatedState = () => {
  mockUseAuthStore.mockReturnValue(
    createMockAuthStore({
      isLoggedIn: false,
      user: null,
    })
  )
}

// Reset all store mocks
export const resetStoreMocks = () => {
  mockUseAuthStore.mockReset()
  mockUseFollowStore.mockReset()
  mockUseNotificationStore.mockReset()
  mockUseMessageStore.mockReset()
  mockUseThemeStore.mockReset()
}

// Helper to setup custom store state
export const setupCustomAuthState = (state: any) => {
  mockUseAuthStore.mockReturnValue(createMockAuthStore(state))
}

export const setupCustomFollowState = (state: any) => {
  mockUseFollowStore.mockReturnValue(createMockFollowStore(state))
}

export const setupCustomNotificationState = (state: any) => {
  mockUseNotificationStore.mockReturnValue(createMockNotificationStore(state))
}

export const setupCustomMessageState = (state: any) => {
  mockUseMessageStore.mockReturnValue(createMockMessageStore(state))
}

export const setupCustomThemeState = (state: any) => {
  mockUseThemeStore.mockReturnValue(createMockThemeStore(state))
}
