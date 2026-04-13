import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function Home() {
  const [timeLeft, setTimeLeft] = useState({ dias: 0, horas: 0, minutos: 0, segundos: 0 })

  useEffect(() => {
    const target = new Date('2026-08-01T09:30:00').getTime()
    const update = () => {
      const now = Date.now()
      const diff = Math.max(0, target - now)
      setTimeLeft({
        dias: Math.floor(diff / (1000 * 60 * 60 * 24)),
        horas: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutos: Math.floor((diff / (1000 * 60)) % 60),
        segundos: Math.floor((diff / 1000) % 60),
      })
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <div className="save-the-date">
            <p className="save-the-date-title">Save the Date</p>
            <div className="save-the-date-row">
              <span className="std-left">01 de Agosto</span>
              <img src="/images/flowers.png" alt="Flores" className="save-the-date-flower" />
              <span className="std-right">de 2026</span>
            </div>
          </div>
          <h1 className="hero-title">H &nbsp;|&nbsp; V</h1>
          <div className="hero-divider"></div>
          <p className="hero-subtitle">Wedding Planner</p>
        </div>
        <span className="scroll-indicator">&rsaquo;</span>
      </section>

      <section className="content">
        <div className="col col-left">
          <h2 className="col-title">Informações Principais</h2>
          <p className="col-label">Data &bull; Hora &bull; Local</p>

          <div className="date-block">
            <span className="date-day">01</span>
            <span className="date-sep">|</span>
            <span className="date-month">Agosto</span>
            <span className="date-sep">|</span>
            <span className="date-year">2026</span>
            <span className="date-sep">|</span>
            <span className="date-time">09:30</span>
          </div>

          <div className="location">
            <h3>Cerimônia</h3>
            <p>Rua Espanha, 289, Cambé-PR</p>
            <p className="location-name">Paróquia Santo Antônio - Matriz</p>
          </div>

          <div className="location">
            <h3>Recepção após a cerimônia</h3>
            <p>Rua José Konhevalik, 50, Bratislava,<br />Cambé-PR - 86189-095</p>
            <p className="location-name">Salão de Festas do Condomínio Recanto Golf Ville</p>
          </div>

          <Link to="/mapas" className="ver-mapas-btn">Ver Mapas</Link>
        </div>

        <div className="col col-right">
          <h2 className="col-title">Confirmar Presença</h2>
          <p className="rsvp-text">
            Confirme sua presença no máximo até o dia <strong>29/06/2026</strong>.
          </p>
          <Link to="/confirmar" className="rsvp-phone">Confirmar Presença</Link>

          <div className="countdown">
            <div className="countdown-item">
              <span className="countdown-number">{timeLeft.dias}</span>
              <span className="countdown-label">Dias</span>
            </div>
            <div className="countdown-item">
              <span className="countdown-number">{timeLeft.horas}</span>
              <span className="countdown-label">Horas</span>
            </div>
            <div className="countdown-item">
              <span className="countdown-number">{timeLeft.minutos}</span>
              <span className="countdown-label">Minutos</span>
            </div>
            <div className="countdown-item">
              <span className="countdown-number">{timeLeft.segundos}</span>
              <span className="countdown-label">Segundos</span>
            </div>
          </div>

          <div className="obs">
            <h3>Observação</h3>
            <p>
              Queridos convidados, nós estamos organizando tudo por conta, então vamos contar com a
              colaboração de vocês para se atentarem nesses detalhes e serem pontuais quanto ao evento
              e a confirmação de presença! Agradecemos desde já e desejamos a todos nós juntos uma
              excelente festa!
            </p>
          </div>
        </div>
      </section>

      <section className="map-section">
        <div className="map-content">
          <div className="map-item">
            <img src="/images/igreja2.png" alt="Igreja" className="map-item-img" />
            <h4 className="map-item-title">Igreja</h4>
            <p className="map-item-desc">Paróquia Santo Antônio - Matriz</p>
          </div>
          <div className="map-item">
            <img src="/images/condominio2.png" alt="Condomínio" className="map-item-img" />
            <h4 className="map-item-title">Condomínio</h4>
            <p className="map-item-desc">Recanto Golf Ville</p>
          </div>
          <div className="map-item">
            <img src="/images/celeiro2.png" alt="Salão de Festas" className="map-item-img" />
            <h4 className="map-item-title">Salão de Festas</h4>
            <p className="map-item-desc">Dentro do condomínio</p>
          </div>
        </div>
      </section>

      <section className="bible-section">
        <blockquote>
          &ldquo;Vós, maridos, amai vossas mulheres, como também Cristo amou a Igreja e se entregou
          por ela... Assim também os maridos devem amar suas mulheres como a seus próprios corpos.
          Quem ama sua mulher ama-se a si mesmo... Grande é este mistério; digo-o em relação a Cristo
          e à Igreja.&rdquo;
        </blockquote>
        <cite>(Ef 5, 25-33)</cite>
        <div className="section-divider"></div>
      </section>

      <section className="dresscode">
        <h2 className="dresscode-title">Traje Social</h2>
        <p className="dresscode-warning">
          Atenção: o nosso casamento será na Igreja Católica, pedimos respeito pelo local e modéstia
          ao escolher seu look.
        </p>
        <div className="dresscode-columns">
          <div className="dresscode-col">
            <img src="/images/groom.png" alt="Noivo" className="dresscode-gender-icon" />
            <h3 className="dresscode-subtitle">Aos homens</h3>
            <p>
              Podem ir de terno completo ou calça social, camisa com ou sem gravata e com ou sem
              blazer, tênis ou sapato. Se desejarem depois para a festa, podem levar uma roupa mais
              leve pra ficar mais a vontade.
            </p>
            <h3 className="dresscode-subtitle dresscode-subtitle-gap">As crianças (no caso aos pais)</h3>
            <p>
              Pais e mães, terá muito entretenimento para as crianças, podem levar trocas de roupa se
              desejarem, provavelmente vão se sujar!
            </p>
          </div>
          <div className="dresscode-col">
            <img src="/images/bride.png" alt="Noiva" className="dresscode-gender-icon" />
            <h3 className="dresscode-subtitle">As mulheres</h3>
            <p>
              Vestido social, com tecido à sua escolha! Pode ser mais leve ou alfaiataria. Pedimos
              cuidado apenas com fendas muito altas, decotes excessivos (tanto na frente quanto nas
              costas) e com as cores: evitar cores muito claras. Se desejarem depois para a festa,
              podem levar um vestido mais leve e um sapato baixo. Como no local é grama e pedrisco,
              nossa dica é de levar tênis ou chinelo. Nós noivos ficamos mais a vontade de tênis lá!
            </p>
          </div>
        </div>
        <div className="dresscode-icons">
          <img src="/images/churrasco.png" alt="Churrasco" className="dresscode-icon-img" />
          <img src="/images/drink-icon.png" alt="Bebidas" className="dresscode-icon-img" />
        </div>
        <p className="dresscode-note">
          A festa será no salão de festas do nosso condomínio. É um espaço mais rural, será uma
          costelada/churrascada fogo de chão, com muita bebida e comida boa, e queremos que todos se
          sintam a vontade na festa para aproveitarem ao máximo!
        </p>
        <div className="section-divider"></div>
      </section>

      <section className="pattern-section">
        <div className="pattern-content">
          <div className="pattern-col">
            <img src="/images/homens.png" alt="Homens" className="pattern-img" />
            <h3 className="pattern-subtitle">Padrinhos</h3>
            <p className="pattern-text">
              Os Padrinhos estarão com terno azul marinho, camisa branca e gravata bordô!
            </p>
          </div>
          <div className="pattern-col">
            <img src="/images/mulheres.png" alt="Mulheres" className="pattern-img" />
            <h3 className="pattern-subtitle">Madrinhas</h3>
            <p className="pattern-text">
              As Madrinhas estarão em tons outono quente: tons de marrom, rosa, laranja e amarelo
            </p>
          </div>
        </div>
      </section>

      <section className="gift-section">
        <div className="gift-list-row">
          <img src="/images/presents.png" alt="Presentes" className="gift-card-icon" />
          <div className="gift-list-text">
            <h2 className="gift-title">Presentear os noivos</h2>
            <div className="gift-divider"></div>
            <p className="gift-card-desc">Acesse a página e deixe um presente especial para os noivos.</p>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <p className="footer-phrase">&ldquo;E os dois serão uma só carne.&rdquo;</p>
        <span className="footer-sep">|</span>
        <p className="footer-logo">H &nbsp;|&nbsp; V</p>
        <span className="footer-sep">|</span>
        <p className="footer-year">01 &bull; 08 &bull; 2026</p>
      </footer>
    </>
  )
}
