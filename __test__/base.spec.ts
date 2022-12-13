import { z } from '../src/index'

describe('BaseZ', () => {
  let sut: z.AnyZBase

  beforeEach(() => {
    sut = new z.ZBase({ typeName: z.ZTypeName.Any })
  })

  test('id', () => {
    expect(typeof sut.id).toBe('string')
  })

  test('typeName', () => {
    expect(sut.typeName).toBe(z.ZTypeName.Any)
  })

  test('clone', () => {
    const cloned = sut.clone()
    expect(cloned).not.toBe(sut)
    expect(cloned.id).not.toBe(sut.id)
  })

  test('_createWithMergedDef', () => {
    const initial = z.boolean().title('foo').summary('bar').examples(true, false).abortEarly()
    const merged = initial.true()
    expect(merged.typeName).toBe(z.ZTypeName.Literal)
    expect(merged.id).not.toBe(initial.id)
    expect(merged.manifest.title).toBe('foo')
    expect(merged.manifest.summary).toBe('bar')
    expect(merged.manifest.examples).toEqual([true, false])
    expect(merged.options.abortEarly).toBe(true)
  })
})
