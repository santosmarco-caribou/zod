import z from '../src/index'

describe('ZManifest', () => {
  test('works', () => {
    const schema = z
      .object({
        name: z.string(),
      })
      .title('Person')
      .summary('A person')
      .description('A person with a name')
      .version('1.0.0')
      .examples({ name: 'John Doe' })
      .tags('human', 'person')
      .notes('This is a person')
      .unit('person')
      .deprecated()
      .meta({ foo: 'bar' })

    expect(schema.manifest).toStrictEqual({
      title: 'Person',
      summary: 'A person',
      description: 'A person with a name',
      version: '1.0.0',
      examples: [{ name: 'John Doe' }],
      tags: ['human', 'person'],
      notes: ['This is a person'],
      unit: 'person',
      deprecated: true,
      meta: { foo: 'bar' },
    })
  })
})
