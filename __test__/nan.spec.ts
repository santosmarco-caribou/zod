import { expectTypeOf } from 'expect-type'
import * as t from '../src'

describe('TNaN', () => {
  let type: t.TNaN

  beforeEach(() => {
    type = t.nan()
  })

  test('passes', () => {
    expect(type.safeParse(Number.NaN).ok).toBe(true)
    expect(type.safeParse(Number('Not a number')).ok).toBe(true)
  })

  test('fails', () => {
    expect(() => type.parse('John')).toThrow()
    expect(() => type.parse(5)).toThrow()
    expect(() => type.parse(true)).toThrow()
    expect(() => type.parse(null)).toThrow()
    expect(() => type.parse(undefined)).toThrow()
    expect(() => type.parse([])).toThrow()
    expect(() => type.parse({})).toThrow()
  })

  test('inference', () => {
    expectTypeOf<t.infer<typeof type>>().toEqualTypeOf<number>()
  })
})
