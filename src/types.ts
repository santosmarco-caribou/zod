import type { ReadonlyDeep } from 'type-fest'
import { checks } from './checks'
import { ZGlobal } from './global'
import { IssueKind, type GetIssuePayload } from './issues'
import {
  createParseContext,
  ParsedType,
  ParseStatus,
  type ParseContext,
  type ParseContextOf,
  type ParsePath,
  type ParseResult,
  type ParseResultOf,
  type SyncParseResult,
} from './parse'
import { ZTypeName } from './type-names'
import { utils } from './utils'
import {
  Z,
  type AnyZ,
  type AnyZDef,
  type InputOf,
  type OutputOf,
  type ZDef,
} from './z'

export const Immutability = {
  Off: 'off',
  Flat: 'flat',
  Deep: 'deep',
} as const

export type Immutability = typeof Immutability[keyof typeof Immutability]

/* -------------------------------------------------------------------------- */
/*                                   ZString                                  */
/* -------------------------------------------------------------------------- */

export const ZStringCheckKind = {
  Min: 'min',
  Max: 'max',
  Length: 'length',
  Pattern: 'pattern',
  Alphanum: 'alphanum',
  Cuid: 'cuid',
  DataUri: 'data_uri',
  Email: 'email',
  Hex: 'hex',
  Uuid: 'uuid',
  Url: 'url',
  StartsWith: 'starts_with',
  EndsWith: 'ends_with',
} as const

export type ZStringCheckKind =
  typeof ZStringCheckKind[keyof typeof ZStringCheckKind]

export type ZStringCheck =
  | checks.Min
  | checks.Max
  | checks.Length
  | checks.Make<'pattern', { readonly pattern: RegExp; readonly name?: string }>
  | checks.Make<'alphanum', null>
  | checks.Make<'cuid', null>
  | checks.Make<'data_uri', null>
  | checks.Make<'email', null>
  | checks.Make<'hex', null>
  | checks.Make<'uuid', null>
  | checks.Make<'url', null>
  | checks.Make<'starts_with', { readonly prefix: string }>
  | checks.Make<'ends_with', { readonly suffix: string }>

export interface ZStringDef extends ZDef<'ZString'> {
  readonly checks: readonly ZStringCheck[]
}

export class ZString extends Z<string, ZStringDef> {
  readonly hint = 'string'

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (typeof ctx.data !== 'string') {
      return ctx
        .INVALID_TYPE(
          { expected: ParsedType.String },
          { required: undefined, invalid_type: undefined }
        )
        .ABORT()
    }

    const { length } = ctx.data

    for (const check of this._def.checks) {
      switch (check.kind) {
        case ZStringCheckKind.Min: {
          if (
            (check.inclusive && length < check.value) ||
            (!check.inclusive && length <= check.value)
          ) {
            ctx.TOO_SMALL(
              'string',
              {
                expected: { value: check.value, inclusive: check.inclusive },
                received: length,
              },
              check.message
            )
          }
        }
        case ZStringCheckKind.Alphanum:
        case ZStringCheckKind.Cuid:
        case ZStringCheckKind.DataUri:
        case ZStringCheckKind.Email:
        case ZStringCheckKind.Hex:
        case ZStringCheckKind.Uuid: {
          if (
            !utils.CONSTANTS.regex[utils.toCamelCase(check.kind)].test(ctx.data)
          ) {
            ctx.DIRTY(
              IssueKind.InvalidString,
              { check: check.kind },
              check.message
            )
            if (ctx.common.abortEarly) {
              return ctx.ABORT()
            }
          }
        }
      }
    }

    return ctx.isInvalid() ? ctx.ABORT() : ctx.OK(ctx.data)
  }

  min<V extends number>(
    value: V,
    options?: checks.OptionsOf<ZStringCheck, 'min'>,
    ..._: utils.ValidateNonNegativeInteger<V>
  ): this {
    return this._addCheck(
      ZStringCheckKind.Min,
      { value, inclusive: options?.inclusive ?? true },
      options?.message
    )
  }

  max<V extends number>(
    value: V,
    options?: checks.OptionsOf<ZStringCheck, 'max'>,
    ..._: utils.ValidateNonNegativeInteger<V>
  ): this {
    return this._addCheck(
      ZStringCheckKind.Max,
      { value, inclusive: options?.inclusive ?? true },
      options?.message
    )
  }

  length<V extends number>(
    value: V,
    options?: checks.OptionsOf<ZStringCheck, 'length'>,
    ..._: utils.ValidateNonNegativeInteger<V>
  ): this {
    return this._addCheck(ZStringCheckKind.Length, { value }, options?.message)
  }

  pattern(
    pattern: RegExp,
    options?: checks.OptionsOf<ZStringCheck, 'pattern'>
  ): this {
    return this._addCheck(
      ZStringCheckKind.Pattern,
      { pattern },
      options?.message
    )
  }

  alphanum(options?: checks.OptionsOf<ZStringCheck, 'alphanum'>): this {
    return this._addCheck(ZStringCheckKind.Alphanum, options?.message)
  }

  cuid(options?: checks.OptionsOf<ZStringCheck, 'cuid'>): this {
    return this._addCheck(ZStringCheckKind.Cuid, options?.message)
  }

  dataUri(options?: checks.OptionsOf<ZStringCheck, 'data_uri'>): this {
    return this._addCheck(ZStringCheckKind.DataUri, options?.message)
  }

  email(options?: checks.OptionsOf<ZStringCheck, 'email'>): this {
    return this._addCheck(ZStringCheckKind.Email, options?.message)
  }

  hex(options?: checks.OptionsOf<ZStringCheck, 'hex'>): this {
    return this._addCheck(ZStringCheckKind.Hex, options?.message)
  }

  uuid(options?: checks.OptionsOf<ZStringCheck, 'uuid'>): this {
    return this._addCheck(ZStringCheckKind.Uuid, options?.message)
  }

  url(options?: checks.OptionsOf<ZStringCheck, 'url'>): this {
    return this._addCheck(ZStringCheckKind.Url, options?.message)
  }

  startsWith(
    prefix: string,
    options?: checks.OptionsOf<ZStringCheck, 'starts_with'>
  ): this {
    return this._addCheck(
      ZStringCheckKind.StartsWith,
      { prefix },
      options?.message
    )
  }

  endsWith(
    suffix: string,
    options?: checks.OptionsOf<ZStringCheck, 'ends_with'>
  ): this {
    return this._addCheck(
      ZStringCheckKind.EndsWith,
      { suffix },
      options?.message
    )
  }

  static create(): ZString {
    return new ZString({ typeName: ZTypeName.String, checks: [] })
  }
}

/* -------------------------------------------------------------------------- */
/*                                   ZNumber                                  */
/* -------------------------------------------------------------------------- */

export interface ZNumberDef extends ZDef<'ZNumber'> {}

export class ZNumber extends Z<number, ZNumberDef> {
  readonly hint = 'number'

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (typeof ctx.data !== 'number' || Number.isNaN(ctx.data)) {
      return ctx.INVALID_TYPE({ expected: ParsedType.Number })
    }
    return ctx.OK(ctx.data)
  }

  static create(): ZNumber {
    return new ZNumber({ typeName: ZTypeName.Number })
  }
}

/* -------------------------------------------------------------------------- */
/*                                    ZNaN                                    */
/* -------------------------------------------------------------------------- */

export interface ZNaNDef extends ZDef<'ZNaN'> {}

export class ZNaN extends Z<number, ZNaNDef> {
  readonly hint = 'NaN'

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return typeof ctx.data === 'number' && Number.isNaN(ctx.data)
      ? ctx.OK(ctx.data)
      : ctx.INVALID_TYPE({ expected: ParsedType.NaN })
  }

  static create(): ZNaN {
    return new ZNaN({ typeName: ZTypeName.NaN })
  }
}

/* -------------------------------------------------------------------------- */
/*                                   ZBigInt                                  */
/* -------------------------------------------------------------------------- */

export interface ZBigIntDef extends ZDef<'ZBigInt'> {}

export class ZBigInt extends Z<bigint, ZBigIntDef> {
  readonly hint = 'bigint'

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return typeof ctx.data === 'bigint'
      ? ctx.OK(ctx.data)
      : ctx.INVALID_TYPE({ expected: ParsedType.BigInt }).ABORT()
  }

  static create(): ZBigInt {
    return new ZBigInt({ typeName: ZTypeName.BigInt })
  }
}

/* -------------------------------------------------------------------------- */
/*                                  ZBoolean                                  */
/* -------------------------------------------------------------------------- */

export interface ZBooleanDef extends ZDef<'ZBoolean'> {}

export class ZBoolean extends Z<boolean, ZBooleanDef> {
  readonly hint = 'boolean'

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return typeof ctx.data === 'boolean'
      ? ctx.OK(ctx.data)
      : ctx.INVALID_TYPE({ expected: ParsedType.Boolean }).ABORT()
  }

  static create(): ZBoolean {
    return new ZBoolean({ typeName: ZTypeName.Boolean })
  }
}

/* -------------------------------------------------------------------------- */
/*                                    ZDate                                   */
/* -------------------------------------------------------------------------- */

export interface ZDateDef extends ZDef<'ZDate'> {}

export class ZDate extends Z<Date, ZDateDef> {
  readonly hint = 'Date'

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!(ctx.data instanceof Date)) {
      return ctx.INVALID_TYPE({ expected: ParsedType.Date }).ABORT()
    }

    const c = createParseContext({
      common: { async: true },
      data: 2,
      parent: null,
      path: [],
      schema: this,
      status: ParseStatus.Valid,
    }).setStatus('invalid')

    c.

    return ctx.OK(ctx.data)
  }

  static create(): ZDate {
    return new ZDate({ typeName: ZTypeName.Date })
  }
}

/* -------------------------------------------------------------------------- */
/*                                   ZSymbol                                  */
/* -------------------------------------------------------------------------- */

export interface ZSymbolDef extends ZDef<'ZSymbol'> {}

export class ZSymbol extends Z<symbol, ZSymbolDef> {
  readonly hint = 'symbol'

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (typeof ctx.data !== 'symbol') {
      return ctx.INVALID_TYPE({ expected: ParsedType.Symbol }).ABORT()
    }
    return ctx.OK(ctx.data)
  }

  static create(): ZSymbol {
    return new ZSymbol({ typeName: ZTypeName.Symbol })
  }
}

/* -------------------------------------------------------------------------- */
/*                                    ZEnum                                   */
/* -------------------------------------------------------------------------- */

export type ZEnumValue = string | number
export type ZEnumValues = utils.AtLeastOne<ZEnumValue>

type UnionToEnumValues<T> = utils.UnionToTuple<T> extends ZEnumValues
  ? utils.UnionToTuple<T>
  : never

const getEnumTypes = (values: readonly ZEnumValue[]) => [
  ...new Set(
    values
      .map((value) => typeof value)
      .filter((type): type is 'string' | 'number' =>
        utils.includes(['string', 'number'], type)
      )
  ),
]

const isEnumValue = (
  types: readonly ('string' | 'number')[],
  data: unknown
): data is ZEnumValue => utils.includes(types, typeof data)

const enumPayloadForInvalidType = (
  types: readonly ('string' | 'number')[]
): Pick<GetIssuePayload<'invalid_type'>, 'expected'> => ({
  expected:
    types.length === 1
      ? { string: ParsedType.String, number: ParsedType.Number }[types[0]]
      : ([ParsedType.String, ParsedType.Number] as const),
})

export interface ZEnumDef<V extends ZEnumValues> extends ZDef<'ZEnum'> {
  readonly values: V
}

export class ZEnum<V extends ZEnumValues> extends Z<V[number], ZEnumDef<V>> {
  readonly hint = utils.unionize(this._def.values.map(utils.literalize))

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { values } = this._def

    const types = getEnumTypes(values)

    if (!isEnumValue(types, ctx.data)) {
      return ctx.INVALID_TYPE(enumPayloadForInvalidType(types)).ABORT()
    }

    if (!utils.includes(values, ctx.data)) {
      return ctx.INVALID_ENUM_VALUE(ctx.data, { values }).ABORT()
    }

    return ctx.OK(ctx.data)
  }

  get values(): V {
    return this._def.values
  }

  get enum(): { readonly [K in V[number]]: K } {
    return utils.fromEntries(
      this._def.values.map((value) => [value, value])
    ) as { readonly [K in V[number]]: K }
  }

  extract<T extends [V[number], ...V[number][]]>(values: T): ZEnum<T> {
    return new ZEnum({ ...this._def, values })
  }

  exclude<T extends [V[number], ...V[number][]]>(
    values: T
  ): ZEnum<UnionToEnumValues<Exclude<V[number], T[number]>>> {
    return new ZEnum({
      ...this._def,
      values: this._def.values.filter(
        (opt) => !utils.includes(values, opt)
      ) as UnionToEnumValues<Exclude<V[number], T[number]>>,
    })
  }

  readonly case = {
    toLower: () => this._transformCase(utils.toLowerCase),
    toUpper: () => this._transformCase(utils.toUpperCase),
    toCamel: () => this._transformCase(utils.toCamelCase),
    toKebab: () => this._transformCase(utils.toKebabCase),
    toSnake: () => this._transformCase(utils.toSnakeCase),
    toPascal: () => this._transformCase(utils.toPascalCase),
    toConstant: () => this._transformCase(utils.toConstantCase),
  } as const

  private _transformCase<T extends string>(
    transformer: (key: V[number] & string) => T
  ): ZEnum<UnionToEnumValues<T | (V[number] & number)>> {
    return new ZEnum({
      ...this._def,
      values: this._def.values.map((value) =>
        typeof value === 'number' ? value : transformer(value)
      ) as UnionToEnumValues<T | (V[number] & number)>,
    })
  }

  static create<T extends ZEnumValue, V extends utils.AtLeastOne<T>>(
    values: V
  ): ZEnum<Readonly<V>>
  static create<E extends utils.EnumLike>(nativeEnum: E): ZNativeEnum<E>
  static create(
    enum_: ZEnumValues | utils.EnumLike
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): ZEnum<any> | AnyZNativeEnum {
    if (utils.isArray(enum_)) {
      return new ZEnum({ typeName: ZTypeName.Enum, values: enum_ })
    }
    return ZNativeEnum.create(enum_)
  }
}

export type AnyZEnum = ZEnum<ZEnumValues>

/* -------------------------------------------------------------------------- */
/*                                 ZNativeEnum                                */
/* -------------------------------------------------------------------------- */

const getValidEnumValues = <E extends utils.EnumLike>(nativeEnum: E) =>
  utils.values(
    utils.fromEntries(
      utils
        .keys(nativeEnum)
        .filter((k) => typeof nativeEnum[nativeEnum[k]] !== 'number')
        .map((k) => [k, nativeEnum[k]])
    )
  )

export interface ZNativeEnumDef<E extends utils.EnumLike>
  extends ZDef<'ZNativeEnum'> {
  readonly enum: E
}

export class ZNativeEnum<E extends utils.EnumLike> extends Z<
  utils.ValueOf<E>,
  ZNativeEnumDef<E>
> {
  readonly hint = utils.unionize(utils.values(nativeEnum).map(utils.literalize))

  _parse(ctx: ParseContextOf<this>) {
    const { values } = this

    const types = getEnumTypes(values)

    if (!isEnumValue(types, ctx.data)) {
      return ctx.INVALID_TYPE(enumPayloadForInvalidType(types))
    }

    if (!utils.includes(values, ctx.data)) {
      return ctx.INVALID_ENUM_VALUE(ctx.data, { values })
    }

    return ctx.OK(ctx.data)
  }

  get values(): readonly [...utils.ValueOf<E>[]] {
    return getValidEnumValues(this._def.enum)
  }

  get enum(): utils.Simplify<utils.OmitIndexSignature<E>> {
    return this._def.enum
  }

  static create<E extends utils.EnumLike>(nativeEnum: E): ZNativeEnum<E> {
    return new ZNativeEnum({ typeName: ZTypeName.NativeEnum, enum: nativeEnum })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyZNativeEnum = ZNativeEnum<any>

/* -------------------------------------------------------------------------- */
/*                                  ZLiteral                                  */
/* -------------------------------------------------------------------------- */

export type ZLiteralValue = utils.Primitive

const payloadForInvalidLiteral = (
  literalValue: ZLiteralValue,
  data: ZLiteralValue
): GetIssuePayload<'invalid_literal'> => ({
  expected: { value: literalValue, formatted: utils.literalize(literalValue) },
  received: { value: data, formatted: utils.literalize(data) },
})

export interface ZLiteralDef<V extends ZLiteralValue> extends ZDef<'ZLiteral'> {
  readonly value: V
}

export class ZLiteral<V extends ZLiteralValue> extends Z<V, ZLiteralDef<V>> {
  readonly hint = utils.literalize(this._def.value)

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!utils.isPrimitive(ctx.data)) {
      return ctx.INVALID_TYPE({ expected: ParsedType.Primitive }).ABORT()
    }

    const { value } = this._def

    if (!utils.equals(ctx.data, value)) {
      return ctx.ABORT(
        'invalid_literal',
        payloadForInvalidLiteral(value, ctx.data).ABORT()
      )
    }

    return ctx.OK(ctx.data)
  }

  get value(): V {
    return this._def.value
  }

  static create<V extends ZLiteralValue>(value: V): ZLiteral<V> {
    return new ZLiteral({ typeName: ZTypeName.Literal, value })
  }
}

export type AnyZLiteral = ZLiteral<ZLiteralValue>

/* -------------------------------------------------------------------------- */
/*                                    ZAny                                    */
/* -------------------------------------------------------------------------- */

export interface ZAnyDef extends ZDef<'ZAny'> {}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ZAny extends Z<any, ZAnyDef> {
  readonly hint = 'any'

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.OK(ctx.data)
  }

  static create(): ZAny {
    return new ZAny({ typeName: ZTypeName.Any, manifest: { nullable: true } })
  }
}

/* -------------------------------------------------------------------------- */
/*                                  ZUnknown                                  */
/* -------------------------------------------------------------------------- */

export interface ZUnknownDef extends ZDef<'ZUnknown'> {}

export class ZUnknown extends Z<unknown, ZUnknownDef> {
  readonly hint = 'unknown'

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.OK(ctx.data)
  }

  static create(): ZUnknown {
    return new ZUnknown({
      typeName: ZTypeName.Unknown,
      manifest: { nullable: true },
    })
  }
}

/* -------------------------------------------------------------------------- */
/*                                   ZNever                                   */
/* -------------------------------------------------------------------------- */

export interface ZNeverDef extends ZDef<'ZNever', never> {}

export class ZNever extends Z<never, ZNeverDef> {
  readonly hint = 'never'

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.FORBIDDEN().ABORT()
  }

  static create(): ZNever {
    return new ZNever({ typeName: ZTypeName.Never })
  }
}

/* -------------------------------------------------------------------------- */
/*                                    ZVoid                                   */
/* -------------------------------------------------------------------------- */

export interface ZVoidDef extends ZDef<'ZVoid'> {}

export class ZVoid extends Z<void, ZVoidDef> {
  readonly hint = 'void'

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (ctx.data !== undefined) {
      return ctx.INVALID_TYPE({ expected: ParsedType.Void }).ABORT()
    }
    return ctx.OK(ctx.data)
  }

  static create(): ZVoid {
    return new ZVoid({ typeName: ZTypeName.Void })
  }
}

/* -------------------------------------------------------------------------- */
/*                                 ZUndefined                                 */
/* -------------------------------------------------------------------------- */

export interface ZUndefinedDef extends ZDef<'ZUndefined'> {}

export class ZUndefined extends Z<undefined, ZUndefinedDef> {
  readonly hint = 'undefined'

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (ctx.data !== undefined) {
      return ctx.INVALID_TYPE({ expected: ParsedType.Undefined }).ABORT()
    }
    return ctx.OK(ctx.data)
  }

  static create(): ZUndefined {
    return new ZUndefined({ typeName: ZTypeName.Undefined })
  }
}

/* -------------------------------------------------------------------------- */
/*                                    ZNull                                   */
/* -------------------------------------------------------------------------- */

export interface ZNullDef extends ZDef<'ZNull'> {}

export class ZNull extends Z<null, ZNullDef> {
  readonly hint = 'null'

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (ctx.data !== null) {
      return ctx.INVALID_TYPE({ expected: ParsedType.Null }).ABORT()
    }
    return ctx.OK(ctx.data)
  }

  static create(): ZNull {
    return new ZNull({ typeName: ZTypeName.Null })
  }
}

/* -------------------------------------------------------------------------- */
/*                                   ZArray                                   */
/* -------------------------------------------------------------------------- */

export interface ZArrayState {
  readonly readonly: Immutability
}

export type ZArrayIO<
  Element extends AnyZ,
  State extends ZArrayState,
  IO extends 'input' | 'output'
> = {
  input: {
    [Immutability.Off]: InputOf<Element>[]
    [Immutability.Flat]: readonly InputOf<Element>[]
    [Immutability.Deep]: readonly Readonly<InputOf<Element>>[]
  }[State['readonly']]
  output: {
    [Immutability.Off]: OutputOf<Element>[]
    [Immutability.Flat]: readonly OutputOf<Element>[]
    [Immutability.Deep]: readonly Readonly<OutputOf<Element>>[]
  }[State['readonly']]
}[IO]

export interface ZArrayDef<Element extends AnyZ, State extends ZArrayState>
  extends ZDef<'ZArray'> {
  readonly element: Element
  readonly state: State
}

export class ZArray<
  Element extends AnyZ,
  State extends ZArrayState = { readonly: 'off' }
> extends Z<
  ZArrayIO<Element, State, 'output'>,
  ZArrayDef<Element, State>,
  ZArrayIO<Element, State, 'input'>
> {
  get hint() {
    const readonlyTag = this.isReadonly() ? 'readonly ' : ''
    return `${readonlyTag}${this._def.element.hint}[]`
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!Array.isArray(ctx.data)) {
      return ctx.INVALID_TYPE({ expected: ParsedType.Array }).ABORT()
    }
    return ctx.OK(ctx.data)
  }

  get elementSchema(): Element {
    return this._def.element
  }

  readonly() {
    return this._setImmutability(Immutability.Flat)
  }

  readonlyDeep() {
    return this._setImmutability(Immutability.Deep)
  }

  mutable() {
    return this._setImmutability(Immutability.Off)
  }

  isReadonly() {
    return this._def.state.readonly !== Immutability.Off
  }

  private _setImmutability<T extends Immutability>(
    state: T
  ): ZArray<Element, utils.Merge<State, { readonly: T }>> {
    return new ZArray({
      ...this._def,
      state: utils.merge(this._def.state, { readonly: state }),
    })
  }

  static create<Element extends AnyZ>(element: Element): ZArray<Element> {
    return new ZArray({
      typeName: ZTypeName.Array,
      element,
      state: { readonly: Immutability.Off },
    })
  }
}

export type AnyZArray = ZArray<AnyZ, ZArrayState>

/* -------------------------------------------------------------------------- */
/*                                   ZTuple                                   */
/* -------------------------------------------------------------------------- */

export type ZTupleItems = utils.AtLeastOne<AnyZ> | readonly []
export type ZTupleRestParam = AnyZ

export type ZTupleIOBase<
  Items extends ZTupleItems,
  IO extends 'input' | 'output'
> = Items extends []
  ? []
  : Items extends readonly [infer Head extends AnyZ, ...infer Rest]
  ? readonly [
      {
        input: InputOf<Head>
        output: OutputOf<Head>
      }[IO],
      ...(Rest extends ZTupleItems ? ZTupleIOBase<Rest, IO> : [])
    ]
  : never

export type ZTupleIO<
  Items extends ZTupleItems,
  Rest extends ZTupleRestParam | utils.UNSET_MARKER,
  IO extends 'input' | 'output'
> = {
  input: Rest extends ZTupleRestParam
    ? readonly [...ZTupleIOBase<Items, IO>, ...InputOf<Rest>[]]
    : ZTupleIOBase<Items, IO>
  output: Rest extends ZTupleRestParam
    ? readonly [...ZTupleIOBase<Items, IO>, ...OutputOf<Rest>[]]
    : ZTupleIOBase<Items, IO>
}[IO]

export interface ZTupleDef<
  T extends ZTupleItems,
  R extends ZTupleRestParam | utils.UNSET_MARKER
> extends ZDef<'ZTuple'> {
  readonly items: T
  readonly rest: R
}

export class ZTuple<
  T extends ZTupleItems,
  R extends ZTupleRestParam | utils.UNSET_MARKER
> extends Z<
  ZTupleIO<T, R, 'output'>,
  ZTupleDef<T, R>,
  ZTupleIO<T, R, 'input'>
> {
  get hint() {
    const items = this.items.map((item) => item.hint)
    const rest = this.restSchema ? `, ...${this.restSchema.hint}[]` : ''
    return `[${items.join(', ')}${rest}]`
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!Array.isArray(ctx.data)) {
      return ctx.INVALID_TYPE({ expected: ParsedType.Array })
    }

    const { items, rest } = this._def

    const invalidLengthIssue = (
      kind: utils.StrictExtract<IssueKind, 'too_small' | 'too_big'>,
      data: readonly unknown[]
    ) =>
      ctx.ABORT(kind, {
        type: 'array',
        expected: { value: items.length, inclusive: true },
        received: data.length,
      })

    if (ctx.data.length < items.length) {
      return invalidLengthIssue(IssueKind.TooSmall, ctx.data)
    }

    if (utils.isUnset(rest) && ctx.data.length > items.length) {
      return invalidLengthIssue(IssueKind.TooBig, ctx.data)
    }

    const generateResults = <Async extends boolean = false>(
      data: readonly unknown[],
      async?: Async
    ) =>
      data
        .map((item, index) => {
          const itemSchema = items[index] ?? rest
          if (utils.isUnset(itemSchema)) {
            return
          }
          return itemSchema[async ? '_parseAsync' : '_parseSync'](
            ctx.child(itemSchema, { data: item, path: [index] })
          ) as ReturnType<
            T[number][Async extends true ? '_parseAsync' : '_parseSync']
          >
        })
        .filter(utils.isNonNullable)

    const resultArray = [] as unknown as [...OutputOf<this>]

    if (ctx.common.async) {
      return Promise.all(generateResults(ctx.data, true)).then((results) => {
        for (const result of results) {
          if (result.ok) {
            resultArray.push(result.data as OutputOf<this>[number])
          } else {
            if (ctx.common.abortEarly) {
              return ctx.ABORT()
            }
          }
        }
        if (ctx.isInvalid()) {
          return ctx.ABORT()
        }
        return ctx.OK(resultArray)
      })
    } else {
      for (const result of generateResults(ctx.data)) {
        if (result.ok) {
          resultArray.push(result.data as OutputOf<this>[number])
        } else {
          if (ctx.common.abortEarly) {
            return ctx.ABORT()
          }
        }
      }
      if (ctx.isInvalid()) {
        return ctx.ABORT()
      }
      return ctx.OK(resultArray)
    }
  }

  get items(): T {
    return this._def.items
  }

  get itemsSchema(): T {
    return this.items
  }

  get restSchema(): R extends utils.UNSET_MARKER
    ? null
    : Exclude<R, utils.UNSET_MARKER> {
    const { rest } = this._def
    return (utils.isUnset(rest) ? null : rest) as R extends utils.UNSET_MARKER
      ? null
      : Exclude<R, utils.UNSET_MARKER>
  }

  rest<R extends AnyZ>(rest: R): ZTuple<T, R> {
    return new ZTuple({ ...this._def, rest })
  }

  static create<
    Items extends ZTupleItems,
    Rest extends ZTupleRestParam | utils.UNSET_MARKER = utils.UNSET_MARKER
  >(
    items: Items,
    rest: Rest = utils.UNSET_MARKER as Rest
  ): ZTuple<Items, Rest> {
    return new ZTuple({ typeName: ZTypeName.Tuple, items, rest })
  }
}

export type AnyZTuple = ZTuple<
  ZTupleItems,
  ZTupleRestParam | utils.UNSET_MARKER
>

/* -------------------------------------------------------------------------- */
/*                                  ZOptional                                 */
/* -------------------------------------------------------------------------- */

export interface ZOptionalDef<T extends AnyZ> extends ZDef<'ZOptional'> {
  readonly underlying: T
}

export class ZOptional<T extends AnyZ> extends Z<
  OutputOf<T> | undefined,
  ZOptionalDef<T>,
  InputOf<T> | undefined
> {
  readonly hint = utils.unionize([this.underlying.hint, 'undefined'])

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (ctx.data === undefined) {
      return ctx.OK(ctx.data)
    }
    return this._def.underlying._parse(ctx)
  }

  get underlying() {
    return this._def.underlying
  }

  unwrap() {
    return this.underlying
  }

  unwrapDeep(): UnwrapZOptionalDeep<T> {
    const { underlying } = this
    return underlying instanceof ZOptional
      ? underlying.unwrapDeep()
      : underlying
  }

  static create<T extends AnyZ>(underlying: T): ZOptional<T> {
    return new ZOptional({
      typeName: ZTypeName.Optional,
      underlying,
      manifest: { required: false },
    })
  }
}

export type UnwrapZOptionalDeep<T extends AnyZ> = T extends ZOptional<infer T>
  ? UnwrapZOptionalDeep<T>
  : T

export type AnyZOptional = ZOptional<AnyZ>

/* -------------------------------------------------------------------------- */
/*                                  ZNullable                                 */
/* -------------------------------------------------------------------------- */

export interface ZNullableDef<T extends AnyZ> extends ZDef<'ZNullable'> {
  readonly underlying: T
}

export class ZNullable<T extends AnyZ> extends Z<
  OutputOf<T> | null,
  ZNullableDef<T>,
  InputOf<T> | null
> {
  readonly hint = utils.unionize([this.underlying.hint, 'null'])

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (ctx.data === null) {
      return ctx.OK(ctx.data)
    }
    return this._def.underlying._parse(ctx)
  }

  get underlying() {
    return this._def.underlying
  }

  unwrap() {
    return this.underlying
  }

  unwrapDeep(): UnwrapZNullableDeep<T> {
    const { underlying } = this
    return underlying instanceof ZNullable
      ? underlying.unwrapDeep()
      : underlying
  }

  static create<T extends AnyZ>(underlying: T): ZNullable<T> {
    return new ZNullable({
      typeName: ZTypeName.Nullable,
      underlying,
      manifest: { nullable: true },
    })
  }
}

export type UnwrapZNullableDeep<T extends AnyZ> = T extends ZNullable<infer T>
  ? UnwrapZNullableDeep<T>
  : T

export type AnyZNullable = ZNullable<AnyZ>

/* -------------------------------------------------------------------------- */
/*                                  ZPromise                                  */
/* -------------------------------------------------------------------------- */

export interface ZPromiseDef<T extends AnyZ> extends ZDef<'ZPromise'> {
  readonly underlying: T
}

export class ZPromise<T extends AnyZ> extends Z<
  Promise<OutputOf<T>>,
  ZPromiseDef<T>,
  Promise<InputOf<T>>
> {
  readonly hint = `Promise<${this.underlying.hint}>`

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!utils.isAsync(ctx.data) && !ctx.common.async) {
      return ctx.INVALID_TYPE({ expected: ParsedType.Promise })
    }
    const promisified = utils.isAsync(ctx.data)
      ? ctx.data
      : Promise.resolve(ctx.data)
    return ctx.OK(
      promisified.then((data) => this._def.underlying.parseAsync(data))
    )
  }

  get underlying() {
    return this._def.underlying
  }

  get awaited() {
    return this.underlying
  }

  unwrap() {
    return this.underlying
  }

  unwrapDeep(): UnwrapZPromiseDeep<T> {
    const { underlying } = this
    return underlying instanceof ZPromise ? underlying.unwrapDeep() : underlying
  }

  static create<T extends AnyZ>(underlying: T): ZPromise<T> {
    return new ZPromise({ typeName: ZTypeName.Promise, underlying })
  }
}

type _UnwrapZPromiseDeep<T extends AnyZ> = T extends ZPromise<infer T>
  ? _UnwrapZPromiseDeep<T>
  : T
export type UnwrapZPromiseDeep<T extends AnyZ> =
  _UnwrapZPromiseDeep<T> extends AnyZ ? T : never

export type AnyZPromise = ZPromise<AnyZ>

/* -------------------------------------------------------------------------- */
/*                                  ZDefault                                  */
/* -------------------------------------------------------------------------- */

export interface ZDefaultDef<T extends AnyZ> extends ZDef<'ZDefault'> {
  readonly underlying: T
  readonly getDefault: () => utils.Defined<InputOf<T>>
}

export class ZDefault<T extends AnyZ> extends Z<
  utils.Defined<OutputOf<T>>,
  ZDefaultDef<T>,
  InputOf<T> | undefined
> {
  readonly hint = `Defaulted<${this.underlying.hint}>`

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (ctx.data === undefined) {
      ctx.setData(this._def.getDefault())
    }
    return this._def.underlying._parse(ctx) as ParseResultOf<this>
  }

  get underlying() {
    return this._def.underlying
  }

  unwrap() {
    return this.underlying
  }

  unwrapDeep(): UnwrapZDefaultDeep<T> {
    const { underlying } = this
    return underlying instanceof ZDefault ? underlying.unwrapDeep() : underlying
  }

  removeDefault() {
    return this.underlying
  }

  static create<T extends AnyZ>(
    schema: T,
    getDefault: utils.Defined<InputOf<T>> | (() => utils.Defined<InputOf<T>>)
  ): ZDefault<T> {
    return new ZDefault({
      typeName: ZTypeName.Default,
      underlying: schema,
      getDefault: (typeof getDefault === 'function'
        ? getDefault
        : () => getDefault) as () => utils.Defined<InputOf<T>>,
    })
  }
}

type _UnwrapZDefaultDeep<T extends AnyZ> = T extends ZDefault<infer T>
  ? _UnwrapZDefaultDeep<T>
  : T
export type UnwrapZDefaultDeep<T extends AnyZ> =
  _UnwrapZDefaultDeep<T> extends AnyZ ? T : never

export type AnyZDefault = ZDefault<AnyZ>

/* -------------------------------------------------------------------------- */
/*                                    ZLazy                                   */
/* -------------------------------------------------------------------------- */

export interface ZLazyDef<T extends AnyZ> extends ZDef<'ZLazy'> {
  readonly factory: () => T
}

export class ZLazy<T extends AnyZ> extends Z<
  OutputOf<T>,
  ZLazyDef<T>,
  InputOf<T>
> {
  get hint() {
    return this._def.factory().hint
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return this._def.factory()._parse(ctx)
  }

  get underlying() {
    return this._def.factory()
  }

  unwrap() {
    return this._def.factory()
  }

  unwrapDeep(): UnwrapZLazyDeep<T> {
    return this.underlying instanceof ZLazy
      ? this.underlying.unwrapDeep()
      : this.underlying
  }

  static create<T extends AnyZ>(factory: () => T): ZLazy<T> {
    return new ZLazy({ typeName: ZTypeName.Lazy, factory })
  }
}

type _UnwrapZLazyDeep<T extends AnyZ> = T extends ZLazy<infer T>
  ? _UnwrapZLazyDeep<T>
  : T
export type UnwrapZLazyDeep<T extends AnyZ> = _UnwrapZLazyDeep<T> extends AnyZ
  ? T
  : never

export type AnyZLazy = ZLazy<AnyZ>

/* -------------------------------------------------------------------------- */
/*                                   ZUnion                                   */
/* -------------------------------------------------------------------------- */

export type ZUnionAlternatives = utils.AtLeastOne<AnyZ>

const handleUnionResults =
  <T extends AnyZUnion>(ctx: ParseContextOf<T>) =>
  (results: readonly SyncParseResult[]): ParseResultOf<T> => {
    const successfulResults = results.filter((result) => !!result.ok)
    return successfulResults.length > 0
      ? ctx.OK(successfulResults[0].data)
      : ctx.ABORT(IssueKind.InvalidUnion, {
          unionErrors: results
            .map((result) => result.error)
            .filter(utils.isNonNullable),
        })
  }

export interface ZUnionDef<T extends ZUnionAlternatives>
  extends ZDef<'ZUnion'> {
  readonly alternatives: T
}

export class ZUnion<T extends ZUnionAlternatives> extends Z<
  OutputOf<T[number]>,
  ZUnionDef<T>,
  InputOf<T[number]>
> {
  get hint() {
    return utils.unionize(this.alternatives.map((alt) => alt.hint))
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    const { alternatives } = this._def
    if (ctx.common.async) {
      return Promise.all(
        alternatives.map(async (alt) => {
          const result = await alt._parseAsync(ctx)
          return result
        })
      ).then(handleUnionResults(ctx))
    } else {
      const results = alternatives.map((alt) => {
        const result = alt._parseSync(ctx)
        return result
      })
      return handleUnionResults(ctx)(results)
    }
  }

  get alternatives(): T {
    return this._def.alternatives
  }

  static create<T extends ZUnionAlternatives>(alternatives: T): ZUnion<T> {
    return new ZUnion({ typeName: ZTypeName.Union, alternatives })
  }
}

export type AnyZUnion = ZUnion<ZUnionAlternatives>

/* -------------------------------------------------------------------------- */
/*                                ZIntersection                               */
/* -------------------------------------------------------------------------- */

export type ZIntersectionComponents = utils.AtLeastOne<AnyZ>

export type ZIntersectionIO<
  T extends ZIntersectionComponents,
  IO extends 'input' | 'output'
> = T extends [infer H extends AnyZ, ...infer R]
  ? {
      input: InputOf<H>
      output: OutputOf<H>
    }[IO] &
      (R extends ZIntersectionComponents ? ZIntersectionIO<R, IO> : unknown)
  : never

export interface ZIntersectionDef<Components extends ZIntersectionComponents>
  extends ZDef<'ZIntersection'> {
  readonly components: Components
}

export class ZIntersection<T extends ZIntersectionComponents> extends Z<
  ZIntersectionIO<T, 'output'>,
  ZIntersectionDef<T>,
  ZIntersectionIO<T, 'input'>
> {
  get hint() {
    return utils.intersectionize(this.components.map((alt) => alt.hint))
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.ABORT()
  }

  get components(): T {
    return this._def.components
  }

  static create<T extends ZIntersectionComponents>(
    components: T
  ): ZIntersection<T> {
    return new ZIntersection({ typeName: ZTypeName.Intersection, components })
  }
}

/* -------------------------------------------------------------------------- */
/*                                    ZMap                                    */
/* -------------------------------------------------------------------------- */

export interface ZMapDef<K extends AnyZ, V extends AnyZ> extends ZDef<'ZMap'> {
  readonly keys: K
  readonly values: V
}

export class ZMap<K extends AnyZ, V extends AnyZ> extends Z<
  Map<OutputOf<K>, OutputOf<V>>,
  ZMapDef<K, V>,
  Map<InputOf<K>, InputOf<V>>
> {
  readonly hint = `Map<${this.keys}, ${this.values}>`

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    if (!(ctx.data instanceof Map)) {
      return ctx.INVALID_TYPE({ expected: ParsedType.Map })
    }

    const { keys, values } = this._def

    const result = new Map<OutputOf<K>, OutputOf<V>>()

    const dataEntries = [...ctx.data.entries()].map(
      ([key, value], index) => [key, value, index] as const
    )

    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        for (const [key, value, index] of dataEntries) {
          const [keyResult, valueResult] = await Promise.all([
            keys._parseAsync(
              ctx.child(keys, { data: key, path: [index, 'key'] })
            ),
            values._parseAsync(
              ctx.child(values, { data: value, path: [index, 'value'] })
            ),
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
        const keyResult = keys._parseSync(
          ctx.child(keys, { data: key, path: [index, 'key'] })
        )
        const valueResult = values._parseSync(
          ctx.child(values, { data: value, path: [index, 'value'] })
        )
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
  }

  get keys(): K {
    return this._def.keys
  }

  get values(): V {
    return this._def.values
  }

  get pair(): readonly [K, V] {
    return [this.keys, this.values]
  }

  static create<K extends AnyZ, V extends AnyZ>(
    keySchema: K,
    valueSchema: V
  ): ZMap<K, V> {
    return new ZMap({
      typeName: ZTypeName.Map,
      keys: keySchema,
      values: valueSchema,
    })
  }
}

/* -------------------------------------------------------------------------- */
/*                                   ZObject                                  */
/* -------------------------------------------------------------------------- */

export type ZObjectBaseShape = Record<string, AnyZ>
export type ZObjectUnknownKeysParam = 'passthrough' | 'strict' | 'strip'
export type ZObjectCatchallParam = AnyZ

export interface ZObjectState {
  readonly readonly: Immutability
}

export type ZObjectIO<
  S extends ZObjectBaseShape,
  U extends ZObjectUnknownKeysParam | utils.UNSET_MARKER,
  C extends ZObjectCatchallParam | utils.UNSET_MARKER,
  ST extends ZObjectState,
  IO extends 'input' | 'output'
> = utils.Simplify<
  utils.EnforceOptional<{
    [K in keyof S]: {
      input: InputOf<S[K]>
      output: OutputOf<S[K]>
    }[IO]
  }> &
    {
      0: {
        [x: string]: {
          input: InputOf<C>
          output: OutputOf<C>
        }[IO]
      }
      1: {
        0: unknown
        1: { [x: string]: unknown }
      }[utils.Equals<U, 'passthrough'>]
    }[utils.Equals<C, utils.UNSET_MARKER>] extends infer R
    ? {
        [Immutability.Off]: R
        [Immutability.Flat]: Readonly<R>
        [Immutability.Deep]: ReadonlyDeep<R>
      }[ST['readonly']]
    : never
>

export type GetShapeKeysEnum<Shape extends ZObjectBaseShape> =
  UnionToEnumValues<keyof Shape>

export type MakeShapePartial<
  Shape extends ZObjectBaseShape,
  Key extends keyof Shape = keyof Shape
> = utils.Merge<Shape, { [K in Key]: ZOptional<Shape[K]> }>

export type MakeShapeRequired<
  Shape extends ZObjectBaseShape,
  Key extends keyof Shape = keyof Shape
> = utils.Merge<Shape, { [K in Key]: UnwrapZOptionalDeep<Shape[K]> }>

export interface ZObjectDef<
  Shape extends ZObjectBaseShape,
  UnknownKeys extends ZObjectUnknownKeysParam | utils.UNSET_MARKER,
  Catchall extends ZObjectCatchallParam | utils.UNSET_MARKER,
  State extends ZObjectState
> extends ZDef<'ZObject'> {
  readonly shape: Shape
  readonly unknownKeys: UnknownKeys
  readonly catchall: Catchall
  readonly state: State
}

export class ZObject<
  Shape extends ZObjectBaseShape,
  UnknownKeys extends ZObjectUnknownKeysParam | utils.UNSET_MARKER,
  Catchall extends ZObjectCatchallParam | utils.UNSET_MARKER,
  State extends ZObjectState = { readonly: 'off' }
> extends Z<
  ZObjectIO<Shape, UnknownKeys, Catchall, State, 'output'>,
  ZObjectDef<Shape, UnknownKeys, Catchall, State>,
  ZObjectIO<Shape, UnknownKeys, Catchall, State, 'input'>
> {
  get hint() {
    const readonlyTag = this.isReadonly() ? 'readonly ' : ''
    return utils
      .jsonStringify(
        utils.fromEntries(
          utils.entries(this.shape).map(([key_, value]) => {
            const key = key_.toString()
            return [
              `${readonlyTag}${value.isOptional() ? `${key}?` : key}`,
              value.hint,
            ]
          })
        )
      )
      .replace(/"/g, '')
      .replace(/\\n(\w*)/g, '\n  $1')
      .replace(/\\/g, '"')
  }

  _parse(ctx: ParseContextOf<this>): ParseResultOf<this> {
    return ctx.ABORT()
  }

  get shape(): Shape {
    return this._def.shape
  }

  keyof() {
    return ZEnum.create(utils.keys(this._def.shape) as GetShapeKeysEnum<Shape>)
  }

  strict() {
    return this._setUnknownKeys('strict')
  }

  passthrough() {
    return this._setUnknownKeys('passthrough')
  }

  strip() {
    return this._setUnknownKeys('strip')
  }

  catchall<NewCatchall extends AnyZ>(catchall: NewCatchall) {
    return this._setCatchall(catchall)
  }

  augment<Augmentation extends ZObjectBaseShape>(augmentation: Augmentation) {
    return this._setShape(utils.merge(this._def.shape, augmentation))
  }

  extend<Augmentation extends ZObjectBaseShape>(augmentation: Augmentation) {
    return this.augment(augmentation)
  }

  setKey<K extends string, S extends AnyZ>(key: K, schema: S) {
    return this.extend({ [key]: schema } as Record<K, S>)
  }

  merge<
    IncShape extends ZObjectBaseShape,
    IncUnknownKeys extends ZObjectUnknownKeysParam | utils.UNSET_MARKER,
    IncCatchall extends ZObjectCatchallParam | utils.UNSET_MARKER,
    IncState extends ZObjectState
  >(incoming: ZObject<IncShape, IncUnknownKeys, IncCatchall, IncState>) {
    return incoming._setShape(utils.merge(this._def.shape, incoming._def.shape))
  }

  pick<K extends keyof Shape>(keys: utils.AtLeastOne<K>) {
    return this._setShape(utils.pick(this._def.shape, keys))
  }

  omit<K extends keyof Shape>(keys: utils.AtLeastOne<K>) {
    return this._setShape(utils.omit(this._def.shape, keys))
  }

  partial<K extends keyof Shape = keyof Shape>(keys?: utils.AtLeastOne<K>) {
    return this._setShape(
      utils.fromEntries(
        Object.entries(this._def.shape).map(([key, value]) => [
          key,
          !keys || utils.includes(keys, key) ? value.optional() : value,
        ])
      ) as MakeShapePartial<Shape, K>
    )
  }

  required<K extends keyof Shape = keyof Shape>(keys?: utils.AtLeastOne<K>) {
    return this._setShape(
      utils.fromEntries(
        Object.entries(this._def.shape).map(([key, value]) => [
          key,
          (!keys || utils.includes(keys, key)) && value instanceof ZOptional
            ? value.unwrapDeep()
            : value,
        ])
      ) as MakeShapeRequired<Shape, K>
    )
  }

  readonly() {
    return this._setImmutability(Immutability.Flat)
  }

  readonlyDeep() {
    return this._setImmutability(Immutability.Deep)
  }

  mutable() {
    return this._setImmutability(Immutability.Off)
  }

  isReadonly() {
    return this._def.state.readonly !== Immutability.Off
  }

  lowerCase<K extends keyof Shape = keyof Shape>(keys?: utils.AtLeastOne<K>) {
    return this._transformKeys(utils.toLowerCase, keys)
  }

  upperCase<K extends keyof Shape = keyof Shape>(keys?: utils.AtLeastOne<K>) {
    return this._transformKeys(utils.toUpperCase, keys)
  }

  camelCase<K extends keyof Shape = keyof Shape>(keys?: utils.AtLeastOne<K>) {
    return this._transformKeys(utils.toCamelCase, keys)
  }

  kebabCase<K extends keyof Shape = keyof Shape>(keys?: utils.AtLeastOne<K>) {
    return this._transformKeys(utils.toKebabCase, keys)
  }

  snakeCase<K extends keyof Shape = keyof Shape>(keys?: utils.AtLeastOne<K>) {
    return this._transformKeys(utils.toSnakeCase, keys)
  }

  pascalCase<K extends keyof Shape = keyof Shape>(keys?: utils.AtLeastOne<K>) {
    return this._transformKeys(utils.toPascalCase, keys)
  }

  constantCase<K extends keyof Shape = keyof Shape>(
    keys?: utils.AtLeastOne<K>
  ) {
    return this._transformKeys(utils.toConstantCase, keys)
  }

  private _setShape<T extends ZObjectBaseShape>(
    shape: T
  ): ZObject<T, UnknownKeys, Catchall, State> {
    return new ZObject({ ...this._def, shape })
  }

  private _setUnknownKeys<T extends ZObjectUnknownKeysParam>(
    unknownKeys: T
  ): ZObject<Shape, T, utils.UNSET_MARKER, State> {
    return new ZObject({ ...this._def, unknownKeys })._unsetCatchall()
  }

  private _unsetUnknownKeys(): ZObject<
    Shape,
    utils.UNSET_MARKER,
    Catchall,
    State
  > {
    return new ZObject({ ...this._def, unknownKeys: utils.UNSET_MARKER })
  }

  private _setCatchall<NewCatchall extends AnyZ>(
    catchall: NewCatchall
  ): ZObject<Shape, utils.UNSET_MARKER, NewCatchall, State> {
    return new ZObject({ ...this._def, catchall })._unsetUnknownKeys()
  }

  private _unsetCatchall(): ZObject<
    Shape,
    UnknownKeys,
    utils.UNSET_MARKER,
    State
  > {
    return new ZObject({ ...this._def, catchall: utils.UNSET_MARKER })
  }

  private _setImmutability<T extends Immutability>(
    state: T
  ): ZObject<
    Shape,
    UnknownKeys,
    Catchall,
    utils.Merge<State, { readonly: T }>
  > {
    return new ZObject({
      ...this._def,
      state: utils.merge(this._def.state, { readonly: state }),
    })
  }

  private _transformKeys<T extends string, K extends keyof Shape>(
    transformer: (key: K & string) => T,
    keys?: utils.AtLeastOne<K>
  ) {
    return this._setShape(
      utils.fromEntries(
        utils
          .entries(this._def.shape)
          .map(([key, value]) => [
            !keys || utils.includes(keys, key)
              ? transformer(key as K & string)
              : key,
            value,
          ])
      ) as unknown as Omit<Shape, K> & { [KK in K as T]: Shape[KK] }
    )
  }

  static create<Shape extends ZObjectBaseShape>(
    shape: Shape
  ): ZObject<Shape, 'strip', utils.UNSET_MARKER, { readonly: 'off' }> {
    return new ZObject({
      typeName: ZTypeName.Object,
      shape,
      unknownKeys: 'strip',
      catchall: utils.UNSET_MARKER,
      state: { readonly: Immutability.Off },
    })
  }
}

export type AnyZObject = ZObject<
  ZObjectBaseShape,
  ZObjectUnknownKeysParam | utils.UNSET_MARKER,
  AnyZ | utils.UNSET_MARKER,
  ZObjectState
>

/* -------------------------------------------------------------------------- */
/*                                  ZEffects                                  */
/* -------------------------------------------------------------------------- */

export const EffectKind = {
  Refinement: 'refinement',
  Transform: 'transform',
  Preprocess: 'preprocess',
} as const

export type EffectKind = typeof EffectKind[keyof typeof EffectKind]

export interface EffectContext<Output = unknown, Input = Output> {
  readonly issue: ParseContext<Output, Input>['DIRTY']
  readonly path: ParsePath
}

export interface BaseEffect<T extends EffectKind> {
  readonly kind: T
}

export interface RefinementEffect<Data = unknown>
  extends BaseEffect<'refinement'> {
  refine(data: Data, ctx: EffectContext<Data>): utils.Promisable<boolean>
}

export interface TransformEffect<Data = unknown, Output = unknown>
  extends BaseEffect<'transform'> {
  transform(data: Data, ctx: EffectContext<Data>): utils.Promisable<Output>
}

export interface PreprocessEffect<Output = unknown>
  extends BaseEffect<'preprocess'> {
  transform(data: unknown): Output
}

export type ZEffect<T = unknown, U = unknown> =
  | RefinementEffect<T>
  | TransformEffect<T, U>
  | PreprocessEffect<T>

export type RefinementMessageParameters = utils.Simplify<
  utils.RequireAtLeastOne<
    Required<GetIssuePayload<'custom'>> & { readonly message: string }
  >
>

export type RefinementMessageArgument<T> =
  | string
  | RefinementMessageParameters
  | ((data: T) => RefinementMessageParameters)

const createEffectContext = <Output, Input>(
  parseContext: ParseContext<Output, Input>
): EffectContext<Output, Input> => ({
  issue: (...arguments_) => parseContext['DIRTY'](...arguments_),
  path: [...parseContext.path],
})

type RefinementExecutorCreator<Async extends boolean = false> = <
  T,
  U extends EffectContext
>(
  effect: RefinementEffect<T>,
  effectContext: U
) => (data: T) => Async extends true ? Promise<boolean> : boolean

const createSyncRefinementExecutor: RefinementExecutorCreator =
  (effect, effectContext) => (data) => {
    const result = effect.refine(data, effectContext)
    if (utils.isAsync(result)) {
      throw new TypeError(
        'Async refinement encountered during synchronous parse operation. Use .parseAsync instead.'
      )
    }
    return result
  }

const createAsyncRefinementExecutor: RefinementExecutorCreator<true> =
  (effect, effectContext) => async (data) =>
    effect.refine(data, effectContext)

export interface ZEffectsDef<T extends AnyZ> extends ZDef<'ZEffects'> {
  readonly underlying: T
  readonly effect: ZEffect
}

export class ZEffects<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends AnyZ<any>,
  Out = OutputOf<T>,
  In = InputOf<T>
> extends Z<Out, ZEffectsDef<T>, In> {
  readonly hint = this.source.hint

  _parse(ctx: ParseContext<Out, In>): ParseResult<Out, In> {
    const { underlying, effect } = this._def

    if (effect.kind === EffectKind.Preprocess) {
      const processed = effect.transform(ctx.data)

      return ctx.common.async
        ? Promise.resolve(processed).then((processedAsync) => {
            ctx.setData(processedAsync)
            return underlying._parseAsync(ctx)
          })
        : ctx.setData(processed) && underlying._parseSync(ctx)
    }

    const effectContext = createEffectContext(ctx)

    if (effect.kind === EffectKind.Refinement) {
      if (ctx.common.async) {
        const executeRefinement = createAsyncRefinementExecutor(
          effect,
          effectContext
        )
        return underlying
          ._parseAsync(ctx)
          .then((underlyingResult) =>
            underlyingResult.ok
              ? executeRefinement(underlyingResult.data).then(
                  (refinementResult) =>
                    refinementResult
                      ? ctx.OK(underlyingResult.data)
                      : ctx.ABORT()
                )
              : ctx.ABORT()
          )
      } else {
        const executeRefinement = createSyncRefinementExecutor(
          effect,
          effectContext
        )
        const underlyingResult = underlying._parseSync(ctx)
        return underlyingResult.ok && executeRefinement(underlyingResult.data)
          ? ctx.OK(underlyingResult.data)
          : ctx.ABORT()
      }
    }

    if (effect.kind === EffectKind.Transform) {
      if (ctx.common.async) {
        return underlying._parseAsync(ctx).then((base) => {
          if (!base.ok) {
            return ctx.ABORT()
          }
          return Promise.resolve(
            effect.transform(base.data, effectContext)
          ).then((result) =>
            ctx.isInvalid() ? ctx.ABORT() : ctx.OK(result as OutputOf<this>)
          )
        })
      } else {
        const base = underlying._parseSync(ctx)
        if (!base.ok) {
          return ctx.ABORT()
        }
        const result = effect.transform(base.data, effectContext)
        if (utils.isAsync(result)) {
          throw new TypeError(
            'Asynchronous transform encountered during synchronous parse operation. Use `.parseAsync()` instead.'
          )
        }
        return ctx.isInvalid() ? ctx.ABORT() : ctx.OK(result as OutputOf<this>)
      }
    }

    return ctx.ABORT()
  }

  get underlying(): T {
    return this._def.underlying
  }

  get source(): UnwrapZEffectsDeep<T> {
    const { underlying } = this
    return underlying instanceof ZEffects ? underlying.unwrapDeep() : underlying
  }

  unwrap(): T {
    return this.underlying
  }

  unwrapDeep(): UnwrapZEffectsDeep<T> {
    return this.source
  }

  private static _create<
    S extends AnyZ,
    O = OutputOf<S>,
    I = InputOf<S>,
    E extends ZEffect = ZEffect
  >(schema: S, effect: E) {
    return new ZEffects<S, O, I>({
      typeName: ZTypeName.Effects,
      underlying: schema,
      effect,
    })
  }

  static refine<T extends AnyZ, RefinedOutput extends OutputOf<T>>(
    schema: T,
    check: (data: OutputOf<T>) => data is RefinedOutput,
    message?: RefinementMessageArgument<OutputOf<T>>
  ): ZEffects<T, RefinedOutput, InputOf<T>>
  static refine<T extends AnyZ, U>(
    schema: T,
    check: (data: OutputOf<T>) => utils.Promisable<U>,
    message?: RefinementMessageArgument<OutputOf<T>>
  ): ZEffects<T, OutputOf<T>, InputOf<T>>
  static refine<T extends AnyZ>(
    schema: T,
    check: (data: OutputOf<T>) => utils.Promisable<unknown>,
    message?: RefinementMessageArgument<OutputOf<T>>
  ): ZEffects<T, OutputOf<T>, InputOf<T>> {
    const getIssuePayload = (data: OutputOf<T>): GetIssuePayload<'custom'> => {
      if (!message || typeof message === 'string') {
        return { message }
      } else if (typeof message === 'function') {
        return message(data)
      } else {
        return message
      }
    }
    return ZEffects._create(schema, {
      kind: EffectKind.Refinement,
      refine: (data, ctx) => {
        const result = check(data)
        console.log(result)
        const abort = () => {
          const issuePayload = getIssuePayload(data)
          ctx.issue(IssueKind.Custom, issuePayload, issuePayload.message)
          return false
        }
        if (utils.isAsync(result)) {
          return result.then((resolvedResult) => !!resolvedResult || abort())
        }
        return !!result || abort()
      },
    })
  }

  static transform<T extends AnyZ, NewOut>(
    schema: T,
    transform: (
      data: OutputOf<T>,
      ctx: EffectContext<OutputOf<T>>
    ) => utils.Promisable<NewOut>
  ): ZEffects<T, NewOut, InputOf<T>> {
    return ZEffects._create<
      T,
      NewOut,
      InputOf<T>,
      TransformEffect<OutputOf<T>, NewOut>
    >(schema, {
      kind: EffectKind.Transform,
      transform,
    })
  }

  static preprocess<O, T extends Z<O, AnyZDef<O>>>(
    preprocess: (data: unknown) => O,
    schema: T
  ): ZEffects<T, O, InputOf<T>> {
    return ZEffects._create<T, O, InputOf<T>, PreprocessEffect<O>>(schema, {
      kind: EffectKind.Preprocess,
      transform: preprocess,
    })
  }
}

type _UnwrapZEffectsDeep<T extends AnyZ> = T extends ZEffects<infer T>
  ? _UnwrapZEffectsDeep<T>
  : T
export type UnwrapZEffectsDeep<T extends AnyZ> =
  _UnwrapZEffectsDeep<T> extends AnyZ ? T : never

/* -------------------------------------------------------------------------- */

const anyType = ZAny.create
const arrayType = ZArray.create
const bigintType = ZBigInt.create
const booleanType = ZBoolean.create
const dateType = ZDate.create
const defaultType = ZDefault.create
const enumType = ZEnum.create
const intersectionType = ZIntersection.create
const lazyType = ZLazy.create
const literalType = ZLiteral.create
const mapType = ZMap.create
const nanType = ZNaN.create
const nativeEnum = ZNativeEnum.create
const neverType = ZNever.create
const nullableType = ZNullable.create
const nullType = ZNull.create
const numberType = ZNumber.create
const objectType = ZObject.create
const optionalType = ZOptional.create
const preprocessType = ZEffects.preprocess
const promiseType = ZPromise.create
const refineType = ZEffects.refine
const stringType = ZString.create
const symbolType = ZSymbol.create
const transformType = ZEffects.transform
const tuple = ZTuple.create
const undefinedType = ZUndefined.create
const unionType = ZUnion.create
const unknownType = ZUnknown.create
const voidType = ZVoid.create

const global = ZGlobal.get

export {
  anyType as any,
  arrayType as array,
  bigintType as bigint,
  booleanType as boolean,
  dateType as date,
  defaultType as default,
  enumType as enum,
  intersectionType as intersection,
  lazyType as lazy,
  literalType as literal,
  mapType as map,
  nanType as nan,
  nativeEnum as nativeEnum,
  neverType as never,
  nullableType as nullable,
  nullType as null,
  numberType as number,
  objectType as object,
  optionalType as optional,
  preprocessType as preprocess,
  promiseType as promise,
  refineType as refine,
  stringType as string,
  symbolType as symbol,
  transformType as transform,
  tuple as tuple,
  undefinedType as undefined,
  unionType as union,
  unknownType as unknown,
  voidType as void,
  global,
}

export type output<T extends AnyZ> = OutputOf<T>
export type input<T extends AnyZ> = InputOf<T>
export type infer<T extends AnyZ> = utils.FixEmptyObject<OutputOf<T>>
