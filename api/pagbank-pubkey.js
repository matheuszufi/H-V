// ─────────────────────────────────────────────────────────────
//  Vercel Serverless Function — PagBank Public Key (para cartão)
//  GET /api/pagbank-pubkey
// ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const PAGBANK_TOKEN = process.env.PAGBANK_TOKEN
  const IS_SANDBOX = process.env.PAGBANK_SANDBOX === 'true'

  if (!PAGBANK_TOKEN) {
    return res.status(503).json({ error: 'Token não configurado' })
  }

  const BASE_URL = IS_SANDBOX
    ? 'https://sandbox.api.pagseguro.com'
    : 'https://api.pagseguro.com'

  try {
    const r = await fetch(`${BASE_URL}/public-keys/card`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${PAGBANK_TOKEN}` },
    })

    const text = await r.text()
    const data = text ? JSON.parse(text) : {}

    if (!r.ok) {
      return res.status(r.status).json({ error: 'Erro ao buscar chave pública do PagBank' })
    }

    return res.status(200).json({ publicKey: data.public_key })
  } catch {
    return res.status(500).json({ error: 'Erro interno ao buscar chave pública' })
  }
}
