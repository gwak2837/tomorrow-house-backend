import { randomUUID } from 'crypto'
import path from 'path'

import { FastifyPluginAsync } from 'fastify'

import { App } from '../app'
import { bucket } from '../common/google-cloud'
import { replicate } from '../common/replicate'

export default async (fastify: App, opts: Record<never, never>) => {
  fastify.post('/upload/image', async (req, res) => {
    const files = req.files({ limits: { files: 1 } })
    let result

    for await (const file of files) {
      if (!file) throw fastify.httpErrors.badRequest('No file')

      if (!file.mimetype.startsWith('image/'))
        throw fastify.httpErrors.badRequest('Only image file can be uploaded')

      const timestamp = ~~(Date.now() / 1000)
      const fileExtension = path.extname(file.filename)
      const fileName = `${timestamp}-${randomUUID()}${fileExtension}`
      const blobStream = bucket.file(fileName).createWriteStream()

      blobStream.on('error', (err) => {
        console.error(err)
        throw fastify.httpErrors.serviceUnavailable('File upload to Google Cloud failed')
      })

      blobStream.on('finish', () => {
        result = {
          fileName: file.filename,
          url: `https://storage.googleapis.com/${bucket.name}/${fileName}`,
        }
      })

      // 1. Stream
      // pipeline(file.file, blobStream)

      // 2. Buffer
      await new Promise(async (resolve) => blobStream.end(await file.toBuffer(), () => resolve('')))
    }

    return res.send(result)
  })

  fastify.post('/upload/image/ai', async (req, reply) => {
    const files = req.files({ limits: { files: 1 } })
    const imageGCP = { fileName: '', url: '' }

    // GCP image upload
    for await (const file of files) {
      if (!file) throw fastify.httpErrors.badRequest('No file')

      if (!file.mimetype.startsWith('image/'))
        throw fastify.httpErrors.badRequest('Only image file can be uploaded')

      const timestamp = ~~(Date.now() / 1000)
      const fileExtension = path.extname(file.filename)
      const fileName = `${timestamp}-${randomUUID()}${fileExtension}`
      const blobStream = bucket.file(fileName).createWriteStream()
      console.log('👀 ~ fileName:', fileName)

      blobStream.on('error', (err) => {
        console.error(err)
        throw fastify.httpErrors.serviceUnavailable('File upload to Google Cloud failed')
      })

      blobStream.on('finish', () => {
        imageGCP.fileName = file.filename
        imageGCP.url = `https://storage.googleapis.com/${bucket.name}/${fileName}`
      })

      // 1. Stream
      // pipeline(file.file, blobStream)

      // 2. Buffer
      const buffer = await file.toBuffer()
      await new Promise((resolve) => {
        blobStream.end(buffer, () => resolve(''))
      })
    }

    if (!imageGCP.url)
      throw fastify.httpErrors.serviceUnavailable('File upload to Google Cloud failed')

    reply.sse({ id: 'image-gcp', data: JSON.stringify(imageGCP) })

    // AI: image to image
    const result = await replicate.run(
      'hjgp/dep2img:728be3b7e4b13b9d0449d33924aabb199a5395ccaf930421461982b6add31a74',
      {
        input: {
          before_image_path: imageGCP.url,
        },
      },
    )

    reply.sse({ id: 'image-ai', data: JSON.stringify(result) })

    // AI: image to coords
    const result2 = await replicate.run(
      'hjgp/dep2img:728be3b7e4b13b9d0449d33924aabb199a5395ccaf930421461982b6add31a74',
      {
        input: {
          before_image_path: imageGCP.url,
        },
      },
    )

    reply.sse({ id: 'image-coords', data: JSON.stringify(result2) })

    reply.sseContext.source.end()
  })
}
