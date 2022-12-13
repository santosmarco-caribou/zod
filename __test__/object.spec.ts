/* eslint-disable @typescript-eslint/no-explicit-any */

import { expectTypeOf } from 'expect-type'
import { z } from '../src/index'
import { complexSchema } from './utils/complex'

describe('ZObject', () => {
  const basicSchema = z.object({
    a: z.number(),
    b: z.string().optional(),
    c: z.string().nullable(),
    d: z.array(
      z.object({
        e: z.union([z.string(), z.boolean()]),
      })
    ),
  })

  describe('keyof', () => {
    const keyofBasic = basicSchema.keyof()

    test('inference', () => {
      expectTypeOf<z.infer<typeof keyofBasic>>().toEqualTypeOf<'a' | 'b' | 'c' | 'd'>()
    })
  })

  describe('unknownKeys', () => {
    const passthrough = basicSchema.passthrough()
    const strict = basicSchema.strict()
    const strip = basicSchema.strip()

    test('inference', () => {
      expectTypeOf<z.infer<typeof passthrough>>().toEqualTypeOf<{
        [x: string]: unknown
        b?: string | undefined
        a: number
        c: string | null
        d: { e: string | boolean }[]
      }>()
      expectTypeOf<z.infer<typeof strict>>().toEqualTypeOf<{
        b?: string | undefined
        a: number
        c: string | null
        d: { e: string | boolean }[]
      }>()
      expectTypeOf<z.infer<typeof strip>>().toEqualTypeOf<{
        b?: string | undefined
        a: number
        c: string | null
        d: { e: string | boolean }[]
      }>()
    })
  })

  describe('catchall', () => {
    const numberCatchall = basicSchema.catchall(z.number())

    test('inference', () => {
      expectTypeOf<z.infer<typeof numberCatchall>>().toEqualTypeOf<{
        [x: string]: number
        // @ts-expect-error Property `x` of type `y` is not assignable to 'string' index type 'number'.
        b?: string | undefined
        a: number
        // @ts-expect-error Property `x` of type `y` is not assignable to 'string' index type 'number'.
        c: string | null
        // @ts-expect-error Property `x` of type `y` is not assignable to 'string' index type 'number'.
        d: { e: string | boolean }[]
      }>()
    })
  })

  describe('pick/omit', () => {
    const onlyUnions = complexSchema.pick(['union1', 'union2', 'union3'])
    const everythingButUnions = complexSchema.omit(['union1', 'union2', 'union3'])

    test('inference', () => {
      expectTypeOf<z.infer<typeof onlyUnions>>().toEqualTypeOf<{
        union1?: string | number | boolean | null | undefined
        union2: (string | number)[]
        union3: { p1?: string | undefined } | { p1?: number | undefined }
      }>()
      expectTypeOf<z.infer<typeof everythingButUnions>>().toEqualTypeOf<{
        merged: { k1: string | null; k2: number }
        array: number[]
        sumMinLength: number[]
      }>()
    })
  })

  describe('transformed keys', () => {
    const transformedKeys = {
      lower: z
        .object({
          'hI  tHere': z.any(),
          'hi-thERe': z.any(),
          hi_there_1: z.any(),
          '  hi_THERE  ': z.any(),
          '1ApplePlease': z.any(),
          CON_STAT: z.any(),
          CaseStatus: z.any(),
        })
        .lowerCase(),
      upper: z
        .object({
          'hI  tHere': z.any(),
          'hi-thERe': z.any(),
          hi_there_1: z.any(),
          '  hi_THERE  ': z.any(),
          '1ApplePlease': z.any(),
          CON_STAT: z.any(),
          CaseStatus: z.any(),
        })
        .upperCase(),
      camel: z
        .object({
          'hi  there': z.any(),
          'hi-there': z.any(),
          hi_there_1: z.any(),
          '  hi_there  ': z.any(),
          '1ApplePlease': z.any(),
          CON_STAT: z.any(),
          CaseStatus: z.any(),
        })
        .camelCase(),
      kebab: z
        .object({
          'hi  there': z.any(),
          'hi-there': z.any(),
          hi_there_1: z.any(),
          '  hi_there  ': z.any(),
          '1ApplePlease': z.any(),
          CON_STAT: z.any(),
          CaseStatus: z.any(),
        })
        .kebabCase(),
      snake: z
        .object({
          'hi  there': z.any(),
          'hi-there': z.any(),
          hi_there_1: z.any(),
          '  hi_there  ': z.any(),
          '1ApplePlease': z.any(),
        })
        .snakeCase(),
      pascal: z
        .object({
          'hi  there': z.any(),
          'hi-there': z.any(),
          hi_there_1: z.any(),
          '  hi_there  ': z.any(),
          '1ApplePlease': z.any(),
        })
        .pascalCase(),
      constant: z
        .object({
          'hi  there': z.any(),
          'hi-there': z.any(),
          hi_there_1: z.any(),
          '  hi_there  ': z.any(),
          '1ApplePlease': z.any(),
        })
        .constantCase(),
    }

    test('shape compatibility', () => {
      expect(transformedKeys.lower.keyof().values).toEqual(['hi  there', 'hi-there', 'hi_there_1', '  hi_there  ', '1appleplease', 'con_stat', 'casestatus'])
      expect(transformedKeys.upper.keyof().values).toEqual(['HI  THERE', 'HI-THERE', 'HI_THERE_1', '  HI_THERE  ', '1APPLEPLEASE', 'CON_STAT', 'CASESTATUS'])
      expect(transformedKeys.camel.keyof().values).toEqual(['hiThere', 'hiThere1', '1ApplePlease', 'conStat', 'caseStatus'])
      expect(transformedKeys.kebab.keyof().values).toEqual(['hi-there', 'hi-there-1', '1-apple-please', 'con-stat', 'case-status'])
      expect(transformedKeys.pascal.keyof().values).toEqual(['HiThere', 'HiThere1', '1ApplePlease'])
      expect(transformedKeys.snake.keyof().values).toEqual(['hi_there', 'hi_there_1', '1_apple_please'])
      expect(transformedKeys.constant.keyof().values).toEqual(['HI_THERE', 'HI_THERE_1', '1_APPLE_PLEASE'])
    })

    test('inference', () => {
      expectTypeOf<z.infer<typeof transformedKeys.lower>>().toEqualTypeOf<{
        'hi  there'?: any
        'hi-there'?: any
        hi_there_1?: any
        '  hi_there  '?: any
        '1appleplease'?: any
        con_stat?: any
        casestatus?: any
      }>()
      expectTypeOf<z.infer<typeof transformedKeys.upper>>().toEqualTypeOf<{
        'HI  THERE'?: any
        'HI-THERE'?: any
        HI_THERE_1?: any
        '  HI_THERE  '?: any
        '1APPLEPLEASE'?: any
        CON_STAT?: any
        CASESTATUS?: any
      }>()
      expectTypeOf<z.infer<typeof transformedKeys.camel>>().toEqualTypeOf<{
        hiThere?: any
        hiThere1?: any
        '1ApplePlease'?: any
        conStat?: any
        caseStatus?: any
      }>()
      expectTypeOf<z.infer<typeof transformedKeys.kebab>>().toEqualTypeOf<{
        'hi-there'?: any
        'hi-there-1'?: any
        '1-apple-please'?: any
        'con-stat'?: any
        'case-status'?: any
      }>()
      expectTypeOf<z.infer<typeof transformedKeys.snake>>().toEqualTypeOf<{
        hi_there?: any
        hi_there_1?: any
        '1_apple_please'?: any
      }>()
      expectTypeOf<z.infer<typeof transformedKeys.pascal>>().toEqualTypeOf<{
        HiThere?: any
        HiThere1?: any
        '1ApplePlease'?: any
      }>()
      expectTypeOf<z.infer<typeof transformedKeys.constant>>().toEqualTypeOf<{
        HI_THERE?: any
        HI_THERE_1?: any
        '1_APPLE_PLEASE'?: any
      }>()
    })

    describe('selecting keys', () => {
      test('inference', () => {
        const onlyHyThereCamel = z
          .object({
            'hi  there': z.any(),
            'hi-there': z.any(),
            hi_there_1: z.any(),
            '  hi_there  ': z.any(),
            '1ApplePlease': z.any(),
            CON_STAT: z.any(),
            CaseStatus: z.any(),
          })
          .camelCase(['hi  there', 'hi-there', 'hi_there_1', '  hi_there  '])

        expectTypeOf<z.infer<typeof onlyHyThereCamel>>().toEqualTypeOf<{
          // camelized
          hiThere?: any
          hiThere1?: any
          // not camelized
          '1ApplePlease'?: any
          CON_STAT?: any
          CaseStatus?: any
        }>()
      })
    })
  })

  describe('readonly/writable', () => {
    const basicReadonly = basicSchema.readonly()
    const basicWritable = basicReadonly.readonly().mutable()
    const readonlyWithCatchall = basicSchema.readonly().catchall(z.bigint())

    test('inference', () => {
      expectTypeOf<z.infer<typeof basicReadonly>>().toEqualTypeOf<{
        readonly a: number
        readonly b?: string | undefined
        readonly c: string | null
        readonly d: { e: string | boolean }[]
      }>()
      expectTypeOf<z.infer<typeof basicWritable>>().toEqualTypeOf<{
        a: number
        b?: string | undefined
        c: string | null
        d: { e: string | boolean }[]
      }>()
      expectTypeOf<z.infer<typeof readonlyWithCatchall>>().toEqualTypeOf<{
        readonly [x: string]: bigint
        // @ts-expect-error Property `x` of type `y` is not assignable to 'string' index type 'bigint'.
        readonly a: number
        // @ts-expect-error Property `x` of type `y` is not assignable to 'string' index type 'bigint'.
        readonly b?: string | undefined
        // @ts-expect-error Property `x` of type `y` is not assignable to 'string' index type 'bigint'.
        readonly c: string | null
        // @ts-expect-error Property `x` of type `y` is not assignable to 'string' index type 'bigint'.
        readonly d: { e: string | boolean }[]
      }>()
    })
  })

  test('inference', () => {
    expectTypeOf<z.infer<typeof basicSchema>>().toEqualTypeOf<{
      a: number
      b?: string | undefined
      c: string | null
      d: { e: string | boolean }[]
    }>()
  })
})
