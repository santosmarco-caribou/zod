# SuperParsing

- [SuperParsing](#superparsing)
  - [Setup \& Installation](#setup--installation)
    - [Setup](#setup)
    - [Installation](#installation)
      - [Node.js](#nodejs)
      - [Deno](#deno)
  - [Basic usage](#basic-usage)
  - [Primitives](#primitives)

## Setup & Installation

### Setup

1. Make sure you have TypeScript version `4.1` or higher installed.
2. Enable the `strict` mode in your `tsconfig.json` file.

```json
{
  // ...
  "compilerOptions": {
    // ...
    "strict": true
  }
}
```

### Installation

#### Node.js

```sh
# npm
npm install z

# yarn
yarn add z

# pnpm
pnpm add z
```

#### Deno

Unlike Node, Deno relies on direct URL imports instead of a package manager like NPM for example. The `z` library is available on [deno.land/x](https://deno.land/x). The latest version can be imported like so:

```ts
import { z } from 'https://deno.land/x/z/mod.ts'
```

You can also specify a particular version if you'd like:

```ts
import { z } from 'https://deno.land/x/z@v3.16.1/mod.ts'
```

> The rest of this README assumes you are using a Node.js package manager (NPM, Yarn etc.), and importing directly from the `z` package.

## Basic usage

Creating a simple string schema

```ts twoslashes
import { z } from 'z'

// creating a string schema
const myStringSchema = z.string()

// parsing
myStringSchema.parse('tuna') // => "tuna"
myStringSchema.parse(12) // => throws ZError

// "safe" parsing: does not throw on failures
myStringSchema.safeParse('tuna') // => { ok: true; data: "tuna" }
myStringSchema.safeParse(12) // => { ok: false; error: ZError }
```

Creating a more complex object schema

```ts
import { z } from 'z'

const User = z.object({
  username: z.string(),
})

User.parse({ username: 'foo' })

type User = z.infer<typeof User> // use `infer` to extract the inferred type
// => { username: string }
```

## Primitives

```ts
import { z } from 'z'

// literally primitives
z.string()
z.number()
z.bigint()
z.boolean()
z.date()
z.symbol()

// empty types
z.undefined()
z.null()
z.void() // accepts undefined

// catchall types: all values will be considered valid
z.any()
z.unknown()

// never type: no values will ever be considered valid
z.never()
```
