import { randomUUID } from 'crypto'
import path from 'path'

import { App } from '../app'
import { bucket } from '../common/google-cloud'
import { replicate } from '../common/replicate'
import { sleep } from '../common/utils'

type SSEClient = {
  id: string
  reply: any
}

export let sseClients: SSEClient[] = []

export default async (fastify: App, opts: Record<never, never>) => {
  fastify.post('/upload/image', async (req, res) => {
    const files = req.files({ limits: { files: 1 } })
    let result

    for await (const file of files) {
      console.log('👀 ~ file:', file)
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

  fastify.get('/upload/image/ai', async (req, reply) => {
    const id = String(Date.now())
    sseClients.push({ id, reply })

    reply.sse({ event: 'sse-client-id', data: id })

    req.socket.on('close', () => {
      sseClients = sseClients.filter((client) => client.id !== id)
    })
  })

  fastify.post('/upload/image/ai', async (req, reply) => {
    const files = req.files({ limits: { files: 1 } })
    const imageGCP = { url: '', description: '' }
    let sseClient

    // GCP image upload
    for await (const file of files) {
      if (!file) throw reply.badRequest('No file')

      if (!file.fieldname || typeof +file.fieldname !== 'number')
        throw reply.badRequest('Fieldname must be SSE client id (number)')

      if (!file.mimetype.startsWith('image/'))
        throw reply.badRequest('Only image file can be uploaded')

      sseClient = sseClients.find((client) => client.id === file.fieldname)

      const timestamp = ~~(Date.now() / 1000)
      const fileExtension = path.extname(file.filename)
      const fileName = `${timestamp}-${randomUUID()}${fileExtension}`
      const blobStream = bucket.file(fileName).createWriteStream()

      blobStream.on('error', (err) => {
        console.error(err)
        throw fastify.httpErrors.serviceUnavailable('File upload to Google Cloud failed')
      })

      blobStream.on('finish', () => {
        imageGCP.url = `https://storage.googleapis.com/${bucket.name}/${fileName}`
        imageGCP.description = file.filename
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

    if (!sseClient) throw reply.badRequest('No SSE client available')

    sseClient.reply.sse({ event: 'images', id: 'gcp', data: JSON.stringify([imageGCP]) })

    // AI: image to image
    const imageURLs = (await replicate.run(
      'hjgp/dep2img:728be3b7e4b13b9d0449d33924aabb199a5395ccaf930421461982b6add31a74',
      {
        input: {
          before_image_path: imageGCP.url,
        },
      },
    )) as string[]

    sseClient.reply.sse({
      event: 'images',
      id: 'ai',
      data: JSON.stringify(imageURLs.map((url) => ({ url }))),
    })

    // // AI: image to coords
    // const result2 = await replicate.run(
    //   'hjgp/dep2img:728be3b7e4b13b9d0449d33924aabb199a5395ccaf930421461982b6add31a74',
    //   {
    //     input: {
    //       before_image_path: imageGCP.url,
    //     },
    //   },
    // )
    // console.log('👀 ~ result2:', result2)

    // sseClient.reply.sse({ event: 'coords', data: JSON.stringify(result2) })
  })

  fastify.get('/upload/image/ai/object', async (req, reply) => {})
}
