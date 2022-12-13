import { z } from '../../src/index'

export const complexSchema = z.object({
  union1: z.union([
    z.string().nullable().optional(),
    z.number().nullable().optional(),
    z.boolean().nullable().optional(),
    z.null().nullable().optional(),
    z.undefined().nullable().optional(),
    z.string().nullable().optional(),
  ]),
  merged: z
    .object({ k1: z.string().optional() })
    .merge(z.object({ k1: z.string().nullable(), k2: z.number() })),
  union2: z.array(z.union([z.string(), z.number()])),
  array: z.array(z.number()),
  sumMinLength: z.array(z.number()),
  union3: z.union([
    z.object({ p1: z.string().optional() }),
    z.object({ p1: z.number().optional() }),
  ]),
})
