/**
 * Servidor de desenvolvimento local para as funções serverless da pasta /api
 * Simula o ambiente Vercel localmente.
 *
 * Uso: node dev-server.mjs
 * Roda na porta 3001 e o Vite proxy encaminha /api/* para este servidor.
 *
 * Variáveis de ambiente lidas de .env.local automaticamente.
 */

import http from 'node:http'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// ── Carrega .env.local manualmente ──
const __dir = dirname(fileURLToPath(import.meta.url))
try {
  const raw = readFileSync(resolve(__dir, '.env.local'), 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (key && !(key in process.env)) process.env[key] = val
  }
} catch {
  console.warn('[dev-server] .env.local não encontrado — variáveis de ambiente não carregadas')
}

// ── Roteador de handlers ──
const HANDLERS = {
  '/api/pagbank-pix':    () => import('./api/pagbank-pix.js'),
  '/api/pagbank-pubkey': () => import('./api/pagbank-pubkey.js'),
}

const PORT = 3001

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const loadHandler = HANDLERS[url.pathname]

  if (!loadHandler) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: `Rota ${url.pathname} não encontrada` }))
    return
  }

  // Lê o body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const bodyText = Buffer.concat(chunks).toString()

  let parsedBody = {}
  if (bodyText) {
    try { parsedBody = JSON.parse(bodyText) } catch { /* ignora */ }
  }

  // Monta req/res compatível com a assinatura Vercel
  const mockReq = {
    method: req.method,
    headers: req.headers,
    url: req.url,
    query: Object.fromEntries(url.searchParams),
    body: parsedBody,
  }

  const mockRes = {
    statusCode: 200,
    _headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    status(code) { this.statusCode = code; return this },
    setHeader(k, v) { this._headers[k] = v; return this },
    json(data) {
      res.writeHead(this.statusCode, this._headers)
      res.end(JSON.stringify(data))
    },
    send(data) {
      res.writeHead(this.statusCode, this._headers)
      res.end(typeof data === 'string' ? data : JSON.stringify(data))
    },
    end(data) {
      res.writeHead(this.statusCode, this._headers)
      res.end(data)
    },
  }

  // Trata CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' })
    res.end()
    return
  }

  try {
    const mod = await loadHandler()
    await mod.default(mockReq, mockRes)
  } catch (err) {
    console.error('[dev-server] Erro no handler:', err)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Erro interno no servidor de desenvolvimento' }))
  }
})

server.listen(PORT, () => {
  console.log(`\n✓ API dev-server rodando em http://localhost:${PORT}`)
  console.log('  Handlers disponíveis:')
  for (const route of Object.keys(HANDLERS)) console.log(`    ${route}`)
  console.log('\n  Inicie o Vite em outro terminal: npm run dev\n')
})
