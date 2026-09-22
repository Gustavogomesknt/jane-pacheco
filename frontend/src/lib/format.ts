import type { Appointment, Category, Clinic, Status } from '../api'

export const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
export const WD_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const MON = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const STATUS: Record<Status, string> = { agendado: 'Agendado', confirmado: 'Confirmado', concluido: 'Concluído', faltou: 'Faltou', cancelado: 'Cancelado' }
export const CATS: Record<Category, string> = { facial: 'Facial', corporal: 'Corporal', outro: 'Outros' }

const pad = (n: number) => String(n).padStart(2, '0')
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fromISO = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const todayISO = () => toISO(new Date())
export const addDays = (iso: string, n: number) => { const d = fromISO(iso); d.setDate(d.getDate() + n); return toISO(d) }
export const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0) }
export const toHM = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
export const digits = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '')

export const brl = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const brlShort = (v: number) => Number(v) ? 'R$ ' + Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : 'Cortesia'

export const longDate = (iso: string) => fromISO(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

const fmtH = (t: string) => { const [h, m] = t.split(':'); return Number(h) + 'h' + (m !== '00' ? m : '') }

export function hoursText(c: Clinic) {
  const order = [1, 2, 3, 4, 5, 6, 0]
  const open = order.filter(d => !c.closedDays.includes(d))
  if (!open.length) return 'Sob agendamento'
  const names = open.map(d => WD_FULL[d].toLowerCase())
  const contiguous = open.every((d, i) => i === 0 || order.indexOf(d) === order.indexOf(open[i - 1]) + 1)
  const days = open.length === 1 ? names[0] : contiguous ? `${names[0]} a ${names[names.length - 1]}` : names.join(', ')
  return `${days[0].toUpperCase() + days.slice(1)}, das ${fmtH(c.open)} às ${fmtH(c.close)}`
}

export function waNumber(phone: string | null | undefined) {
  let d = digits(phone)
  if (d.length < 10) return null
  if (d.length <= 11) d = '55' + d
  return d
}

export function waLink(a: Pick<Appointment, 'clientName' | 'clientPhone' | 'date' | 'time' | 'serviceName'>, clinicName: string, kind: 'lembrete' | 'confirmacao') {
  const n = waNumber(a.clientPhone)
  if (!n) return null
  const dia = fromISO(a.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
  const first = a.clientName.trim().split(/\s+/)[0] ?? ''
  const msg = kind === 'lembrete'
    ? `Oi, ${first}! Passando para lembrar do seu horário de amanhã, ${dia}, às ${a.time}: ${a.serviceName}. Podemos confirmar? 💜\n${clinicName}`
    : `Oi, ${first}! Seu horário na ${clinicName} está marcado: ${a.serviceName}, ${dia}, às ${a.time}. Se surgir algum imprevisto, é só avisar por aqui. 💜`
  return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`
}

/** Separa "Jane Pacheco Estética" em ["Jane Pacheco", "Estética"]. */
export function splitName(name: string): [string, string] {
  const m = name.match(/^(.*?)\s+(Est[ée]tica.*)$/i)
  return m ? [m[1], m[2]] : [name, '']
}
