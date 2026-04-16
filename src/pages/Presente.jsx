import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './Presente.css'

const PRESET_VALUES = [80, 100, 150, 200, 300, 500]
const MAX_INSTALLMENTS = 6
const MIN_AMOUNT = 80

// ── Máscaras de entrada ────────────────────────────────────────────────────
function maskCpf(v) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function maskCardNumber(v) {
  return v.replace(/\D/g, '').slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

function maskExpiry(v) {
  return v.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(\d)/, '$1/$2')
}

function installmentLabel(amount, n) {
  const val = (amount / n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n === 1 ? `1x de R$ ${val} (à vista)` : `${n}x de R$ ${val} sem juros`
}
// ──────────────────────────────────────────────────────────────────────────

export default function Presente() {
  // Fluxo: 1=form inicial | 2=form cartão | 3=resultado PIX | 4=resultado cartão
  const [step, setStep] = useState(1)

  // Dados do comprador
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('PIX')

  // Dados do cartão
  const [cardHolder, setCardHolder] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [installments, setInstallments] = useState(1)

  // Estado de UI
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // Resultado
  const [pixCopyPaste, setPixCopyPaste] = useState('')
  const [cardStatus, setCardStatus] = useState('')

  const numAmount = parseFloat(amount) || 0
  const formattedAmount = numAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // Carrega o SDK PagBank quando cartão for selecionado
  useEffect(() => {
    if (paymentMethod !== 'CREDIT_CARD' || window.PagSeguro) return
    const script = document.createElement('script')
    script.src = 'https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js'
    script.async = true
    document.head.appendChild(script)
  }, [paymentMethod])

  // ── Step 1: valida e decide fluxo ─────────────────────────────────────────
  async function handleStep1Submit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Informe seu nome.')
    if (cpf.replace(/\D/g, '').length !== 11) return setError('Informe um CPF válido (11 dígitos).')
    if (!numAmount || numAmount < MIN_AMOUNT) return setError(`Valor mínimo é R$ ${MIN_AMOUNT},00.`)
    if (paymentMethod === 'PIX') await submitPix()
    else setStep(2)
  }

  // ── PIX: chama API e vai para tela de resultado ───────────────────────────
  async function submitPix() {
    setLoading(true)
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: 'PIX', amount: numAmount, buyer: { name: name.trim(), cpf } }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao gerar PIX. Tente novamente.'); return }
      setPixCopyPaste(data.pixCopyPaste ?? '')
      setStep(3)
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // ── Cartão: criptografa e chama API ──────────────────────────────────────
  async function handleCardSubmit(e) {
    e.preventDefault()
    setError('')
    if (!cardHolder.trim()) return setError('Informe o nome impresso no cartão.')
    if (cardNumber.replace(/\s/g, '').length < 16) return setError('Número do cartão inválido.')
    if (expiry.length < 5) return setError('Data de validade inválida.')
    if (cvv.length < 3) return setError('CVV inválido.')

    const PagSeguro = window.PagSeguro
    if (!PagSeguro) return setError('SDK de pagamento não carregado. Recarregue a página.')

    let encryptedCard
    try {
      const [expMonth, expYearShort] = expiry.split('/')
      const result = PagSeguro.encryptCard({
        publicKey: import.meta.env.VITE_PAGBANK_PUBLIC_KEY,
        holder: cardHolder.trim().toUpperCase(),
        number: cardNumber.replace(/\s/g, ''),
        expMonth,
        expYear: `20${expYearShort}`,
        securityCode: cvv,
      })
      if (result.hasErrors) return setError(result.errors?.[0]?.message ?? 'Dados do cartão inválidos.')
      encryptedCard = result.encryptedCard
    } catch {
      return setError('Erro ao processar dados do cartão.')
    }

    setLoading(true)
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: 'CREDIT_CARD',
          amount: numAmount,
          buyer: { name: name.trim(), cpf },
          card: { encrypted: encryptedCard, installments: Number(installments) },
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao processar pagamento. Verifique os dados.'); return }
      setCardStatus(data.status ?? 'PENDING')
      setStep(4)
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(pixCopyPaste).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    })
  }

  function reset() {
    setStep(1); setError(''); setCopied(false)
    setPixCopyPaste(''); setCardStatus('')
  }

  const qrUrl = pixCopyPaste
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&ecc=M&data=${encodeURIComponent(pixCopyPaste)}`
    : ''

  return (
    <div className="presente-page">
      <div className="presente-card">
        <p className="presente-logo">H &nbsp;|&nbsp; V</p>
        <div className="presente-divider" />

        {/* ── STEP 1: Seleção de valor e método ─────────────────────────── */}
        {step === 1 && (
          <>
            <h1 className="presente-heading">Presentear os Noivos</h1>
            <p className="presente-info">
              Escolha um valor e pague via PIX ou cartão de crédito em até {MAX_INSTALLMENTS}x sem juros.
            </p>

            {error && <p className="presente-error">{error}</p>}

            <form className="presente-form" onSubmit={handleStep1Submit} noValidate>
              <label className="presente-label">
                Seu nome
                <input
                  className="presente-input"
                  type="text"
                  placeholder="Nome completo"
                  value={name}
                  maxLength={50}
                  onChange={e => setName(e.target.value)}
                />
              </label>

              <label className="presente-label">
                CPF
                <input
                  className="presente-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={e => setCpf(maskCpf(e.target.value))}
                />
              </label>

              <span className="presente-label">Valor do presente</span>
              <div className="presente-presets">
                {PRESET_VALUES.map(v => (
                  <button
                    key={v}
                    type="button"
                    className={`presente-preset${parseFloat(amount) === v ? ' active' : ''}`}
                    onClick={() => setAmount(String(v))}
                  >
                    R$&nbsp;{v}
                  </button>
                ))}
              </div>
              <div className="presente-amount-wrapper">
                <span className="presente-currency">R$</span>
                <input
                  className="presente-input presente-input-amount"
                  type="number"
                  placeholder="Outro valor"
                  min={MIN_AMOUNT}
                  step="1"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>

              <span className="presente-label">Forma de pagamento</span>
              <div className="presente-payment-methods">
                <button
                  type="button"
                  className={`presente-method-btn${paymentMethod === 'PIX' ? ' active' : ''}`}
                  onClick={() => setPaymentMethod('PIX')}
                >
                  PIX
                </button>
                <button
                  type="button"
                  className={`presente-method-btn${paymentMethod === 'CREDIT_CARD' ? ' active' : ''}`}
                  onClick={() => setPaymentMethod('CREDIT_CARD')}
                >
                  Cartão de Crédito
                </button>
              </div>

              {paymentMethod === 'CREDIT_CARD' && numAmount >= MIN_AMOUNT && (
                <p className="presente-installments-preview">
                  Em até {MAX_INSTALLMENTS}x de R${' '}
                  {(numAmount / MAX_INSTALLMENTS).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sem juros
                </p>
              )}

              <button type="submit" className="presente-submit" disabled={loading}>
                {loading ? 'Processando…' : paymentMethod === 'PIX' ? 'Gerar PIX' : 'Continuar para cartão'}
              </button>
            </form>

            <Link to="/" className="presente-home-link">← Voltar ao início</Link>
          </>
        )}

        {/* ── STEP 2: Dados do cartão ────────────────────────────────────── */}
        {step === 2 && (
          <>
            <h1 className="presente-heading">Dados do Cartão</h1>

            <div className="presente-pix-amount-box">
              <span className="presente-pix-amount-label">Valor</span>
              <span className="presente-pix-amount-value">{formattedAmount}</span>
              <span className="presente-pix-name">de {name}</span>
            </div>

            {error && <p className="presente-error">{error}</p>}

            <form className="presente-form" onSubmit={handleCardSubmit} noValidate>
              <label className="presente-label">
                Nome no cartão
                <input
                  className="presente-input"
                  type="text"
                  placeholder="NOME COMO NO CARTÃO"
                  value={cardHolder}
                  maxLength={26}
                  style={{ textTransform: 'uppercase' }}
                  onChange={e => setCardHolder(e.target.value.toUpperCase())}
                />
              </label>

              <label className="presente-label">
                Número do cartão
                <input
                  className="presente-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={e => setCardNumber(maskCardNumber(e.target.value))}
                />
              </label>

              <div className="presente-card-row">
                <label className="presente-label" style={{ flex: 1 }}>
                  Validade
                  <input
                    className="presente-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/AA"
                    value={expiry}
                    onChange={e => setExpiry(maskExpiry(e.target.value))}
                  />
                </label>
                <label className="presente-label" style={{ flex: 1 }}>
                  CVV
                  <input
                    className="presente-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="123"
                    value={cvv}
                    maxLength={4}
                    onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  />
                </label>
              </div>

              <label className="presente-label">
                Parcelas
                <select
                  className="presente-input"
                  value={installments}
                  onChange={e => setInstallments(e.target.value)}
                >
                  {Array.from({ length: MAX_INSTALLMENTS }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{installmentLabel(numAmount, n)}</option>
                  ))}
                </select>
              </label>

              <button type="submit" className="presente-submit" disabled={loading}>
                {loading ? 'Processando…' : `Pagar ${formattedAmount}`}
              </button>
            </form>

            <button className="presente-back-btn" onClick={() => { setStep(1); setError('') }}>
              ← Voltar
            </button>
          </>
        )}

        {/* ── STEP 3: Resultado PIX ──────────────────────────────────────── */}
        {step === 3 && (
          <>
            <h1 className="presente-heading">Pagamento via PIX</h1>
            <p className="presente-info">Escaneie o QR code ou use Copia e Cola no seu app bancário.</p>

            <div className="presente-pix-amount-box">
              <span className="presente-pix-amount-label">Valor do presente</span>
              <span className="presente-pix-amount-value">{formattedAmount}</span>
              <span className="presente-pix-name">de {name}</span>
            </div>

            {qrUrl && <img className="presente-qrcode" src={qrUrl} alt="QR Code PIX" />}

            <p className="presente-pix-instructions">
              Abra seu app bancário → <strong>PIX</strong> → <strong>Pagar</strong> →{' '}
              <strong>Ler QR code</strong> ou <strong>Copia e Cola</strong>
            </p>

            {pixCopyPaste && (
              <button
                className={`presente-copy-btn${copied ? ' copied' : ''}`}
                onClick={handleCopy}
              >
                {copied ? '✓ Código copiado!' : 'Copiar código PIX (Copia e Cola)'}
              </button>
            )}

            <button className="presente-back-btn" onClick={reset}>← Alterar valor</button>
          </>
        )}

        {/* ── STEP 4: Resultado Cartão ───────────────────────────────────── */}
        {step === 4 && (
          <>
            <div className="presente-success-icon">
              {cardStatus === 'PAID' || cardStatus === 'AUTHORIZED' ? '✓' : '…'}
            </div>
            <h1 className="presente-heading">
              {cardStatus === 'PAID' || cardStatus === 'AUTHORIZED'
                ? 'Pagamento confirmado!'
                : 'Pagamento em análise'}
            </h1>
            <p className="presente-info">
              {cardStatus === 'PAID' || cardStatus === 'AUTHORIZED'
                ? `Sua contribuição de ${formattedAmount} foi recebida. Muito obrigado, ${name}!`
                : `Seu pagamento de ${formattedAmount} foi enviado e está sendo processado. Obrigado!`}
            </p>

            <div className="presente-pix-amount-box">
              <span className="presente-pix-amount-label">Valor pago</span>
              <span className="presente-pix-amount-value">{formattedAmount}</span>
              <span className="presente-pix-name">por {name}</span>
            </div>

            <button className="presente-back-btn" onClick={reset}>← Fazer outro presente</button>
          </>
        )}
      </div>
    </div>
  )
}
