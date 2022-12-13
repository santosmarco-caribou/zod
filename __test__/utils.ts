/* eslint-disable jest/no-export */

import { inspect } from 'node:util'
import z from '../src/index'
import { utils } from '../lib/utils'

export namespace testUtils {
  export type PassingTestCase = [value: unknown, shouldPass: true]

  export type FailingTestCase = [
    value: unknown,
    shouldPass: false,
    issues: [z.IssueKind, ...z.IssueKind[]]
  ]

  export type TestCase = PassingTestCase | FailingTestCase

  export interface TesterOptions {
    readonly name?: string
  }

  export interface TesterTest extends Required<TesterOptions> {
    readonly schema: z.AnyZ
    readonly cases: readonly TestCase[]
  }

  export const Value = {
    String: 'foo',
    EmptyString: '',
    Number: 123,
    PositiveInfinity: Number.POSITIVE_INFINITY,
    NegativeInfinity: Number.NEGATIVE_INFINITY,
    BigInt: BigInt(123),
    True: true,
    False: false,
    Symbol: Symbol('foo'),
    Function: function foo() {
      return 'foo'
    },
    Undefined: undefined,
    Null: null,
    Array: [1, 2, 3],
    Object: { foo: 'bar' },
    Date: new Date(),
    Map: new Map(),
    Set: new Set(),
    Promise: Promise.resolve('foo'),
    NotANumber: Number.NaN,
  } as const

  export type Value = typeof Value[keyof typeof Value]

  export const isPassing = (c: TestCase): c is PassingTestCase => !!c[1]
  export const isFailing = (c: TestCase): c is FailingTestCase => !isPassing(c)

  export const makePassingCase = (value: unknown): PassingTestCase => [
    value,
    true,
  ]

  export const makeInvalidTypeCase = (value: unknown): FailingTestCase => [
    value,
    false,
    [z.IssueKind.InvalidType],
  ]

  export const tester = (schema: z.AnyZ, cases: readonly TestCase[]) => {
    const tests: TesterTest[] = [{ name: 'base', schema, cases }]

    const runTest = ({ schema, cases, name }: TesterTest) => {
      const passingCases = cases.filter(isPassing)
      const failingCases = cases.filter(isFailing)

      describe(`${name}`, () => {
        describe('passes', () => {
          for (const [value] of passingCases) {
            test(`${inspect(value)}`, async () => {
              const parseResult = await schema[
                utils.isAsync(value) ? 'safeParseAsync' : 'safeParse'
              ](value)
              expect(parseResult.ok).toBe(true)
              expect(parseResult.data).toStrictEqual(value)
              expect(parseResult.error).toBeUndefined()
            })
          }
        })

        describe('fails', () => {
          for (const [value, , issues] of failingCases) {
            test(`${inspect(value)}`, async () => {
              const parseResult = await schema[
                utils.isAsync(value) ? 'safeParseAsync' : 'safeParse'
              ](value)
              expect(parseResult.ok).toBe(false)
              expect(parseResult.data).toBeUndefined()
              expect(parseResult.error).toBeInstanceOf(z.ZError)
              expect(parseResult.error?.issues).toHaveLength(issues.length)
              expect(
                parseResult.error?.issues.map(({ kind }) => kind)
              ).toStrictEqual(issues)
            })
          }
        })
      })
    }

    return {
      includeNullish() {
        tests.push({
          name: 'nullish',
          schema: schema.nullish(),
          cases: cases.map((c) =>
            utils.includes([Value.Undefined, Value.Null], c[0])
              ? [c[0], true]
              : c
          ),
        })
        return this
      },

      run() {
        for (const test of tests) {
          runTest(test)
        }
      },
    }
  }
}
