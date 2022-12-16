import { expectTypeOf } from 'expect-type'
import * as t from '../src'

describe('TNull', () => {
  let type: t.TNull

  beforeEach(() => {
    type = t.null()
  })

  test('passes', () => {
    expect(type.safeParse(null).ok).toBe(true)
  })

  test('fails', () => {
    expect(() => type.parse(undefined)).toThrow()
    expect(() => type.parse(void 0)).toThrow()
    expect(() => type.parse(0)).toThrow()
    expect(() => type.parse('')).toThrow()
  })

  test('inference', () => {
    expectTypeOf<t.infer<typeof type>>().toEqualTypeOf<null>()
  })
})

describe('TUndefined', () => {
  let type: t.TUndefined

  beforeEach(() => {
    type = t.undefined()
  })

  test('passes', () => {
    expect(type.safeParse(undefined).ok).toBe(true)
    expect(type.safeParse(void 0).ok).toBe(true)
  })

  test('fails', () => {
    expect(() => type.parse(null)).toThrow()
    expect(() => type.parse(0)).toThrow()
    expect(() => type.parse('')).toThrow()
  })

  test('inference', () => {
    expectTypeOf<t.infer<typeof type>>().toEqualTypeOf<undefined>()
  })
})

describe('TVoid', () => {
  let type: t.TVoid

  beforeEach(() => {
    type = t.void()
  })

  test('passes', () => {
    expect(type.safeParse(undefined).ok).toBe(true)
    expect(type.safeParse(void 0).ok).toBe(true)
  })

  test('fails', () => {
    expect(() => type.parse(null)).toThrow()
    expect(() => type.parse(0)).toThrow()
    expect(() => type.parse('')).toThrow()
  })

  test('inference', () => {
    expectTypeOf<t.infer<typeof type>>().toEqualTypeOf<void>()
  })
})
