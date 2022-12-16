import type { TError } from './error'
import type { ParsePath, TParsedType } from './parse'
import type { TTypeName } from './type-names'
import type { TStringCheck } from './types'
import type { utils } from './utils'

export enum IssueKind {
  Required = 'required',
  InvalidType = 'invalid_type',
  InvalidString = 'invalid_string',
  InvalidEnumValue = 'invalid_enum_value',
  InvalidLiteral = 'invalid_literal',
  InvalidUnion = 'invalid_union',
  InvalidInstance = 'invalid_instance',
  TooSmall = 'too_small',
  TooBig = 'too_big',
  Forbidden = 'forbidden',
  Custom = 'custom',
}

export type IssuePayload = Record<string, unknown> | null

export interface IssueInput {
  readonly data: unknown
  readonly type: TParsedType
}

type MakeIssue<P extends IssuePayload> = {
  readonly input: IssueInput
  readonly path: ParsePath
  readonly message: string
  readonly typeName: TTypeName
  readonly typeHint: string
} & (P extends null ? unknown : { readonly payload: P })

export type IssueMap = {
  [IssueKind.Required]: MakeIssue<null>
  [IssueKind.InvalidType]: MakeIssue<{
    readonly expected: TParsedType
    readonly received: TParsedType
  }>
  [IssueKind.InvalidString]: TStringCheck
  [IssueKind.InvalidEnumValue]: MakeIssue<{
    readonly expected: { readonly values: readonly (string | number)[]; readonly formatted: string }
    readonly received: { readonly value: string | number; readonly formatted: string }
  }>
  [IssueKind.InvalidLiteral]: MakeIssue<{
    readonly expected: { readonly value: utils.Primitive; readonly formatted: utils.Literalize }
    readonly received: { readonly value: utils.Primitive; readonly formatted: utils.Literalize }
  }>
  [IssueKind.InvalidUnion]: MakeIssue<{
    readonly unionErrors: readonly TError[]
  }>
  [IssueKind.InvalidInstance]: MakeIssue<{
    readonly expected: { readonly className: string }
  }>
  [IssueKind.TooSmall]: MakeIssue<{
    readonly type: 'string' | 'number' | 'date' | 'array' | 'set'
    readonly expected: { readonly value: number; readonly inclusive: boolean }
    readonly received: number
  }>
  [IssueKind.TooBig]: MakeIssue<{
    readonly type: 'string' | 'number' | 'date' | 'array' | 'set'
    readonly expected: { readonly value: number; readonly inclusive: boolean }
    readonly received: number
  }>
  [IssueKind.Forbidden]: MakeIssue<null>
  [IssueKind.Custom]: MakeIssue<{
    readonly message?: string
    readonly params?: unknown
  }>
} extends infer X
  ? { [K in keyof X]: X[K] & { readonly kind: K } }
  : never

export type Issue<K extends IssueKind = IssueKind> = IssueMap[K]

export type MakeChecks<T extends Record<string, Record<string, unknown> | null>> = {
  [K in keyof T]: MakeIssue<
    (T[K] extends null ? unknown : T[K]) & {
      readonly check: K
      readonly message?: string | undefined
    }
  >
}[keyof T]

export namespace checks {
  export type Base = { readonly payload: { readonly check: string } }

  type MinMaxLengthSize<T extends 'min' | 'max' | 'length' | 'size', V = number> = utils.Simplify<
    { readonly [K in T]: V } & { readonly inclusive?: boolean }
  >
  export type Min<V = number> = MinMaxLengthSize<'min', V>
  export type Max<V = number> = MinMaxLengthSize<'max', V>
  export type Length<V = number> = MinMaxLengthSize<'length', V>
  export type Size<V = number> = MinMaxLengthSize<'size', V>

  export type Get<T extends Base, C extends T['payload']['check']> = Extract<
    T,
    { readonly payload: { readonly check: C } }
  >

  export type PayloadOf<T extends Base, C extends T['payload']['check'] = T['payload']['check']> = Required<
    Get<T, C>['payload']
  >

  export type OptionsOf<T extends Base, C extends T['payload']['check'] = T['payload']['check']> = Get<
    T,
    C
  >['payload'] extends infer P
    ? utils.Simplify<Pick<P, utils.OptionalKeysOf<P>>>
    : never
}
