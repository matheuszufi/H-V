import { Link } from 'react-router-dom'
import './Mapas.css'

export default function Mapas() {
  return (
    <div className="mapas-page">
      <h1 className="mapas-logo">H &nbsp;|&nbsp; V</h1>
      <div className="mapas-divider"></div>
      <h2 className="mapas-heading">Mapas</h2>

      <div className="mapas-grid">
        <div className="mapas-item">
          <h3 className="mapas-item-title">Cerimônia</h3>
          <p className="mapas-item-desc">Paróquia Santo Antônio - Matriz</p>
          <p className="mapas-item-address">Rua Espanha, 289, Cambé-PR</p>
          <img src="/images/mapa-igreja.png" alt="Mapa da Igreja" className="mapas-img" />
        </div>

        <div className="mapas-item">
          <h3 className="mapas-item-title">Recepção</h3>
          <p className="mapas-item-desc">Salão de Festas do Condomínio Recanto Golf Ville</p>
          <p className="mapas-item-address">Rua José Konhevalik, 50, Bratislava, Cambé-PR</p>
          <img src="/images/mapa-evento.png" alt="Mapa do Evento" className="mapas-img" />
        </div>
      </div>

      <Link to="/" className="mapas-back">Voltar ao site</Link>
    </div>
  )
}
