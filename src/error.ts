import { GetIssuePayload, IssueKind, type AnyIssue, type Issue } from './issues'
import type { ParseContext, ParseContextOf } from './parse'
import { utils } from './utils'
import type { AnyZ, InputOf, OutputOf } from './z'

/* -------------------------------------------------------------------------- */
/*                                   ZError                                   */
/* -------------------------------------------------------------------------- */

export class ZError<Output = unknown, Input = Output> extends Error {
  readonly name = 'ZError'
  readonly parseContext: ParseContext<Output, Input>
  readonly issues: readonly AnyIssue[]
  readonly message: string

  private constructor(parseContext: ParseContext<Output, Input>) {
    super()
    this.parseContext = parseContext
    this.issues = this.parseContext.allIssues
    this.message = this._generateMessage()
  }

  private _generateMessage() {
    const issues = this.parseContext.allIssues
    return utils.jsonStringify(issues)
  }

  static create<T extends AnyZ>(
    parseContext: ParseContextOf<T>
  ): ZError<OutputOf<T>, InputOf<T>> {
    return new ZError(parseContext)
  }
}

/* -------------------------------------------------------------------------- */
/*                                  ErrorMap                                  */
/* -------------------------------------------------------------------------- */

export type ErrorMapIssue<K extends IssueKind = IssueKind> = Issue<
  K,
  { omitKeys: 'message' }
>

export type ErrorMapFunction<K extends IssueKind = IssueKind> = (
  issue: ErrorMapIssue<K>,
  ctx: { readonly defaultMessage: string }
) => string

export type ErrorMapDict = {
  [K in IssueKind]?: string | ErrorMapFunction
}

export type ErrorMap<K extends IssueKind = IssueKind> =
  | ErrorMapDict
  | ErrorMapFunction<K>

const tooSmallOrTooBigMessage = <T extends 'too_small' | 'too_big'>(
  kind: T,
  payload: GetIssuePayload<T>
) => {
  const {
    type,
    expected: { value, inclusive },
    received,
  } = payload

  const { atLeastOrAtMost, lessOrGreaterThan, lessOrMoreThan } = {
    [IssueKind.TooSmall]: {
      atLeastOrAtMost: 'at least',
      lessOrGreaterThan: 'greater than',
      lessOrMoreThan: 'more than',
    },
    [IssueKind.TooBig]: {
      atLeastOrAtMost: 'at most',
      lessOrGreaterThan: 'less than',
      lessOrMoreThan: 'less than',
    },
  }[kind]

  switch (type) {
    case 'string': {
      return `Expected string to contain ${
        inclusive ? atLeastOrAtMost : lessOrMoreThan
      } ${utils.stringifyInt(value)} ${utils.pluralize(
        'character',
        value
      )}; counted ${utils.stringifyInt(received)}`
    }
    case 'set':
    case 'array': {
      return `Expected ${type === 'set' ? 'Set' : 'array'} to contain ${
        inclusive ? atLeastOrAtMost : lessOrMoreThan
      } ${utils.stringifyInt(value)} ${utils.pluralize(
        'item',
        value
      )}; found ${utils.stringifyInt(received)}`
    }
    case 'number': {
      return `Expected number to be ${lessOrGreaterThan}${
        inclusive ? ' or equal to' : ''
      } ${utils.stringifyInt(value)}; got ${utils.stringifyInt(received)}`
    }
    case 'date': {
      return `Expected date to be ${lessOrGreaterThan}${
        inclusive ? ' or equal to' : ''
      } ${utils.stringifyInt(value)}; got ${utils.stringifyInt(received)}`
    }
  }
}

export const DEFAULT_ERROR_MAP: ErrorMapFunction = (issue) => {
  switch (issue.kind) {
    case IssueKind.Required: {
      return 'Required'
    }
    case IssueKind.InvalidType: {
      return `Expected ${
        utils.isArray(issue.payload.expected)
          ? `one of: ${utils.unionize(issue.payload.expected)}`
          : issue.payload.expected
      }; got ${issue.payload.received}`
    }
    case IssueKind.InvalidEnumValue: {
      return `Expected value to be one of: ${issue.payload.expected.formatted}; got: ${issue.payload.received.formatted}`
    }
    case IssueKind.InvalidLiteral: {
      return `Expected value to be ${issue.payload.expected.formatted}; got ${issue.payload.received.formatted}`
    }
    case IssueKind.InvalidUnion: {
      return `Expected input to match one of: ${issue.hint}`
    }
    case IssueKind.TooSmall:
    case IssueKind.TooBig: {
      return tooSmallOrTooBigMessage(issue.kind, issue.payload)
    }
    case IssueKind.Forbidden: {
      return 'Value not allowed'
    }
    case IssueKind.Custom: {
      return issue.payload.message || 'Custom validation failed'
    }
  }
}

export const resolveToErrorMapFunction = <K extends IssueKind>(
  errorMap: ErrorMap<K>,
  issue: Omit<AnyIssue, 'message'>
): ErrorMapFunction<K> => {
  if (typeof errorMap === 'function') {
    return errorMap
  }

  const errorMapDictEntry = errorMap[issue.kind]

  if (!errorMapDictEntry) {
    return DEFAULT_ERROR_MAP
  }

  return (issue, ctx) =>
    typeof errorMapDictEntry === 'string'
      ? errorMapDictEntry
      : errorMapDictEntry(issue, ctx)
}
