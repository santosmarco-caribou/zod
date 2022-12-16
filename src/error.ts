import { IssueKind, type Issue } from './issues'
import type { ParseContext } from './parse'
import { utils } from './utils'

export class TError<O = unknown, I = O> extends Error {
  readonly name = 'TError'

  readonly issues = this._parseContext.allIssues

  constructor(private readonly _parseContext: ParseContext<O, I>) {
    super()
  }
}

export interface ErrorMapContext {
  readonly defaultMessage: string
}

export type ErrorMap<T extends IssueKind = IssueKind> = (
  issue: T extends unknown ? utils.StrictOmit<Issue<T>, 'message'> : never,
  ctx: ErrorMapContext
) => string

export const DEFAULT_ERROR_MAP: ErrorMap = (issue, ctx) => {
  switch (issue.kind) {
    case IssueKind.Required: {
      return 'Required'
    }
    case IssueKind.InvalidType: {
      return `Expected ${issue.payload.expected}, received ${issue.payload.received}`
    }
    default: {
      return ctx.defaultMessage
    }
  }
}
