import { z } from '../src'

const ChildlessPerson = z.object({
  firstName: z.any(),
  middleName: z.string().optional(),
  lastName: z.string(),
  age: z.number(),
  birthDate: z.date(),
  isAlive: z.boolean(),
  email: z.any(),
  gender: z.enum(['male', 'female', 'other']),
})

export const Person = ChildlessPerson.extend({
  children: z.array(ChildlessPerson.readonly()),
})

type Person = z.infer<typeof Person>
