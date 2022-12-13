import {
  DEFAULT_ERROR_MAP,
  ErrorMapIssue,
  resolveErrorMap,
  resolveToErrorMapFunction,
  ZError,
  type ErrorMap,
} from './error'
import { ZGlobal } from './global'
import {
  IssueKind,
  type AnyIssue,
  type GetIssuePayload,
  type IssueHasPayload,
  type OmitFromIssuePayload,
  type PickFromIssuePayload,
} from './issues'
import type { ZEnumValue } from './types'
import { utils } from './utils'
import type { AnyZ, InputOf, OutputOf } from './z'

/* -------------------------------------------------------------------------- */
/*                                 ParsedType                                 */
/* -------------------------------------------------------------------------- */

const ParsedTypeBase = {
  Array: 'Array',
  BigInt: 'bigint',
  Boolean: 'boolean',
  Date: 'Date',
  Function: 'Function',
  Map: 'Map',
  NaN: 'NaN',
  Null: 'null',
  Number: 'number',
  Object: 'object',
  Promise: 'Promise',
  Set: 'Set',
  String: 'string',
  Symbol: 'symbol',
  Undefined: 'undefined',
  Unknown: 'unknown',
  Void: 'void',
} as const

export const ParsedType = {
  ...ParsedTypeBase,
  Primitive: [
    ParsedTypeBase.String,
    ParsedTypeBase.Number,
    ParsedTypeBase.BigInt,
    ParsedTypeBase.Boolean,
    ParsedTypeBase.Symbol,
    ParsedTypeBase.Null,
    ParsedTypeBase.Undefined,
  ],
} as const

export type ParsedType = typeof ParsedType[keyof typeof ParsedType]

export const getParsedType = (data: unknown) => {
  switch (typeof data) {
    case 'string': {
      return ParsedType.String
    }
    case 'number': {
      if (Number.isNaN(data)) return ParsedType.NaN
      return ParsedType.Number
    }
    case 'bigint': {
      return ParsedType.BigInt
    }
    case 'boolean': {
      return ParsedType.Boolean
    }
    case 'symbol': {
      return ParsedType.Symbol
    }
    case 'function': {
      return ParsedType.Function
    }
    case 'undefined': {
      return ParsedType.Undefined
    }
    case 'object': {
      if (data === null) return ParsedType.Null
      if (Array.isArray(data)) return ParsedType.Array
      if (data instanceof Date) return ParsedType.Date
      if (data instanceof Map) return ParsedType.Map
      if (data instanceof Promise) return ParsedType.Promise
      if (data instanceof Set) return ParsedType.Set
      return ParsedType.Object
    }

    default: {
      return ParsedType.Unknown
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                                 ParseResult                                */
/* -------------------------------------------------------------------------- */

export type SuccessfulParseResult<Output = unknown> = {
  readonly ok: true
  readonly data: Output
  readonly error?: never
}

export type FailedParseResult<Output = unknown, Input = Output> = {
  readonly ok: false
  readonly data?: never
  readonly error: ZError<Output, Input>
}

export type SyncParseResult<Output = unknown, Input = Output> =
  | SuccessfulParseResult<Output>
  | FailedParseResult<Output, Input>

export type AsyncParseResult<Output = unknown, Input = Output> = Promise<
  SuccessfulParseResult<Output> | FailedParseResult<Output, Input>
>

export type ParseResult<Output = unknown, Input = Output> =
  | SyncParseResult<Output, Input>
  | AsyncParseResult<Output, Input>

export type SyncParseResultOf<T> = SyncParseResult<OutputOf<T>, InputOf<T>>
export type AsyncParseResultOf<T> = AsyncParseResult<OutputOf<T>, InputOf<T>>
export type ParseResultOf<T> = ParseResult<OutputOf<T>, InputOf<T>>

/* -------------------------------------------------------------------------- */
/*                                ParseContext                                */
/* -------------------------------------------------------------------------- */

export type ParsePath = readonly (string | number)[]

export const ParseStatus = {
  Valid: 'valid',
  Dirty: 'dirty',
  Invalid: 'invalid',
} as const

export type ParseStatus = typeof ParseStatus[keyof typeof ParseStatus]

export type ParseContextCommon = {
  readonly async: boolean
  readonly abortEarly?: boolean
  readonly contextualErrorMap?: ErrorMap
}

export type ParseOptions = utils.StrictOmit<ParseContextCommon, 'async'>

export type ParseContextDef<Output = unknown, Input = Output> = {
  readonly schema: AnyZ<Output, Input>
  readonly data: unknown
  readonly path: ParsePath
  readonly parent: ParseContext | null
  readonly common: ParseContextCommon
}

export class ParseContext<Output = unknown, Input = Output> {
  private _status: ParseStatus = ParseStatus.Valid

  private readonly _children: ParseContext[] = []
  private readonly _issues: AnyIssue[] = []

  private constructor(private readonly _def: ParseContextDef<Output, Input>) {}

  get schema() {
    return this._def.schema
  }

  get data(): unknown {
    return this._def.data
  }

  get dataType(): ParsedType {
    return getParsedType(this.data)
  }

  setData(data: unknown): this {
    Object.assign(this._def, { data })
    return this
  }

  get path(): ParsePath {
    return this._def.path
  }

  get parent(): ParseContext | null {
    return this._def.parent
  }

  get common(): ParseContextCommon {
    return this._def.common
  }

  get ownChildren(): readonly ParseContext[] {
    return this._children
  }

  get allChildren(): readonly ParseContext[] {
    return [
      ...this.ownChildren,
      ...this.ownChildren.flatMap((child) => child.allChildren),
    ]
  }

  child<ChildOut, ChildIn>(def: {
    readonly schema: AnyZ<ChildOut, ChildIn>
    readonly data: unknown
    readonly path: ParsePath
  }): ParseContextOf<AnyZ<ChildOut, ChildIn>> {
    const child = new ParseContext<ChildOut, ChildIn>({
      schema: def.schema,
      data: def.data,
      path: [...this.path, ...def.path],
      parent: this,
      common: this.common,
    })

    this._children.push(child)

    return child
  }

  get ownIssues(): readonly AnyIssue[] {
    return this._issues
  }

  get allIssues(): readonly AnyIssue[] {
    return [
      ...this.ownIssues,
      ...this.ownChildren.flatMap((child) => child.allIssues),
    ]
  }

  getStatus(): ParseStatus {
    return this._status
  }

  setStatus(newStatus: ParseStatus): this {
    const currentStatus = this.getStatus()
    if (currentStatus === ParseStatus.Invalid) {
      return this
    } else if (currentStatus === ParseStatus.Dirty) {
      if (newStatus === ParseStatus.Invalid) {
        this._status = newStatus
        this.parent?.setStatus(newStatus)
      }
      return this
    }
    this._status = newStatus
    if (newStatus === ParseStatus.Invalid) {
      this.parent?.setStatus(newStatus)
    }
    return this
  }

  get isValid(): boolean {
    return (
      this.getStatus() === ParseStatus.Valid &&
      this.ownChildren.every((child) => child.isValid)
    )
  }

  get isDirty(): boolean {
    return (
      this.getStatus() === ParseStatus.Dirty ||
      this.ownChildren.some((child) => child.isDirty)
    )
  }

  get isInvalid(): boolean {
    return (
      this.getStatus() === ParseStatus.Invalid ||
      this.ownChildren.some((child) => child.isInvalid)
    )
  }

  OK<T extends Output>(value: T): SuccessfulParseResult<T> {
    return { ok: true, data: value }
  }

  ABORT(): FailedParseResult<Output, Input> {
    return { ok: false, error: ZError.create(this) }
  }

  DIRTY<K extends IssueKind>(
    kind: K,
    ...arguments_: {
      0: [message?: string | undefined]
      1: [payload: GetIssuePayload<K>, message?: string | undefined]
    }[IssueHasPayload<K>]
  ): this {
    const {
      _issues,
      common,
      data,
      dataType,
      isInvalid,
      isValid,
      path,
      schema,
    } = this

    if (common.abortEarly) {
      if (isInvalid) {
        return this
      }
      this.setStatus(ParseStatus.Invalid)
    } else if (isValid) {
      this.setStatus(ParseStatus.Dirty)
    }

    const [payloadOrMessage, maybeMessage] = arguments_

    const payload =
      typeof payloadOrMessage === 'string' ? undefined : payloadOrMessage

    const message =
      typeof payloadOrMessage === 'string' ? payloadOrMessage : maybeMessage

    const partialIssue: Omit<AnyIssue, 'message'> = {
      kind,
      payload,
      input: { data, type: dataType },
      path,
      origin: schema.typeName,
      hint: schema.hint,
    }

    const issueMessage: string =
      message ||
      resolveErrorMap(
        [
          common.contextualErrorMap,
          schema._def.schemaErrorMap,
          ZGlobal.get().getCurrentErrorMap(),
          DEFAULT_ERROR_MAP,
        ]
          .filter(utils.isDefined)
          .reverse()
          .reduce(
            (message, map) =>
              resolveToErrorMapFunction(map, partialIssue)(
                partialIssue as ErrorMapIssue<K>,
                { defaultMessage: message }
              ),
            ''
          )
      )

    _issues.push({ ...partialIssue, message: issueMessage })

    return this
  }

  INVALID_TYPE(
    payload: OmitFromIssuePayload<'invalid_type', 'received'>
  ): this {
    if (this.data === undefined) {
      return this.DIRTY(IssueKind.Required)
    }
    return this.DIRTY(IssueKind.InvalidType, {
      ...payload,
      received: this.dataType,
    })
  }

  INVALID_ENUM_VALUE(
    data: ZEnumValue,
    payload: utils.StrictOmit<
      PickFromIssuePayload<'invalid_enum_value', 'expected'>['expected'],
      'formatted'
    >
  ): this {
    return this.DIRTY(IssueKind.InvalidEnumValue, {
      expected: { ...payload, formatted: this.schema.hint },
      received: { value: data, formatted: utils.literalize(data) },
    })
  }

  TOO_SMALL(
    type: PickFromIssuePayload<'too_small', 'type'>['type'],
    payload: OmitFromIssuePayload<'too_small', 'type'>
  ): this {
    return this.DIRTY(IssueKind.TooSmall, { type, ...payload })
  }

  TOO_BIG(
    type: PickFromIssuePayload<'too_big', 'type'>['type'],
    payload: OmitFromIssuePayload<'too_big', 'type'>
  ): this {
    return this.DIRTY(IssueKind.TooBig, { type, ...payload })
  }

  FORBIDDEN() {
    return this.DIRTY(IssueKind.Forbidden)
  }

  static createSync<T extends AnyZ>(
    schema: T,
    data: unknown,
    options?: ParseOptions
  ): ParseContextOf<T> {
    return new ParseContext({
      schema,
      data,
      path: [],
      parent: null,
      common: { ...options, async: false },
    })
  }

  static createAsync<T extends AnyZ>(
    schema: T,
    data: unknown,
    options?: ParseOptions
  ): ParseContextOf<T> {
    return new ParseContext({
      schema,
      data,
      path: [],
      parent: null,
      common: { ...options, async: true },
    })
  }
}

export type ParseContextOf<T> = ParseContext<OutputOf<T>, InputOf<T>>
