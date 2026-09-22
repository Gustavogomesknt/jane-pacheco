import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { splitName } from '../lib/format'

export function Logo({ name }: { name: string }) {
  const [first, rest] = splitName(name)
  return <Link to="/" className="logo" aria-label="Início"><b>{first}</b>{rest && <i>{rest}</i>}</Link>
}

export default function SiteHeader({ name }: { name: string }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <header className={`top ${scrolled ? 'scrolled' : ''}`}>
      <div className="wrap top-in">
        <Logo name={name} />
        <nav className="menu">
          <a href="#sobre">Sobre</a><a href="#servicos">Serviços</a><a href="#galeria">Galeria</a><a href="#agendar">Contato</a>
        </nav>
        <a className="btn primary" href="#agendar">Agendar horário</a>
      </div>
    </header>
  )
}
