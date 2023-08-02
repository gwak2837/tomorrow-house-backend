import { randomUUID } from 'crypto'
import path from 'path'

import { Type } from '@sinclair/typebox'

import { App } from '../app.js'
import { bucket } from '../common/google-cloud.js'
import { replicate } from '../common/replicate.js'
import { generateUniqueId } from '../common/utils.js'

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

  type Image = {
    id: string
    url: string
    segmentation?: any
  }

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

    const images: Image[] = i2iImageURLs.map((url) => ({
      id: generateUniqueId(),
      url,
    }))

    sseClient.reply.sse({
      event: 'image',
      id: 'i2i',
      data: JSON.stringify(images),
    })

    for (const image of images) {
      replicate
        .run('hjgp/ram:af37d56889e57f4d37ed0cb663179049ee7448094a0eef0af55dcd6e81038f1b', {
          input: { input_image: image.url },
        })
        .then((segmentation) =>
          sseClient.reply.sse({
            event: 'segmentation',
            id: image.id,
            data: JSON.stringify((segmentation as string[])[3]),
          }),
        )
    }
  })

  const schema3 = {
    body: Type.Object({
      clientId: Type.String(),
      targetImageURL: Type.String(),
      maskImageURL: Type.String(),
    }),
  }

  fastify.post('/image/ai/inpaint', { schema: schema3 }, async (req, reply) => {
    const { clientId, targetImageURL, maskImageURL } = req.body

    const sseClient = sseClients.find((client) => client.id === clientId)
    if (!sseClient) throw reply.badRequest('No SSE client available')

    // 15~20 seconds
    const inpaintImageURLs = (await replicate.run(
      'hjgp/inpaint2img:9c0d69fae6f2435c4768eaf01eb841b470e90f6f121b643c3b200255a6e9b5a8',
      {
        input: {
          input_image: targetImageURL,
          input_mask_image: maskImageURL,
        },
      },
    )) as string[]

    const images: Image[] = inpaintImageURLs.map((url) => ({
      id: generateUniqueId(),
      url,
    }))

    sseClient.reply.sse({
      event: 'image',
      id: 'inpaint',
      data: JSON.stringify(images),
    })

    for (const image of images) {
      replicate
        .run('hjgp/ram:af37d56889e57f4d37ed0cb663179049ee7448094a0eef0af55dcd6e81038f1b', {
          input: { input_image: image.url },
        })
        .then((segmentation) =>
          sseClient.reply.sse({
            event: 'segmentation',
            id: image.id,
            data: JSON.stringify((segmentation as string[])[3]),
          }),
        )
    }
  })
}
