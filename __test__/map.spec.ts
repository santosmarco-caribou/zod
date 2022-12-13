import { expectTypeOf } from 'expect-type'
import { z } from '../src/index'

const stringMap = z.map(z.string(), z.string())

describe('ZMap', () => {
  test('inference', () => {
    expectTypeOf<z.infer<typeof stringMap>>().toEqualTypeOf<Map<string, string>>()
  })

  test('valid parse', () => {
    const result = stringMap.safeParse(
      new Map([
        ['first', 'foo'],
        ['second', 'bar'],
      ])
    )
    expect(result.ok).toBe(true)
    expect(result.data?.has('first')).toBe(true)
    expect(result.data?.has('second')).toBe(true)
    expect(result.data?.get('first')).toBe('foo')
    expect(result.data?.get('second')).toBe('bar')
  })

  test('valid parse async', async () => {
    const result = await stringMap.safeParseAsync(
      new Map([
        ['first', 'foo'],
        ['second', 'bar'],
      ])
    )
    expect(result.ok).toBe(true)
    expect(result.data?.has('first')).toBe(true)
    expect(result.data?.has('second')).toBe(true)
    expect(result.data?.get('first')).toBe('foo')
    expect(result.data?.get('second')).toBe('bar')
  })

  test('throws when a Set is given', () => {
    const result = stringMap.safeParse(new Set([]))
    expect(result.ok).toBe(false)
    expect(result.error?.issues).toHaveLength(1)
    expect(result.error?.issues[0].kind).toEqual(z.IssueKind.InvalidType)
  })

  test('throws when the given map has invalid key and invalid input', () => {
    const result = stringMap.safeParse(new Map([[42, Symbol()]]))
    expect(result.ok).toBe(false)
    expect(result.error?.issues).toHaveLength(2)
    expect(result.error?.issues[0].kind).toEqual(z.IssueKind.InvalidType)
    expect(result.error?.issues[0].path).toEqual([0, 'key'])
    expect(result.error?.issues[1].kind).toEqual(z.IssueKind.InvalidType)
    expect(result.error?.issues[1].path).toEqual([0, 'value'])
  })

  test('throws when the given map has multiple invalid entries', () => {
    const result = stringMap.safeParse(
      new Map<number | string, number | string>([
        [1, 'foo'],
        ['bar', 2],
      ])
    )
    expect(result.ok).toBe(false)
    expect(result.error?.issues).toHaveLength(2)
    expect(result.error?.issues[0].kind).toEqual(z.IssueKind.InvalidType)
    expect(result.error?.issues[0].path).toEqual([0, 'key'])
    expect(result.error?.issues[1].kind).toEqual(z.IssueKind.InvalidType)
    expect(result.error?.issues[1].path).toEqual([1, 'value'])
  })
})
