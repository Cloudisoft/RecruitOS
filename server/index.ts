import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireAuth } from './middleware/auth.js'
import { resumeRouter } from './routes/resume.js'
import { copilotRouter } from './routes/copilot.js'
import { matchingRouter } from './routes/matching.js'
import { emailRouter } from './routes/email.js'
import { statusRouter } from './routes/status.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/status', statusRouter)
app.use('/api/resume', requireAuth, resumeRouter)
app.use('/api/copilot', requireAuth, copilotRouter)
app.use('/api/matching', requireAuth, matchingRouter)
app.use('/api/email', requireAuth, emailRouter)

// Serve the built frontend (Railway runs `npm run build` then `npm start`,
// which lands the Vite build in ../dist relative to this compiled file).
const clientDist = path.resolve(__dirname, '../dist')
app.use(express.static(clientDist))
app.get('/{*splat}', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next()
  res.sendFile(path.join(clientDist, 'index.html'))
})

// Express error handler — never let an unhandled rejection surface as an
// opaque 500 with no body, and never leak stack traces to the client.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

const port = Number(process.env.PORT) || 8787
app.listen(port, () => {
  console.log(`[server] RecruitOS API + static frontend listening on :${port}`)
})
