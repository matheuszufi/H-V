// ─────────────────────────────────────────────────────────────
//  Vercel Serverless Function — PagBank PIX Charge
//
//  Variáveis de ambiente necessárias (configurar no painel Vercel):
//    PAGBANK_TOKEN    → Token de acesso da conta PagBank (e-commerce)
//    PAGBANK_SANDBOX  → "true" para ambiente sandbox / "false" para produção
// ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Apenas POST é aceito
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const { amount, description, reference_id } = req.body ?? {}

  // Validação básica de entrada
  if (!amount || typeof amount !== 'number' || amount < 100) {
    return res.status(400).json({ error: 'Valor inválido (mínimo R$ 1,00)' })
  }
  if (!description || !reference_id) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' })
  }

  const PAGBANK_TOKEN = process.env.PAGBANK_TOKEN
  const IS_SANDBOX = process.env.PAGBANK_SANDBOX === 'true'

  // Se o token ainda não foi configurado, retorna mensagem amigável
  if (!PAGBANK_TOKEN) {
    return res.status(503).json({
      error: 'Integração com PagBank ainda não configurada. Adicione as variáveis de ambiente no painel Vercel.',
    })
  }

  const BASE_URL = IS_SANDBOX
    ? 'https://sandbox.api.pagseguro.com'
    : 'https://api.pagseguro.com'

  try {
    const pagbankRes = await fetch(`${BASE_URL}/charges`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAGBANK_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference_id,
        // description limitada a 64 caracteres conforme especificação PagBank
        description: description.substring(0, 64),
        amount: {
          value: amount,   // em centavos (ex: R$ 3,50 → 350)
          currency: 'BRL',
        },
        payment_method: {
          type: 'PIX',
          installments: 1,
          capture: true,
        },
        notification_urls: [],
      }),
    })

    if (!pagbankRes.ok) {
      const errorBody = await pagbankRes.json().catch(() => ({}))
      const messages =
        errorBody?.error_messages?.map((m) => m.description).join(', ') ||
        `Erro PagBank (HTTP ${pagbankRes.status})`
      return res.status(pagbankRes.status).json({ error: messages })
    }

    const data = await pagbankRes.json()
    const qrCode = data.qr_codes?.[0] ?? null
    const qrCodeUrl =
      qrCode?.links?.find((l) => l.rel === 'QRCODE.PNG')?.href ?? null

    return res.status(200).json({
      id: data.id,
      pixCopiaECola: qrCode?.text ?? null,
      qrCodeUrl,
      expiresAt: qrCode?.expiration_date ?? null,
    })
  } catch {
    return res.status(500).json({ error: 'Erro interno ao gerar PIX. Tente novamente.' })
  }
}
