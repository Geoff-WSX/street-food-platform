import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// 简单示例：测试一个计数器组件
describe('Example Component Tests', () => {
  it('should demonstrate basic testing setup', () => {
    // 基础断言测试
    expect(true).toBe(true)
    expect(1 + 1).toBe(2)
  })

  it('should demonstrate async testing', async () => {
    // 异步测试示例
    const fetchData = () => Promise.resolve({ data: 'test' })

    const result = await fetchData()
    expect(result.data).toBe('test')
  })

  it('should demonstrate mock functions', () => {
    // Mock 函数测试
    const mockFn = vi.fn()
    mockFn('test')

    expect(mockFn).toHaveBeenCalledWith('test')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('should demonstrate DOM manipulation', () => {
    // DOM 操作测试
    const { container } = render(<div data-testid="test-div">Hello World</div>)

    const div = container.querySelector('[data-testid="test-div"]')
    expect(div).toBeInTheDocument()
    expect(div).toHaveTextContent('Hello World')
  })

  it('should demonstrate user interactions', async () => {
    // 用户交互测试
    const handleClick = vi.fn()
    const { container } = render(
      <button onClick={handleClick}>Click me</button>
    )

    const button = container.querySelector('button')
    await userEvent.click(button!)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should demonstrate waiting for changes', async () => {
    // 等待状态变化测试 - 使用 React 状态
    const TestComponent = () => {
      const [visible, setVisible] = React.useState(false)
      React.useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 100)
        return () => clearTimeout(timer)
      }, [])
      return <div>{visible ? 'Visible' : 'Hidden'}</div>
    }

    const { container } = render(<TestComponent />)

    expect(container.querySelector('div')).toHaveTextContent('Hidden')

    // 等待状态变化
    await waitFor(() => {
      expect(container.querySelector('div')).toHaveTextContent('Visible')
    }, { timeout: 200 })
  })
})

// 描述如何测试实际的 React 组件
describe('React Component Testing Guide', () => {
  it('shows how to test component rendering', () => {
    // 1. 导入组件
    // import Component from '../Component'

    // 2. 渲染组件
    // const { container } = render(<Component prop="value" />)

    // 3. 断言
    // expect(container.querySelector('.component-class')).toBeInTheDocument()
  })

  it('shows how to test user interactions', async () => {
    // 1. 渲染组件
    // const { container } = render(<Component />)

    // 2. 模拟用户操作
    // const button = screen.getByRole('button')
    // await userEvent.click(button)

    // 3. 断言结果
    // expect(screen.getByText('Clicked')).toBeInTheDocument()
  })

  it('shows how to test async operations', async () => {
    // 1. Mock API 调用
    // const mockApi = vi.fn().mockResolvedValue({ data: 'test' })

    // 2. 渲染组件并触发操作
    // render(<Component />)
    // await userEvent.click(screen.getByText('Load'))

    // 3. 等待并断言
    // await waitFor(() => {
    //   expect(mockApi).toHaveBeenCalled()
    //   expect(screen.getByText('test')).toBeInTheDocument()
    // })
  })

  it('shows how to mock dependencies', () => {
    // 1. Mock API 模块
    // vi.mock('../api/module', () => ({
    //   apiFunction: vi.fn()
    // }))

    // 2. Mock Store
    // vi.mock('../store/auth', () => ({
    //   useAuthStore: vi.fn(() => ({
    //     user: { id: 1, name: 'Test' }
    //   }))
    // }))

    // 3. Mock React Router
    // vi.mock('react-router-dom', async () => {
    //   const actual = await vi.importActual('react-router-dom')
    //   return {
    //     ...actual,
    //     useNavigate: () => vi.fn()
    //   }
    // })
  })
})

// 测试工具函数示例
describe('Test Utilities Examples', () => {
  it('shows how to create mock data', () => {
    // 创建模拟用户数据
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      avatar: 'https://example.com/avatar.jpg',
      role: 'user',
      createdAt: new Date().toISOString(),
    }

    expect(mockUser.username).toBe('testuser')
    expect(mockUser).toHaveProperty('id')
  })

  it('shows how to create mock API responses', () => {
    // 创建模拟 API 响应
    const mockResponse = {
      data: {
        data: [
          { id: 1, content: 'Post 1' },
          { id: 2, content: 'Post 2' },
        ],
        pagination: {
          page: 1,
          pageSize: 10,
          total: 2,
          totalPages: 1,
        },
      },
    }

    expect(mockResponse.data.data).toHaveLength(2)
    expect(mockResponse.data.pagination.total).toBe(2)
  })

  it('shows how to setup test environment', () => {
    // 测试环境配置示例
    const testEnv = {
      apiUrl: 'http://localhost:3000/api',
      wsUrl: 'ws://localhost:3000',
      timeout: 5000,
    }

    expect(testEnv).toBeDefined()
  })
})
