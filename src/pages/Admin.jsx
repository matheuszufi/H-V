import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useNavigate } from 'react-router-dom'
import './Admin.css'

export default function Admin() {
  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('todos')
  const navigate = useNavigate()

  const fetchGuests = async () => {
    const snapshot = await getDocs(collection(db, 'rsvp'))
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    setGuests(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchGuests()
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

  const confirmed = guests.filter((g) => g.status === 'confirmado')
  const pending = guests.filter((g) => g.status !== 'confirmado')
  const totalPeople = guests.reduce((sum, g) => sum + (g.quantidade || g.pessoas?.length || 1), 0)
  const confirmedPeople = confirmed.reduce((sum, g) => sum + (g.quantidade || g.pessoas?.length || 1), 0)

  const getGuestName = (g) => (g.pessoas ? g.pessoas.join(', ') : g.nome || '')

  const filteredGuests = guests
    .filter((g) => {
      if (activeFilter === 'confirmados') return g.status === 'confirmado'
      if (activeFilter === 'pendentes') return g.status !== 'confirmado'
      return true
    })
    .filter((g) => {
      if (!search.trim()) return true
      const term = search.toLowerCase()
      return getGuestName(g).toLowerCase().includes(term)
    })
    .sort((a, b) => getGuestName(a).localeCompare(getGuestName(b), 'pt-BR'))

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
          <div className="stat-card">
            <span className="stat-number">{totalPeople}</span>
            <span className="stat-label">Total Pessoas</span>
          </div>
          <div className="stat-card stat-confirmed">
            <span className="stat-number">{confirmedPeople}</span>
            <span className="stat-label">Pessoas Confirmadas</span>
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
          <p className="admin-empty">Nenhum resultado encontrado para "{search}"</p>
        ) : (
          <>
            <p className="admin-results-count">
              {filteredGuests.length} {filteredGuests.length === 1 ? 'resultado' : 'resultados'}
            </p>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Pessoas</th>
                    <th>Qtd</th>
                    <th>Mensagem</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuests.map((guest) => (
                    <tr key={guest.id}>
                      <td className="admin-guest-name">{getGuestName(guest)}</td>
                      <td>{guest.quantidade || guest.pessoas?.length || 1}</td>
                      <td className="admin-msg">{guest.mensagem || '—'}</td>
                      <td>
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
          </>
        )}
      </main>
    </div>
  )
}
