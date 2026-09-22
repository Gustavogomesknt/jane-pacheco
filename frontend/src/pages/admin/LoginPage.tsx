import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError, auth } from '../../api'
import { Logo } from '../../components/SiteHeader'

export default function LoginPage() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const r = await api.login(email, password)
      auth.set(r.token)
      nav('/equipe', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível entrar.')
    } finally { setBusy(false) }
  }

  return (
    <>
      <header className="top"><div className="wrap top-in"><Logo name="Jane Pacheco Estética" /></div></header>
      <main className="login">
        <form className="card" onSubmit={submit}>
          <h1>Área da equipe</h1>
          <p>Entre para ver a agenda e os ajustes do site.</p>
          <div className="field"><label htmlFor="em">E-mail</label><input id="em" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div className="field"><label htmlFor="pw">Senha</label><input id="pw" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
          {error && <div className="err" style={{ marginTop: 14 }}>{error}</div>}
          <button className="btn primary lg" style={{ width: '100%', marginTop: 20 }} disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        </form>
      </main>
    </>
  )
}
