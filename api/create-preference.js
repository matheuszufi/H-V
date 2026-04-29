export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { amount, name } = req.body ?? {}

  if (typeof amount !== 'number' || amount < 50) {
    return res.status(400).json({ error: 'Valor inválido (mínimo R$ 50)' })
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Nome inválido' })
  }

  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) {
    return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado' })
  }

  const appUrl = (process.env.APP_URL || '').replace(/\/$/, '')
  const isLocalhost = !appUrl || appUrl.includes('localhost') || appUrl.includes('127.0.0.1')

  const preference = {
    items: [
      {
        title: 'Presente de Casamento — H & V',
        quantity: 1,
        currency_id: 'BRL',
        unit_price: amount,
      },
    ],
    payer: {
      name: name.trim(),
    },
    payment_methods: {
      excluded_payment_types: [
        { id: 'ticket' },
        { id: 'bank_transfer' },
        { id: 'atm' },
      ],
      installments: 12,
    },
    ...(isLocalhost ? {} : {
      back_urls: {
        success: `${appUrl}/presente?status=sucesso`,
        failure: `${appUrl}/presente?status=erro`,
        pending: `${appUrl}/presente?status=pendente`,
      },
      auto_return: 'approved',
    }),
    statement_descriptor: 'H E V CASAMENTO',
    external_reference: name.trim(),
  }

  try {
    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preference),
    })

    const data = await mpRes.json()

    if (!mpRes.ok) {
      console.error('[create-preference] Mercado Pago error:', data)
      return res.status(mpRes.status).json({ error: data.message || 'Erro ao criar preferência' })
    }

    return res.status(200).json({ init_point: data.init_point })
  } catch (err) {
    console.error('[create-preference] fetch error:', err)
    return res.status(500).json({ error: 'Erro interno ao contatar Mercado Pago' })
  }
}
