import { useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import './Presente.css'

const PRESET_VALUES = [80, 100, 150, 200, 300, 500, 800, 1000]
const MIN_AMOUNT = 50
const PIX_KEY = 'heldermateusm23@gmail.com'
const MERCHANT_NAME = 'H E V CASAMENTO'
const MERCHANT_CITY = 'LONDRINA'

function crc16(str) {
  let crc = 0xFFFF
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021
      else crc <<= 1
      crc &= 0xFFFF
    }
  }
  return crc
}

function generatePixPayload(amount) {
  const tlv = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`
  const merchantAccountInfo = tlv('00', 'br.gov.bcb.pix') + tlv('01', PIX_KEY)
  const additionalData = tlv('05', '***')
  const payload =
    tlv('00', '01') +
    tlv('26', merchantAccountInfo) +
    tlv('52', '0000') +
    tlv('53', '986') +
    tlv('54', amount.toFixed(2)) +
    tlv('58', 'BR') +
    tlv('59', MERCHANT_NAME.slice(0, 25)) +
    tlv('60', MERCHANT_CITY.slice(0, 15)) +
    tlv('62', additionalData) +
    '6304'
  const crc = crc16(payload)
  return payload + crc.toString(16).toUpperCase().padStart(4, '0')
}

const MONTHLY_RATE = 0.025 // 2.5% ao mês para parcelas com juros

function calcInstallmentTotal(amount, n) {
  if (n <= 1) return amount
  return amount * Math.pow(1 + MONTHLY_RATE, n)
}

function formatCardNumber(value) {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  return digits.length >= 3 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits
}

export default function Presente() {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('pix')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // PIX states
  const [copied, setCopied] = useState(false)
  const [pixCode, setPixCode] = useState('')

  // Card states
  const [cardHolder, setCardHolder] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [installments, setInstallments] = useState(1)
  const [cardError, setCardError] = useState('')
  const [cardLoading, setCardLoading] = useState(false)

  const numAmount = parseFloat(amount) || 0
  const formattedAmount = numAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // ── Step 1: submit (PIX ou ir para cartão) ────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Informe seu nome.')
    const minAmount = paymentMethod === 'card' ? 1 : MIN_AMOUNT
    if (!numAmount || numAmount < minAmount) return setError(`Valor mínimo é R$ ${minAmount},00.`)

    if (paymentMethod === 'card') {
      setStep(3)
      return
    }

    setLoading(true)
    try {
      const code = generatePixPayload(numAmount)
      setPixCode(code)
      setStep(2)
      addDoc(collection(db, 'presentes'), {
        nome: name.trim(),
        valor: numAmount,
        metodoPagamento: 'pix',
        timestamp: serverTimestamp(),
      }).catch((err) => console.error('Firestore save failed:', err))
    } catch (err) {
      console.error('PIX generation error:', err)
      setError('Erro ao gerar PIX. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: submit do cartão ──────────────────────────────────────────────
  async function handleCardSubmit(e) {
    e.preventDefault()
    setCardError('')

    const rawNumber = cardNumber.replace(/\s/g, '')
    if (rawNumber.length < 13) return setCardError('Número do cartão inválido.')
    if (!cardHolder.trim()) return setCardError('Informe o nome impresso no cartão.')
    if (!cardExpiry.match(/^\d{2}\/\d{2}$/)) return setCardError('Validade inválida. Use MM/AA.')
    if (!cardCvv.match(/^\d{3,4}$/)) return setCardError('CVV inválido.')

    const [expMonth, expYearShort] = cardExpiry.split('/')
    const expYear = '20' + expYearShort

    setCardLoading(true)
    try {
      // 1. Obter chave pública do PagBank
      const pkRes = await fetch('/api/public-key')
      const pkData = await pkRes.json()
      if (!pkRes.ok) throw new Error(pkData.error || 'Erro ao obter chave de encriptação.')

      // 2. Encriptar cartão via SDK PagBank
      const PagSeguro = window.PagSeguro
      if (!PagSeguro) throw new Error('SDK de pagamento não carregado. Recarregue a página.')

      const { encryptedCard, hasErrors, errors } = PagSeguro.encryptCard({
        publicKey: pkData.publicKey,
        holder: cardHolder.trim().toUpperCase(),
        number: rawNumber,
        expMonth,
        expYear,
        securityCode: cardCvv,
      })

      if (hasErrors) {
        throw new Error(errors?.[0]?.message || 'Dados do cartão inválidos.')
      }

      // 3. Criar cobrança no backend
      const chargeRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encryptedCard,
          holderName: cardHolder.trim(),
          amount: numAmount,
          installments: parseInt(installments, 10),
          nome: name.trim(),
        }),
      })

      const chargeData = await chargeRes.json()
      if (!chargeRes.ok) throw new Error(chargeData.error || 'Pagamento recusado.')

      // 4. Salvar no Firestore
      const totalPago = calcInstallmentTotal(numAmount, parseInt(installments, 10))
      addDoc(collection(db, 'presentes'), {
        nome: name.trim(),
        valor: numAmount,
        valorTotal: parseFloat(totalPago.toFixed(2)),
        parcelas: parseInt(installments, 10),
        metodoPagamento: 'cartao',
        pagbankId: chargeData.id,
        timestamp: serverTimestamp(),
      }).catch(console.error)

      setStep(4)
    } catch (err) {
      setCardError(err.message)
    } finally {
      setCardLoading(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(pixCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    })
  }

  function reset() {
    setStep(1); setError(''); setCopied(false); setPixCode('')
    setCardError(''); setCardHolder(''); setCardNumber(''); setCardExpiry(''); setCardCvv(''); setInstallments(1)
  }

  const qrUrl = pixCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&ecc=M&data=${encodeURIComponent(pixCode)}`
    : ''

  return (
    <div className="presente-page">
      <div className="presente-card">
        <p className="presente-logo">H &nbsp;|&nbsp; V</p>
        <div className="presente-divider" />

        {/* ── STEP 1: Nome, valor e método ──────────────────────────────── */}
        {step === 1 && (
          <>
            <h1 className="presente-heading">Presentear os Noivos</h1>
            <p className="presente-info">
              Escolha um valor e a forma de pagamento.
            </p>

            {error && <p className="presente-error">{error}</p>}

            <form className="presente-form" onSubmit={handleSubmit} noValidate>
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
                {paymentMethod === 'card' && (
                  <button
                    type="button"
                    className={`presente-preset presente-preset-test${parseFloat(amount) === 1 ? ' active' : ''}`}
                    onClick={() => setAmount('1')}
                    title="Apenas para testes"
                  >
                    R$&nbsp;1 (teste)
                  </button>
                )}
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
                  className={`presente-method-btn${paymentMethod === 'pix' ? ' active' : ''}`}
                  onClick={() => setPaymentMethod('pix')}
                >
                  <span className="presente-method-icon">⚡</span> PIX
                </button>
                <button
                  type="button"
                  className={`presente-method-btn${paymentMethod === 'card' ? ' active' : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <span className="presente-method-icon">💳</span> Cartão de Crédito
                </button>
              </div>

              <button type="submit" className="presente-submit" disabled={loading}>
                {loading ? 'Aguarde…' : paymentMethod === 'pix' ? 'Gerar PIX' : 'Prosseguir →'}
              </button>
            </form>

            <Link to="/" className="presente-home-link">← Voltar ao início</Link>
          </>
        )}

        {/* ── STEP 2: PIX QR Code ───────────────────────────────────────── */}
        {step === 2 && (
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

            <button
              className={`presente-copy-btn${copied ? ' copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? '✓ Código copiado!' : 'Copiar código PIX (Copia e Cola)'}
            </button>

            <button className="presente-back-btn" onClick={reset}>← Alterar valor</button>
          </>
        )}

        {/* ── STEP 3: Formulário de Cartão ──────────────────────────────── */}
        {step === 3 && (
          <>
            <h1 className="presente-heading">Pagamento com Cartão</h1>

            <div className="presente-pix-amount-box">
              <span className="presente-pix-amount-label">Valor do presente</span>
              <span className="presente-pix-amount-value">{formattedAmount}</span>
              <span className="presente-pix-name">de {name}</span>
            </div>

            {cardError && <p className="presente-error">{cardError}</p>}

            <form className="presente-form" onSubmit={handleCardSubmit} noValidate>
              <label className="presente-label">
                Nome no cartão
                <input
                  className="presente-input"
                  type="text"
                  placeholder="NOME COMO NO CARTÃO"
                  value={cardHolder}
                  maxLength={30}
                  autoComplete="cc-name"
                  onChange={e => setCardHolder(e.target.value.toUpperCase())}
                />
              </label>

              <label className="presente-label">
                Número do cartão
                <input
                  className="presente-input"
                  type="text"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  inputMode="numeric"
                  autoComplete="cc-number"
                  onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                />
              </label>

              <div className="presente-card-row">
                <label className="presente-label">
                  Validade
                  <input
                    className="presente-input"
                    type="text"
                    placeholder="MM/AA"
                    value={cardExpiry}
                    maxLength={5}
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                  />
                </label>
                <label className="presente-label">
                  CVV
                  <input
                    className="presente-input"
                    type="text"
                    placeholder="123"
                    value={cardCvv}
                    maxLength={4}
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
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
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(n => {
                    const total = calcInstallmentTotal(numAmount, n)
                    const valor = total / n
                    return (
                      <option key={n} value={n}>
                        {n}x de {valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        {n === 1
                          ? ' (sem juros)'
                          : ` — total ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                      </option>
                    )
                  })}
                </select>
              </label>

              <p className="presente-card-notice">
                🔒 Pagamento seguro processado pelo PagBank. Seus dados são encriptados e não armazenados.
              </p>

              <button type="submit" className="presente-submit" disabled={cardLoading}>
                {cardLoading ? 'Processando…' : `Pagar ${formattedAmount}`}
              </button>
            </form>

            <button className="presente-back-btn" onClick={reset}>← Alterar valor ou método</button>
          </>
        )}

        {/* ── STEP 4: Confirmação do Cartão ─────────────────────────────── */}
        {step === 4 && (
          <>
            <h1 className="presente-heading">Pagamento Confirmado! 🎉</h1>
            <p className="presente-info">
              Obrigado, <strong>{name}</strong>! Seu presente foi recebido com sucesso.
              <br />Os noivos ficam muito felizes com o seu carinho.
            </p>
            <Link to="/" className="presente-submit" style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none', marginTop: '1rem' }}>
              Voltar ao site
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
