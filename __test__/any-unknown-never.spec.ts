import { expectTypeOf } from 'expect-type'
import * as t from '../src'

describe('TAny', () => {
  let type: t.TAny

  beforeEach(() => {
    type = t.any()
  })

  test('passes', () => {
    expect(type.safeParse('John').ok).toBe(true)
    expect(type.safeParse(5).ok).toBe(true)
    expect(type.safeParse(true).ok).toBe(true)
    expect(type.safeParse(null).ok).toBe(true)
    expect(type.safeParse(undefined).ok).toBe(true)
    expect(type.safeParse([]).ok).toBe(true)
    expect(type.safeParse({}).ok).toBe(true)
  })

  test('inference', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expectTypeOf<t.infer<typeof type>>().toEqualTypeOf<any>()
  })
})

describe('TUnknown', () => {
  let type: t.TUnknown

  beforeEach(() => {
    type = t.unknown()
  })

  test('passes', () => {
    expect(type.safeParse('John').ok).toBe(true)
    expect(type.safeParse(5).ok).toBe(true)
    expect(type.safeParse(true).ok).toBe(true)
    expect(type.safeParse(null).ok).toBe(true)
    expect(type.safeParse(undefined).ok).toBe(true)
    expect(type.safeParse([]).ok).toBe(true)
    expect(type.safeParse({}).ok).toBe(true)
  })

  test('inference', () => {
    expectTypeOf<t.infer<typeof type>>().toEqualTypeOf<unknown>()
  })
})

describe('TNever', () => {
  let type: t.TNever

  beforeEach(() => {
    type = t.never()
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
    expectTypeOf<t.infer<typeof type>>().toEqualTypeOf<never>()
  })
})
