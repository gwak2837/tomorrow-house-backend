import { Storage } from '@google-cloud/storage'

import { GOOGLE_CLOUD_STORAGE_BUCKET } from './constants.js'

export const bucket = new Storage().bucket(GOOGLE_CLOUD_STORAGE_BUCKET)
