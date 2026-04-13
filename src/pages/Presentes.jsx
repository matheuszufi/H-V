import { useState } from 'react'
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

export default function Presentes() {
  const [selected, setSelected]     = useState(null)
  const [payerName, setPayerName]   = useState('')
  const [pixData, setPixData]       = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [copied, setCopied]         = useState(false)

  const openModal = (gift) => {
    setSelected(gift)
    setPayerName('')
    setPixData(null)
    setError('')
    setCopied(false)
  }

  const closeModal = () => {
    setSelected(null)
    setPixData(null)
    setError('')
    setLoading(false)
  }

  const handleGerar = async (e) => {
    e.preventDefault()
    if (!payerName.trim()) {
      setError('Por favor, informe seu nome.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/pagbank-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selected.value * 100, // converte para centavos
          description: selected.name,
          reference_id: crypto.randomUUID(),
          payer_name: payerName.trim(),
        }),
      })

      const text = await res.text()
      let data = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        throw new Error('Resposta inesperada do servidor. Verifique se a integração com o PagBank está configurada.')
      }

      if (!res.ok) throw new Error(data.error || `Erro ao gerar PIX (HTTP ${res.status})`)
      setPixData(data)
    } catch (err) {
      setError(err.message || 'Erro ao gerar PIX. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixData.pixCopiaECola)
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
          da nossa lista e contribua com o valor simbólico via PIX. Qualquer gesto é muito
          significativo para nós!
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

      {/* ── Modal de pagamento ── */}
      {selected && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal} aria-label="Fechar">✕</button>

            {!pixData ? (
              /* ── Passo 1: formulário ── */
              <>
                <span className="modal-emoji">{selected.emoji}</span>
                <h3 className="modal-gift-name">{selected.name}</h3>
                <p className="modal-gift-value">{fmt(selected.value)}</p>
                <div className="modal-divider"></div>
                <p className="modal-instructions">
                  Informe seu nome e clique em <strong>Gerar PIX</strong> para receber o código de
                  pagamento.
                </p>
                <form onSubmit={handleGerar} className="modal-form">
                  <label className="modal-label" htmlFor="payer-name">Seu nome</label>
                  <input
                    id="payer-name"
                    type="text"
                    className="modal-input"
                    placeholder="Nome completo"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    maxLength={100}
                    autoComplete="name"
                  />
                  {error && <p className="modal-error">{error}</p>}
                  <button type="submit" className="modal-submit-btn" disabled={loading}>
                    {loading ? 'Gerando PIX…' : 'Gerar PIX'}
                  </button>
                </form>
              </>
            ) : (
              /* ── Passo 2: QR Code ── */
              <>
                <span className="modal-emoji">{selected.emoji}</span>
                <h3 className="modal-gift-name">{selected.name}</h3>
                <p className="modal-gift-value">{fmt(selected.value)}</p>
                <div className="modal-divider"></div>
                <p className="modal-instructions">
                  Escaneie o QR Code ou copie o código PIX abaixo para efetuar o pagamento.
                </p>

                {pixData.qrCodeUrl ? (
                  <img
                    src={pixData.qrCodeUrl}
                    alt="QR Code PIX"
                    className="modal-qrcode"
                  />
                ) : (
                  <div className="modal-qrcode-placeholder">
                    QR Code indisponível
                  </div>
                )}

                {pixData.pixCopiaECola && (
                  <div className="modal-pix-box">
                    <p className="modal-pix-text">{pixData.pixCopiaECola}</p>
                    <button className="modal-copy-btn" onClick={handleCopy}>
                      {copied ? '✓ Copiado!' : 'Copiar Código PIX'}
                    </button>
                  </div>
                )}

                {pixData.expiresAt && (
                  <p className="modal-expires">
                    Válido até:{' '}
                    {new Date(pixData.expiresAt).toLocaleString('pt-BR')}
                  </p>
                )}

                <p className="modal-thanks">
                  Muito obrigado, <strong>{payerName}</strong>!&nbsp;💛
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
