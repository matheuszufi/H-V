import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useNavigate } from 'react-router-dom'
import './Admin.css'

export default function Admin() {
  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)
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
    await deleteDoc(doc(db, 'rsvp', id))
    setGuests((prev) => prev.filter((g) => g.id !== id))
  }

  const confirmed = guests.filter((g) => g.status === 'confirmado')
  const pending = guests.filter((g) => g.status !== 'confirmado')
  const totalPeople = guests.reduce((sum, g) => sum + (g.quantidade || g.pessoas?.length || 1), 0)
  const confirmedPeople = confirmed.reduce((sum, g) => sum + (g.quantidade || g.pessoas?.length || 1), 0)

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

        {loading ? (
          <p className="admin-loading">Carregando...</p>
        ) : guests.length === 0 ? (
          <p className="admin-empty">Nenhum convidado cadastrado ainda.</p>
        ) : (
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
                {guests.map((guest) => (
                  <tr key={guest.id}>
                    <td>{guest.pessoas ? guest.pessoas.join(', ') : guest.nome}</td>
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
        )}
      </main>
    </div>
  )
}
