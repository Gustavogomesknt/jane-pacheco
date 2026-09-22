import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { auth } from '../../api'
import { Logo } from '../../components/SiteHeader'

export default function AdminLayout() {
  const nav = useNavigate()
  if (!auth.get()) return <Navigate to="/equipe/login" replace />

  return (
    <>
      <header className="top"><div className="wrap top-in">
        <Logo name="Jane Pacheco Estética" />
        <Link className="btn ghost sm" to="/">Ver o site</Link>
        <button className="btn ghost sm" onClick={() => { auth.clear(); nav('/equipe/login') }}>Sair</button>
      </div></header>
      <main className="team"><div className="wrap">
        <div className="team-bar">
          <h1>Área da equipe</h1>
          <nav className="tabs team-nav">
            <NavLink end to="/equipe"><TabBtn label="Agenda" /></NavLink>
            <NavLink to="/equipe/ajustes"><TabBtn label="Ajustes" /></NavLink>
          </nav>
        </div>
        <Outlet />
      </div></main>
    </>
  )
}

// NavLink injeta aria-current; o CSS das abas usa aria-selected, então espelhamos aqui.
function TabBtn({ label }: { label: string }) {
  return <span className="tabbtn">{label}</span>
}
