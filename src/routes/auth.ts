import { FastifyPluginAsync } from 'fastify'

const auth: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/auth', async (request, reply) => {
    return 'this is an example'
  })
}

export default auth
