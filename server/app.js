import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import storeRoutes from './routes/store.routes.js'

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://dreamy-sable-f225e2.netlify.app',
]

const getAllowedOrigins = () => {
  const configuredOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return new Set(configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_ALLOWED_ORIGINS)
}

const allowedOrigins = getAllowedOrigins()
const app = express()

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true)
        return
      }

      callback(null, false)
    },
  }),
)

app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.use('/api/store', storeRoutes)

app.use((request, response) => {
  response.status(404).json({
    error: `Route not found: ${request.method} ${request.originalUrl}`,
  })
})

app.use((error, _request, response, _next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(error)
  }

  response.status(error.status || 500).json({
    error: error.message || 'Internal server error.',
    ...(error.details ? { details: error.details } : {}),
  })
})

export default app
