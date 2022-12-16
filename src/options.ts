import type { ErrorMap } from './error'
import type { IssueKind } from './issues'
import { utils } from './utils'

export interface RCOOptions {
  additionalIssueKind?: utils.StrictExclude<IssueKind, IssueKind.Required | IssueKind.InvalidType>
}

export interface MetaObject {
  readonly title?: string
  readonly summary?: string
  readonly description?: string
  readonly [k: string]: unknown
}

export type RawCreateOptions<T extends RCOOptions | null = null> = { readonly meta?: MetaObject } & (
  | {
      readonly errorMap?: ErrorMap
      readonly messages?: never
    }
  | {
      readonly errorMap?: never
      readonly messages?: {
        [K in IssueKind.Required | IssueKind.InvalidType | ((T & RCOOptions)['additionalIssueKind'] & IssueKind)]?:
          | string
          | ErrorMap<K>
      }
    }
)

export type CreateOptions<T extends RCOOptions | null = null> = utils.Simplify<RawCreateOptions<T>>

export interface ProcessedCreateOptions {
  readonly meta: MetaObject
  readonly errorMap: ErrorMap | undefined
}

export const toptions = {
  processCreate: (rawOptions: CreateOptions | undefined): ProcessedCreateOptions => {
    const processErrorMap = () => {
      if (!rawOptions) {
        return { errorMap: undefined }
      }
      const { errorMap, messages } = rawOptions
      if (errorMap) {
        return { errorMap }
      }
      const processedErrorMap: ErrorMap = (issue, ctx) => {
        if (!messages || !utils.includes(utils.keys(messages), issue.kind)) {
          return ctx.defaultMessage
        }
        const message = messages?.[issue.kind]
        if (typeof message === 'string') {
          return message
        }
        if (typeof message === 'function') {
          return message(issue as never, ctx)
        }
        return ctx.defaultMessage
      }
      return { errorMap: processedErrorMap }
    }
    return { ...processErrorMap(), meta: rawOptions?.meta ?? {} }
  },
}
