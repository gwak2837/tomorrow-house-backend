import { Type } from '@sinclair/typebox'

import { App } from '../app'

export default async (fastify: App, opts: Record<never, never>) => {
  const schema = {
    querystring: Type.Object({
      foo: Type.Optional(Type.Number()),
      bar: Type.Optional(Type.String()),
    }),
    response: {
      200: Type.Object({
        hello: Type.String(),
        foo: Type.Optional(Type.Number()),
        bar: Type.Optional(Type.String()),
      }),
    },
  }

  fastify.get('/', { schema }, async (req, reply) => {
    return { hello: 'world' }
  })
}
