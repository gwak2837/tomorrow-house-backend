// 자동
export const NODE_ENV = process.env.NODE_ENV as string
export const K_SERVICE = process.env.K_SERVICE as string // GCP에서 실행 중일 때

// 공통
export const PORT = process.env.PORT as string

export const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN as string

export const FASTIFY_CLOSE_GRACE_DELAY = process.env.FASTIFY_CLOSE_GRACE_DELAY as string

export const GOOGLE_CLOUD_STORAGE_BUCKET = process.env.GOOGLE_CLOUD_STORAGE_BUCKET as string

export const REDIS_CONNECTION_STRING = process.env.REDIS_CONNECTION_STRING as string

export const PGURI = process.env.PGURI as string

export const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID as string
export const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET as string

// 개별
export const LOCALHOST_HTTPS_KEY = process.env.LOCALHOST_HTTPS_KEY as string
export const LOCALHOST_HTTPS_CERT = process.env.LOCALHOST_HTTPS_CERT as string

export const POSTGRES_CA = process.env.POSTGRES_CA as string
export const POSTGRES_CERT = process.env.POSTGRES_CERT as string
export const POSTGRES_KEY = process.env.POSTGRES_KEY as string

export const REDIS_CA = process.env.REDIS_CA as string
export const REDIS_CLIENT_KEY = process.env.REDIS_CLIENT_KEY as string
export const REDIS_CLIENT_CERT = process.env.REDIS_CLIENT_CERT as string

////////////////////////////////////////
export const PROJECT_ENV = process.env.PROJECT_ENV as string
export const FRONTEND_URL = process.env.FRONTEND_URL as string
