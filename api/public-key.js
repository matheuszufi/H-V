// GET /api/public-key
// Retorna a chave pública do PagBank para encriptação do cartão no frontend
export default async function handler(req, res) {
  const token = (process.env.PAGBANK_TOKEN || '').trim()
  const isProd = (process.env.PAGBANK_ENV || '').trim() === 'production'
  const baseUrl = isProd
    ? 'https://api.pagseguro.com'
    : 'https://sandbox.api.pagseguro.com'

  try {
    const response = await fetch(`${baseUrl}/public-keys/credit_card`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[public-key] PagBank error:', data)
      return res.status(500).json({ error: 'Erro ao obter chave pública' })
    }

    return res.status(200).json({ publicKey: data.public_key })
  } catch (err) {
    console.error('[public-key] fetch error:', err)
    return res.status(500).json({ error: 'Erro interno' })
  }
}
