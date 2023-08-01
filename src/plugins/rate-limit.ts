import rateLimit, { RateLimitPluginOptions } from '@fastify/rate-limit'
import fp from 'fastify-plugin'

import { NODE_ENV } from '../common/constants'

export default fp<RateLimitPluginOptions>(async (fastify) => {
  fastify.register(rateLimit, {
    ...(NODE_ENV === 'development' && {
      allowList: ['127.0.0.1'],
    }),
  })
})
