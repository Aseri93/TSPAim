import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import fs from 'fs'
import path from 'path'

const SCORES_FILE = path.resolve(__dirname, 'scores.json')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    preact(),
    {
      name: 'local-scores-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = new URL(req.url || '', `http://${req.headers.host}`)
          if (url.pathname === '/api/scores' && req.method === 'POST') {
            let body = ''
            req.on('data', chunk => {
              body += chunk
              // Safety limit to prevent memory exhaustion
              if (body.length > 1e6) req.destroy()
            })
            req.on('end', () => {
              if (res.writableEnded) return
              try {
                const score = JSON.parse(body)
                let scores = []
                if (fs.existsSync(SCORES_FILE)) {
                  const content = fs.readFileSync(SCORES_FILE, 'utf-8')
                  scores = content.trim() ? JSON.parse(content) : []
                }

                // Add new score
                scores.push({
                  ...score,
                  id: Date.now(),
                  created_at: new Date().toISOString()
                })

                // Save and respond
                fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2))
                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true }))
              } catch (e) {
                console.error("Vite API Error:", e)
                res.statusCode = 500
                res.end(JSON.stringify({ error: 'Failed to save score' }))
              }
            })
          } else if (url.pathname === '/api/scores' && req.method === 'GET') {
            let scores = []
            if (fs.existsSync(SCORES_FILE)) {
              try {
                const content = fs.readFileSync(SCORES_FILE, 'utf-8')
                scores = content.trim() ? JSON.parse(content) : []
              } catch (e) {
                scores = []
              }
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(scores))
          } else {
            next()
          }
        })
      }
    }
  ],
})