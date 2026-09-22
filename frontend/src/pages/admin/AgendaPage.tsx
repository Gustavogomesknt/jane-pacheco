import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, ApiError, type Appointment, type Clinic, type Professional, type Service } from '../../api'
import { CATS, STATUS, WD, WD_FULL, addDays, brl, fromISO, toHM, toMin, todayISO, waLink } from '../../lib/format'
import { useToast } from '../../components/Toast'
import AppointmentDialog, { type DialogSeed } from './AppointmentDialog'

const ROW = 48

export default function AgendaPage() {
  const toast = useToast()
  const [day, setDay] = useState(todayISO())
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [pros, setPros] = useState<Professional[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [appts, setAppts] = useState<Appointment[]>([])
  const [dialog, setDialog] = useState<DialogSeed | null>(null)
  const [now, setNow] = useState(new Date())

  const monday = useMemo(() => addDays(day, -((fromISO(day).getDay() + 6) % 7)), [day])
  const rangeEnd = addDays(monday, 7) // inclui a segunda seguinte, para os lembretes de domingo

  useEffect(() => {
    Promise.all([api.settings(), api.professionals(), api.adminServices()])
      .then(([c, p, s]) => { setClinic(c); setPros(p.filter(x => x.active)); setServices(s) })
      .catch(() => toast('Não foi possível carregar a agenda.'))
  }, [toast])

  const load = useCallback(() => {
    api.appointments(monday, rangeEnd).then(setAppts).catch(() => {})
  }, [monday, rangeEnd])

  // Recarrega a cada 30 s para ver na hora o que chegou pelo site.
  useEffect(() => {
    load()
    const t = window.setInterval(() => { load(); setNow(new Date()) }, 30_000)
    return () => window.clearInterval(t)
  }, [load])

  if (!clinic) return <div className="skeleton" style={{ height: 400 }} />

  const today = todayISO()
  const list = appts.filter(a => a.date === day)
  const active = list.filter(a => a.status !== 'cancelado')
  const forecast = active.filter(a => a.status !== 'faltou').reduce((s, a) => s + a.price, 0)
  const confirmed = active.filter(a => a.status === 'confirmado' || a.status === 'concluido').length
  const next = addDays(day, 1)
  const reminders = appts.filter(a => a.date === next && (a.status === 'agendado' || a.status === 'confirmado'))
  const nextLabel = next === addDays(today, 1) ? 'amanhã' : fromISO(next).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' })
  const d = fromISO(day)
  const sub = day === today ? `Hoje, ${WD_FULL[d.getDay()].toLowerCase()}` : day === addDays(today, 1) ? `Amanhã, ${WD_FULL[d.getDay()].toLowerCase()}` : `${WD_FULL[d.getDay()]}, ${d.getFullYear()}`

  async function confirm(a: Appointment) {
    try { await api.setStatus(a.id, 'confirmado'); toast('Marcado como confirmado.'); load() }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Não foi possível salvar.') }
  }

  return (
    <div className="layout">
      <aside>
        <div className="panel"><div className="week">
          {Array.from({ length: 7 }, (_, i) => {
            const di = addDays(monday, i), dd = fromISO(di)
            const n = appts.filter(a => a.date === di && a.status !== 'cancelado').length
            const cls = [di === day && 'sel', di === today && 'today', clinic.closedDays.includes(dd.getDay()) && 'closed'].filter(Boolean).join(' ')
            return (
              <button key={di} className={cls} onClick={() => setDay(di)} aria-label={dd.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}>
                <span className="wd">{WD[dd.getDay()]}</span><span className="dn">{dd.getDate()}</span><span className="ct">{n ? `${n} ag.` : ''}</span>
              </button>
            )
          })}
        </div></div>

        <div className="panel"><h3>Resumo do dia</h3>
          <div className="stats">
            <div className="stat"><b>{active.length}</b><span>atendimentos</span></div>
            <div className="stat"><b>{active.length ? `${confirmed}/${active.length}` : '—'}</b><span>confirmados</span></div>
            <div className="stat" style={{ gridColumn: '1/-1' }}><b>{brl(forecast)}</b><span>previsão de faturamento</span></div>
          </div>
        </div>

        <div className="panel"><h3>Lembretes para {nextLabel}</h3>
          {reminders.length === 0 && <p className="muted small" style={{ margin: 0 }}>Nenhum horário marcado para {nextLabel}.</p>}
          <ul className="rem">
            {reminders.map(a => {
              const link = waLink(a, clinic.name, 'lembrete')
              return (
                <li key={a.id}>
                  <div className="who"><b>{a.clientName}</b><span>{a.time} · {a.serviceName}</span></div>
                  {a.status === 'confirmado' ? <span className="done-tag">Confirmado</span> : <>
                    {link && <a className="btn sm wa" href={link} target="_blank" rel="noopener">Lembrar</a>}
                    <button className="btn sm" onClick={() => confirm(a)}>Confirmar</button>
                  </>}
                </li>
              )
            })}
          </ul>
        </div>
      </aside>

      <section>
        <div className="daynav">
          <button className="iconbtn" onClick={() => setDay(addDays(day, -1))} aria-label="Dia anterior">‹</button>
          <button className="iconbtn" onClick={() => setDay(addDays(day, 1))} aria-label="Próximo dia">›</button>
          <h2>{d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}<small>{sub}</small></h2>
          <span className="spacer" />
          {day !== today && <button className="btn ghost sm" onClick={() => setDay(today)}>Hoje</button>}
          <input type="date" className="btn sm" value={day} onChange={e => e.target.value && setDay(e.target.value)} aria-label="Escolher data" />
          <button className="btn primary" onClick={() => setDialog({ date: day })}>Novo agendamento</button>
        </div>

        {clinic.closedDays.includes(d.getDay()) && <div className="banner">A clínica normalmente não abre neste dia. Você ainda pode marcar horários, se precisar.</div>}

        <Timeline clinic={clinic} pros={pros} list={list} isToday={day === today} now={now}
          onSlot={(time, pro) => setDialog({ date: day, time, professionalId: pro })}
          onOpen={a => setDialog({ appointment: a })} />

        <div className="legend">
          {(Object.keys(CATS) as (keyof typeof CATS)[]).map(k => <span key={k} className={`cat-${k}`}><i />{CATS[k]}</span>)}
          <span>Toque num horário vazio para marcar.</span>
        </div>
      </section>

      {dialog && (
        <AppointmentDialog seed={dialog} clinic={clinic} pros={pros} services={services} appts={appts}
          onClose={() => setDialog(null)}
          onSaved={(saved, msg) => { setDialog(null); toast(msg); if (saved && saved.date !== day) setDay(saved.date); load() }} />
      )}
    </div>
  )
}

interface TimelineProps {
  clinic: Clinic; pros: Professional[]; list: Appointment[]; isToday: boolean; now: Date
  onSlot: (time: string, pro: number) => void; onOpen: (a: Appointment) => void
}

function Timeline({ clinic, pros, list, isToday, now, onSlot, onOpen }: TimelineProps) {
  const open = toMin(clinic.open), close = toMin(clinic.close), step = clinic.slotMin
  const rows = Math.max(1, Math.ceil((close - open) / step))
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const showNow = isToday && nowMin >= open && nowMin <= close

  return (
    <div className="tl"><div className="tl-scroll">
      <div className="tl-grid" style={{ ['--cols' as string]: pros.length || 1 }}>
        <div className="tl-h" />
        {pros.map(p => <div key={p.id} className="tl-h">{p.name}</div>)}
        <div className="tl-hours">{Array.from({ length: rows }, (_, i) => { const m = open + i * step; return <div key={i}>{m % 60 === 0 ? toHM(m) : ''}</div> })}</div>
        {pros.map(p => (
          <div key={p.id} className="tl-col">
            {Array.from({ length: rows }, (_, i) => {
              const m = open + i * step, hm = toHM(m)
              return <button key={i} className={`slot ${m % 60 === 0 ? 'hour' : ''}`} onClick={() => onSlot(hm, p.id)} aria-label={`Marcar às ${hm} com ${p.name}`}>+ {hm}</button>
            })}
            {list.filter(a => a.professionalId === p.id).map(a => {
              const top = (toMin(a.time) - open) / step * ROW
              const h = Math.max(a.durationMin / step * ROW - 4, 26)
              return (
                <button key={a.id} className={`appt cat-${a.category} ${a.status}`} style={{ top: top + 2, height: h }} onClick={() => onOpen(a)}>
                  <b>{a.clientName}</b><span>{a.time}–{a.end} · {a.serviceName}</span>
                  {a.status !== 'agendado'
                    ? <em className={`st pill ${a.status}`}>{STATUS[a.status]}</em>
                    : a.origin === 'site' && <em className="st pill site">Pelo site</em>}
                </button>
              )
            })}
            {showNow && <div className="now" style={{ top: (nowMin - open) / step * ROW }} />}
          </div>
        ))}
      </div>
    </div></div>
  )
}
