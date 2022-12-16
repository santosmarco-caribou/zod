import type { ErrorMap, TError } from './error'
import { IssueKind, MakeChecks, checks } from './issues'
import { toptions, type CreateOptions, type MetaObject } from './options'
import {
  TParsedType,
  getParsedType,
  tparse,
  type AsyncParseResult,
  type ParseContext,
  type ParseOptions,
  type ParseResult,
  type SyncParseResult,
} from './parse'
import { TTypeName, type TTypeNameMap } from './type-names'
import { utils } from './utils'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        Base                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TInternals {
  readonly meta: MetaObject
  readonly errorMap: ErrorMap | undefined
}

export interface TDef<T extends TTypeName = TTypeName, H extends string = string> {
  readonly typeName: T
  readonly hint: H
}

export interface TType<O = unknown, Def extends TDef = TDef, I = O> {
  readonly _O: O
  readonly _I: I
  readonly _internals: TInternals
  readonly typeName: Def['typeName']
  readonly hint: Def['hint']
  _parse(ctx: ParseContext<O, I>): ParseResult<O, I>
  _parseSync(ctx: ParseContext<O, I>): SyncParseResult<O, I>
  _parseAsync(ctx: ParseContext<O, I>): AsyncParseResult<O, I>
  safeParse(data: unknown, options?: utils.Simplify<ParseOptions>): SyncParseResult<O, I>
  safeParseAsync(data: unknown, options?: utils.Simplify<ParseOptions>): AsyncParseResult<O, I>
  parse(data: unknown, options?: utils.Simplify<ParseOptions>): O
  parseAsync(data: unknown, options?: utils.Simplify<ParseOptions>): Promise<O>
  optional(): TOptional<TType<O, Def, I>>
  nullable(): TNullable<TType<O, Def, I>>
  nullish(): TOptional<TNullable<TType<O, Def, I>>>
  or<T extends [AnyTType, ...AnyTType[]]>(...alternatives: T): TUnion<[TType<O, Def, I>, T[0], ...utils.Tail<T>]>
  array(): TArray<TType<O, Def, I>>
  promise(): TPromise<TType<O, Def, I>>
  default<D extends utils.Defined<I>>(defaultValue: D | (() => D)): TDefault<TType<O, Def, I>, D>
  catch<D extends I>(defaultValue: D | (() => D)): TCatch<TType<O, Def, I>, D>
  lazy(): TLazy<TType<O, Def, I>>
  is<T extends TTypeName>(type: T | readonly T[]): this is TTypeNameMap[T]
  meta(meta: MetaObject): TType<O, Def, I>
}

export const ttype = <O, I = O>(handleParse: (ctx: ParseContext<O, I>) => ParseResult<O, I>) => ({
  options: (createOptions: CreateOptions | undefined) => ({
    typeName: <T extends TTypeName>(typeName: T) => ({
      hint: <H extends string>(hint: H) => {
        const _options = toptions.processCreate(createOptions)

        const _internals: TInternals = {
          meta: _options.meta,
          errorMap: _options.errorMap,
        }

        const _parse = utils.memoize(handleParse)

        const _parseSync = (ctx: ParseContext<O, I>): SyncParseResult<O, I> => {
          const result = _parse(ctx)
          if (utils.isAsync(result)) {
            throw new Error('Synchronous parse encountered promise')
          }
          return result
        }

        const _parseAsync = async (ctx: ParseContext<O, I>): AsyncParseResult<O, I> => {
          const result = _parse(ctx)
          return result
        }

        const t: TType<O, TDef<T, H>, I> = {
          _O: undefined as O,
          _I: undefined as I,
          _internals,
          typeName,
          hint,
          _parse,
          _parseSync,
          _parseAsync,
          safeParse: (data, options) => {
            const parseContext = tparse.createSync(t, data, options)
            return _parseSync(parseContext)
          },
          safeParseAsync: async (data, options) => {
            const parseContext = tparse.createAsync(t, data, options)
            return _parseAsync(parseContext)
          },
          parse: (data, options) => {
            const result = t.safeParse(data, options)
            if (result.ok) return result.data
            else throw result.error
          },
          parseAsync: async (data, options) => {
            const result = await t.safeParseAsync(data, options)
            if (result.ok) return result.data
            else throw result.error
          },
          optional: () => toptional(t, _options),
          nullable: () => tnullable(t, _options),
          nullish: () => toptional(tnullable(t, _options), _options),
          or: (...alternatives) => tunion([t, alternatives[0], ...utils.tail(alternatives)], _options),
          array: () => tarray(t, _options),
          promise: () => tpromise(t, _options),
          default: (defaultValue) => tdefault(t, defaultValue, _options),
          catch: (defaultValue) => tcatch(t, defaultValue, _options),
          lazy: () => tlazy(() => t, _options),
          is: (type) => utils.includes(utils.isArray(type) ? type : [type], typeName),
          meta: (meta) => utils.mergeDeep(t, { _internals: { meta } }),
        }

        Reflect.deleteProperty(t, '_O')
        Reflect.deleteProperty(t, '_I')

        return {
          build: () => t,
          extend: <U extends typeof t>(handleExtend: (type: typeof t) => Readonly<U>) => handleExtend(t),
        }
      },
    }),
  }),
})

export type AnyTType<O = unknown, I = O> = TType<O, TDef, I>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                         Any                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface TAny extends TType<any, TDef<TTypeName.Any, 'any'>> {}

export const tany = (options?: CreateOptions): TAny =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ttype<any>((ctx) => ctx.OK(ctx.data))
    .options(options)
    .typeName(TTypeName.Any)
    .hint('any')
    .build()

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        Array                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TArray<T extends AnyTType>
  extends TType<T['_O'][], TDef<TTypeName.Array, `${T['hint']}[]`>, T['_I'][]> {
  readonly element: T
}

export const tarray = <T extends AnyTType>(element: T, options?: CreateOptions): TArray<T> =>
  ttype<T['_O'][], T['_I'][]>((ctx) => {
    if (!utils.isArray(ctx.data)) {
      return ctx.INVALID_TYPE({ expected: TParsedType.Array }).ABORT()
    }
    return ctx.OK(ctx.data)
  })
    .options(options)
    .typeName(TTypeName.Array)
    .hint(`${element.hint}[]`)
    .extend((t) => ({ ...t, element }))

export type AnyTArray = TArray<AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       BigInt                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TBigInt extends TType<bigint, TDef<TTypeName.BigInt, 'bigint'>> {}

export const tbigint = (options?: CreateOptions): TBigInt =>
  ttype<bigint>((ctx) =>
    typeof ctx.data === 'bigint' ? ctx.OK(ctx.data) : ctx.INVALID_TYPE({ expected: TParsedType.BigInt }).ABORT()
  )
    .options(options)
    .typeName(TTypeName.BigInt)
    .hint('bigint')
    .build()

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       Boolean                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TBoolean extends TType<boolean, TDef<TTypeName.Boolean, 'boolean'>> {}

export const tboolean = (options?: CreateOptions): TBoolean =>
  ttype<boolean>((ctx) =>
    typeof ctx.data === 'boolean' ? ctx.OK(ctx.data) : ctx.INVALID_TYPE({ expected: TParsedType.Boolean }).ABORT()
  )
    .options(options)
    .typeName(TTypeName.Boolean)
    .hint('boolean')
    .build()

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        Catch                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

const _getDefaultValue = <T extends AnyTType, D extends T['_I'] | utils.Defined<T['_I']>>(
  defaultValue: D | (() => D)
): D => {
  return typeof defaultValue === 'function' ? (defaultValue as () => D)() : defaultValue
}

export interface TCatch<T extends AnyTType, D extends T['_I']>
  extends TType<utils.Defined<T['_O']>, TDef<TTypeName.Catch, `Catch<${T['hint']}>`>, T['_I'] | undefined> {
  readonly defaultValue: D
  removeCatch(): T
}

export const tcatch = <T extends AnyTType, D extends T['_I']>(
  type: T,
  defaultValue: D | (() => D),
  options?: CreateOptions
): TCatch<T, D> =>
  ttype<utils.Defined<T['_O']>, T['_I'] | undefined>((ctx) => {
    const result = type._parse(ctx.clone({ type }))
    return utils.isAsync(result)
      ? result.then((resolvedResult) =>
          ctx.OK((resolvedResult.ok ? resolvedResult.data : _getDefaultValue(defaultValue)) as utils.Defined<T['_O']>)
        )
      : ctx.OK((result.ok ? result.data : _getDefaultValue(defaultValue)) as utils.Defined<T['_O']>)
  })
    .options(options)
    .typeName(TTypeName.Catch)
    .hint(`Catch<${type['hint']}>`)
    .extend((t) => ({
      ...t,
      get defaultValue() {
        return _getDefaultValue(defaultValue)
      },
      removeCatch: () => type,
    }))

export type AnyTCatch = TCatch<AnyTType, AnyTType['_I']>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        Date                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TDate extends TType<Date, TDef<TTypeName.Date, 'Date'>> {}

export const tdate = (options?: CreateOptions): TDate =>
  ttype<Date>((ctx) => {
    if (!(ctx.data instanceof Date)) {
      return ctx.INVALID_TYPE({ expected: TParsedType.Date }).ABORT()
    }
    return ctx.OK(ctx.data)
  })
    .options(options)
    .typeName(TTypeName.Date)
    .hint('Date')
    .build()

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       Default                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TDefault<T extends AnyTType, D extends utils.Defined<T['_I']>>
  extends TType<utils.Defined<T['_O']>, TDef<TTypeName.Default, `Default<${T['hint']}>`>, T['_I'] | undefined> {
  readonly defaultValue: D
  removeDefault(): T
}

export const tdefault = <T extends AnyTType, D extends utils.Defined<T['_I']>>(
  type: T,
  defaultValue: D | (() => D),
  options?: CreateOptions
): TDefault<T, D> =>
  ttype<utils.Defined<T['_O']>, T['_I'] | undefined>((ctx) => {
    if (ctx.data === undefined) {
      ctx.setData(_getDefaultValue(defaultValue))
    }
    return type._parse(ctx.clone({ type })) as ParseResult<utils.Defined<T['_O']>, T['_I'] | undefined>
  })
    .options(options)
    .typeName(TTypeName.Default)
    .hint(`Default<${type['hint']}>`)
    .extend((t) => ({
      ...t,
      get defaultValue() {
        return _getDefaultValue(defaultValue)
      },
      removeDefault: () => type,
    }))

export type AnyTDefault = TDefault<AnyTType, utils.Defined<AnyTType['_I']>>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        Enum                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export type EnumValue = string | number
export type EnumValues<V extends EnumValue = EnumValue> = readonly [V, ...V[]]

export type TEnumIO<T extends Readonly<EnumValues | utils.EnumLike>> = T extends EnumValues
  ? T[number]
  : T extends utils.EnumLike
  ? T[keyof T]
  : never

export type TEnumValuesArray<T extends Readonly<EnumValues | utils.EnumLike>> = (
  T extends unknown ? utils.UnionToTuple<TEnumIO<T>> : never
) extends infer X extends EnumValues
  ? X
  : never

export type TEnumObject<T extends Readonly<EnumValues | utils.EnumLike>> = (
  T extends utils.EnumLike
    ? utils.OmitIndexSignature<{ readonly [K in keyof T]: T[K] }>
    : { readonly [K in T[number]]: K }
) extends infer X
  ? utils.Simplify<X>
  : never

const _getValidEnumEntries = <T extends utils.EnumLike>(object: T) =>
  utils
    .keys(object)
    .filter((key) => typeof object[object[key]] !== 'number')
    .map((key) => [key, object[key]] as const)

export interface TEnum<T extends Readonly<EnumValues | utils.EnumLike>>
  extends TType<TEnumIO<T>, TDef<TTypeName.Enum, string>, TEnumIO<T>> {
  readonly values: TEnumValuesArray<T>
  readonly enum: TEnumObject<T>
}

export const tenum = <V extends EnumValue, T extends EnumValues<V> | utils.EnumLike>(
  values: T,
  options?: CreateOptions<{
    additionalIssueKind: IssueKind.InvalidEnumValue
  }>
): TEnum<Readonly<T>> => {
  const _values = (utils.isArray(values)
    ? values
    : utils.values(
        utils.fromEntries(_getValidEnumEntries(values as Extract<T, utils.EnumLike>))
      )) as unknown as TEnumValuesArray<T>

  const _enum = utils.fromEntries(
    utils.isArray(values)
      ? values.map((value) => [value, value])
      : _getValidEnumEntries(values as Extract<T, utils.EnumLike>)
  ) as TEnumObject<T>

  return ttype<TEnumIO<T>, TEnumIO<T>>((ctx) => {})
    .options(options)
    .typeName(TTypeName.Enum)
    .hint(_values.map(utils.literalize).join(' | '))
    .extend((t) => ({ ...t, values: _values, enum: _enum }))
}

export type AnyTEnum = TEnum<Readonly<EnumValues | utils.EnumLike>>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                     InstanceOf                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TInstanceOf<T extends utils.Constructor>
  extends TType<InstanceType<T>, TDef<TTypeName.InstanceOf, string>> {
  readonly class: T
}

export const tinstanceof = <T extends utils.Constructor>(
  cls: T,
  options?: CreateOptions<{
    additionalIssueKind: IssueKind.InvalidInstance
  }>
): TInstanceOf<T> =>
  ttype<InstanceType<T>>((ctx) =>
    utils.isInstanceOf(ctx.data, cls) ? ctx.OK(ctx.data) : ctx.INVALID_INSTANCE({ expected: cls.name }).ABORT()
  )
    .options(options)
    .typeName(TTypeName.InstanceOf)
    .hint(cls.name)
    .extend((t) => ({ ...t, class: cls }))

export type AnyTInstanceOf = TInstanceOf<utils.Constructor>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        Lazy                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TLazy<T extends AnyTType> extends TType<T['_O'], TDef<TTypeName.Lazy, `Lazy<${T['hint']}>`>, T['_I']> {
  readonly type: T
}

export const tlazy = <T extends AnyTType>(factory: () => T, options?: CreateOptions): TLazy<T> =>
  ttype<T['_O'], T['_I']>((ctx) => {
    const resolvedType = factory()
    return resolvedType._parse(ctx.clone({ type: resolvedType }))
  })
    .options(options)
    .typeName(TTypeName.Lazy)
    .hint(`Lazy<${factory()['hint']}>`)
    .extend((t) => ({
      ...t,
      get type() {
        return factory()
      },
    }))

export type AnyTLazy = TLazy<AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       Literal                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type LiteralValue = utils.Primitive

export type TLiteralCreateOptions = CreateOptions<{
  additionalIssueKind: IssueKind.InvalidLiteral
}>

export interface TLiteral<V extends LiteralValue> extends TType<V, TDef<TTypeName.Literal, utils.Literalize<V>>> {
  readonly value: V
}

export const tliteral = <V extends LiteralValue>(value: V, options?: TLiteralCreateOptions): TLiteral<V> =>
  ttype<V>((ctx) => {
    if (!utils.isPrimitive(ctx.data)) {
      return ctx.INVALID_TYPE({ expected: getParsedType(value) }).ABORT()
    }
    if (ctx.data !== value) {
      return ctx.INVALID_LITERAL({ expected: value, received: ctx.data }).ABORT()
    }
    return ctx.OK(value)
  })
    .options(options)
    .typeName(TTypeName.Literal)
    .hint(utils.literalize(value))
    .extend((t) => ({ ...t, value }))

export type AnyTLiteral = TLiteral<LiteralValue>

/* --------------------------------------------------- True/False --------------------------------------------------- */

export interface TTrue extends TType<true, TDef<TTypeName.True, 'true'>> {}
export interface TFalse extends TType<false, TDef<TTypeName.False, 'false'>> {}

const _ttrue = (options?: TLiteralCreateOptions) => tliteral(true, options)
const _tfalse = (options?: TLiteralCreateOptions) => tliteral(false, options)

export const ttrue = (options?: TLiteralCreateOptions) =>
  ttype<true>((ctx) => _ttrue(options)._parse(ctx))
    .options(options)
    .typeName(TTypeName.True)
    .hint('true')
    .build()

export const tfalse = (options?: TLiteralCreateOptions) =>
  ttype<false>((ctx) => _tfalse(options)._parse(ctx))
    .options(options)
    .typeName(TTypeName.False)
    .hint('false')
    .build()

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                         Map                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TMap<K extends AnyTType, V extends AnyTType>
  extends TType<Map<K['_O'], V['_O']>, TDef<TTypeName.Map, `Map<${K['hint']}, ${V['hint']}>`>, Map<K['_I'], V['_I']>> {
  readonly keys: K
  readonly values: V
  readonly pair: readonly [keys: K, values: V]
}

export const tmap = <K extends AnyTType, V extends AnyTType>(keys: K, values: V, options?: CreateOptions): TMap<K, V> =>
  ttype<Map<K['_O'], V['_O']>, Map<K['_I'], V['_I']>>((ctx) => {
    if (!(ctx.data instanceof Map)) {
      return ctx.INVALID_TYPE({ expected: TParsedType.Map }).ABORT()
    }

    const result = new Map<K['_O'], V['_O']>()
    const dataEntries = [...ctx.data.entries()].map(([key, value], index) => [key, value, index] as const)

    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        for (const [key, value, index] of dataEntries) {
          const [keyResult, valueResult] = await Promise.all([
            keys._parseAsync(ctx.child({ type: keys, data: key, path: [index, 'key'] })),
            values._parseAsync(ctx.child({ type: values, data: value, path: [index, 'value'] })),
          ])
          if (!keyResult.ok || !valueResult.ok) {
            if (ctx.common.abortEarly) {
              return ctx.ABORT()
            }
          } else {
            result.set(keyResult.data, valueResult.data)
          }
        }
        return ctx.isInvalid() ? ctx.ABORT() : ctx.OK(result)
      })
    } else {
      for (const [key, value, index] of dataEntries) {
        const keyResult = keys._parseSync(ctx.child({ type: keys, data: key, path: [index, 'key'] }))
        const valueResult = values._parseSync(ctx.child({ type: values, data: value, path: [index, 'value'] }))
        if (!keyResult.ok || !valueResult.ok) {
          if (ctx.common.abortEarly) {
            return ctx.ABORT()
          }
        } else {
          result.set(keyResult.data, valueResult.data)
        }
      }
      return ctx.isInvalid() ? ctx.ABORT() : ctx.OK(result)
    }
  })
    .options(options)
    .typeName(TTypeName.Map)
    .hint(`Map<${keys.hint}, ${values.hint}>`)
    .extend((t) => ({ ...t, keys, values, pair: [keys, values] }))

export type AnyTMap = TMap<AnyTType, AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                         NaN                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNaN extends TType<number, TDef<TTypeName.NaN, 'NaN'>> {}

export const tnan = (options?: CreateOptions): TNaN =>
  ttype<number>((ctx) =>
    typeof ctx.data === 'number' && Number.isNaN(ctx.data)
      ? ctx.OK(ctx.data)
      : ctx.INVALID_TYPE({ expected: TParsedType.NaN }).ABORT()
  )
    .options(options)
    .typeName(TTypeName.NaN)
    .hint('NaN')
    .build()

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        Never                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNever extends TType<never, TDef<TTypeName.Never, 'never'>> {}

export const tnever = (
  options?: CreateOptions<{
    additionalIssueKind: IssueKind.Forbidden
  }>
): TNever =>
  ttype<never>((ctx) => ctx.FORBIDDEN().ABORT())
    .options(options)
    .typeName(TTypeName.Never)
    .hint('never')
    .build()

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        Null                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNull extends TType<null, TDef<TTypeName.Null, 'null'>> {}

export const tnull = (options?: CreateOptions): TNull =>
  ttype<null>((ctx) =>
    ctx.data === null ? ctx.OK(ctx.data) : ctx.INVALID_TYPE({ expected: TParsedType.Null }).ABORT()
  )
    .options(options)
    .typeName(TTypeName.Null)
    .hint('null')
    .build()

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      Nullable                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type UnwrapTNullableDeep<T extends AnyTType> = T extends TNullable<infer U> ? UnwrapTNullableDeep<U> : T

export interface TNullable<T extends AnyTType>
  extends TType<T['_O'] | null, TDef<TTypeName.Nullable, `${T['hint']} | null`>, T['_I'] | null> {
  readonly underlying: T
  unwrap(): T
  unwrapDeep(): UnwrapTNullableDeep<T>
}

export const tnullable = <T extends AnyTType>(underlying: T, options?: CreateOptions): TNullable<T> =>
  ttype<T['_O'] | null, T['_I'] | null>((ctx) =>
    ctx.data === null ? ctx.OK(ctx.data) : underlying._parse(ctx.clone({ type: underlying }))
  )
    .options(options)
    .typeName(TTypeName.Nullable)
    .hint(`${underlying.hint} | null`)
    .extend((t) => ({
      ...t,
      underlying,
      unwrap: () => underlying,
      unwrapDeep: () =>
        (underlying.is(TTypeName.Nullable) ? underlying.unwrapDeep() : underlying) as UnwrapTNullableDeep<T>,
    }))

export type AnyTNullable = TNullable<AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       Number                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TNumber extends TType<number, TDef<TTypeName.Number, 'number'>> {}

export const tnumber = (options?: CreateOptions): TNumber =>
  ttype<number>((ctx) => {
    if (typeof ctx.data !== 'number' || Number.isNaN(ctx.data)) {
      return ctx.INVALID_TYPE({ expected: TParsedType.Number }).ABORT()
    }
    return ctx.OK(ctx.data)
  })
    .options(options)
    .typeName(TTypeName.Number)
    .hint('number')
    .build()

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       Object                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type TObjectShape = { [x: string]: AnyTType }
export type TObjectUnknownKeys = 'passthrough' | 'strict' | 'strip'
export type TObjectCatchall = AnyTType

export type TObjectIO<
  S extends TObjectShape,
  U extends TObjectUnknownKeys | null,
  C extends TObjectCatchall | null,
  IO extends '_I' | '_O'
> = utils.Simplify<
  utils.EnforceOptional<{ [K in keyof S]: S[K][IO] }> &
    (C extends TObjectCatchall
      ? { [x: string]: C[IO] }
      : U extends 'passthrough'
      ? { [x: string]: unknown }
      : U extends 'strict'
      ? { [x: string]: never }
      : unknown)
>

export type TObjectPartialShape<S extends TObjectShape, K extends keyof S = keyof S> = utils.Merge<
  S,
  { [k in K]: S[k] extends AnyTOptional ? S[k] : TOptional<S[k]> }
>

const _toPartialShape = <S extends TObjectShape, K extends keyof S = keyof S>(shape: S, keys?: readonly [K, ...K[]]) =>
  utils.fromEntries(
    utils
      .entries(shape)
      .map(([key, type]) => [
        key,
        !keys || (utils.includes(keys, key) && !type.is(TTypeName.Optional)) ? toptional(type) : type,
      ])
  ) as TObjectPartialShape<S, K>

export type TObjectRequiredShape<S extends TObjectShape, K extends keyof S = keyof S> = utils.Merge<
  S,
  { [k in K]: UnwrapTOptionalDeep<S[k]> }
>

const _toRequiredShape = <S extends TObjectShape, K extends keyof S = keyof S>(shape: S, keys?: readonly [K, ...K[]]) =>
  utils.fromEntries(
    utils
      .entries(shape)
      .map(([key, type]) => [
        key,
        (!keys || utils.includes(keys, key)) && type.is(TTypeName.Optional) ? type.unwrap() : type,
      ])
  ) as TObjectRequiredShape<S, K>

export interface TObjectDef<
  S extends TObjectShape,
  U extends TObjectUnknownKeys | null,
  C extends TObjectCatchall | null
> {
  readonly shape: S
  readonly unknownKeys: U
  readonly catchall: C
}

export interface TObject<S extends TObjectShape, U extends TObjectUnknownKeys | null, C extends TObjectCatchall | null>
  extends TType<TObjectIO<S, U, C, '_O'>, TDef<TTypeName.Object, 'object'>, TObjectIO<S, U, C, '_I'>> {
  readonly _def: TObjectDef<S, U, C>
  readonly shape: S
  passthrough(): TObject<S, 'passthrough', null>
  strict(): TObject<S, 'strict', null>
  strip(): TObject<S, 'strip', null>
  catchall<C_ extends TObjectCatchall>(catchall: C_): TObject<S, null, C_>
  augment<A extends TObjectShape>(augmentation: A): TObject<utils.Merge<S, A>, U, C>
  extend<E extends TObjectShape>(extension: E): TObject<utils.Merge<S, E>, U, C>
  setKey<K extends string, T extends AnyTType>(key: K, type: T): TObject<utils.Merge<S, { [k in K]: T }>, U, C>
  merge<S_ extends TObjectShape, U_ extends TObjectUnknownKeys | null, C_ extends TObjectCatchall | null>(
    incoming: TObject<S_, U_, C_>
  ): TObject<utils.Merge<S, S_>, U_, C_>
  pick<K extends keyof S>(keys: readonly [K, ...K[]]): TObject<Pick<S, K>, U, C>
  omit<K extends keyof S>(keys: readonly [K, ...K[]]): TObject<Omit<S, K>, U, C>
  partial<K extends keyof S = keyof S>(keys?: readonly [K, ...K[]]): TObject<TObjectPartialShape<S, K>, U, C>
  required<K extends keyof S = keyof S>(keys?: readonly [K, ...K[]]): TObject<TObjectRequiredShape<S, K>, U, C>
}

const _tobject = <S extends TObjectShape, U extends TObjectUnknownKeys | null, C extends TObjectCatchall | null>(
  def: TObjectDef<S, U, C>,
  options: CreateOptions | undefined
): TObject<S, U, C> =>
  ttype<TObjectIO<S, U, C, '_O'>, TObjectIO<S, U, C, '_I'>>((ctx) => ctx.ABORT())
    .options(options)
    .typeName(TTypeName.Object)
    .hint('object')
    .extend((t) => {
      const _def = utils.cloneDeep(def)

      const tobject: TObject<S, U, C> = {
        ...t,
        _def,
        get shape() {
          return utils.cloneDeep(_def.shape)
        },
        passthrough: () => _tobject({ ..._def, unknownKeys: 'passthrough', catchall: null }, options),
        strict: () => _tobject({ ..._def, unknownKeys: 'strict', catchall: null }, options),
        strip: () => _tobject({ ..._def, unknownKeys: 'strip', catchall: null }, options),
        catchall: (catchall) => _tobject({ ..._def, catchall, unknownKeys: null }, options),
        augment: (augmentation) => _tobject({ ..._def, shape: utils.merge(tobject.shape, augmentation) }, options),
        extend: (extension) => tobject.augment(extension),
        setKey: (key, type) => tobject.augment({ [key]: type } as { [k in typeof key]: typeof type }),
        merge: (incoming) => _tobject({ ...incoming._def, shape: tobject.augment(incoming.shape).shape }, options),
        pick: (keys) => _tobject({ ..._def, shape: utils.pick(tobject.shape, keys) }, options),
        omit: (keys) => _tobject({ ..._def, shape: utils.omit(tobject.shape, keys) }, options),
        partial: (keys) => _tobject({ ..._def, shape: _toPartialShape(tobject.shape, keys) }, options),
        required: (keys) => _tobject({ ..._def, shape: _toRequiredShape(tobject.shape, keys) }, options),
      }

      return tobject
    })

export const tobject = <S extends TObjectShape>(shape: S, options?: CreateOptions) =>
  _tobject({ shape, unknownKeys: 'strip', catchall: null }, options)

export const tstrictObject = <S extends TObjectShape>(shape: S, options?: CreateOptions) =>
  _tobject({ shape, unknownKeys: 'strict', catchall: null }, options)

export type AnyTObject = TObject<TObjectShape, TObjectUnknownKeys | null, TObjectCatchall | null>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      Optional                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export type UnwrapTOptionalDeep<T> = T extends TOptional<infer U> ? UnwrapTOptionalDeep<U> : T

export interface TOptional<T extends AnyTType>
  extends TType<T['_O'] | undefined, TDef<TTypeName.Optional, `${T['hint']} | undefined`>, T['_I'] | undefined> {
  readonly underlying: T
  unwrap(): T
  unwrapDeep(): UnwrapTOptionalDeep<T>
}

export const toptional = <T extends AnyTType>(underlying: T, options?: CreateOptions): TOptional<T> =>
  ttype<T['_O'] | undefined, T['_I'] | undefined>((ctx) =>
    ctx.data === undefined ? ctx.OK(ctx.data) : underlying._parse(ctx.clone({ type: underlying }))
  )
    .options(options)
    .typeName(TTypeName.Optional)
    .hint(`${underlying.hint} | undefined`)
    .extend((t) => ({
      ...t,
      underlying,
      unwrap: () => underlying,
      unwrapDeep: () =>
        (underlying.is(TTypeName.Optional) ? underlying.unwrapDeep() : underlying) as UnwrapTOptionalDeep<T>,
    }))

export type AnyTOptional = TOptional<AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      TPromise                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TPromise<T extends AnyTType>
  extends TType<Promise<T['_O']>, TDef<TTypeName.Promise, `Promise<${T['hint']}>`>, Promise<T['_I']>> {
  readonly underlying: T
  readonly awaited: T
  unwrap(): T
}

export const tpromise = <T extends AnyTType>(underlying: T, options?: CreateOptions): TPromise<T> =>
  ttype<Promise<T['_O']>, Promise<T['_I']>>((ctx) => {
    if (!utils.isAsync(ctx.data) && !ctx.common.async) {
      return ctx.INVALID_TYPE({ expected: TParsedType.Promise }).ABORT()
    }
    const promisified = utils.isAsync(ctx.data) ? ctx.data : Promise.resolve(ctx.data)
    return ctx.OK(promisified.then((data) => underlying._parseAsync(ctx.child({ type: underlying, data }))))
  })
    .options(options)
    .typeName(TTypeName.Promise)
    .hint(`Promise<${underlying.hint}>`)
    .extend((t) => ({ ...t, underlying, awaited: underlying, unwrap: () => underlying }))

export type AnyTPromise = TPromise<AnyTType>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       String                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export enum TStringCheckKind {
  Min = 'min',
  Max = 'max',
  Length = 'length',
  Pattern = 'pattern',
  Email = 'email',
  Url = 'url',
  Uuid = 'uuid',
  Hex = 'hex',
  Base64 = 'base64',
  Alpha = 'alpha',
  Alphanumeric = 'alphanumeric',
  Numeric = 'numeric',
}

export type TStringCheck = MakeChecks<{
  [TStringCheckKind.Min]: checks.Min
  [TStringCheckKind.Max]: checks.Max
  [TStringCheckKind.Length]: checks.Length
  [TStringCheckKind.Pattern]: { readonly pattern: RegExp; readonly name: string }
  [TStringCheckKind.Email]: null
}>

export interface TString extends TType<string, TDef<TTypeName.String, 'string'>> {}

export const tstring = (options?: CreateOptions): TString =>
  ttype<string>((ctx) => {
    if (typeof ctx.data !== 'string') {
      return ctx.INVALID_TYPE({ expected: TParsedType.String }).ABORT()
    }
    return ctx.OK(ctx.data)
  })
    .options(options)
    .typeName(TTypeName.String)
    .hint('string')
    .build()

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       Symbol                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TSymbol extends TType<symbol, TDef<TTypeName.Symbol, 'symbol'>> {}

export const tsymbol = (options?: CreateOptions): TSymbol =>
  ttype<symbol>((ctx) =>
    typeof ctx.data === 'symbol' ? ctx.OK(ctx.data) : ctx.INVALID_TYPE({ expected: TParsedType.Symbol }).ABORT()
  )
    .options(options)
    .typeName(TTypeName.Symbol)
    .hint('symbol')
    .build()

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                      Undefined                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TUndefined extends TType<undefined, TDef<TTypeName.Undefined, 'undefined'>> {}

export const tundefined = (options?: CreateOptions): TUndefined =>
  ttype<undefined>((ctx) =>
    ctx.data === undefined ? ctx.OK(ctx.data) : ctx.INVALID_TYPE({ expected: TParsedType.Undefined }).ABORT()
  )
    .options(options)
    .typeName(TTypeName.Undefined)
    .hint('undefined')
    .build()

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        Union                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export type UnionAlternatives = [AnyTType, AnyTType, ...AnyTType[]]

export type UnionHint<T extends [AnyTType, ...AnyTType[]]> = T extends [infer H extends AnyTType, ...infer R]
  ? `${H['hint']}${R extends [AnyTType, ...AnyTType[]] ? ` | ${UnionHint<R>}` : ''}`
  : never

export interface TUnion<T extends UnionAlternatives>
  extends TType<T[number]['_O'], TDef<TTypeName.Union, UnionHint<T>>, T[number]['_I']> {
  readonly alternatives: T
}

export const tunion = <T extends UnionAlternatives>(
  alternatives: T,
  options?: CreateOptions<{
    additionalIssueKind: IssueKind.InvalidUnion
  }>
): TUnion<T> =>
  ttype<T[number]['_O'], T[number]['_I']>((ctx) => {
    const unionErrors: TError<T[number]['_O'], T[number]['_I']>[] = []
    if (ctx.common.async) {
      return Promise.all(alternatives.map((alt) => alt._parseAsync(ctx.clone({ type: alt })))).then((results) => {
        for (const result of results) {
          if (result.ok) {
            return result
          } else {
            unionErrors.push(result.error)
          }
        }
        return ctx.INVALID_UNION({ unionErrors }).ABORT()
      })
    } else {
      for (const alt of alternatives) {
        const result = alt._parseSync(ctx.clone({ type: alt }))
        if (result.ok) {
          return result
        } else {
          unionErrors.push(result.error)
        }
      }
      return ctx.INVALID_UNION({ unionErrors }).ABORT()
    }
  })
    .options(options)
    .typeName(TTypeName.Union)
    .hint(alternatives.map((alt) => alt.hint).join(' | ') as UnionHint<T>)
    .extend((t) => ({ ...t, alternatives }))

export type AnyTUnion = TUnion<UnionAlternatives>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       Unknown                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TUnknown extends TType<unknown, TDef<TTypeName.Unknown, 'unknown'>> {}

export const tunknown = (options?: CreateOptions): TUnknown =>
  ttype<unknown>((ctx) => ctx.OK(ctx.data))
    .options(options)
    .typeName(TTypeName.Unknown)
    .hint('unknown')
    .build()

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        Void                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TVoid extends TType<void, TDef<TTypeName.Void, 'void'>> {}

export const tvoid = (options?: CreateOptions): TVoid =>
  ttype<void>((ctx) =>
    ctx.data === undefined ? ctx.OK(ctx.data) : ctx.INVALID_TYPE({ expected: TParsedType.Void }).ABORT()
  )
    .options(options)
    .typeName(TTypeName.Void)
    .hint('void')
    .build()

/* ------------------------------------------------------------------------------------------------------------------ */

export {
  tany as any,
  tarray as array,
  tbigint as bigint,
  tboolean as boolean,
  tcatch as catch,
  tdate as date,
  tdefault as default,
  tenum as enum,
  tinstanceof as instanceof,
  tfalse as false,
  tlazy as lazy,
  tliteral as literal,
  tmap as map,
  tnan as nan,
  tnever as never,
  tnull as null,
  tnullable as nullable,
  tnumber as number,
  tobject as object,
  tstrictObject as strictObject,
  toptional as optional,
  tpromise as promise,
  tstring as string,
  tsymbol as symbol,
  ttrue as true,
  tundefined as undefined,
  tunion as union,
  tunknown as unknown,
  tvoid as void,
}

export type output<T extends AnyTType> = utils.FixEmptyObject<T['_O']>
export type input<T extends AnyTType> = utils.FixEmptyObject<T['_I']>
export type infer<T extends AnyTType> = output<T>
