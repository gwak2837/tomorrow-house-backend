import Replicate from 'replicate'

import { REPLICATE_API_TOKEN } from './constants.js'

export const replicate = new Replicate({
  auth: REPLICATE_API_TOKEN,
})
