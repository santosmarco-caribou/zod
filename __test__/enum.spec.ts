import { expectTypeOf } from 'expect-type'
import { z } from '../src/index'

describe('ZEnum', () => {
  const schemas = [z.enum(['a', 'b', 'c']), z.enum([1, 2, 3]), z.enum(['a', 2, 'c'])] as const

  test('passes', () => {
    expect(schemas[0].safeParse('a')).toStrictEqual({ ok: true, data: 'a' })
    expect(schemas[1].safeParse(2)).toStrictEqual({ ok: true, data: 2 })
    expect(schemas[2].safeParse('c')).toStrictEqual({ ok: true, data: 'c' })
  })

  describe('fails', () => {
    test('with invalid_type', () => {
      const results = [schemas[0].safeParse(true), schemas[1].safeParse([]), schemas[2].safeParse({})] as const
      expect(results.every((result) => result.ok)).toBe(false)
      expect(results.map((result) => result.error?.issues.length)).toStrictEqual([1, 1, 1])
      expect(results.map((result) => result.error?.issues[0].kind)).toStrictEqual(['invalid_type', 'invalid_type', 'invalid_type'])
    })

    test('with invalid_enum_value', () => {
      const results = [schemas[0].safeParse('d'), schemas[1].safeParse(4), schemas[2].safeParse(1)] as const
      expect(results.every((result) => result.ok)).toBe(false)
      expect(results.map((result) => result.error?.issues.length)).toStrictEqual([1, 1, 1])
      expect(results.map((result) => result.error?.issues[0].kind)).toStrictEqual(['invalid_enum_value', 'invalid_enum_value', 'invalid_enum_value'])
      expect(results.map((result) => result.error?.issues[0])).toStrictEqual([
        {
          kind: 'invalid_enum_value',
          message: 'Expected value to be one of "a" | "b" | "c"; got "d"',
          payload: {
            expected: { values: ['a', 'b', 'c'], formatted: '"a" | "b" | "c"' },
            received: { value: 'd', formatted: '"d"' },
          },
          input: {
            data: 'd',
            type: 'string',
          },
          path: [],
          origin: 'ZEnum',
        },
        {
          kind: 'invalid_enum_value',
          message: 'Expected value to be one of 1 | 2 | 3; got 4',
          payload: {
            expected: { values: [1, 2, 3], formatted: '1 | 2 | 3' },
            received: { value: 4, formatted: '4' },
          },
          input: {
            data: 4,
            type: 'number',
          },
          path: [],
          origin: 'ZEnum',
        },
        {
          kind: 'invalid_enum_value',
          message: 'Expected value to be one of "a" | 2 | "c"; got 1',
          payload: {
            expected: { values: ['a', 2, 'c'], formatted: '"a" | 2 | "c"' },
            received: { value: 1, formatted: '1' },
          },
          input: {
            data: 1,
            type: 'number',
          },
          path: [],
          origin: 'ZEnum',
        },
      ])
    })
  })

  describe('values/enum', () => {
    test('values', () => {
      expect(schemas[0].values).toStrictEqual(['a', 'b', 'c'])
      expect(schemas[1].values).toStrictEqual([1, 2, 3])
      expect(schemas[2].values).toStrictEqual(['a', 2, 'c'])

      expectTypeOf<typeof schemas[0]['values']>().toEqualTypeOf<readonly ['a', 'b', 'c']>()
      expectTypeOf<typeof schemas[1]['values']>().toEqualTypeOf<readonly [1, 2, 3]>()
      expectTypeOf<typeof schemas[2]['values']>().toEqualTypeOf<readonly ['a', 2, 'c']>()
    })

    test('enum', () => {
      expect(schemas[0].enum).toStrictEqual({ a: 'a', b: 'b', c: 'c' })
      expect(schemas[1].enum).toStrictEqual({ 1: 1, 2: 2, 3: 3 })
      expect(schemas[2].enum).toStrictEqual({ a: 'a', 2: 2, c: 'c' })

      expectTypeOf<typeof schemas[0]['enum']>().toEqualTypeOf<{
        readonly a: 'a'
        readonly b: 'b'
        readonly c: 'c'
      }>()
      expectTypeOf<typeof schemas[1]['enum']>().toEqualTypeOf<{
        readonly 1: 1
        readonly 2: 2
        readonly 3: 3
      }>()
      expectTypeOf<typeof schemas[2]['enum']>().toEqualTypeOf<{
        readonly a: 'a'
        readonly 2: 2
        readonly c: 'c'
      }>()
    })
  })

  describe('extract/exclude', () => {
    test('extract', () => {
      const newSchemas = [schemas[0].extract(['a']), schemas[1].extract([2]), schemas[2].extract(['c'])] as const
      expect(newSchemas[0].values).toStrictEqual(['a'])
      expect(newSchemas[1].values).toStrictEqual([2])
      expect(newSchemas[2].values).toStrictEqual(['c'])
      expect(newSchemas[0].enum).toStrictEqual({ a: 'a' })
      expect(newSchemas[1].enum).toStrictEqual({ 2: 2 })
      expect(newSchemas[2].enum).toStrictEqual({ c: 'c' })
      expect(newSchemas[0].safeParse('a')).toStrictEqual({
        ok: true,
        data: 'a',
      })
      expect(newSchemas[1].safeParse(2)).toStrictEqual({ ok: true, data: 2 })
      expect(newSchemas[2].safeParse('c')).toStrictEqual({
        ok: true,
        data: 'c',
      })
      expect(newSchemas[0].safeParse('b').ok).toBe(false)
      expect(newSchemas[1].safeParse(3).ok).toBe(false)
      expect(newSchemas[2].safeParse('d').ok).toBe(false)

      expectTypeOf<z.infer<typeof newSchemas[0]>>().toEqualTypeOf<'a'>()
      expectTypeOf<z.infer<typeof newSchemas[1]>>().toEqualTypeOf<2>()
      expectTypeOf<z.infer<typeof newSchemas[2]>>().toEqualTypeOf<'c'>()
    })

    test('exclude', () => {
      const newSchemas = [schemas[0].exclude(['a']), schemas[1].exclude([2]), schemas[2].exclude(['c'])] as const
      expect(newSchemas[0].values).toStrictEqual(['b', 'c'])
      expect(newSchemas[1].values).toStrictEqual([1, 3])
      expect(newSchemas[2].values).toStrictEqual(['a', 2])
      expect(newSchemas[0].enum).toStrictEqual({ b: 'b', c: 'c' })
      expect(newSchemas[1].enum).toStrictEqual({ 1: 1, 3: 3 })
      expect(newSchemas[2].enum).toStrictEqual({ a: 'a', 2: 2 })
      expect(newSchemas[0].safeParse('a').ok).toBe(false)
      expect(newSchemas[1].safeParse(2).ok).toBe(false)
      expect(newSchemas[2].safeParse('c').ok).toBe(false)

      expectTypeOf<z.infer<typeof newSchemas[0]>>().toEqualTypeOf<'b' | 'c'>()
      expectTypeOf<z.infer<typeof newSchemas[1]>>().toEqualTypeOf<1 | 3>()
      expectTypeOf<z.infer<typeof newSchemas[2]>>().toEqualTypeOf<'a' | 2>()
    })
  })

  test('inference', () => {
    expectTypeOf<z.infer<typeof schemas[0]>>().toEqualTypeOf<'a' | 'b' | 'c'>()
    expectTypeOf<z.infer<typeof schemas[1]>>().toEqualTypeOf<1 | 2 | 3>()
    expectTypeOf<z.infer<typeof schemas[2]>>().toEqualTypeOf<'a' | 2 | 'c'>()
  })
})
