import { DEFAULT_ERROR_MAP, TError, type ErrorMap } from './error'
import { IssueKind, type Issue } from './issues'
import type { AnyTType } from './types.v2'
import { utils } from './utils'

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                     ParseResult                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface SuccessfulParseResult<O = unknown> {
  readonly ok: true
  readonly data: O
  readonly error?: never
}

export interface FailedParseResult<O = unknown, I = O> {
  readonly ok: false
  readonly data?: never
  readonly error: TError<O, I>
}

export type SyncParseResult<O = unknown, I = O> = SuccessfulParseResult<O> | FailedParseResult<O, I>
export type AsyncParseResult<O = unknown, I = O> = Promise<SyncParseResult<O, I>>
export type ParseResult<O = unknown, I = O> = SyncParseResult<O, I> | AsyncParseResult<O, I>

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                    ParseContext                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

export type ParsePath = readonly (string | number)[]

export enum ParseStatus {
  Valid = 'valid',
  Invalid = 'invalid',
}

export interface ParseOptions {
  readonly abortEarly?: boolean
  readonly errorMap?: ErrorMap
}

export interface ParseContextCommon extends utils.StrictOmit<ParseOptions, 'errorMap'> {
  readonly async: boolean
  readonly contextualErrorMap?: ErrorMap
}

export interface ParseContextCloneDef<O = unknown, I = O> {
  readonly type: AnyTType<O, I>
}

export interface ParseContextChildDef<O = unknown, I = O> extends ParseContextCloneDef<O, I> {
  readonly data: unknown
  readonly path?: ParsePath
}

export interface ParseContextDef<O = unknown, I = O> extends Required<ParseContextChildDef<O, I>> {
  readonly parent: ParseContext | null
  readonly common: ParseContextCommon
}

export interface ParseContext<O = unknown, I = O> {
  readonly type: AnyTType
  readonly data: unknown
  readonly dataType: TParsedType
  readonly path: ParsePath
  readonly parent: ParseContext | null
  readonly common: ParseContextCommon
  readonly ownChildren: readonly ParseContext[]
  readonly allChildren: readonly ParseContext[]
  readonly ownIssues: readonly Issue[]
  readonly allIssues: readonly Issue[]
  setData(data: unknown): this
  clone<O_, I_>(def: ParseContextCloneDef<O_, I_>): ParseContext<O_, I_>
  child<O_, I_>(def: ParseContextChildDef<O_, I_>): ParseContext<O_, I_>
  isValid(): boolean
  isInvalid(): boolean
  setStatus(status: ParseStatus): this
  addIssue<K extends IssueKind>(
    kind: K,
    ...arguments_: K extends unknown
      ? 'payload' extends keyof Issue<K>
        ? [payload: Issue<K>['payload'], message?: string]
        : [message?: string]
      : never
  ): this
  INVALID_TYPE(payload: { readonly expected: TParsedType }): this
  INVALID_LITERAL(payload: { readonly expected: LiteralValue; readonly received: LiteralValue }): this
  INVALID_UNION(payload: { readonly unionErrors: TError<O, I>[] }): this
  INVALID_INSTANCE(payload: { readonly expected: string }): this
  FORBIDDEN(): this
  OK<D extends O>(data: D): SuccessfulParseResult<D>
  ABORT(): FailedParseResult<O, I>
}

export const ParseContext = <O, I>(def: ParseContextDef<O, I>): ParseContext<O, I> => {
  const { type, data, path, common, parent } = def

  const _internals = { status: ParseStatus.Valid, data }
  const _ownChildren: ParseContext[] = []
  const _ownIssues: Issue[] = []

  const ctx: ParseContext<O, I> = {
    get type() {
      return type
    },
    get data() {
      return _internals.data
    },
    get dataType() {
      return getParsedType(ctx.data)
    },
    get path() {
      return [...path]
    },
    get parent() {
      return parent
    },
    get common() {
      return common
    },
    get ownChildren() {
      return [..._ownChildren]
    },
    get allChildren() {
      return [...ctx.ownChildren, ...ctx.ownChildren.flatMap((child) => child.allChildren)]
    },
    get ownIssues() {
      return [..._ownIssues]
    },
    get allIssues() {
      return [...ctx.ownIssues, ...ctx.allChildren.flatMap((child) => child.allIssues)]
    },
    setData: (data) => {
      _internals.data = data
      return ctx
    },
    clone: (def) => {
      const { type } = def
      const clone = ParseContext({ ...ctx, type })
      _ownChildren.push(clone)
      return clone
    },
    child: (def) => {
      const { type, data, path } = def
      const child = ParseContext({
        type,
        data,
        path: [...ctx.path, ...(path ?? [])],
        parent: ctx,
        common: ctx.common,
      })
      _ownChildren.push(child)
      return child
    },
    isValid: () => _internals.status === ParseStatus.Valid && ctx.allChildren.every((child) => child.isValid()),
    isInvalid: () => _internals.status === ParseStatus.Invalid || ctx.allChildren.some((child) => child.isInvalid()),
    setStatus: (status) => {
      if (ctx.isInvalid() || _internals.status === status) {
        return ctx
      }
      _internals.status = status
      ctx.parent?.setStatus(status)
      return ctx
    },
    addIssue: (kind, ...arguments_) => {
      if (ctx.common.abortEarly && ctx.isInvalid()) {
        return ctx
      }

      if (ctx.isValid()) {
        ctx.setStatus(ParseStatus.Invalid)
      }

      const [payload, message] =
        typeof arguments_[0] === 'string' ? [null, arguments_[0]] : [arguments_[0], arguments_[1]]

      const issue = {
        kind,
        payload,
        input: { data, type: ctx.dataType },
        path,
        typeName: ctx.type.typeName,
        typeHint: ctx.type.hint,
      } as Issue

      const issueMessage =
        message ??
        [ctx.common.contextualErrorMap, ctx.type._internals.errorMap, DEFAULT_ERROR_MAP]
          .filter(utils.isNonNullable)
          .reverse()
          .reduce((message, map) => map(issue, { defaultMessage: message }), '')

      _ownIssues.push({ ...issue, message: issueMessage })

      return ctx
    },
    INVALID_TYPE: ({ expected }) =>
      ctx.data === undefined
        ? ctx.addIssue(IssueKind.Required)
        : ctx.addIssue(IssueKind.InvalidType, { expected, received: ctx.dataType }),
    INVALID_LITERAL: ({ expected, received }) =>
      ctx.addIssue(IssueKind.InvalidLiteral, {
        expected: { value: expected, formatted: utils.literalize(expected) },
        received: { value: received, formatted: utils.literalize(received) },
      }),
    INVALID_UNION: ({ unionErrors }) => ctx.addIssue(IssueKind.InvalidUnion, { unionErrors }),
    INVALID_INSTANCE: ({ expected }) => ctx.addIssue(IssueKind.InvalidInstance, { expected: { className: expected } }),
    FORBIDDEN: () => ctx.addIssue(IssueKind.Forbidden),
    OK: (data) => ({ ok: true, data }),
    ABORT: () => ({ ok: false, error: new TError(ctx) }),
  }

  return ctx
}

const _handleCreateParseContext =
  (async: boolean) =>
  <O, I>(type: { readonly _O: O; readonly _I: I }, data: unknown, options: ParseOptions | undefined) =>
    ParseContext({
      type,
      data,
      path: [],
      parent: null,
      common: {
        ...utils.omit(utils.cloneDeep(options ?? {}), ['errorMap']),
        contextualErrorMap: options?.errorMap,
        async,
      },
    })

ParseContext.createSync = _handleCreateParseContext(false)
ParseContext.createAsync = _handleCreateParseContext(true)

/* ------------------------------------------------------------------------------------------------------------------ */
/*                                                     ParsedType                                                     */
/* ------------------------------------------------------------------------------------------------------------------ */

export enum TParsedType {
  Array = 'Array',
  BigInt = 'bigint',
  Boolean = 'boolean',
  Buffer = 'Buffer',
  Date = 'Date',
  Function = 'Function',
  Map = 'Map',
  NaN = 'NaN',
  Null = 'null',
  Number = 'number',
  Object = 'object',
  Promise = 'Promise',
  RegExp = 'RegExp',
  Set = 'Set',
  String = 'string',
  Symbol = 'symbol',
  Undefined = 'undefined',
  Unknown = 'unknown',
  Void = 'void',
}

export const getParsedType = (data: unknown): TParsedType => {
  switch (typeof data) {
    case 'string': {
      return TParsedType.String
    }
    case 'number': {
      if (Number.isNaN(data)) {
        return TParsedType.NaN
      }
      return TParsedType.Number
    }
    case 'bigint': {
      return TParsedType.BigInt
    }
    case 'boolean': {
      return TParsedType.Boolean
    }
    case 'symbol': {
      return TParsedType.Symbol
    }
    case 'function': {
      return TParsedType.Function
    }
    case 'undefined': {
      return TParsedType.Undefined
    }
    case 'object': {
      if (data === null) return TParsedType.Null
      if (Array.isArray(data)) return TParsedType.Array
      if (data instanceof Buffer) return TParsedType.Buffer
      if (data instanceof Date) return TParsedType.Date
      if (data instanceof Map) return TParsedType.Map
      if (data instanceof Promise) return TParsedType.Promise
      if (data instanceof RegExp) return TParsedType.RegExp
      if (data instanceof Set) return TParsedType.Set
      return TParsedType.Object
    }
  }
}
