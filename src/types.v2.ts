import {
  ParseContext,
  TParsedType,
  type AsyncParseResult,
  type ParseOptions,
  type ParseResult,
  type SyncParseResult,
} from './parse'
import { TTypeName } from './type-names'
import { utils } from './utils'

export interface TDef {
  readonly typeName: TTypeName
  readonly properties: Record<string, unknown> | null
  readonly hint: string
  readonly checks: Record<string, Record<string, unknown> | null> | utils.UNSET_MARKER
}

export type MakeTDef<
  TN extends TTypeName,
  P extends Record<string, unknown> | null,
  H extends string,
  C extends Record<string, Record<string, unknown> | null> | utils.UNSET_MARKER = utils.UNSET_MARKER
> = {
  readonly typeName: TN
  readonly properties: P
  readonly hint: H
  readonly checks: C
}

export interface TType<O = unknown, Def extends TDef = TDef, I = O> {
  readonly _O: O
  readonly _I: I
  readonly _properties: Def['properties']
  readonly typeName: Def['typeName']
  readonly hint: Def['hint']
  _parse(ctx: ParseContext<O, I>): ParseResult<O, I>
  _parseSync(ctx: ParseContext<O, I>): SyncParseResult<O, I>
  _parseAsync(ctx: ParseContext<O, I>): AsyncParseResult<O, I>
  safeParse(data: unknown, options?: utils.Simplify<ParseOptions>): SyncParseResult<O, I>
  safeParseAsync(data: unknown, options?: utils.Simplify<ParseOptions>): AsyncParseResult<O, I>
  parse(data: unknown, options?: utils.Simplify<ParseOptions>): O
  parseAsync(data: unknown, options?: utils.Simplify<ParseOptions>): Promise<O>
}

export const ttype = <O, I = O>() => ({
  typeName: <TN extends TTypeName>(typeName: TN) => ({
    props: <P extends Record<string, unknown> | null>(properties: P) => ({
      hint: <H extends string>(hint: H | ((properties: P) => H)) => ({
        handleParse: (parseHandler: (properties: P, ctx: ParseContext<O, I>) => ParseResult<O, I>) => {
          const buildT = <
            C extends Record<string, Record<string, unknown> | null> | utils.UNSET_MARKER = utils.UNSET_MARKER
          >() => {
            type Def = MakeTDef<TN, P, H, C>

            class T {
              readonly _O!: O
              readonly _I!: I

              constructor(readonly _properties: P) {
                this._parseSync = this._parseSync.bind(this)
                this._parseAsync = this._parseAsync.bind(this)
                this.safeParse = this.safeParse.bind(this)
                this.safeParseAsync = this.safeParseAsync.bind(this)
                this.parse = this.parse.bind(this)
                this.parseAsync = this.parseAsync.bind(this)

                for (const [key, descriptor] of utils.entries(Object.getOwnPropertyDescriptors(this))) {
                  if (/^\$?_/.test(String(key))) {
                    Object.defineProperty(this, key, { ...descriptor, enumerable: false })
                  }
                }

                Reflect.deleteProperty(this, '_O')
                Reflect.deleteProperty(this, '_I')
              }

              get typeName(): TN {
                return typeName
              }

              get hint(): H {
                return typeof hint === 'function' ? hint(this._properties) : hint
              }

              readonly _parse = utils.memoize(parseHandler.bind(this, this._properties))

              _parseSync(ctx: ParseContext<O, I>): SyncParseResult<O, I> {
                const result = this._parse(ctx)
                if (utils.isAsync(result)) {
                  throw new Error('Synchronous parse encountered promise')
                }
                return result
              }

              async _parseAsync(ctx: ParseContext<O, I>): AsyncParseResult<O, I> {
                const result = this._parse(ctx)
                return result
              }

              safeParse(data: unknown, options?: utils.Simplify<ParseOptions>): SyncParseResult<O, I> {
                const parseContext = ParseContext.createSync(this, data, options)
                return this._parseSync(parseContext)
              }

              async safeParseAsync(data: unknown, options?: utils.Simplify<ParseOptions>): AsyncParseResult<O, I> {
                const parseContext = ParseContext.createAsync(this, data, options)
                return this._parseAsync(parseContext)
              }

              parse(data: unknown, options?: utils.Simplify<ParseOptions>): O {
                const result = this.safeParse(data, options)
                if (result.ok) return result.data
                else throw result.error
              }

              async parseAsync(data: unknown, options?: utils.Simplify<ParseOptions>): Promise<O> {
                const result = await this.safeParseAsync(data, options)
                if (result.ok) return result.data
                else throw result.error
              }

              static create() {
                return new T(utils.cloneDeep(properties))
              }
            }

            Object.defineProperty(T, 'name', { value: typeName })

            return {
              checks: <C_ extends Record<string, Record<string, unknown> | null>>() => buildT<C_>(),
              build: () => T.create(),
              extend: <E extends TType<O, Def, I>>(handleExtend: (ttype: TType<O, Def, I>) => E) =>
                handleExtend(T.create()),
            }
          }

          return buildT()
        },
      }),
    }),
  }),
})

export type AnyTType<O = unknown, I = O> = TType<O, TDef, I>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                         Any                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface TAny extends TType<any, MakeTDef<TTypeName.Any, null, 'any'>> {}

export const tany = (): TAny =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ttype<any>()
    .typeName(TTypeName.Any)
    .props(null)
    .hint('any')
    .handleParse((_, ctx) => ctx.OK(ctx.data))
    .build()

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                       Unknown                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface TUnknown extends TType<unknown, MakeTDef<TTypeName.Unknown, null, 'unknown'>> {}

export const tunknown = (): TUnknown =>
  ttype<unknown>()
    .typeName(TTypeName.Unknown)
    .props(null)
    .hint('unknown')
    .handleParse((_, ctx) => ctx.OK(ctx.data))
    .build()

export interface TArray<T extends AnyTType>
  extends TType<T['_O'][], MakeTDef<TTypeName.Array, { readonly element: T }, `${T['hint']}[]`>, T['_I'][]> {
  readonly element: T
}

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                        Array                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

export const tarray = <T extends TType>(element: T): TArray<T> =>
  ttype<T['_O'][], T['_I'][]>()
    .typeName(TTypeName.Array)
    .props({ element })
    .hint(({ element }) => `${element.hint}[]`)
    .handleParse(({ element }, ctx) => {
      if (!Array.isArray(ctx.data)) {
        return ctx.INVALID_TYPE({ expected: TParsedType.Array }).ABORT()
      }

      const entries = [...ctx.data.entries()]
      const result: T['_O'][] = []

      if (ctx.common.async) {
        return Promise.resolve().then(async () => {
          for (const [index, value] of entries) {
            const parseResult = await element._parseAsync(ctx.child({ type: element, data: value, path: [index] }))
            if (parseResult.ok) {
              result.push(parseResult.data)
            } else {
              if (ctx.common.abortEarly) {
                return parseResult
              }
            }
          }
          return ctx.isValid() ? ctx.OK(result) : ctx.ABORT()
        })
      } else {
        for (const [index, value] of entries) {
          const parseResult = element._parseSync(ctx.child({ type: element, data: value, path: [index] }))
          if (parseResult.ok) {
            result.push(parseResult.data)
          } else {
            if (ctx.common.abortEarly) {
              return parseResult
            }
          }
        }
        return ctx.isValid() ? ctx.OK(result) : ctx.ABORT()
      }
    })
    .extend((ttype) => ({
      ...ttype,
      get element(): T {
        return ttype._properties.element
      },
    }))
