import fp from 'fastify-plugin'
import serverSentEvents from 'fastify-sse-v2'
import { SsePluginOptions } from 'fastify-sse-v2/lib/types'

export default fp<SsePluginOptions>(async (fastify) => {
  fastify.register(serverSentEvents)
})
