import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useNavigate } from 'react-router-dom'
import './Admin.css'

export default function Admin() {
  const [activeTab, setActiveTab] = useState('rsvp')
  const [guests, setGuests] = useState([])
  const [presentes, setPresentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('todos')
  const navigate = useNavigate()

  const fetchData = async () => {
    setLoading(true)
    const [rsvpSnap, presentesSnap] = await Promise.all([
      getDocs(collection(db, 'rsvp')),
      getDocs(collection(db, 'presentes')),
    ])
    setGuests(rsvpSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
    setPresentes(presentesSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const toggleStatus = async (guest) => {
    const newStatus = guest.status === 'confirmado' ? 'pendente' : 'confirmado'
    await updateDoc(doc(db, 'rsvp', guest.id), { status: newStatus })
    setGuests((prev) =>
      prev.map((g) => (g.id === guest.id ? { ...g, status: newStatus } : g))
    )
  }

  const removeGuest = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este convidado?')) return
    await deleteDoc(doc(db, 'rsvp', id))
    setGuests((prev) => prev.filter((g) => g.id !== id))
  }

  const removePresente = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este presente?')) return
    await deleteDoc(doc(db, 'presentes', id))
    setPresentes((prev) => prev.filter((p) => p.id !== id))
  }

  const togglePagamento = async (presente) => {
    const newPago = !presente.pago
    await updateDoc(doc(db, 'presentes', presente.id), { pago: newPago })
    setPresentes((prev) =>
      prev.map((p) => (p.id === presente.id ? { ...p, pago: newPago } : p))
    )
  }

  // ── RSVP stats ───────────────────────────────────────────────────────────
  const confirmed = guests.filter((g) => g.status === 'confirmado')
  const pending = guests.filter((g) => g.status !== 'confirmado')
  const getGuestName = (g) => g.nome || ''

  const filteredGuests = guests
    .filter((g) => {
      if (activeFilter === 'confirmados') return g.status === 'confirmado'
      if (activeFilter === 'pendentes') return g.status !== 'confirmado'
      return true
    })
    .filter((g) => {
      if (!search.trim()) return true
      return getGuestName(g).toLowerCase().includes(search.toLowerCase())
    })
    .sort((a, b) => getGuestName(a).localeCompare(getGuestName(b), 'pt-BR'))

  // ── Presentes stats ───────────────────────────────────────────────────────
  const presentesPagos = presentes.filter((p) => p.pago)
  const presentesAguardando = presentes.filter((p) => !p.pago)
  const totalPresentes = presentesPagos.reduce((sum, p) => sum + (p.valor || 0), 0)
  const formattedTotal = totalPresentes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const filteredAguardando = presentesAguardando
    .filter((p) => {
      if (!search.trim()) return true
      return (p.nome || '').toLowerCase().includes(search.toLowerCase())
    })
    .sort((a, b) => {
      const ta = a.timestamp?.toMillis?.() ?? 0
      const tb = b.timestamp?.toMillis?.() ?? 0
      return tb - ta
    })

  const filteredPagos = presentesPagos
    .filter((p) => {
      if (!search.trim()) return true
      return (p.nome || '').toLowerCase().includes(search.toLowerCase())
    })
    .sort((a, b) => {
      const ta = a.timestamp?.toMillis?.() ?? 0
      const tb = b.timestamp?.toMillis?.() ?? 0
      return tb - ta
    })

  function formatDate(ts) {
    if (!ts) return '—'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="admin-logo">H &nbsp;|&nbsp; V</h1>
        <nav className="admin-nav">
          <span className="admin-nav-label">Dashboard</span>
          <button onClick={handleLogout} className="admin-logout">Sair</button>
        </nav>
      </header>

      <main className="admin-main">
        <h2 className="admin-title">Dashboard</h2>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="admin-tabs">
          <button
            className={`admin-tab${activeTab === 'rsvp' ? ' admin-tab-active' : ''}`}
            onClick={() => { setActiveTab('rsvp'); setSearch(''); setActiveFilter('todos') }}
          >
            Confirmações de Presença
            <span className="admin-tab-count">{guests.length}</span>
          </button>
          <button
            className={`admin-tab${activeTab === 'presentes' ? ' admin-tab-active' : ''}`}
            onClick={() => { setActiveTab('presentes'); setSearch('') }}
          >
            Presentes
            <span className="admin-tab-count">{presentes.length}</span>
          </button>
        </div>

        {/* ── RSVP Tab ───────────────────────────────────────────────────── */}
        {activeTab === 'rsvp' && (
          <>
            <div className="admin-stats">
              <div className="stat-card">
                <span className="stat-number">{guests.length}</span>
                <span className="stat-label">Total Convidados</span>
              </div>
              <div className="stat-card stat-confirmed">
                <span className="stat-number">{confirmed.length}</span>
                <span className="stat-label">Confirmados</span>
              </div>
              <div className="stat-card stat-pending">
                <span className="stat-number">{pending.length}</span>
                <span className="stat-label">Pendentes</span>
              </div>
            </div>

            <div className="admin-toolbar">
              <div className="admin-search">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Pesquisar por nome..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="search-input"
                />
                {search && (
                  <button className="search-clear" onClick={() => setSearch('')}>&times;</button>
                )}
              </div>
              <div className="admin-filters">
                {['todos', 'confirmados', 'pendentes'].map((f) => (
                  <button
                    key={f}
                    className={`filter-btn ${activeFilter === f ? 'filter-active' : ''}`}
                    onClick={() => setActiveFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    <span className="filter-count">
                      {f === 'todos' ? guests.length : f === 'confirmados' ? confirmed.length : pending.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <p className="admin-loading">Carregando...</p>
            ) : guests.length === 0 ? (
              <p className="admin-empty">Nenhum convidado cadastrado ainda.</p>
            ) : filteredGuests.length === 0 ? (
              <p className="admin-empty">Nenhum resultado encontrado para &ldquo;{search}&rdquo;</p>
            ) : (
              <>
                <p className="admin-results-count">
                  {filteredGuests.length} {filteredGuests.length === 1 ? 'resultado' : 'resultados'}
                </p>
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Mensagem</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGuests.map((guest) => (
                        <tr key={guest.id}>
                          <td data-label="Nome" className="admin-guest-name">{getGuestName(guest)}</td>
                          <td data-label="Mensagem" className="admin-msg">{guest.mensagem || '—'}</td>
                          <td data-label="Status">
                            <span className={`badge ${guest.status === 'confirmado' ? 'badge-confirmed' : 'badge-pending'}`}>
                              {guest.status === 'confirmado' ? 'Confirmado' : 'Pendente'}
                            </span>
                          </td>
                          <td className="admin-actions">
                            <button onClick={() => toggleStatus(guest)} className="btn-toggle">
                              {guest.status === 'confirmado' ? 'Marcar Pendente' : 'Confirmar'}
                            </button>
                            <button onClick={() => removeGuest(guest.id)} className="btn-remove">
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="admin-table-footer">
                  <span>{confirmed.length} confirmado{confirmed.length !== 1 ? 's' : ''} de {guests.length} convidado{guests.length !== 1 ? 's' : ''}</span>
                </div>
              </>
            )}
          </>
        )}

        {/* ── Presentes Tab ─────────────────────────────────────────────── */}
        {activeTab === 'presentes' && (
          <>
            {/* Stats gerais */}
            <div className="admin-stats">
              <div className="stat-card">
                <span className="stat-number">{presentes.length}</span>
                <span className="stat-label">Total PIX Gerados</span>
              </div>
              <div className="stat-card stat-confirmed">
                <span className="stat-number">{presentesPagos.length}</span>
                <span className="stat-label">Pagamentos Confirmados</span>
              </div>
              <div className="stat-card stat-pending">
                <span className="stat-number">{presentesAguardando.length}</span>
                <span className="stat-label">Aguardando Pagamento</span>
              </div>
              <div className="stat-card stat-total">
                <span className="stat-number stat-number-small">{formattedTotal}</span>
                <span className="stat-label">Total Confirmado</span>
              </div>
            </div>

            {/* Barra de pesquisa compartilhada */}
            <div className="admin-toolbar">
              <div className="admin-search">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Pesquisar por nome..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="search-input"
                />
                {search && (
                  <button className="search-clear" onClick={() => setSearch('')}>&times;</button>
                )}
              </div>
            </div>

            {loading ? (
              <p className="admin-loading">Carregando...</p>
            ) : (
              <>
                {/* ── Dashboard 1: Aguardando Pagamento ───────────────── */}
                <div className="admin-section">
                  <h3 className="admin-section-title admin-section-title-pending">Aguardando Confirmação</h3>
                  {presentesAguardando.length === 0 ? (
                    <p className="admin-empty admin-empty-small">Nenhum PIX aguardando confirmação.</p>
                  ) : filteredAguardando.length === 0 ? (
                    <p className="admin-empty admin-empty-small">Nenhum resultado encontrado.</p>
                  ) : (
                    <>
                      <p className="admin-results-count">{filteredAguardando.length} {filteredAguardando.length === 1 ? 'resultado' : 'resultados'}</p>
                      <div className="admin-table-wrapper">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Nome</th>
                              <th>Valor</th>
                              <th>Data</th>
                              <th>Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAguardando.map((p) => (
                              <tr key={p.id}>
                                <td data-label="Nome" className="admin-guest-name">{p.nome || '—'}</td>
                                <td data-label="Valor" className="admin-valor">
                                  {(p.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                                <td data-label="Data">{formatDate(p.timestamp)}</td>
                                <td className="admin-actions">
                                  <button onClick={() => togglePagamento(p)} className="btn-confirm-pay">
                                    Confirmar Pgt.
                                  </button>
                                  <button onClick={() => removePresente(p.id)} className="btn-remove">Remover</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

                {/* ── Dashboard 2: Pagamentos Confirmados ─────────────── */}
                <div className="admin-section">
                  <h3 className="admin-section-title admin-section-title-confirmed">Pagamentos Confirmados</h3>
                  {presentesPagos.length === 0 ? (
                    <p className="admin-empty admin-empty-small">Nenhum pagamento confirmado ainda.</p>
                  ) : filteredPagos.length === 0 ? (
                    <p className="admin-empty admin-empty-small">Nenhum resultado encontrado.</p>
                  ) : (
                    <>
                      <p className="admin-results-count">{filteredPagos.length} {filteredPagos.length === 1 ? 'resultado' : 'resultados'}</p>
                      <div className="admin-table-wrapper">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Nome</th>
                              <th>Valor</th>
                              <th>Data</th>
                              <th>Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredPagos.map((p) => (
                              <tr key={p.id}>
                                <td data-label="Nome" className="admin-guest-name">{p.nome || '—'}</td>
                                <td data-label="Valor" className="admin-valor">
                                  {(p.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                                <td data-label="Data">{formatDate(p.timestamp)}</td>
                                <td className="admin-actions">
                                  <button onClick={() => togglePagamento(p)} className="btn-toggle">
                                    Desconfirmar
                                  </button>
                                  <button onClick={() => removePresente(p.id)} className="btn-remove">Remover</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="admin-table-footer admin-table-footer-total">
                        <span>{presentesPagos.length} pago{presentesPagos.length !== 1 ? 's' : ''} — Total confirmado: <strong>{formattedTotal}</strong></span>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
