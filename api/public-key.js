// Vercel Serverless Function – Retorna a chave pública PagBank para criptografia de cartão
// O token nunca é exposto ao frontend; apenas a chave pública (que é pública por natureza).

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' })

  const token = process.env.PAGBANK_TOKEN
  if (!token) return res.status(500).json({ error: 'Token PagBank não configurado' })

  const isSandbox = (process.env.PAGBANK_ENV ?? 'sandbox') === 'sandbox'
  const baseUrl = isSandbox
    ? 'https://sandbox.api.pagseguro.com'
    : 'https://api.pagseguro.com'

  try {
    const response = await fetch(`${baseUrl}/public-keys/card`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('PagBank public-key error:', JSON.stringify(data))
      return res.status(response.status).json({ error: 'Erro ao buscar chave pública PagBank' })
    }

    // Retorna somente a chave pública — sem expor token ou dados sensíveis
    return res.status(200).json({ publicKey: data.public_key })
  } catch (err) {
    console.error('PagBank public-key fetch error:', err)
    return res.status(500).json({ error: 'Erro de conexão com PagBank' })
  }
}
