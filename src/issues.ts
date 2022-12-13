import type { ZError } from './error'
import type { ParsedType, ParsePath } from './parse'
import type { ZTypeName } from './type-names'
import type { ZEnumValue, ZLiteralValue } from './types'
import type { utils } from './utils'

export const IssueKind = {
  Required: 'required',
  InvalidType: 'invalid_type',
  InvalidEnumValue: 'invalid_enum_value',
  InvalidLiteral: 'invalid_literal',
  InvalidUnion: 'invalid_union',
  TooSmall: 'too_small',
  TooBig: 'too_big',
  Forbidden: 'forbidden',
  Custom: 'custom',
} as const

export type IssueKind = typeof IssueKind[keyof typeof IssueKind]

export type IssuePayload = utils.AnyReadonlyRecord | null

export interface IssueInput {
  readonly data: unknown
  readonly type: ParsedType
}

export type MakeIssue<Payload extends IssuePayload> = {
  readonly input: IssueInput
  readonly path: ParsePath
  readonly message: string
  readonly origin: ZTypeName
  readonly hint: string
} & {
  0: { readonly payload: Payload }
  1: unknown
}[utils.Equals<Payload, null>]

export type IssueMapBase = {
  readonly [IssueKind.Required]: MakeIssue<null>
  readonly [IssueKind.InvalidType]: MakeIssue<{
    readonly expected:
      | ParsedType
      | readonly Exclude<ParsedType, readonly unknown[]>[]
    readonly received: ParsedType
  }>
  readonly [IssueKind.InvalidEnumValue]: MakeIssue<{
    readonly expected: {
      readonly values: readonly ZEnumValue[]
      readonly formatted: string
    }
    readonly received: {
      readonly value: ZEnumValue
      readonly formatted: string
    }
  }>
  readonly [IssueKind.InvalidLiteral]: MakeIssue<{
    readonly expected: {
      readonly value: ZLiteralValue
      readonly formatted: string
    }
    readonly received: {
      readonly value: ZLiteralValue
      readonly formatted: string
    }
  }>
  readonly [IssueKind.InvalidUnion]: MakeIssue<{
    readonly unionErrors: readonly ZError[]
  }>
  readonly [IssueKind.TooSmall]: MakeIssue<{
    readonly type: 'string' | 'number' | 'date' | 'array' | 'set'
    readonly expected: { readonly value: number; readonly inclusive: boolean }
    readonly received: number
  }>
  readonly [IssueKind.TooBig]: MakeIssue<{
    readonly type: 'string' | 'number' | 'date' | 'array' | 'set'
    readonly expected: { readonly value: number; readonly inclusive: boolean }
    readonly received: number
  }>
  readonly [IssueKind.Forbidden]: MakeIssue<null>
  readonly [IssueKind.Custom]: MakeIssue<{
    readonly message?: string
    readonly params?: utils.AnyReadonlyRecord
  }>
}

interface IssueOptions {
  omitKeys?: keyof utils.UnionToIntersection<utils.ValueOf<IssueMap>>
  intersect?: utils.AnyReadonlyRecord
}

export type IssueMap<Options extends IssueOptions = utils.Empty<IssueOptions>> =
  {
    [K in IssueKind]: Omit<
      IssueMapBase[K] & { readonly kind: K },
      Options['omitKeys'] extends string ? Options['omitKeys'] : never
    > &
      (Options['intersect'] extends utils.AnyReadonlyRecord
        ? Options['intersect']
        : unknown)
  }

export type Issue<
  T extends IssueKind = IssueKind,
  Options extends IssueOptions = utils.Empty<IssueOptions>
> = IssueMap<Options>[T]

export type AnyIssue = Issue<
  IssueKind,
  {
    omitKeys: 'kind' | 'payload'
    intersect: {
      readonly kind: IssueKind
      readonly payload: unknown
    }
  }
>

export type IssueHasPayload<T extends IssueKind> = T extends unknown
  ? utils.Extends<'payload', keyof Issue<T>>
  : never

export type GetIssuePayload<T extends IssueKind> = T extends unknown
  ? 'payload' extends keyof Issue<T>
    ? Issue<T>['payload']
    : never
  : never

export type PickFromIssuePayload<
  T extends IssueKind,
  K extends keyof Issue<T>['payload' & keyof Issue<T>]
> = Pick<Issue<T>['payload' & keyof Issue<T>], K>

export type OmitFromIssuePayload<
  T extends IssueKind,
  K extends keyof Issue<T>['payload' & keyof Issue<T>]
> = utils.StrictOmit<Issue<T>['payload' & keyof Issue<T>], K>

export type GetIssueCheckKind<T extends IssueKind> = Extract<
  Issue<T>,
  { readonly payload: { readonly check: string } }
>['payload']['check']
