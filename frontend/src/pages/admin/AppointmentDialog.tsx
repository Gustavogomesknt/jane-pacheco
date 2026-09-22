import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { api, ApiError, type Appointment, type AppointmentInput, type Clinic, type Professional, type Service, type Status } from '../../api'
import { STATUS, brl, toHM, toMin, waLink } from '../../lib/format'

export interface DialogSeed { appointment?: Appointment; date?: string; time?: string; professionalId?: number }

interface Props {
  seed: DialogSeed; clinic: Clinic; pros: Professional[]; services: Service[]; appts: Appointment[]
  onClose: () => void; onSaved: (a: Appointment | null, message: string) => void
}

export default function AppointmentDialog({ seed, clinic, pros, services, appts, onClose, onSaved }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const a = seed.appointment
  const firstSvc = services.find(s => s.active) ?? services[0]

  const [clientName, setClientName] = useState(a?.clientName ?? '')
  const [clientPhone, setClientPhone] = useState(a?.clientPhone ?? '')
  const [serviceId, setServiceId] = useState(a?.serviceId ?? firstSvc?.id ?? 0)
  const [date, setDate] = useState(a?.date ?? seed.date ?? '')
  const [professionalId, setProfessionalId] = useState(a?.professionalId ?? seed.professionalId ?? pros[0]?.id ?? 0)
  const [time, setTime] = useState(a?.time ?? seed.time ?? '')
  const [durationMin, setDuration] = useState(a?.durationMin ?? firstSvc?.durationMin ?? 30)
  const [price, setPrice] = useState(a?.price ?? firstSvc?.price ?? 0)
  const [notes, setNotes] = useState(a?.notes ?? '')
  const [status, setStatus] = useState<Status>(a?.status ?? 'agendado')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { ref.current?.showModal() }, [])

  // Horários do dia com marcação de ocupado (apenas dentro da semana já carregada).
  const options = useMemo(() => {
    const out: { hm: string; busy: boolean }[] = []
    for (let m = toMin(clinic.open); m < toMin(clinic.close); m += clinic.slotMin) {
      const busy = appts.some(b => b.id !== a?.id && b.date === date && b.professionalId === professionalId && b.status !== 'cancelado'
        && toMin(b.time) < m + durationMin && toMin(b.time) + b.durationMin > m)
      out.push({ hm: toHM(m), busy })
    }
    return out
  }, [appts, date, professionalId, durationMin, clinic, a?.id])

  useEffect(() => { if (!time) { const f = options.find(o => !o.busy); if (f) setTime(f.hm) } }, [options, time])

  const knownClients = useMemo(() => {
    const m = new Map<string, string>()
    appts.forEach(x => { if (x.clientName && !m.has(x.clientName)) m.set(x.clientName, x.clientPhone) })
    return m
  }, [appts])

  function pickService(id: number) {
    setServiceId(id)
    const s = services.find(x => x.id === id)
    if (s) { setDuration(s.durationMin); setPrice(s.price) }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!clientName.trim()) return setError('Informe o nome da cliente.')
    if (!date || !time) return setError('Escolha a data e o horário.')
    const body: AppointmentInput = { date, time, durationMin, serviceId, professionalId, clientName: clientName.trim(), clientPhone: clientPhone.trim(), price, notes: notes.trim() || null, status }
    setBusy(true)
    try {
      const saved = a ? await api.updateAppointment(a.id, body) : await api.createAppointment(body)
      onSaved(saved, a ? 'Agendamento salvo.' : 'Horário marcado.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar.')
    } finally { setBusy(false) }
  }

  async function remove() {
    if (!a || !window.confirm('Excluir este agendamento? Para manter o histórico, prefira marcar como Cancelado.')) return
    try { await api.deleteAppointment(a.id); onSaved(null, 'Agendamento excluído.') }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Não foi possível excluir.') }
  }

  const wa = a ? waLink(a, clinic.name, 'confirmacao') : null
  const hasCurrent = options.some(o => o.hm === time)

  return (
    <dialog ref={ref} onClose={onClose} onClick={e => { if (e.target === ref.current) ref.current?.close() }}>
      <form onSubmit={submit} noValidate>
        <div className="dlg-h">
          <h3>{a ? 'Agendamento' : 'Novo agendamento'}</h3>
          {a?.origin === 'site' && <span className="pill site">Feito pelo site</span>}
          <button type="button" className="iconbtn" onClick={() => ref.current?.close()} aria-label="Fechar">×</button>
        </div>
        <div className="dlg-b">
          {a && (
            <div className="statusbar" role="group" aria-label="Situação">
              {(Object.keys(STATUS) as Status[]).map(k => (
                <button key={k} type="button" aria-pressed={status === k} onClick={() => setStatus(k)}>{STATUS[k]}</button>
              ))}
            </div>
          )}
          <div className="row2">
            <div className="field"><label htmlFor="f-client">Cliente</label>
              <input id="f-client" list="dl-clients" autoComplete="off" value={clientName}
                onChange={e => { setClientName(e.target.value); const p = knownClients.get(e.target.value); if (p && !clientPhone) setClientPhone(p) }} />
              <datalist id="dl-clients">{[...knownClients.keys()].map(n => <option key={n} value={n} />)}</datalist>
            </div>
            <div className="field"><label htmlFor="f-phone">WhatsApp</label><input id="f-phone" inputMode="tel" placeholder="(11) 98765-4321" value={clientPhone} onChange={e => setClientPhone(e.target.value)} /></div>
          </div>
          <div className="field"><label htmlFor="f-svc">Tratamento</label>
            <select id="f-svc" value={serviceId} onChange={e => pickService(Number(e.target.value))}>
              {services.filter(s => s.active || s.id === serviceId).map(s => <option key={s.id} value={s.id}>{s.name} ({s.durationMin} min, {brl(s.price)})</option>)}
            </select>
          </div>
          <div className="row2">
            <div className="field"><label htmlFor="f-date">Data</label><input id="f-date" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div className="field"><label htmlFor="f-pro">Profissional</label>
              <select id="f-pro" value={professionalId} onChange={e => setProfessionalId(Number(e.target.value))}>
                {pros.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="row2">
            <div className="field"><label htmlFor="f-time">Horário</label>
              <select id="f-time" value={time} onChange={e => setTime(e.target.value)}>
                {!hasCurrent && time && <option value={time}>{time}</option>}
                {options.map(o => <option key={o.hm} value={o.hm}>{o.hm}{o.busy ? ' (ocupado)' : ''}</option>)}
              </select>
            </div>
            <div className="row2" style={{ gap: 8 }}>
              <div className="field"><label htmlFor="f-dur">Duração</label><input id="f-dur" type="number" min={5} step={5} value={durationMin} onChange={e => setDuration(Number(e.target.value) || 30)} /></div>
              <div className="field"><label htmlFor="f-price">Valor (R$)</label><input id="f-price" type="number" min={0} step={5} value={price} onChange={e => setPrice(Number(e.target.value) || 0)} /></div>
            </div>
          </div>
          <div className="field"><label htmlFor="f-notes">Observações</label><textarea id="f-notes" rows={2} placeholder="Alergias, pacote, sessão 3 de 10…" value={notes} onChange={e => setNotes(e.target.value)} /></div>
          {error && <div className="err">{error}</div>}
        </div>
        <div className="dlg-f">
          {a && <button type="button" className="btn danger" onClick={remove}>Excluir</button>}
          <span className="grow" />
          {wa && <a className="btn wa" href={wa} target="_blank" rel="noopener">Enviar no WhatsApp</a>}
          <button type="submit" className="btn primary" disabled={busy}>{a ? 'Salvar' : 'Marcar horário'}</button>
        </div>
      </form>
    </dialog>
  )
}
