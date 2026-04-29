// Servidor local de desenvolvimento para as Vercel Serverless Functions
// Uso: node dev-server.mjs
// Rode em paralelo com: npm run dev

import http from 'node:http'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Carrega .env manualmente (sem depender de pacotes externos)
function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '.env'), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx === -1) continue
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    console.warn('[dev-server] .env não encontrado')
  }
}
loadEnv()

// Objeto res simplificado compatível com os handlers Vercel
function makeRes(nodeRes) {
  const headers = {}
  return {
    setHeader: (k, v) => { headers[k] = v; nodeRes.setHeader(k, v) },
    status: (code) => {
      nodeRes.statusCode = code
      return {
        json: (data) => {
          nodeRes.setHeader('Content-Type', 'application/json')
          nodeRes.end(JSON.stringify(data))
        },
        end: () => nodeRes.end(),
      }
    },
    end: () => nodeRes.end(),
  }
}

const PORT = 3002

const server = http.createServer(async (req, nodeRes) => {
  // CORS para desenvolvimento
  nodeRes.setHeader('Access-Control-Allow-Origin', '*')
  nodeRes.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  nodeRes.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    nodeRes.statusCode = 200
    nodeRes.end()
    return
  }

  const url = req.url?.split('?')[0] ?? '/'

  // Roteamento das funções
  let handlerModule
  try {
    if (url === '/api/public-key') {
      handlerModule = await import('./api/public-key.js?' + Date.now())
    } else if (url === '/api/create-order') {
      handlerModule = await import('./api/create-order.js?' + Date.now())
    } else if (url === '/api/create-preference') {
      handlerModule = await import('./api/create-preference.js?' + Date.now())
    } else {
      nodeRes.statusCode = 404
      nodeRes.end(JSON.stringify({ error: 'Rota não encontrada' }))
      return
    }
  } catch (err) {
    console.error('[dev-server] import error:', err)
    nodeRes.statusCode = 500
    nodeRes.end(JSON.stringify({ error: 'Erro ao carregar handler' }))
    return
  }

  // Lê body (para POST)
  let body = ''
  req.on('data', chunk => { body += chunk })
  req.on('end', async () => {
    const req2 = Object.assign(req, {
      body: body ? JSON.parse(body) : {},
    })
    const res2 = makeRes(nodeRes)
    try {
      await handlerModule.default(req2, res2)
    } catch (err) {
      console.error('[dev-server] handler error:', err)
      nodeRes.statusCode = 500
      nodeRes.end(JSON.stringify({ error: 'Erro interno no handler' }))
    }
  })
})

server.listen(PORT, () => {
  console.log(`[dev-server] API local rodando em http://localhost:${PORT}/api`)
  console.log('[dev-server] Endpoints disponíveis:')
  console.log(`  GET  http://localhost:${PORT}/api/public-key`)
  console.log(`  POST http://localhost:${PORT}/api/create-order`)
  console.log(`  POST http://localhost:${PORT}/api/create-preference`)
})
