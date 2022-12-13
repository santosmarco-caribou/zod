import { DEFAULT_ERROR_MAP, type ErrorMap } from './error'

export class ZGlobal {
  private static readonly _instance = new ZGlobal()

  static get(): ZGlobal {
    return this._instance
  }

  private _currentErrorMap: ErrorMap = DEFAULT_ERROR_MAP

  getCurrentErrorMap(): ErrorMap {
    return this._currentErrorMap
  }

  setCurrentErrorMap(errorMap: ErrorMap): this {
    this._currentErrorMap = errorMap
    return this
  }
}
