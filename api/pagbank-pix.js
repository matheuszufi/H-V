// ─────────────────────────────────────────────────────────────
//  Vercel Serverless Function — PagBank (PIX + Cartão de Crédito)
//
//  Variáveis de ambiente (painel Vercel):
//    PAGBANK_TOKEN    → Token da conta PagBank
//    PAGBANK_SANDBOX  → "true" sandbox / "false" produção
// ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const {
    amount,
    description,
    reference_id,
    payer_name,
    payer_cpf,
    payment_type,    // 'PIX' | 'CREDIT_CARD'
    card_encrypted,  // apenas para CREDIT_CARD
    installments,    // apenas para CREDIT_CARD
  } = req.body ?? {}

  // ── Validação básica ──
  if (!amount || typeof amount !== 'number' || amount < 100) {
    return res.status(400).json({ error: 'Valor inválido (mínimo R$ 1,00)' })
  }
  if (!description || !reference_id || !payer_name || !payer_cpf) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' })
  }

  const cpfDigits = String(payer_cpf).replace(/\D/g, '')
  if (cpfDigits.length !== 11) {
    return res.status(400).json({ error: 'CPF inválido' })
  }

  const type = payment_type === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'PIX'

  if (type === 'CREDIT_CARD' && !card_encrypted) {
    return res.status(400).json({ error: 'Dados do cartão ausentes' })
  }

  const PAGBANK_TOKEN = process.env.PAGBANK_TOKEN
  const IS_SANDBOX = process.env.PAGBANK_SANDBOX === 'true'

  if (!PAGBANK_TOKEN) {
    return res.status(503).json({
      error: 'Integração com PagBank ainda não configurada. Adicione as variáveis de ambiente no painel Vercel.',
    })
  }

  const BASE_URL = IS_SANDBOX
    ? 'https://sandbox.api.pagseguro.com'
    : 'https://api.pagseguro.com'

  // ── Monta o body do pedido ──
  const orderBody = {
    reference_id,
    customer: {
      name: payer_name,
      tax_id: cpfDigits,
    },
    items: [
      {
        name: description.substring(0, 64),
        quantity: 1,
        unit_amount: amount,
      },
    ],
  }

  if (type === 'PIX') {
    const expiration = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    orderBody.qr_codes = [
      {
        amount: { value: amount },
        expiration_date: expiration,
      },
    ]
  } else {
    orderBody.charges = [
      {
        reference_id,
        description: description.substring(0, 64),
        amount: { value: amount, currency: 'BRL' },
        payment_method: {
          type: 'CREDIT_CARD',
          installments: Number(installments) || 1,
          capture: true,
          card: {
            encrypted: card_encrypted,
            store: false,
          },
        },
      },
    ]
  }

  const authHeaders = {
    Authorization: `Bearer ${PAGBANK_TOKEN}`,
    'Content-Type': 'application/json',
  }

  try {
    const pagbankRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(orderBody),
    })

    const responseText = await pagbankRes.text()
    let data = {}
    try {
      data = responseText ? JSON.parse(responseText) : {}
    } catch {
      return res.status(500).json({ error: 'Resposta inválida do PagBank' })
    }

    if (!pagbankRes.ok) {
      const messages =
        data?.error_messages?.map((m) => `${m.code}: ${m.description}`).join(', ') ||
        data?.message ||
        `Erro PagBank (HTTP ${pagbankRes.status})`
      return res.status(pagbankRes.status).json({ error: messages })
    }

    // ── Resposta PIX ──
    if (type === 'PIX') {
      const qrCode = data.qr_codes?.[0] ?? null
      const qrCodeUrl =
        qrCode?.links?.find((l) => l.rel === 'QRCODE.PNG')?.href ?? null

      return res.status(200).json({
        id: data.id,
        paymentType: 'PIX',
        pixCopiaECola: qrCode?.text ?? null,
        qrCodeUrl,
        expiresAt: qrCode?.expiration_date ?? null,
      })
    }

    // ── Resposta Cartão ──
    const charge = data.charges?.[0] ?? null
    const chargeStatus = charge?.status ?? 'UNKNOWN'

    if (chargeStatus === 'DECLINED') {
      const reason = charge?.payment_response?.message || 'Pagamento recusado pela operadora.'
      return res.status(422).json({ error: reason })
    }

    return res.status(200).json({
      id: data.id,
      paymentType: 'CREDIT_CARD',
      status: chargeStatus,
    })
  } catch {
    return res.status(500).json({ error: 'Erro interno ao processar pagamento. Tente novamente.' })
  }
}
