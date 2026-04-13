import { describe, it, expect } from 'vitest'

describe('Example Tests', () => {
  it('should add numbers correctly', () => {
    expect(1 + 1).toBe(2)
  })

  it('should check string length', () => {
    const str = 'hello'
    expect(str.length).toBe(5)
  })

  it('should handle objects', () => {
    const obj = { name: 'test', value: 123 }
    expect(obj).toHaveProperty('name', 'test')
  })

  it('should handle arrays', () => {
    const arr = [1, 2, 3, 4, 5]
    expect(arr).toHaveLength(5)
    expect(arr).toContain(3)
  })

  it('should handle booleans', () => {
    expect(true).toBe(true)
    expect(false).toBe(false)
  })

  it('should handle null and undefined', () => {
    expect(null).toBeNull()
    expect(undefined).toBeUndefined()
  })

  it('should handle async operations', async () => {
    const promise = Promise.resolve('success')
    const result = await promise
    expect(result).toBe('success')
  })

  it('should handle errors', () => {
    expect(() => {
      throw new Error('Test error')
    }).toThrow('Test error')
  })

  it('should compare numbers', () => {
    expect(10).toBeGreaterThan(5)
    expect(5).toBeLessThan(10)
    expect(5.5).toBeCloseTo(5.5)
  })

  it('should check types', () => {
    const str = 'hello'
    const num = 123
    const bool = true
    const obj = {}
    const arr = []

    expect(typeof str).toBe('string')
    expect(typeof num).toBe('number')
    expect(typeof bool).toBe('boolean')
    expect(typeof obj).toBe('object')
    expect(Array.isArray(arr)).toBe(true)
  })

  it('should handle regex', () => {
    const email = 'test@example.com'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    expect(email).toMatch(emailRegex)
  })

  it('should handle promises', async () => {
    const asyncAdd = async (a: number, b: number) => {
      return new Promise<number>((resolve) => {
        setTimeout(() => resolve(a + b), 100)
      })
    }

    const result = await asyncAdd(2, 3)
    expect(result).toBe(5)
  })
})
