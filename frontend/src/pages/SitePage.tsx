import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Category, type Clinic, type Service } from '../api'
import SiteHeader from '../components/SiteHeader'
import Booking from '../components/Booking'
import { Frame } from '../components/Frame'
import { CATS, brlShort, hoursText, splitName, waNumber } from '../lib/format'

const GALLERY_SLOTS = 6

export default function SitePage() {
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [cat, setCat] = useState<Category | 'all'>('all')
  const [preselect, setPreselect] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    Promise.all([api.clinic(), api.services()])
      .then(([c, s]) => { setClinic(c); setServices(s); document.title = c.name })
      .catch(() => setFailed(true))
  }, [])

  if (failed) return <div className="loading">Não foi possível carregar o site. Confira se a API está rodando.</div>
  if (!clinic) return <div className="loading">Jane Pacheco Estética</div>

  const [first, rest] = splitName(clinic.name)
  const cats = [...new Set(services.map(s => s.category))]
  const list = services.filter(s => cat === 'all' || s.category === cat)
  const ig = clinic.instagram.replace(/^@/, '').trim()
  const wa = waNumber(clinic.whatsApp)
  const hours = hoursText(clinic)
  const gallery = Array.from({ length: Math.max(GALLERY_SLOTS, clinic.gallery.length) }, (_, i) => clinic.gallery[i] ?? null).slice(0, 12)
  const defaultCaps = ['Nosso espaço', 'Cuidado facial', 'Detalhes', 'Resultados', 'Bem-estar', 'Produtos']

  return (
    <>
      <SiteHeader name={clinic.name} />

      <section className="hero"><div className="wrap hero-in">
        <div>
          <p className="kicker anim">Estética facial e corporal</p>
          <h1 className="anim d2">{first}{rest && <span>{rest}</span>}</h1>
          <p className="lead anim d3">{clinic.tagline}</p>
          <div className="ctas anim d4">
            <a className="btn primary lg" href="#agendar">Agendar meu horário</a>
            <a className="btn ghost lg" href="#servicos">Ver tratamentos</a>
          </div>
        </div>
        <div className="hero-art anim d3">
          <Frame photo={clinic.heroPhoto} arch index={0} alt={clinic.name} />
          <div className="badge"><div><b>{services.length}</b><span>tratamentos para rosto e corpo</span></div></div>
        </div>
      </div></section>

      <section className="s alt" id="sobre"><div className="wrap about">
        <Frame photo={clinic.aboutPhoto} arch index={3} alt="Sobre a clínica" />
        <div className="txt">
          <h2>Beleza que respeita quem você é</h2>
          {clinic.about.split(/\n\s*\n/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
          <div className="pillars">
            <div><h4>Avaliação individual</h4><p>Todo tratamento começa entendendo a sua pele e a sua rotina.</p></div>
            <div><h4>Protocolos sob medida</h4><p>Técnicas combinadas para o resultado que você procura.</p></div>
            <div><h4>Tempo para você</h4><p>Hora marcada, sem pressa, em um ambiente acolhedor.</p></div>
          </div>
        </div>
      </div></section>

      <section className="s" id="servicos"><div className="wrap">
        <div className="s-head"><h2>Tratamentos</h2><p>Escolha um tratamento e agende em poucos passos. Na dúvida, comece pela avaliação.</p></div>
        <div className="svc-tabs" role="group" aria-label="Filtrar por categoria">
          <button aria-pressed={cat === 'all'} onClick={() => setCat('all')}>Todos</button>
          {cats.map(k => <button key={k} aria-pressed={cat === k} onClick={() => setCat(k)}>{CATS[k]}</button>)}
        </div>
        <div className="svc-list">
          {list.map(s => (
            <article className="svc-item" key={s.id}>
              <h3>{s.name}</h3><div className="price">{brlShort(s.price)}</div>
              <p>{s.description}</p>
              <div className="meta"><span>{s.durationMin} min</span><a href="#agendar" onClick={() => setPreselect(s.id)}>Agendar</a></div>
            </article>
          ))}
        </div>
      </div></section>

      <section className="s alt" id="galeria"><div className="wrap">
        <div className="s-head"><h2>Por dentro da clínica</h2><p>Um pouco do nosso espaço, dos cuidados e dos resultados.</p></div>
        <div className="gallery">
          {gallery.map((p, i) => <Frame key={p?.id ?? `ph${i}`} photo={p} index={i} caption={p?.caption || defaultCaps[i % defaultCaps.length]} />)}
        </div>
        {ig && <div className="insta"><a className="btn" href={`https://www.instagram.com/${ig}/`} target="_blank" rel="noopener">Ver mais no Instagram @{ig}</a></div>}
      </div></section>

      <section className="s" id="agendar"><div className="wrap book">
        <div className="book-side">
          <h2>Agende seu momento</h2>
          <p>Escolha o tratamento, o dia e o horário que ficam melhor para você. A confirmação chega pelo WhatsApp.</p>
          <dl>
            <div><dt>Horário de atendimento</dt><dd>{hours}</dd></div>
            {clinic.address && <div><dt>Endereço</dt><dd>{clinic.address}</dd></div>}
            {wa && <div><dt>WhatsApp</dt><dd><a href={`https://wa.me/${wa}`} target="_blank" rel="noopener">{clinic.whatsApp}</a></dd></div>}
          </dl>
        </div>
        <Booking clinic={clinic} services={services} preselect={preselect} />
      </div></section>

      <footer className="site"><div className="wrap">
        <div className="cols">
          <div><div className="big">{first}<br /><i>{rest || 'Estética'}</i></div></div>
          <div><h5>Atendimento</h5><p>{hours}</p>{clinic.address && <p style={{ marginTop: 8 }}>{clinic.address}</p>}</div>
          <div><h5>Redes</h5>
            {ig && <p><a href={`https://www.instagram.com/${ig}/`} target="_blank" rel="noopener">@{ig}</a></p>}
            {wa && <p><a href={`https://wa.me/${wa}`} target="_blank" rel="noopener">WhatsApp</a></p>}
          </div>
        </div>
        <div className="fine"><span>© {new Date().getFullYear()} {clinic.name}</span><Link to="/equipe">Área da equipe</Link></div>
      </div></footer>
    </>
  )
}
