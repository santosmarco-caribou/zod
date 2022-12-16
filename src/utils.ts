/*
  eslint-disable
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/ban-types,
    unicorn/prefer-export-from
*/

import _cloneDeep from 'lodash/cloneDeep'
import _defaultsDeep from 'lodash/defaultsDeep'
import _memoize from 'lodash/memoize'
import _mergeWith from 'lodash/mergeWith'
import safeJsonStringify from 'safe-json-stringify'
import { camelCase, kebabCase, pascalCase, snakeCase } from 'tiny-case'
import type { CamelCase as TfCamelCase, KebabCase as TfKebabCase, PascalCase as TfPascalCase, SnakeCase as TfSnakeCase } from 'type-fest'
import type { AnyTType } from './types'

export namespace utils {
  export const UNSET_MARKER = Symbol('UNSET_MARKER')
  export type UNSET_MARKER = typeof UNSET_MARKER
  export const isUnset = (value: unknown): value is UNSET_MARKER => value === UNSET_MARKER
  export type AnyReadonlyRecord = { readonly [x: string]: any }
  export type AnyFunction = ((...arguments_: readonly any[]) => any) | (abstract new (...arguments_: readonly any[]) => any)
  export type Primitive = string | number | bigint | boolean | symbol | null | undefined
  export type Constructor = abstract new (...arguments_: readonly any[]) => any
  export type Promisable<T> = T | Promise<T>
  export type EnumLike = { readonly [x: string]: string | number; readonly [y: number]: string }
  export type AtLeastOne<T> = { readonly 0: T } & readonly T[]
  export type Not<T extends 0 | 1> = 1 extends T ? 0 : 1
  export type Or<T extends _internals.Conditions> = 1 extends T[number] ? 1 : 0
  export type Extends<T, U> = [T] extends [never] ? 0 : T extends U ? 1 : 0
  export type Equals<T, U> = (<X>() => X extends T ? 1 : 0) extends <Y>() => Y extends U ? 1 : 0 ? 1 : 0
  export type TrimLeft<S extends string, D extends string = ' '> = S extends `${D}${infer R}` ? TrimLeft<R> : S
  export type TrimRight<S extends string, D extends string = ' '> = S extends `${infer L}${D}` ? TrimRight<L> : S
  export type Trim<S extends string, D extends string = ' '> = TrimLeft<TrimRight<S, D>, D>
  export type CamelCase<T extends string> = TfCamelCase<T>
  export type ConstantCase<T extends string> = Uppercase<SnakeCase<T>>
  export type KebabCase<T extends string> = _internals.FixCaseTransform<TfKebabCase<T>, '-'>
  export type PascalCase<T extends string> = TfPascalCase<T>
  export type SnakeCase<T extends string> = _internals.FixCaseTransform<TfSnakeCase<T>, '_'>
  export type Literalize<T extends Primitive = Primitive> = T extends string ? `"${T}"` : T extends number | boolean | null | undefined ? `${T}` : T extends bigint ? `${T}n` : 'symbol'
  export type StrictOmit<T, K extends keyof T> = Omit<T, K>
  export type StrictExtract<T, U extends T> = Extract<T, U>
  export type StrictExclude<T, U extends T> = Exclude<T, U>
  export type Tail<T extends readonly unknown[]> = T extends readonly [] ? T : T extends readonly [unknown, ...infer R] ? R : never
  export const BRAND = Symbol('BRAND')
  export type BRAND = typeof BRAND
  export type Branded<T, B> = T & { readonly [BRAND]: B }
  export type ValueOf<T> = T[keyof T]
  export type Empty<T> = { [K in keyof T]?: undefined }
  export type Defined<T> = T extends undefined ? never : T
  export type Simplify<T> = { 0: { [K in keyof T]: Simplify<T[K]> }; 1: T }[Or<[Equals<T, unknown>, Extends<T, _internals.BuiltIn | AnyTType>]>]
  export type PartialDeep<T> = T extends []
    ? []
    : T extends _internals.BuiltIn
    ? T
    : T extends readonly [infer H, ...infer R]
    ? readonly [PartialDeep<H>?, ...PartialDeep<R>]
    : { [K in keyof T]?: PartialDeep<T[K]> }
  export type RequiredFilter<T, K extends keyof T> = undefined extends T[K] ? (T[K] extends undefined ? K : never) : K
  export type OptionalFilter<T, K extends keyof T> = undefined extends T[K] ? (T[K] extends undefined ? never : K) : never
  export type OptionalKeysOf<T> = Exclude<{ [K in keyof T]: T extends Record<K, T[K]> ? never : K }[keyof T], undefined>
  export type RequiredKeysOf<T> = Exclude<{ [K in keyof T]: T extends Record<K, T[K]> ? K : never }[keyof T], undefined>
  export type EnforceOptional<T> = Simplify<{ [K in keyof T as RequiredFilter<T, K>]: T[K] } & { [K in keyof T as OptionalFilter<T, K>]?: Exclude<T[K], undefined> }>
  export type StrictRequired<T> = { [K in keyof T]-?: [T[K]] } extends infer U ? (U extends Record<keyof U, [any]> ? { [K in keyof U]: U[K][0] } : never) : never
  export type OmitIndexSignature<T> = { [K in keyof T as {} extends Record<K, unknown> ? never : K]: T[K] }
  export type Merge<T, U> = Omit<T, keyof U> & U
  export type FromEntries<T extends readonly (readonly [PropertyKey, unknown])[]> = { [K in T[number][0]]: Extract<T[number], [K, unknown]>[1] }
  export type RequireAtLeastOne<T, K extends keyof T = keyof T> = { [K_ in K]-?: Required<Pick<T, K_>> & Partial<Pick<T, Exclude<K, K_>>> }[K] & utils.StrictOmit<T, K>
  export type Writable<T, K extends keyof T = keyof T> = StrictOmit<T, K> & { -readonly [P in K]: T[P] }
  export type ExcludeMethods<T> = Pick<T, { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]>
  export type FixEmptyObject<T> = { 0: T; 1: { [x: string]: never } }[Equals<T, {}>]
  export type UnionToIntersection<T> = (T extends unknown ? (x: T) => void : never) extends (y: infer Intersection) => void ? Intersection : never
  export type GetLastOfUnion<T> = ((T extends unknown ? (x: () => T) => void : never) extends (y: infer Intersection) => void ? Intersection : never) extends () => infer Last ? Last : never
  export type UnionToTuple<T> = _internals.UnionToTuple<T>
  export type Narrow<T> = T extends [] ? T : _internals.NarrowRaw<T>
  export type Negative<T extends number | bigint> = T extends 0 | 0n ? never : `${T}` extends `-${string}` ? T : never
  export type NonNegative<T extends number | bigint> = T extends 0 | 0n ? T : Negative<T> extends never ? T : never
  export type Integer<T extends number> = `${T}` extends `${bigint}` ? T : never
  export type NonNegativeInteger<T extends number> = NonNegative<Integer<T>>
  export const TYPE_ERROR = Symbol('TYPE_ERROR')
  export type TYPE_ERROR = typeof TYPE_ERROR
  export type $TypeError<Message extends string> = { [TYPE_ERROR]: Message }
  export type Validate<T, Message extends string> = { 0: []; 1: [_error: $TypeError<Message>] }[Equals<T, never>]
  export type ValidateNonNegativeInteger<T extends number> = Validate<number extends T ? T : NonNegativeInteger<T>, `Value must be a non-negative integer (>= 0); got: ${T}`>
  export const cloneDeep = _cloneDeep
  export const defaultsDeep = _defaultsDeep
  export const memoize = _memoize
  export const equals = <T>(a: unknown, b: T): a is T => a === b
  export const isNonNullable = <T>(value: T): value is NonNullable<T> => value !== undefined && value !== null
  export const isDefined = <T>(value: T): value is Defined<T> => value !== undefined
  export const isPrimitive = (value: unknown): value is Primitive => value === null || includes(['string', 'number', 'bigint', 'boolean', 'symbol', 'undefined'], typeof value)
  export const isArray = <T>(value: T): value is Extract<T, any[]> => Array.isArray(value)
  export const isAsync = <T>(value: T | PromiseLike<T>): value is Promise<T> => value instanceof Promise
  export const isInstanceOf = <T extends Constructor>(value: unknown, constructor: T): value is InstanceType<T> => value instanceof constructor
  export const jsonStringify = (data: unknown, space = 2) => safeJsonStringify(data as object, (_key, value) => (typeof value === 'bigint' ? value.toString() : value), space)
  export const toLowerCase = <T extends string>(value: T) => value.toLowerCase() as Lowercase<T>
  export const toUpperCase = <T extends string>(value: T) => value.toUpperCase() as Uppercase<T>
  export const toCamelCase = <T extends string>(value: T) => camelCase(value) as CamelCase<T>
  export const toKebabCase = <T extends string>(value: T) => kebabCase(value) as KebabCase<T>
  export const toSnakeCase = <T extends string>(value: T) => snakeCase(value) as SnakeCase<T>
  export const toPascalCase = <T extends string>(value: T) => pascalCase(value) as PascalCase<T>
  export const toConstantCase = <T extends string>(value: T) => toUpperCase(toSnakeCase(value))
  export const pluralize = (value: string, quantity: number) => (quantity > 1 ? `${value}s` : value)
  export const stringifyInt = (value: number) => (value > 1 ? value : value === 0 ? 'zero' : 'one')
  export const literalize = <T extends Primitive>(value: T) => {
    return (() => {
      if (typeof value === 'string') return `"${value}"`
      if (typeof value === 'number' || typeof value === 'boolean') return `${value}`
      if (value === undefined) return 'undefined'
      if (value === null) return 'null'
      if (typeof value === 'bigint') return `${value}n`
      return 'symbol'
    })() as Literalize<T>
  }
  export const unionize = <T extends readonly (string | number)[]>(values: T) => values.join(_internals.UNION_PIPE)
  export const intersectionize = <T extends readonly (string | number)[]>(values: T) => values.join(_internals.INTERSECTION_AMPERSAND)
  export const includes = <T>(array: readonly T[], value: any): value is T => array.includes(value)
  export const tail = <T extends readonly unknown[]>(array: T) => array.slice(1) as Tail<T>
  export const keys = <T extends object>(object: T) => {
    if (typeof Object.keys === 'function') {
      return Object.keys(object) as (keyof T)[]
    }
    const keys = []
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key)
      }
    }
    return keys
  }
  export const values = <T extends object>(object: T) => keys(object).map((key) => object[key])
  export const entries = <T extends object>(object: T) => keys(object).map((key) => [key, object[key]] as const)
  export const fromEntries = <K extends PropertyKey, V>(entries: readonly (readonly [K, V])[]) => Object.fromEntries(entries) as FromEntries<typeof entries>
  export const sortKeys = <T extends object>(object: T): T =>
    fromEntries(
      keys(object)
        .sort()
        .map((key) => [key, object[key]])
    )
  export const merge = <A, B>(a: A, b: B) => ({ ...cloneDeep(a), ...cloneDeep(b) } as Merge<A, B>)
  export const mergeDeep = <A, B>(a: A, b: B) => _mergeWith(cloneDeep(a), cloneDeep(b), (objectValue, sourceValue) => (Array.isArray(objectValue) ? [...objectValue, ...sourceValue] : undefined))
  export const pick = <T extends object, K extends keyof T>(object: T, keys: readonly K[]) => fromEntries(entries(object).filter(([key]) => includes(keys, key))) as Pick<T, K>
  export const omit = <T extends object, K extends keyof T>(object: T, keys: readonly K[]) => fromEntries(entries(object).filter(([key]) => !includes(keys, key))) as Omit<T, K>
  export const omitIndexSignature = <T extends object>(object: T) => object as OmitIndexSignature<T>
  export const simplify = <T>(value: T) => value as Simplify<T>
  export const narrow = <T>(value: Narrow<T>) => value as T

  export const CONSTANTS = {
    regex: {
      alphanum: /^[\dA-Za-z]+$/,
      cuid: /^c[^\s-]{8,}$/i,
      dataUri: /^data:[\w+.-]+\/[\w+.-]+;((charset=[\w-]+|base64),)?(.*)$/,
      email: /^(([^\s"(),.:;<>@[\]]+(\.[^\s"(),.:;<>@[\]]+)*)|(".+"))@(([^\s"(),.:;<>@[\]]+\.)+[^\s"(),.:;<>@[\]]{2,})$/i,
      hex: /^[\da-f]+$/i,
      uuid: /^([\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[\da-f]{4}-[\da-f]{12}|0{8}-(?:0{4}-){3}0{12})$/i,
    },
  } as const

  namespace _internals {
    export type BuiltIn =
      | { readonly [Symbol.toStringTag]: string }
      | AnyFunction
      | Date
      | Error
      | Generator
      | Promise<unknown>
      | ReadonlyArray<unknown>
      | ReadonlyMap<unknown, unknown>
      | ReadonlySet<unknown>
      | RegExp
    export type Conditions = readonly [0 | 1, 0 | 1, ...(0 | 1)[]]
    export type FixCaseTransform<String_ extends string, Delimiter extends string> = String_ extends `${infer A}${Delimiter}${Delimiter}${infer B}`
      ? FixCaseTransform<`${A}${Delimiter}${B}`, Delimiter>
      : Trim<String_, Delimiter>
    export type UnionToTuple<T, _Accumulator extends unknown[] = []> = [T] extends [never] ? Readonly<_Accumulator> : UnionToTuple<Exclude<T, GetLastOfUnion<T>>, [GetLastOfUnion<T>, ..._Accumulator]>
    export type NarrowRaw<T> = (T extends [] ? [] : never) | (T extends string | number | bigint | boolean ? T : never) | { [K in keyof T]: T[K] extends AnyFunction ? T[K] : NarrowRaw<T[K]> }
    export const UNION_PIPE = ' | '
    export const INTERSECTION_AMPERSAND = ' & '
  }
}
