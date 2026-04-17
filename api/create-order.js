// Vercel Serverless Function – PagBank Orders API (sandbox)
// Token lido da variável de ambiente PAGBANK_TOKEN (nunca exposta ao frontend)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  const token = process.env.PAGBANK_TOKEN
  if (!token) return res.status(500).json({ error: 'Token PagBank não configurado' })

  const isSandbox = (process.env.PAGBANK_ENV ?? 'sandbox') === 'sandbox'
  const PAGBANK_BASE_URL = isSandbox
    ? 'https://sandbox.api.pagseguro.com'
    : 'https://api.pagseguro.com'

  // Vercel já faz parse do body JSON automaticamente
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const { paymentMethod, amount, buyer, card } = body ?? {}

  // ── Validações básicas ────────────────────────────────────────────────────
  if (!paymentMethod || !amount || !buyer?.name || !buyer?.cpf) {
    return res.status(400).json({ error: 'Dados incompletos na requisição' })
  }

  const amountInCents = Math.round(parseFloat(amount) * 100)
  if (isNaN(amountInCents) || amountInCents < 8000) {
    return res.status(400).json({ error: 'Valor inválido (mínimo R$ 80,00)' })
  }

  const cpf = buyer.cpf.replace(/\D/g, '')
  if (cpf.length !== 11) {
    return res.status(400).json({ error: 'CPF inválido' })
  }

  // ── Payload base do pedido ────────────────────────────────────────────────
  const orderPayload = {
    reference_id: `presente-hv-${Date.now()}`,
    customer: {
      name: buyer.name,
      email: isSandbox ? 'comprador@sandbox.pagseguro.com.br' : (buyer.email ?? 'comprador@email.com'),
      tax_id: cpf,
      phones: [{ country: '55', area: '43', number: '999999999', type: 'MOBILE' }],
    },
    items: [{ name: 'Presente H e V', quantity: 1, unit_amount: amountInCents }],
  }

  // ── PIX ───────────────────────────────────────────────────────────────────
  if (paymentMethod === 'PIX') {
    const expiration = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    orderPayload.qr_codes = [
      { amount: { value: amountInCents }, expiration_date: expiration },
    ]
  }

  // ── Cartão de Crédito ─────────────────────────────────────────────────────
  else if (paymentMethod === 'CREDIT_CARD') {
    if (!card?.encrypted || !card?.installments) {
      return res.status(400).json({ error: 'Dados do cartão incompletos' })
    }
    const installments = Math.min(Math.max(parseInt(card.installments) || 1, 1), 6)
    orderPayload.charges = [
      {
        reference_id: `charge-${Date.now()}`,
        description: 'Presente H e V',
        amount: { value: amountInCents, currency: 'BRL' },
        payment_method: {
          type: 'CREDIT_CARD',
          installments,
          capture: true,
          card: { encrypted: card.encrypted, store: false },
        },
      },
    ]
  } else {
    return res.status(400).json({ error: 'Método de pagamento inválido' })
  }

  // ── Chamada à API PagBank ──────────────────────────────────────────────────
  try {
    const response = await fetch(`${PAGBANK_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderPayload),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('PagBank error response:', JSON.stringify(data))
      const msg = data?.error_messages?.[0]?.description ?? 'Erro retornado pelo PagBank'
      return res.status(response.status).json({ error: msg })
    }

    // ── Resposta PIX ──────────────────────────────────────────────────────
    if (paymentMethod === 'PIX') {
      const qr = data.qr_codes?.[0]
      return res.status(200).json({
        type: 'PIX',
        pixCopyPaste: qr?.text ?? '',
      })
    }

    // ── Resposta Cartão ───────────────────────────────────────────────────
    const charge = data.charges?.[0]
    return res.status(200).json({
      type: 'CREDIT_CARD',
      status: charge?.status ?? 'PENDING',
      chargeId: charge?.id ?? '',
    })
  } catch (err) {
    console.error('PagBank fetch error:', err)
    return res.status(500).json({ error: 'Erro de conexão com PagBank' })
  }
}
