import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Presente.css'

// ── PIX EMV payload generator ──────────────────────────────────────────────
function buildField(id, value) {
  const len = String(value.length).padStart(2, '0')
  return `${id}${len}${value}`
}

function crc16(str) {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021
      else crc <<= 1
      crc &= 0xffff
    }
  }
  return crc
}

function generatePixPayload(key, merchantName, amount) {
  const safeName = merchantName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .slice(0, 25)
    .trim() || 'Convidado'

  const merchantAccount =
    buildField('00', 'br.gov.bcb.pix') + buildField('01', key)

  const payload = [
    buildField('00', '01'),
    buildField('26', merchantAccount),
    buildField('52', '0000'),
    buildField('53', '986'),
    buildField('54', amount.toFixed(2)),
    buildField('58', 'BR'),
    buildField('59', safeName),
    buildField('60', 'Cambe'),
    buildField('62', buildField('05', '***')),
    '6304',
  ].join('')

  const checksum = crc16(payload).toString(16).toUpperCase().padStart(4, '0')
  return payload + checksum
}
// ──────────────────────────────────────────────────────────────────────────

const PIX_KEY = '43999909090'
const MIN_AMOUNT = 80
const PRESET_VALUES = [80, 100, 150, 200, 300]

export default function Presente() {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [pixPayload, setPixPayload] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const numAmount = parseFloat(amount)

    if (!name.trim()) {
      setError('Por favor, informe seu nome.')
      return
    }
    if (!amount || isNaN(numAmount) || numAmount < MIN_AMOUNT) {
      setError(`O valor mínimo para o presente é R$ ${MIN_AMOUNT},00.`)
      return
    }

    const payload = generatePixPayload(PIX_KEY, name.trim(), numAmount)
    setPixPayload(payload)
    setStep(2)
  }

  function handleCopy() {
    navigator.clipboard.writeText(pixPayload).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    })
  }

  function handleBack() {
    setStep(1)
    setCopied(false)
  }

  const numAmount = parseFloat(amount || '0')
  const formattedAmount = isNaN(numAmount)
    ? 'R$ 0,00'
    : numAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&ecc=M&data=${encodeURIComponent(pixPayload)}`

  return (
    <div className="presente-page">
      <div className="presente-card">
        <p className="presente-logo">H &nbsp;|&nbsp; V</p>
        <div className="presente-divider" />

        {step === 1 ? (
          <>
            <h1 className="presente-heading">Presentear os Noivos</h1>
            <p className="presente-info">
              Escolha um valor (mínimo R$&nbsp;{MIN_AMOUNT},00) e realize o pagamento via PIX
              diretamente no seu app bancário.
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

              <label className="presente-label">
                Valor do presente
                <div className="presente-amount-wrapper">
                  <span className="presente-currency">R$</span>
                  <input
                    className="presente-input presente-input-amount"
                    type="number"
                    placeholder="80"
                    min={MIN_AMOUNT}
                    step="1"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                </div>
              </label>

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

              <button type="submit" className="presente-submit">
                Gerar código PIX
              </button>
            </form>

            <Link to="/" className="presente-home-link">
              ← Voltar ao início
            </Link>
          </>
        ) : (
          <>
            <h1 className="presente-heading">Pagamento via PIX</h1>
            <p className="presente-info">
              Escaneie o QR code ou copie o código no seu app bancário.
            </p>

            <div className="presente-pix-amount-box">
              <span className="presente-pix-amount-label">Valor do presente</span>
              <span className="presente-pix-amount-value">{formattedAmount}</span>
              <span className="presente-pix-name">de {name}</span>
            </div>

            <img
              className="presente-qrcode"
              src={qrUrl}
              alt="QR Code PIX"
            />

            <p className="presente-pix-instructions">
              Abra seu app bancário → <strong>PIX</strong> → <strong>Pagar</strong> →{' '}
              <strong>Ler QR code</strong> ou <strong>Copia e Cola</strong>
            </p>

            <button
              className={`presente-copy-btn${copied ? ' copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? '✓  Código copiado!' : 'Copiar código PIX (Copia e Cola)'}
            </button>

            <div className="presente-pix-key-row">
              <span className="presente-pix-key-label">Chave PIX (telefone)</span>
              <span className="presente-pix-key-value">{PIX_KEY}</span>
            </div>

            <button className="presente-back-btn" onClick={handleBack}>
              ← Alterar valor
            </button>
          </>
        )}
      </div>
    </div>
  )
}
