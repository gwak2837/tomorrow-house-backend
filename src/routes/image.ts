import { randomUUID } from 'crypto'
import path from 'path'

import { Type } from '@sinclair/typebox'

import { App } from '../app.js'
import { bucket } from '../common/google-cloud.js'
import { replicate } from '../common/replicate.js'

type SSEClient = {
  id: string
  reply: any
}

export let sseClients: SSEClient[] = []

export default async (fastify: App, opts: Record<never, never>) => {
  fastify.get('/image', async (req, reply) => {
    const id = String(Date.now())
    sseClients.push({ id, reply })

    reply.sse({ event: 'sse-client-id', data: id })

    req.socket.on('close', () => {
      sseClients = sseClients.filter((client) => client.id !== id)
    })
  })

  fastify.post('/image/upload', async (req, reply) => {
    const files = req.files({ limits: { files: 1 } })
    let imageURL

    for await (const file of files) {
      if (!file) throw reply.badRequest('No file')

      if (!file.mimetype.startsWith('image/'))
        throw reply.badRequest('Only image file can be uploaded')

      if (!file.fieldname) throw reply.badRequest('Fieldname must be space category')

      const timestamp = ~~(Date.now() / 1000)
      const fileExtension = path.extname(file.filename)
      const fileName = `${timestamp}-${randomUUID()}${fileExtension}`
      const blobStream = bucket.file(fileName).createWriteStream()

      blobStream.on('error', (err) => {
        console.error(err)
        throw reply.serviceUnavailable('File upload to Google Cloud failed')
      })

      blobStream.on('finish', () => {
        imageURL = `https://storage.googleapis.com/${bucket.name}/${fileName}`
      })

      // 1. Stream
      // pipeline(file.file, blobStream)

      // 2. Buffer
      const buffer = await file.toBuffer()
      await new Promise((resolve) => {
        blobStream.end(buffer, () => resolve(''))
      })
    }

    return imageURL
  })

  const schema = {
    body: Type.Object({
      clientId: Type.String(),
      imageURL: Type.String(),
      spaceCategory: Type.String(),
    }),
  }

  fastify.post('/image/ai/i2i', { schema }, async (req, reply) => {
    const { clientId, imageURL, spaceCategory } = req.body

    const sseClient = sseClients.find((client) => client.id === clientId)
    if (!sseClient) throw reply.badRequest('No SSE client available')

    const i2iImageURLs = (await replicate.run(
      'hjgp/img2img:3aa53804847d9f1b29355673776a79348e9e287194c3135956a220bf9db7a58a',
      {
        input: {
          input_image: imageURL,
          space: spaceCategory,
        },
      },
    )) as string[]

    sseClient.reply.sse({
      event: 'images',
      id: 'ai',
      data: JSON.stringify(i2iImageURLs.map((url) => ({ url }))),
    })

    const segmentation = await replicate.run(
      'hjgp/ram:58287d22f600cfc60736d190ade7f7cf5e790d4a7313e88ba35a08b89bd5c7f6',
      { input: { input_image: imageURL } },
    )

    sseClient.reply.sse({
      event: 'images',
      id: 'ai',
      data: JSON.stringify(segmentation),
    })
  })

  const schema2 = {
    body: Type.Object({
      imageURL: Type.String(),
    }),
  }

  fastify.post('/image/ai/seg', { schema: schema2 }, async (req, reply) => {
    const { imageURL } = req.body

    const segmentation = await replicate.run(
      'hjgp/ram:58287d22f600cfc60736d190ade7f7cf5e790d4a7313e88ba35a08b89bd5c7f6',
      { input: { input_image: imageURL } },
    )
    console.log('👀 ~ segmentation:', segmentation)

    return segmentation
  })

  const schema3 = {
    body: Type.Object({
      targetImageURL: Type.String(),
      maskImageURL: Type.String(),
    }),
  }

  fastify.post('/image/ai/inpaint', { schema: schema3 }, async (req, reply) => {
    const { targetImageURL, maskImageURL } = req.body

    const inpaintImageURLs = await replicate.run(
      'hjgp/inpaint2img:405e2de5d9bc773467b0228a694b9ced2bde90780bd8b8c501645050dddf735f',
      {
        input: {
          input_image: targetImageURL,
          input_mask_image: maskImageURL,
        },
      },
    )
    console.log('👀 ~ inpaintImageURLs:', inpaintImageURLs)

    return inpaintImageURLs
  })
}
