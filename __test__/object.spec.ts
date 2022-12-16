import { expectTypeOf } from 'expect-type'
import * as t from '../src'

describe('TObject', () => {
  const type = t.object({
    a: t.string(),
    b: t.number(),
    c: t.boolean(),
    d: t.null(),
    e: t.undefined(),
    f: t.void(),
    g: t.nan(),
    h: t.array(t.string()),
    i: t.false().optional(),
    j: t.literal('John').nullable(),
  })

  describe('no catchall', () => {
    describe('strip', () => {
      test.todo('passes')

      test.todo('fails')

      test('inference', () => {
        expectTypeOf<t.infer<typeof type>>().toEqualTypeOf<{
          a: string
          b: number
          c: boolean
          d: null
          e: undefined
          f?: void
          g: number
          h: string[]
          i?: false
          j: 'John' | null
        }>()
      })
    })

    describe('passthrough', () => {
      const passthroughNoCatchallType = type.passthrough()

      test.todo('passes')

      test.todo('fails')

      test('inference', () => {
        expectTypeOf<t.infer<typeof passthroughNoCatchallType>>().toEqualTypeOf<
          {
            a: string
            b: number
            c: boolean
            d: null
            e: undefined
            f?: void
            g: number
            h: string[]
            i?: false
            j: 'John' | null
          } & { [x: string]: unknown }
        >()
      })
    })

    describe('strict', () => {
      const strictNoCatchallType = type.strict()

      test.todo('passes')

      test.todo('fails')

      test('inference', () => {
        expectTypeOf<t.infer<typeof strictNoCatchallType>>().toEqualTypeOf<
          {
            a: string
            b: number
            c: boolean
            d: null
            e: undefined
            f?: void
            g: number
            h: string[]
            i?: false
            j: 'John' | null
          } & { [x: string]: never }
        >()
      })
    })
  })

  describe('with catchall', () => {
    describe('strip', () => {
      const stripWithCatchallType = type.catchall(t.boolean())

      test.todo('passes')

      test.todo('fails')

      test('inference', () => {
        expectTypeOf<t.infer<typeof stripWithCatchallType>>().toEqualTypeOf<
          {
            a: string
            b: number
            c: boolean
            d: null
            e: undefined
            f?: void
            g: number
            h: string[]
            i?: false
            j: 'John' | null
          } & { [x: string]: boolean }
        >()
      })
    })

    describe('passthrough', () => {
      const passthroughWithCatchallType = type.passthrough().catchall(t.number())

      test.todo('passes')

      test.todo('fails')

      test('inference', () => {
        expectTypeOf<t.infer<typeof passthroughWithCatchallType>>().toEqualTypeOf<
          {
            a: string
            b: number
            c: boolean
            d: null
            e: undefined
            f?: void
            g: number
            h: string[]
            i?: false
            j: 'John' | null
          } & { [x: string]: number }
        >()
      })
    })

    describe('strict', () => {
      const strictWithCatchallType = type.strict().catchall(t.string())

      test.todo('passes')

      test.todo('fails')

      test('inference', () => {
        expectTypeOf<t.infer<typeof strictWithCatchallType>>().toEqualTypeOf<
          {
            a: string
            b: number
            c: boolean
            d: null
            e: undefined
            f?: void
            g: number
            h: string[]
            i?: false
            j: 'John' | null
          } & { [x: string]: string }
        >()
      })
    })
  })

  describe('empty', () => {
    const emptyType = t.object({})
    const emptyPassthroughType = emptyType.passthrough()
    const emptyWithCatchallType = emptyType.catchall(t.string())

    test('inference', () => {
      expectTypeOf<t.infer<typeof emptyType>>().toEqualTypeOf<{ [x: string]: never }>()
      expectTypeOf<t.infer<typeof emptyPassthroughType>>().toEqualTypeOf<{ [x: string]: unknown }>()
      expectTypeOf<t.infer<typeof emptyWithCatchallType>>().toEqualTypeOf<{ [x: string]: string }>()
    })
  })
})
