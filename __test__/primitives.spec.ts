import { expectTypeOf } from 'expect-type'
import { z } from '../src/index'
import { utils } from '../lib/utils'
import { testUtils } from './utils'

describe('ZAny', () => {
  const schema = z.any()

  testUtils.tester(schema, utils.values(testUtils.Value).map(testUtils.makePassingCase)).includeNullish().run()

  test('inference', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expectTypeOf<z.infer<typeof schema>>().toEqualTypeOf<any>()
  })
})

describe('ZUnknown', () => {
  const schema = z.unknown()

  testUtils.tester(schema, utils.values(testUtils.Value).map(testUtils.makePassingCase)).includeNullish().run()

  test('inference', () => {
    expectTypeOf<z.infer<typeof schema>>().toEqualTypeOf<unknown>()
  })
})

describe('ZString', () => {
  const schema = z.string()

  const { String, EmptyString, Undefined, ...Failing } = testUtils.Value

  testUtils
    .tester(schema, [[Undefined, false, [z.IssueKind.Required]], ...[String, EmptyString].map(testUtils.makePassingCase), ...utils.values(Failing).map(testUtils.makeInvalidTypeCase)])
    .includeNullish()
    .run()

  test('inference', () => {
    expectTypeOf<z.infer<typeof schema>>().toEqualTypeOf<string>()
  })
})

describe('ZNumber', () => {
  const schema = z.number()

  const { Number, PositiveInfinity, NegativeInfinity, Undefined, ...Failing } = testUtils.Value

  testUtils
    .tester(schema, [
      [Undefined, false, [z.IssueKind.Required]],
      ...[Number, PositiveInfinity, NegativeInfinity].map(testUtils.makePassingCase),
      ...utils.values(Failing).map(testUtils.makeInvalidTypeCase),
    ])
    .includeNullish()
    .run()

  test('inference', () => {
    expectTypeOf<z.infer<typeof schema>>().toEqualTypeOf<number>()
  })
})

describe('ZNaN', () => {
  const schema = z.nan()

  const { NotANumber, Undefined, ...Failing } = testUtils.Value

  testUtils
    .tester(schema, [[Undefined, false, [z.IssueKind.Required]], ...[NotANumber].map(testUtils.makePassingCase), ...utils.values(Failing).map(testUtils.makeInvalidTypeCase)])
    .includeNullish()
    .run()

  test('inference', () => {
    expectTypeOf<z.infer<typeof schema>>().toEqualTypeOf<number>()
  })
})

describe('ZBigInt', () => {
  const schema = z.bigint()

  const { BigInt, Undefined, ...Failing } = testUtils.Value

  testUtils
    .tester(schema, [[Undefined, false, [z.IssueKind.Required]], ...[BigInt].map(testUtils.makePassingCase), ...utils.values(Failing).map(testUtils.makeInvalidTypeCase)])
    .includeNullish()
    .run()

  test('inference', () => {
    expectTypeOf<z.infer<typeof schema>>().toEqualTypeOf<bigint>()
  })
})

describe('ZBoolean', () => {
  const schema = z.boolean()

  const { True, False, Undefined, ...Failing } = testUtils.Value

  testUtils
    .tester(schema, [[Undefined, false, [z.IssueKind.Required]], ...[True, False].map(testUtils.makePassingCase), ...utils.values(Failing).map(testUtils.makeInvalidTypeCase)])
    .includeNullish()
    .run()

  test('inference', () => {
    expectTypeOf<z.infer<typeof schema>>().toEqualTypeOf<boolean>()
  })
})

describe('ZDate', () => {
  const schema = z.date()

  const { Date, Undefined, ...Failing } = testUtils.Value

  testUtils
    .tester(schema, [[Undefined, false, [z.IssueKind.Required]], ...[Date].map(testUtils.makePassingCase), ...utils.values(Failing).map(testUtils.makeInvalidTypeCase)])
    .includeNullish()
    .run()

  test('inference', () => {
    expectTypeOf<z.infer<typeof schema>>().toEqualTypeOf<Date>()
  })
})

describe('ZSymbol', () => {
  const schema = z.symbol()

  const { Symbol, Undefined, ...Failing } = testUtils.Value

  testUtils
    .tester(schema, [[Undefined, false, [z.IssueKind.Required]], ...[Symbol].map(testUtils.makePassingCase), ...utils.values(Failing).map(testUtils.makeInvalidTypeCase)])
    .includeNullish()
    .run()

  test('inference', () => {
    expectTypeOf<z.infer<typeof schema>>().toEqualTypeOf<symbol>()
  })
})

describe('ZUndefined', () => {
  const schema = z.undefined()

  const { Undefined, ...Failing } = testUtils.Value

  testUtils
    .tester(schema, [...[Undefined].map(testUtils.makePassingCase), ...utils.values(Failing).map(testUtils.makeInvalidTypeCase)])
    .includeNullish()
    .run()

  test('inference', () => {
    expectTypeOf<z.infer<typeof schema>>().toEqualTypeOf<undefined>()
  })
})

describe('ZVoid', () => {
  const schema = z.void()

  const { Undefined, ...Failing } = testUtils.Value

  testUtils
    .tester(schema, [...[Undefined].map(testUtils.makePassingCase), ...utils.values(Failing).map(testUtils.makeInvalidTypeCase)])
    .includeNullish()
    .run()

  test('inference', () => {
    expectTypeOf<z.infer<typeof schema>>().toEqualTypeOf<void>()
  })
})

describe('ZNull', () => {
  const schema = z.null()

  const { Null, Undefined, ...Failing } = testUtils.Value

  testUtils
    .tester(schema, [[Undefined, false, [z.IssueKind.Required]], ...[Null].map(testUtils.makePassingCase), ...utils.values(Failing).map(testUtils.makeInvalidTypeCase)])
    .includeNullish()
    .run()

  test('inference', () => {
    expectTypeOf<z.infer<typeof schema>>().toEqualTypeOf<null>()
  })
})

describe('ZNever', () => {
  const schema = z.never()

  testUtils
    .tester(
      schema,
      utils.values(testUtils.Value).map((value) => [value, false, [z.IssueKind.Forbidden]])
    )
    .includeNullish()
    .run()

  test('inference', () => {
    expectTypeOf<z.infer<typeof schema>>().toEqualTypeOf<never>()
  })
})
