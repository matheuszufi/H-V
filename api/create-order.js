// POST /api/create-order
// Cria uma cobrança no PagBank com cartão de crédito parcelado
import { randomUUID } from 'node:crypto'

// Taxa mensal aplicada nas parcelas (juros ao comprador)
const MONTHLY_RATE = 0.025 // 2.5% ao mês

export function calcInstallmentTotal(amount, n) {
  if (n <= 1) return amount
  return amount * Math.pow(1 + MONTHLY_RATE, n)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const { encryptedCard, holderName, amount, installments, nome } = req.body ?? {}

  if (!encryptedCard || !holderName || !amount || !installments || !nome) {
    return res.status(400).json({ error: 'Dados incompletos' })
  }

  const n = parseInt(installments, 10)
  if (isNaN(n) || n < 1 || n > 12) {
    return res.status(400).json({ error: 'Número de parcelas inválido (1–12)' })
  }

  const total = calcInstallmentTotal(parseFloat(amount), n)
  const amountCents = Math.round(total * 100)

  const token = process.env.PAGBANK_TOKEN
  const isProd = process.env.PAGBANK_ENV === 'production'
  const baseUrl = isProd
    ? 'https://api.pagseguro.com'
    : 'https://sandbox.api.pagseguro.com'

  try {
    const response = await fetch(`${baseUrl}/charges`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference_id: randomUUID(),
        description: `Presente casamento - ${nome}`.slice(0, 64),
        amount: {
          value: amountCents,
          currency: 'BRL',
        },
        payment_method: {
          type: 'CREDIT_CARD',
          installments: n,
          capture: true,
          card: {
            encrypted: encryptedCard,
            holder: { name: holderName.toUpperCase().slice(0, 30) },
            store: false,
          },
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      const msg =
        data.error_messages?.[0]?.description ||
        'Pagamento recusado. Verifique os dados e tente novamente.'
      console.error('[create-order] PagBank error:', data)
      return res.status(400).json({ error: msg })
    }

    if (data.status === 'DECLINED') {
      return res.status(400).json({ error: 'Cartão recusado pela operadora.' })
    }

    return res.status(200).json({ id: data.id, status: data.status })
  } catch (err) {
    console.error('[create-order] fetch error:', err)
    return res.status(500).json({ error: 'Erro interno ao processar pagamento' })
  }
}
