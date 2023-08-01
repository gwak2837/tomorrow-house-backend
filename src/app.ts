import 'dotenv/config'

import { networkInterfaces } from 'os'

import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import closeWithGrace from 'close-with-grace'
import Fastify from 'fastify'

import {
  FASTIFY_CLOSE_GRACE_DELAY,
  K_SERVICE,
  LOCALHOST_HTTPS_CERT,
  LOCALHOST_HTTPS_KEY,
  NODE_ENV,
  PGURI,
  PORT,
  PROJECT_ENV,
} from './common/constants'
import { pool } from './common/postgres'
import { replicate } from './common/replicate'
import cors from './plugins/cors'
import multipart from './plugins/multipart'
import rateLimit from './plugins/rate-limit'
import sensible from './plugins/sensible'
import serverSentEvents from './plugins/server-sent-events'
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

export type App = typeof app

app.register(cors)
app.register(multipart)
app.register(rateLimit)
app.register(sensible)
app.register(serverSentEvents)
app.register(support)

app.register(auth)
app.register(root)
app.register(upload)

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
const nets = networkInterfaces()

app
  .listen({
    host: K_SERVICE || PROJECT_ENV === 'local-docker' ? '0.0.0.0' : 'localhost',
    port: +PORT || 4000,
  })
  .then((url) => {
    console.log(`🚀 Server ready at: ${url}`)
    if (NODE_ENV !== 'production' && nets.en0)
      console.log(`🚀 On Your Network: https://${nets.en0[1].address}:${PORT}`)
  })
  .catch((error) => console.error('Cannot start API server... \n' + error))

// Connect to the database server
pool
  .query('SELECT CURRENT_TIMESTAMP')
  .then(({ rows }) =>
    console.log(
      `🚅 Connected to ${PGURI} at ${new Date(rows[0].current_timestamp).toLocaleString()}`,
    ),
  )
  .catch((error) => console.error('Cannot connect to PostgreSQL server... \n' + error))

// replicate
//   .run('hjgp/dep2img:728be3b7e4b13b9d0449d33924aabb199a5395ccaf930421461982b6add31a74', {
//     input: {
//       before_image_path: '',
//     },
//   })
//   .then((a2) => {
//     console.log(JSON.stringify(a2, null, 2))
//   })
//   .catch((error) => console.error('Cannot connect to Replicate server... \n' + error))
