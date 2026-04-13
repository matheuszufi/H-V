import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './Presentes.css'

const GIFTS = [
  { id: 1,  emoji: '🛏️',  name: 'Jogo de Cama Queen',              value: 350 },
  { id: 2,  emoji: '🧴',  name: 'Jogo de Toalhas',                  value: 220 },
  { id: 3,  emoji: '☕',  name: 'Cafeteira Expresso',               value: 280 },
  { id: 4,  emoji: '🥤',  name: 'Liquidificador',                   value: 180 },
  { id: 5,  emoji: '🍳',  name: 'Air Fryer',                        value: 480 },
  { id: 6,  emoji: '🍲',  name: 'Conjunto de Panelas',              value: 600 },
  { id: 7,  emoji: '🍽️',  name: 'Aparelho de Jantar (6 pessoas)',   value: 400 },
  { id: 8,  emoji: '🥄',  name: 'Jogo de Talheres',                 value: 300 },
  { id: 9,  emoji: '🧺',  name: 'Ferro de Passar com Vaporizador',  value: 200 },
  { id: 10, emoji: '🧹',  name: 'Aspirador de Pó Vertical',         value: 380 },
  { id: 11, emoji: '📡',  name: 'Micro-ondas',                      value: 520 },
  { id: 12, emoji: '🎂',  name: 'Batedeira Planetária',             value: 450 },
  { id: 13, emoji: '🥂',  name: 'Conjunto de Copos e Taças',        value: 260 },
  { id: 14, emoji: '🔥',  name: 'Churrasqueira Elétrica',           value: 320 },
  { id: 15, emoji: '🥪',  name: 'Sanduicheira e Grill',             value: 160 },
  { id: 16, emoji: '🫙',  name: 'Jogo de Potes Herméticos',         value: 120 },
  { id: 17, emoji: '🛋️',  name: 'Tapete de Sala',                   value: 400 },
  { id: 18, emoji: '😴',  name: 'Par de Travesseiros',              value: 200 },
  { id: 19, emoji: '🖼️',  name: 'Kit Porta-Retratos',              value: 100 },
  { id: 20, emoji: '🍵',  name: 'Jogo de Xícaras de Porcelana',    value: 150 },
]

const fmt = (value) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const maskCpf = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

const maskCard = (v) =>
  v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ')

const maskExpiry = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}

export default function Presentes() {
  const [selected, setSelected]     = useState(null)
  const [payerName, setPayerName]   = useState('')
  const [payerCpf, setPayerCpf]     = useState('')
  const [payType, setPayType]       = useState('PIX')
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName]     = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv]       = useState('')
  const [installments, setInstallments] = useState(1)
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [copied, setCopied]         = useState(false)
  const pubKeyRef                   = useRef(null)

  // Carrega o SDK do PagBank
  useEffect(() => {
    if (document.getElementById('pagbank-sdk')) return
    const script = document.createElement('script')
    script.id = 'pagbank-sdk'
    script.src = 'https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js'
    script.async = true
    document.head.appendChild(script)
  }, [])

  // Busca a chave pública ao trocar para cartão
  useEffect(() => {
    if (payType !== 'CREDIT_CARD' || pubKeyRef.current) return
    fetch('/api/pagbank-pubkey')
      .then((r) => r.json())
      .then((d) => { if (d.publicKey) pubKeyRef.current = d.publicKey })
      .catch(() => {})
  }, [payType])

  const openModal = (gift) => {
    setSelected(gift)
    setPayerName('')
    setPayerCpf('')
    setPayType('PIX')
    setCardNumber('')
    setCardName('')
    setCardExpiry('')
    setCardCvv('')
    setInstallments(1)
    setResult(null)
    setError('')
    setCopied(false)
  }

  const closeModal = () => {
    setSelected(null)
    setResult(null)
    setError('')
    setLoading(false)
  }

  const getInstallmentOptions = () => {
    const amount = selected?.value || 0
    const options = []
    for (let i = 1; i <= 12; i++) {
      if (amount / i < 5) break
      const label = i === 1
        ? `1x de ${fmt(amount)} (sem juros)`
        : `${i}x de ${fmt(amount / i)} (sem juros)`
      options.push({ value: i, label })
    }
    return options
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!payerName.trim()) { setError('Por favor, informe seu nome.'); return }
    const cpfDigits = payerCpf.replace(/\D/g, '')
    if (cpfDigits.length !== 11) { setError('CPF inválido (11 dígitos).'); return }

    let card_encrypted = null

    if (payType === 'CREDIT_CARD') {
      const num = cardNumber.replace(/\s/g, '')
      if (num.length < 13) { setError('Número do cartão inválido.'); return }
      if (!cardName.trim()) { setError('Nome no cartão é obrigatório.'); return }
      const parts = cardExpiry.split('/')
      if (parts.length !== 2 || parts[0].length !== 2 || parts[1].length !== 2) {
        setError('Validade inválida (MM/AA).'); return
      }
      if (!cardCvv || cardCvv.length < 3) { setError('CVV inválido.'); return }
      if (!window.PagSeguro) { setError('SDK do PagBank ainda não carregou. Tente novamente.'); return }
      if (!pubKeyRef.current) { setError('Chave pública não disponível. Tente novamente.'); return }

      const { encryptedCard, hasErrors, errors } = window.PagSeguro.encryptCard({
        publicKey: pubKeyRef.current,
        holder: cardName.trim().toUpperCase(),
        number: num,
        expMonth: parts[0],
        expYear: '20' + parts[1],
        securityCode: cardCvv,
      })
      if (hasErrors) { setError(errors?.[0]?.message || 'Erro ao criptografar cartão.'); return }
      card_encrypted = encryptedCard
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/pagbank-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selected.value * 100,
          description: selected.name,
          reference_id: crypto.randomUUID(),
          payer_name: payerName.trim(),
          payer_cpf: cpfDigits,
          payment_type: payType,
          card_encrypted,
          installments: Number(installments),
        }),
      })

      const text = await res.text()
      let data = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        throw new Error('Resposta inesperada do servidor. Verifique a integração com o PagBank.')
      }

      if (!res.ok) throw new Error(data.error || `Erro (HTTP ${res.status})`)
      setResult({ type: payType, ...data })
    } catch (err) {
      setError(err.message || 'Erro ao processar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.pixCopiaECola)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      // fallback silencioso
    }
  }

  return (
    <div className="presentes-page">

      {/* ── Cabeçalho ── */}
      <header className="presentes-header">
        <Link to="/" className="presentes-back">← Voltar</Link>
        <h1 className="presentes-logo">H &nbsp;|&nbsp; V</h1>
        <div className="presentes-divider"></div>
        <h2 className="presentes-title">Lista de Presentes</h2>
        <p className="presentes-subtitle">
          Aos que quiserem nos presentear e nos ajudar nesse início de vida a dois, escolha um item
          da nossa lista e contribua com o valor simbólico. Qualquer gesto é muito significativo
          para nós!
        </p>
      </header>

      {/* ── Grade de presentes ── */}
      <main className="presentes-grid">
        {GIFTS.map((gift) => (
          <div key={gift.id} className="present-card">
            <span className="present-emoji">{gift.emoji}</span>
            <h3 className="present-name">{gift.name}</h3>
            <p className="present-value">{fmt(gift.value)}</p>
            <button className="present-btn" onClick={() => openModal(gift)}>
              Presentear
            </button>
          </div>
        ))}
      </main>

      {/* ── Modal ── */}
      {selected && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal} aria-label="Fechar">✕</button>

            {!result ? (
              /* ── Formulário ── */
              <>
                <span className="modal-emoji">{selected.emoji}</span>
                <h3 className="modal-gift-name">{selected.name}</h3>
                <p className="modal-gift-value">{fmt(selected.value)}</p>
                <div className="modal-divider"></div>

                <form onSubmit={handleSubmit} className="modal-form">
                  {/* Dados pessoais */}
                  <label className="modal-label" htmlFor="payer-name">Seu nome</label>
                  <input
                    id="payer-name" type="text" className="modal-input"
                    placeholder="Nome completo" value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    maxLength={100} autoComplete="name"
                  />

                  <label className="modal-label" htmlFor="payer-cpf">CPF</label>
                  <input
                    id="payer-cpf" type="text" className="modal-input"
                    placeholder="000.000.000-00" value={payerCpf}
                    onChange={(e) => setPayerCpf(maskCpf(e.target.value))}
                    maxLength={14} autoComplete="off" inputMode="numeric"
                  />

                  {/* Toggle pagamento */}
                  <div className="pay-toggle">
                    <button
                      type="button"
                      className={`pay-toggle-btn${payType === 'PIX' ? ' active' : ''}`}
                      onClick={() => setPayType('PIX')}
                    >
                      PIX
                    </button>
                    <button
                      type="button"
                      className={`pay-toggle-btn${payType === 'CREDIT_CARD' ? ' active' : ''}`}
                      onClick={() => setPayType('CREDIT_CARD')}
                    >
                      Cartão de Crédito
                    </button>
                  </div>

                  {/* Campos cartão */}
                  {payType === 'CREDIT_CARD' && (
                    <div className="card-fields">
                      <label className="modal-label" htmlFor="card-number">Número do cartão</label>
                      <input
                        id="card-number" type="text" className="modal-input"
                        placeholder="0000 0000 0000 0000" value={cardNumber}
                        onChange={(e) => setCardNumber(maskCard(e.target.value))}
                        maxLength={19} inputMode="numeric" autoComplete="cc-number"
                      />

                      <label className="modal-label" htmlFor="card-name">Nome no cartão</label>
                      <input
                        id="card-name" type="text" className="modal-input"
                        placeholder="Como está no cartão" value={cardName}
                        onChange={(e) => setCardName(e.target.value.toUpperCase())}
                        maxLength={60} autoComplete="cc-name"
                      />

                      <div className="card-row">
                        <div className="card-field-half">
                          <label className="modal-label" htmlFor="card-expiry">Validade</label>
                          <input
                            id="card-expiry" type="text" className="modal-input"
                            placeholder="MM/AA" value={cardExpiry}
                            onChange={(e) => setCardExpiry(maskExpiry(e.target.value))}
                            maxLength={5} inputMode="numeric" autoComplete="cc-exp"
                          />
                        </div>
                        <div className="card-field-half">
                          <label className="modal-label" htmlFor="card-cvv">CVV</label>
                          <input
                            id="card-cvv" type="text" className="modal-input"
                            placeholder="000" value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            maxLength={4} inputMode="numeric" autoComplete="cc-csc"
                          />
                        </div>
                      </div>

                      <label className="modal-label" htmlFor="installments">Parcelas</label>
                      <select
                        id="installments" className="modal-input modal-select"
                        value={installments}
                        onChange={(e) => setInstallments(e.target.value)}
                      >
                        {getInstallmentOptions().map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {error && <p className="modal-error">{error}</p>}
                  <button type="submit" className="modal-submit-btn" disabled={loading}>
                    {loading
                      ? 'Processando…'
                      : payType === 'PIX'
                        ? 'Gerar PIX'
                        : 'Pagar com Cartão'}
                  </button>
                </form>
              </>
            ) : result.type === 'PIX' ? (
              /* ── QR Code PIX ── */
              <>
                <span className="modal-emoji">{selected.emoji}</span>
                <h3 className="modal-gift-name">{selected.name}</h3>
                <p className="modal-gift-value">{fmt(selected.value)}</p>
                <div className="modal-divider"></div>
                <p className="modal-instructions">
                  Escaneie o QR Code ou copie o código PIX abaixo para efetuar o pagamento.
                </p>

                {result.qrCodeUrl
                  ? <img src={result.qrCodeUrl} alt="QR Code PIX" className="modal-qrcode" />
                  : <div className="modal-qrcode-placeholder">QR Code indisponível</div>
                }

                {result.pixCopiaECola && (
                  <div className="modal-pix-box">
                    <p className="modal-pix-text">{result.pixCopiaECola}</p>
                    <button className="modal-copy-btn" onClick={handleCopy}>
                      {copied ? '✓ Copiado!' : 'Copiar Código PIX'}
                    </button>
                  </div>
                )}

                {result.expiresAt && (
                  <p className="modal-expires">
                    Válido até: {new Date(result.expiresAt).toLocaleString('pt-BR')}
                  </p>
                )}
                <p className="modal-thanks">Muito obrigado, <strong>{payerName}</strong>!&nbsp;💛</p>
              </>
            ) : (
              /* ── Cartão aprovado ── */
              <>
                <span className="modal-success-icon">✓</span>
                <h3 className="modal-gift-name">Pagamento Realizado!</h3>
                <div className="modal-divider"></div>
                <p className="modal-instructions">
                  Seu pagamento com cartão foi processado com sucesso.
                </p>
                <p className="modal-thanks">Muito obrigado, <strong>{payerName}</strong>!&nbsp;💛</p>
                <button className="modal-copy-btn" style={{ marginTop: '0.5rem' }} onClick={closeModal}>
                  Fechar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
