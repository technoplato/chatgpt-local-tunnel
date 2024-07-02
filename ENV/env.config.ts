import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  NGROK_AUTH: z.string(),
  NGROK_DOMAIN: z.string(),
  USER_PROJECT_CONTAINER_LOCATION: z.string(),
})

export const envParsedWithTypes = envSchema.parse(process.env)
