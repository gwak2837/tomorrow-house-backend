import multipart, { FastifyMultipartOptions } from '@fastify/multipart'
import fp from 'fastify-plugin'

export default fp<FastifyMultipartOptions>(async (fastify) => {
  fastify.register(multipart, {
    limits: {
      fieldNameSize: 100, // Max field name size in bytes
      fieldSize: 100, // Max field value size in bytes
      fields: 10, // Max number of non-file fields
      fileSize: 10_000_000, // For multipart forms, the max file size in bytes
      files: 10, // Max number of file fields
      headerPairs: 2000, // Max number of header key=>value pairs
    },
  })
})
