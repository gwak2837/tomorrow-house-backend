import 'dotenv/config'

import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import closeWithGrace from 'close-with-grace'
import Fastify from 'fastify'

import {
  FASTIFY_CLOSE_GRACE_DELAY,
  LOCALHOST_HTTPS_CERT,
  LOCALHOST_HTTPS_KEY,
  PGURI,
  PORT,
} from './common/constants'
import { pool } from './common/postgres'
import multipart from './plugins/multipart'
import sensible from './plugins/sensible'
import support from './plugins/support'
import auth from './routes/auth'
import root from './routes/root'
import upload from './routes/upload'

// Instantiate Fastify with some config
export const app = Fastify({
  // logger: NODE_ENV === 'development',
  http2: true,

  ...(LOCALHOST_HTTPS_KEY &&
    LOCALHOST_HTTPS_CERT && {
      https: {
        key: `-----BEGIN PRIVATE KEY-----\n${LOCALHOST_HTTPS_KEY}\n-----END PRIVATE KEY-----`,
        cert: `-----BEGIN CERTIFICATE-----\n${LOCALHOST_HTTPS_CERT}\n-----END CERTIFICATE-----`,
      },
    }),
}).withTypeProvider<TypeBoxTypeProvider>()

app.register(async (fastify, opts): Promise<void> => {
  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  fastify.register(multipart)
  fastify.register(sensible)
  fastify.register(support)
  fastify.register(multipart)

  // This loads all plugins defined in routes
  // define your routes in one of these
  fastify.register(upload)
  fastify.register(auth)
  fastify.register(root)
})

// delay is the number of milliseconds for the graceful close to finish
const closeListeners = closeWithGrace(
  { delay: +FASTIFY_CLOSE_GRACE_DELAY || 500 },
  async function ({ signal, err, manual }) {
    if (err) {
      app.log.error(err)
    }
    await app.close()
  },
)

app.addHook('onClose', (instance, done) => {
  closeListeners.uninstall()
  done()
})

// Start listening
app.listen({ port: +PORT || 4000 }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})

// Connect to the database server
pool
  .query('SELECT CURRENT_TIMESTAMP')
  .then(({ rows }) =>
    console.log(
      `🚅 Connected to ${PGURI} at ${new Date(rows[0].current_timestamp).toLocaleString()}`,
    ),
  )
  .catch((error) => console.error('Cannot connect to PostgreSQL server... \n' + error))

// replicate.run(
//   'cjwbw/semantic-segment-anything:b2691db53f2d96add0051a4a98e7a3861bd21bf5972031119d344d956d2f8256',
//   {
//     input: {
//       image: '...',
//     },
//   },
// )
