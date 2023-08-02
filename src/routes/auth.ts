import { App } from '../app.js'

export default async (fastify: App, opts: Record<never, never>) => {
  fastify.get('/auth', async (request, reply) => {
    return 'this is an example'
  })
}
