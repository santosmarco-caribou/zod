import { Memoize } from 'lodash-decorators'
import { nanoid } from 'nanoid'
import type { CheckBase, checks } from './checks'
import type { ErrorMap, ErrorMapDict } from './error'
import {
  ParseContext,
  type ParseOptions,
  type ParseResult,
  type SyncParseResult,
  type SyncParseResultOf,
} from './parse'
import { ZTypeName } from './type-names'
import {
  ZArray,
  ZDefault,
  ZEffects,
  ZIntersection,
  ZLazy,
  ZNullable,
  ZOptional,
  ZPromise,
  ZStringCheck,
  ZUnion,
  type EffectContext,
  type RefinementMessageArgument,
  type ZIntersectionComponents,
  type ZUnionAlternatives,
} from './types'
import { utils } from './utils'

export interface PublicManifest<Output = unknown> {
  readonly title?: string
  readonly summary?: string
  readonly description?: string
  readonly version?: string
  readonly examples?: readonly Output[]
  readonly tags?: readonly string[]
  readonly notes?: readonly string[]
  readonly unit?: string
  readonly deprecated?: boolean
  readonly meta?: utils.AnyReadonlyRecord
}

export interface PrivateManifest {
  readonly required?: boolean
  readonly nullable?: boolean
  readonly readonly?: boolean
}

export interface Manifest<Output = unknown>
  extends PublicManifest<Output>,
    PrivateManifest {}

const MANIFEST_DEFAULTS = {
  required: true,
  nullable: false,
  readonly: false,
} as const

export interface Options {
  readonly abortEarly?: boolean
  readonly color?: string
  readonly debug?: boolean
  readonly errorMap?: ErrorMap
  readonly label?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ZDef<TypeName extends ZTypeName, _Output = any> {
  readonly typeName: TypeName
  readonly checks?: readonly checks.Base[]
  readonly manifest?: Manifest<_Output>
  readonly messages?: ErrorMapDict
  readonly options?: Options
  readonly schemaErrorMap?: ErrorMap
  readonly state?: utils.AnyReadonlyRecord
}

export type AnyZDef<Output = unknown> = ZDef<ZTypeName, Output>

export type InnerDef<Def extends AnyZDef> = {
  readonly [K in keyof Def]: K extends 'checks'
    ? readonly ZStringCheck['$FullData'][]
    : Def[K]
}

/* -------------------------------------------------------------------------- */
/*                                    ZBase                                   */
/* -------------------------------------------------------------------------- */

export abstract class ZBase<Output, Def extends AnyZDef<Output>, Input> {
  readonly $_output!: Output
  readonly $_input!: Input

  readonly _def: InnerDef<Def>

  readonly id = nanoid()
  readonly typeName: Def['typeName']

  constructor(def: Def) {
    this._def = utils.mergeDeep({ manifest: MANIFEST_DEFAULTS }, def)
    this.typeName = this._def.typeName
  }

  abstract readonly hint: string
  abstract _parse(ctx: ParseContext<Output, Input>): ParseResult<Output, Input>

  @Memoize()
  _parseSync(ctx: ParseContext<Output, Input>): SyncParseResult<Output, Input> {
    const result = this._parse(ctx)
    if (utils.isAsync(result)) {
      throw new Error('Synchronous parse encountered promise')
    }
    return result
  }

  @Memoize()
  async _parseAsync(
    ctx: ParseContext<Output, Input>
  ): Promise<SyncParseResult<Output, Input>> {
    const result = this._parse(ctx)
    return result
  }

  clone() {
    return this._reconstruct()
  }

  protected _addCheck<K extends checks.AllKinds<ZStringCheck>>(
    kind: K,
    ...arguments_: checks.GetAddCheckArgument<ZStringCheck, K>
  ) {
    const [payloadOrMessage, maybeMessage] = arguments_
    return this._reconstruct({
      checks: [
        ...(this._def.checks ?? []),
        {
          ...(typeof payloadOrMessage === 'string' ? {} : payloadOrMessage),
          kind,
          message:
            typeof payloadOrMessage === 'string'
              ? payloadOrMessage
              : maybeMessage,
        },
      ],
    })
  }

  protected _reconstruct(
    newDef?: utils.StrictOmit<
      ZDef<Def['typeName'], Output>,
      utils.RequiredKeysOf<AnyZDef>
    >
  ): this {
    const merged = utils.mergeDeep(this._def, newDef)
    return Reflect.construct(this.constructor, [merged])
  }
}

/* -------------------------------------------------------------------------- */
/*                                  ZOptions                                  */
/* -------------------------------------------------------------------------- */

export abstract class ZOptions<
  Output,
  Def extends AnyZDef<Output>,
  Input
> extends ZBase<Output, Def, Input> {
  get options(): NonNullable<Def['options']> {
    return this._def.options ?? {}
  }

  abortEarly(abortEarly = true): this {
    return this._reconstruct({ options: { abortEarly } })
  }

  color(color: string): this {
    return this._reconstruct({ options: { color } })
  }

  debug(debug = true): this {
    return this._reconstruct({ options: { debug } })
  }

  errorMap(errorMap: ErrorMap): this {
    return this._reconstruct({ options: { errorMap } })
  }

  label(label: string): this {
    return this._reconstruct({ options: { label } })
  }
}

/* -------------------------------------------------------------------------- */
/*                                  ZManifest                                 */
/* -------------------------------------------------------------------------- */

export abstract class ZManifest<
  Output,
  Def extends AnyZDef<Output>,
  Input
> extends ZOptions<Output, Def, Input> {
  get manifest(): NonNullable<Def['manifest']> {
    return this._def.manifest ?? {}
  }

  title(title: string): this {
    return this._reconstruct({ manifest: { title } })
  }

  summary(summary: string): this {
    return this._reconstruct({ manifest: { summary } })
  }

  description(description: string): this {
    return this._reconstruct({ manifest: { description } })
  }

  version(version: string): this {
    return this._reconstruct({ manifest: { version } })
  }

  examples(...examples: utils.AtLeastOne<Output>): this {
    return this._reconstruct({ manifest: { examples } })
  }

  tags(...tags: utils.AtLeastOne<string>): this {
    return this._reconstruct({ manifest: { tags } })
  }

  notes(...notes: utils.AtLeastOne<string>): this {
    return this._reconstruct({ manifest: { notes } })
  }

  unit(unit: string): this {
    return this._reconstruct({ manifest: { unit } })
  }

  deprecated(deprecated = true): this {
    return this._reconstruct({ manifest: { deprecated } })
  }

  meta(meta: Record<string, unknown>): this {
    return this._reconstruct({ manifest: { meta } })
  }
}

/* -------------------------------------------------------------------------- */
/*                                      Z                                     */
/* -------------------------------------------------------------------------- */

export abstract class Z<
  Output,
  Def extends AnyZDef<Output>,
  Input = Output
> extends ZManifest<Output, Def, Input> {
  constructor(def: Def) {
    super(def)

    this.clone = this.clone.bind(this)
    /* ---------------------------------------------------------------------- */
    this.abortEarly = this.abortEarly.bind(this)
    this.color = this.color.bind(this)
    this.debug = this.debug.bind(this)
    this.errorMap = this.errorMap.bind(this)
    this.label = this.label.bind(this)
    /* ---------------------------------------------------------------------- */
    this.title = this.title.bind(this)
    this.summary = this.summary.bind(this)
    this.description = this.description.bind(this)
    this.version = this.version.bind(this)
    this.examples = this.examples.bind(this)
    this.tags = this.tags.bind(this)
    this.notes = this.notes.bind(this)
    this.unit = this.unit.bind(this)
    this.deprecated = this.deprecated.bind(this)
    this.meta = this.meta.bind(this)
    /* ---------------------------------------------------------------------- */
    this.parse = this.parse.bind(this)
    this.safeParse = this.safeParse.bind(this)
    this.parseAsync = this.parseAsync.bind(this)
    this.safeParseAsync = this.safeParseAsync.bind(this)
    this.optional = this.optional.bind(this)
    this.nullable = this.nullable.bind(this)
    this.nullish = this.nullish.bind(this)
    this.array = this.array.bind(this)
    this.promise = this.promise.bind(this)
    this.or = this.or.bind(this)
    this.and = this.and.bind(this)
    this.default = this.default.bind(this)
    // this.catch = this.catch.bind(this)
    // this.brand = this.brand.bind(this)
    this.lazy = this.lazy.bind(this)
    this.refine = this.refine.bind(this)
    this.transform = this.transform.bind(this)
    this.preprocess = this.preprocess.bind(this)
    // this.pipe = this.pipe.bind(this)
    this.isOptional = this.isOptional.bind(this)
    this.isNullable = this.isNullable.bind(this)
  }

  parse(data: unknown, options?: utils.Simplify<ParseOptions>): Output {
    const result = this.safeParse(data, options)
    if (result.ok) return result.data
    else throw result.error
  }

  safeParse(
    data: unknown,
    options?: utils.Simplify<ParseOptions>
  ): SyncParseResultOf<this> {
    const parseContext = ParseContext.createSync(this, data, options)
    return this._parseSync(parseContext)
  }

  async parseAsync(
    data: unknown,
    options?: utils.Simplify<ParseOptions>
  ): Promise<Output> {
    const result = await this.safeParseAsync(data, options)
    if (result.ok) return result.data
    else throw result.error
  }

  async safeParseAsync(
    data: unknown,
    options?: utils.Simplify<ParseOptions>
  ): Promise<SyncParseResultOf<this>> {
    const parseContext = ParseContext.createAsync(this, data, options)
    return this._parseAsync(parseContext)
  }

  optional(): ZOptional<this> {
    return ZOptional.create(this)
  }

  nullable(): ZNullable<this> {
    return ZNullable.create(this)
  }

  nullish(): ZNullable<ZOptional<this>> {
    return this.optional().nullable()
  }

  array(): ZArray<this> {
    return ZArray.create(this)
  }

  promise(): ZPromise<this> {
    return ZPromise.create(this)
  }

  or<T extends ZUnionAlternatives>(...alternatives: T): ZUnion<[this, ...T]> {
    return ZUnion.create([this, ...alternatives])
  }

  and<T extends ZIntersectionComponents>(
    ...components: T
  ): ZIntersection<[this, ...T]> {
    return ZIntersection.create([this, ...components])
  }

  default(
    getDefault: utils.Defined<Input> | (() => utils.Defined<Input>)
  ): ZDefault<this> {
    return ZDefault.create(this, getDefault)
  }

  lazy(): ZLazy<this> {
    return ZLazy.create(() => this)
  }

  refine<RefinedOutput extends Output>(
    check: (data: Output) => data is RefinedOutput,
    message?: RefinementMessageArgument<Output>
  ): ZEffects<this, RefinedOutput, Input>
  refine<T>(
    check: (data: Output) => utils.Promisable<T>,
    message?: RefinementMessageArgument<Output>
  ): ZEffects<this, Output, Input>
  refine(
    check: (data: Output) => utils.Promisable<unknown>,
    message?: RefinementMessageArgument<Output>
  ): ZEffects<this, Output, Input> {
    return ZEffects.refine(this, check, message)
  }

  transform<NewOut>(
    transform: (
      data: Output,
      ctx: EffectContext<Output>
    ) => utils.Promisable<NewOut>
  ): ZEffects<this, NewOut, Input> {
    return ZEffects.transform(this, transform)
  }

  preprocess(preprocess: (data: unknown) => Output) {
    return ZEffects.preprocess(preprocess, this)
  }

  isOptional(): boolean {
    return !this.manifest.required
  }

  isNullable(): boolean {
    return !!this.manifest.nullable
  }
}

export type AnyZ<Output = unknown, Input = Output> = Z<
  Output,
  AnyZDef<Output>,
  Input
>

export type OutputOf<T> = (T & AnyZ<unknown>)['$_output']
export type InputOf<T> = (T & AnyZ<unknown>)['$_input']
