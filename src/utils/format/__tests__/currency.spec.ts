import { describe, it, expect } from 'vitest'
import { fmtSgd } from '../currency'

describe('fmtSgd', () => {
  it('formats integer amounts with S$ prefix', () => {
    expect(fmtSgd(100)).toBe('S$100')
  })
  it('formats decimal amounts with up to 2 decimals', () => {
    expect(fmtSgd(123.45)).toBe('S$123.45')
  })
  it('rounds to 2 decimals', () => {
    expect(fmtSgd(123.456)).toBe('S$123.46')
  })
  it('handles zero', () => {
    expect(fmtSgd(0)).toBe('S$0')
  })
  it('formats large numbers with thousands separators', () => {
    expect(fmtSgd(1234567)).toBe('S$1,234,567')
  })
  it('handles undefined/null/NaN by returning S$0', () => {
    expect(fmtSgd(undefined as any)).toBe('S$0')
    expect(fmtSgd(null as any)).toBe('S$0')
    expect(fmtSgd(NaN)).toBe('S$0')
  })
})
