import cors, { FastifyCorsOptions } from '@fastify/cors'
import fp from 'fastify-plugin'

export default fp<FastifyCorsOptions>(async (fastify) => {
  fastify.register(cors, {
    origin: [
      'localhost',
      'localhost:3000',
      'http://localhost:3000',
      'http://localhost:3002',
      'https://tomorrow-house.app',
      'https://tomorrow-house.vercel.app',
      'https://tomorrow-house-git-dev-gwak2837.vercel.app',
      /^https:\/\/tomorrow-house-[a-z0-9]{1,20}-gwak2837\.vercel\.app/,
    ],
  })
})
