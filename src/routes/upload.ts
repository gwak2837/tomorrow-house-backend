import { randomUUID } from 'crypto'
import path from 'path'

import { FastifyPluginAsync } from 'fastify'

import { App } from '../app'
import { bucket } from '../common/google-cloud'

export default async (fastify: App, opts: Record<never, never>) => {
  fastify.post('/upload/image', async (req, reply) => {
    const files = req.files()
    const result: any[] = []

    for await (const file of files) {
      if (file.file) {
        if (!file.mimetype.startsWith('image/'))
          throw fastify.httpErrors.badRequest('이미지 파일만 업로드할 수 있습니다')

        const timestamp = ~~(Date.now() / 1000)
        const fileExtension = path.extname(file.filename)
        const fileName = `${timestamp}-${randomUUID()}${fileExtension}`
        const blobStream = bucket.file(fileName).createWriteStream()

        blobStream.on('error', (err) => {
          console.error(err)
          throw fastify.httpErrors.serviceUnavailable('File upload to Google Cloud failed')
        })

        blobStream.on('finish', () => {
          result.push({
            fileName: file.filename,
            url: `https://storage.googleapis.com/${bucket.name}/${fileName}`,
          })
        })

        // 1. Stream
        // pipeline(file.file, blobStream)

        // 2. Buffer
        const buffer = await file.toBuffer()
        await new Promise((resolve) => {
          blobStream.end(buffer, () => resolve(''))
        })
      }
    }

    return reply.send(result)
  })
}
