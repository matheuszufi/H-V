import { useState } from 'react'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../firebase'
import './Rsvp.css'

export default function Rsvp() {
  const [pessoas, setPessoas] = useState([''])
  const [mensagem, setMensagem] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  const addPessoa = () => {
    if (pessoas.length < 5) {
      setPessoas([...pessoas, ''])
    }
  }

  const removePessoa = (index) => {
    setPessoas(pessoas.filter((_, i) => i !== index))
  }

  const updatePessoa = (index, value) => {
    const updated = [...pessoas]
    updated[index] = value
    setPessoas(updated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')

    const nomes = pessoas.map((p) => p.trim()).filter(Boolean)
    if (nomes.length === 0) {
      setErro('Por favor, insira pelo menos um nome.')
      return
    }

    try {
      const grupoId = crypto.randomUUID()
      const agora = new Date().toISOString()
      for (let i = 0; i < nomes.length; i++) {
        await addDoc(collection(db, 'rsvp'), {
          nome: nomes[i],
          mensagem: i === 0 ? mensagem.trim() : '',
          status: 'confirmado',
          grupoId,
          criadoEm: agora,
        })
      }
      setEnviado(true)
    } catch {
      setErro('Erro ao confirmar. Tente novamente.')
    }
  }

  if (enviado) {
    const nomes = pessoas.map((p) => p.trim()).filter(Boolean)
    return (
      <div className="rsvp-page">
        <div className="rsvp-card">
          <h1 className="rsvp-logo">H &nbsp;|&nbsp; V</h1>
          <div className="rsvp-divider"></div>
          <h2 className="rsvp-success-title">Presença Confirmada!</h2>
          <p className="rsvp-success-text">
            {nomes.length === 1
              ? <>Obrigado, <strong>{nomes[0]}</strong>! Estamos ansiosos para celebrar com você.</>
              : <>Obrigado! <strong>{nomes.length} presenças</strong> confirmadas. Estamos ansiosos para celebrar com vocês.</>
            }
          </p>
          <a href="/" className="rsvp-back">Voltar ao site</a>
        </div>
      </div>
    )
  }

  return (
    <div className="rsvp-page">
      <div className="rsvp-card">
        <h1 className="rsvp-logo">H &nbsp;|&nbsp; V</h1>
        <div className="rsvp-divider"></div>
        <h2 className="rsvp-heading">Confirmar Presença</h2>
        <p className="rsvp-info">
          Confirme sua presença no máximo até o dia <strong>29/06/2026</strong>.
        </p>
        <p className="rsvp-notice">
          Para que possamos organizar tudo com muito carinho, pedimos que a confirmação de presença seja feita apenas para as pessoas que constam no convite.
          Nosso espaço possui capacidade limitada, por isso não será possível incluir convidados extras.
          <br /><br />
          Agradecemos muito a compreensão e estamos ansiosos para celebrar esse momento com vocês!
        </p>

        {erro && <p className="rsvp-error">{erro}</p>}

        <form className="rsvp-form" onSubmit={handleSubmit}>
          {pessoas.map((pessoa, index) => (
            <div key={index} className="rsvp-pessoa-row">
              <label className="rsvp-label">
                {index === 0 ? 'Nome completo' : `Pessoa ${index + 1}`}
                <input
                  type="text"
                  value={pessoa}
                  onChange={(e) => updatePessoa(index, e.target.value)}
                  className="rsvp-input"
                  placeholder="Nome completo"
                  required
                />
              </label>
              {index > 0 && (
                <button type="button" className="rsvp-remove" onClick={() => removePessoa(index)}>
                  &times;
                </button>
              )}
            </div>
          ))}

          {pessoas.length < 5 && (
            <button type="button" className="rsvp-add" onClick={addPessoa}>
              + Adicionar pessoa
            </button>
          )}

          <label className="rsvp-label">
            Mensagem para os noivos (opcional)
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="rsvp-input rsvp-textarea"
              placeholder="Deixe uma mensagem carinhosa..."
              rows="3"
            />
          </label>

          <button type="submit" className="rsvp-submit">Confirmar Presença</button>
        </form>
      </div>
    </div>
  )
}
