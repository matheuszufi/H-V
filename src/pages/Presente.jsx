import { useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import './Presente.css'

const PRESET_VALUES = [80, 100, 150, 200, 300, 500]
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

export default function Presente() {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [pixCode, setPixCode] = useState('')

  const numAmount = parseFloat(amount) || 0
  const formattedAmount = numAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Informe seu nome.')
    if (!numAmount || numAmount < MIN_AMOUNT) return setError(`Valor mínimo é R$ ${MIN_AMOUNT},00.`)

    setLoading(true)
    try {
      const code = generatePixPayload(numAmount)
      setPixCode(code)
      setStep(2)
      // Save to Firestore in background — does not block showing the PIX
      addDoc(collection(db, 'presentes'), {
        nome: name.trim(),
        valor: numAmount,
        timestamp: serverTimestamp(),
      }).catch((err) => console.error('Firestore save failed:', err))
    } catch (err) {
      console.error('PIX generation error:', err)
      setError('Erro ao gerar PIX. Tente novamente.')
    } finally {
      setLoading(false)
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
  }

  const qrUrl = pixCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&ecc=M&data=${encodeURIComponent(pixCode)}`
    : ''

  return (
    <div className="presente-page">
      <div className="presente-card">
        <p className="presente-logo">H &nbsp;|&nbsp; V</p>
        <div className="presente-divider" />

        {/* ── STEP 1: Nome e valor ──────────────────────────────────────── */}
        {step === 1 && (
          <>
            <h1 className="presente-heading">Presentear os Noivos</h1>
            <p className="presente-info">
              Escolha um valor e receba o código PIX para pagamento.
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

              <button type="submit" className="presente-submit" disabled={loading}>
                {loading ? 'Gerando PIX…' : 'Gerar PIX'}
              </button>
            </form>

            <Link to="/" className="presente-home-link">← Voltar ao início</Link>
          </>
        )}

        {/* ── STEP 2: PIX Copia e Cola ──────────────────────────────────── */}
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
      </div>
    </div>
  )
}
