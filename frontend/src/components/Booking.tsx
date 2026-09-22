import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api, ApiError, type BookingResult, type Clinic, type DayAvailability, type FreeSlot, type Service } from '../api'
import { MON, WD, brlShort, digits, fromISO, longDate, todayISO, addDays, toMin, waNumber } from '../lib/format'

interface Props { clinic: Clinic; services: Service[]; preselect: number | null }

export default function Booking({ clinic, services, preselect }: Props) {
  const [serviceId, setServiceId] = useState<number | null>(null)
  const [days, setDays] = useState<DayAvailability[]>([])
  const [date, setDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<FreeSlot[] | null>(null)
  const [slot, setSlot] = useState<FreeSlot | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState<BookingResult | null>(null)

  const service = services.find(s => s.id === serviceId) ?? null

  useEffect(() => { if (preselect) { setServiceId(preselect); setDone(null) } }, [preselect])

  useEffect(() => {
    setDays([]); setSlot(null); setSlots(null)
    if (!serviceId) return
    let alive = true
    api.days(serviceId).then(d => { if (alive) setDays(d) }).catch(() => {})
    return () => { alive = false }
  }, [serviceId])

  useEffect(() => {
    setSlot(null); setSlots(null)
    if (!serviceId || !date) return
    let alive = true
    api.availability(serviceId, date).then(s => { if (alive) setSlots(s) }).catch(() => { if (alive) setSlots([]) })
    return () => { alive = false }
  }, [serviceId, date])

  const groups = useMemo(() => {
    if (!slots) return []
    return ([['Manhã', 0, 720], ['Tarde', 720, 1080], ['Noite', 1080, 1440]] as const)
      .map(([label, a, b]) => ({ label, items: slots.filter(s => toMin(s.time) >= a && toMin(s.time) < b) }))
      .filter(g => g.items.length)
  }, [slots])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!service || !date || !slot) return setError('Escolha o tratamento, o dia e o horário.')
    if (name.trim().length < 3) return setError('Informe seu nome.')
    if (digits(phone).length < 10) return setError('Informe um WhatsApp com DDD.')
    setSaving(true)
    try {
      const r = await api.book({ serviceId: service.id, date, time: slot.time, professionalId: slot.professionalId, name: name.trim(), phone: phone.trim() })
      setDone(r)
      document.getElementById('agendar')?.scrollIntoView({ block: 'start' })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível reservar. Tente de novo.')
      if (err instanceof ApiError && err.status === 409) {
        setSlot(null)
        api.availability(service.id, date).then(setSlots).catch(() => {})
      }
    } finally { setSaving(false) }
  }

  function reset() { setDone(null); setServiceId(null); setDate(null); setSlot(null) }

  if (done) {
    const wa = waNumber(clinic.whatsApp)
    const msg = `Olá! Acabei de agendar pelo site: ${done.serviceName}, ${longDate(done.date)}, às ${done.time}. Meu nome é ${name.trim()}.`
    return (
      <div className="bk"><div className="bk-ok">
        <div className="mark">✓</div>
        <h3>Horário reservado</h3>
        <p>{done.serviceName}, {longDate(done.date)}, às {done.time}. Vamos confirmar com você pelo WhatsApp.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {wa && <a className="btn wa" href={`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener">Avisar a clínica no WhatsApp</a>}
          <button className="btn" onClick={reset}>Agendar outro horário</button>
        </div>
      </div></div>
    )
  }

  const today = todayISO()
  const s1 = !!service, s2 = s1 && !!date, s3 = s2 && !!slot

  return (
    <div className="bk">
      <div className={`bk-step ${s1 ? 'done' : ''}`}>
        <h4><span className="n">1</span>Tratamento</h4>
        <div className="chips">
          {services.map(s => (
            <button key={s.id} type="button" className="chip" aria-pressed={serviceId === s.id} onClick={() => setServiceId(s.id)}>
              {s.name}<small>{s.durationMin} min · {brlShort(s.price)}</small>
            </button>
          ))}
        </div>
      </div>

      <div className={`bk-step ${s2 ? 'done' : ''} ${s1 ? '' : 'off'}`}>
        <h4><span className="n">2</span>Dia</h4>
        <div className="days-scroll">
          {(s1 && !days.length) && <div className="skeleton" style={{ width: '100%', height: 74 }} />}
          {days.map(d => {
            const dd = fromISO(d.date)
            const label = d.date === today ? 'hoje' : d.date === addDays(today, 1) ? 'amanhã' : WD[dd.getDay()]
            return (
              <button key={d.date} type="button" className="daychip" disabled={!d.hasSlots} aria-pressed={date === d.date} onClick={() => setDate(d.date)}>
                <span className="w">{label}</span><span className="d">{dd.getDate()}</span><span className="m">{MON[dd.getMonth()]}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className={`bk-step ${s3 ? 'done' : ''} ${s2 ? '' : 'off'}`}>
        <h4><span className="n">3</span>Horário</h4>
        {!s2 && <p className="muted" style={{ margin: 0 }}>Escolha um dia para ver os horários livres.</p>}
        {s2 && slots === null && <div className="skeleton" />}
        {s2 && slots?.length === 0 && <p className="muted" style={{ margin: 0 }}>Esse dia está com a agenda cheia. Escolha outra data.</p>}
        {groups.map(g => (
          <div key={g.label}>
            <div className="period">{g.label}</div>
            <div className="chips">
              {g.items.map(s => (
                <button key={s.time} type="button" className="timechip" aria-pressed={slot?.time === s.time} onClick={() => setSlot(s)}>{s.time}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <form className={`bk-step ${s3 ? '' : 'off'}`} onSubmit={submit} noValidate>
        <h4><span className="n">4</span>Seus dados</h4>
        <div className="row2">
          <div className="field"><label htmlFor="bk-name">Nome completo</label><input id="bk-name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="field"><label htmlFor="bk-phone">WhatsApp</label><input id="bk-phone" inputMode="tel" autoComplete="tel" placeholder="(11) 98765-4321" value={phone} onChange={e => setPhone(e.target.value)} /></div>
        </div>
        {s3 && service && date && slot && (
          <div className="bk-sum"><b>{service.name}</b>{longDate(date)}, às {slot.time} · {service.durationMin} min · {brlShort(service.price)}</div>
        )}
        {error && <div className="err">{error}</div>}
        <button className="btn primary lg" type="submit" style={{ width: '100%', marginTop: 6 }} disabled={saving}>
          {saving ? 'Reservando…' : 'Confirmar agendamento'}
        </button>
      </form>
    </div>
  )
}
