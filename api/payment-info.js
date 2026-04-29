export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { payment_id } = req.query

  if (!payment_id) {
    return res.status(400).json({ error: 'payment_id é obrigatório' })
  }

  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) {
    return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado' })
  }

  try {
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    const data = await mpRes.json()

    if (!mpRes.ok) {
      console.error('[payment-info] Mercado Pago error:', data)
      return res.status(mpRes.status).json({ error: data.message || 'Erro ao buscar pagamento' })
    }

    const installments = data.installments || 1
    const totalAmount = data.transaction_amount || 0
    const installmentAmount =
      data.transaction_details?.installment_amount ||
      (installments > 0 ? totalAmount / installments : totalAmount)

    return res.status(200).json({
      external_reference: data.external_reference || '',
      total_amount: totalAmount,
      installments,
      installment_amount: installmentAmount,
      status: data.status,
    })
  } catch (err) {
    console.error('[payment-info] fetch error:', err)
    return res.status(500).json({ error: 'Erro interno ao contatar Mercado Pago' })
  }
}
