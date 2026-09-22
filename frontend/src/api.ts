export type Category = 'facial' | 'corporal' | 'outro'
export type Status = 'agendado' | 'confirmado' | 'concluido' | 'faltou' | 'cancelado'
export type PhotoSlot = 'hero' | 'about' | 'gallery'

export interface Photo { id: number; slot: PhotoSlot; url: string; caption: string; sortOrder: number }

export interface Clinic {
  name: string; tagline: string; about: string; address: string; whatsApp: string; instagram: string
  open: string; close: string; slotMin: number; closedDays: number[]
  heroPhoto: Photo | null; aboutPhoto: Photo | null; gallery: Photo[]
}

export interface Service {
  id: number; name: string; description: string; category: Category
  durationMin: number; price: number; sortOrder: number; active: boolean
}

export interface Professional { id: number; name: string; active: boolean }
export interface DayAvailability { date: string; hasSlots: boolean }
export interface FreeSlot { time: string; professionalId: number }

export interface Appointment {
  id: string; date: string; time: string; end: string; durationMin: number
  serviceId: number; serviceName: string; category: Category; price: number
  professionalId: number; clientName: string; clientPhone: string; notes: string | null
  status: Status; origin: 'site' | 'equipe'; createdAt: string
}

export interface AppointmentInput {
  date: string; time: string; durationMin: number; serviceId: number; professionalId: number
  clientName: string; clientPhone: string; price: number; notes: string | null; status?: Status
}

export interface BookingInput { serviceId: number; date: string; time: string; professionalId?: number | null; name: string; phone: string }
export interface BookingResult { id: string; date: string; time: string; serviceName: string; professionalName: string }

export type SettingsInput = Pick<Clinic, 'name' | 'tagline' | 'about' | 'address' | 'whatsApp' | 'instagram' | 'open' | 'close' | 'slotMin' | 'closedDays'>
export type ServiceInput = Omit<Service, 'id'>

const TOKEN_KEY = 'jp_token'
export const auth = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const token = auth.get()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')

  const res = await fetch(path, { ...init, headers })
  if (res.status === 401 && path.startsWith('/api/admin')) {
    auth.clear()
    window.location.assign('/equipe/login')
  }
  if (!res.ok) {
    let message = 'Não foi possível concluir. Tente de novo.'
    try { const body = await res.json(); if (body?.message) message = body.message } catch { /* sem corpo */ }
    throw new ApiError(message, res.status)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

export const api = {
  // Site
  clinic: () => request<Clinic>('/api/public/clinic'),
  services: () => request<Service[]>('/api/public/services'),
  days: (serviceId: number) => request<DayAvailability[]>(`/api/public/days?serviceId=${serviceId}`),
  availability: (serviceId: number, date: string) => request<FreeSlot[]>(`/api/public/availability?serviceId=${serviceId}&date=${date}`),
  book: (b: BookingInput) => request<BookingResult>('/api/public/bookings', json('POST', b)),

  // Login
  login: (email: string, password: string) => request<{ token: string; expiresAt: string }>('/api/auth/login', json('POST', { email, password })),

  // Equipe
  appointments: (from: string, to: string) => request<Appointment[]>(`/api/admin/appointments?from=${from}&to=${to}`),
  createAppointment: (a: AppointmentInput) => request<Appointment>('/api/admin/appointments', json('POST', a)),
  updateAppointment: (id: string, a: AppointmentInput) => request<Appointment>(`/api/admin/appointments/${id}`, json('PUT', a)),
  setStatus: (id: string, status: Status) => request<Appointment>(`/api/admin/appointments/${id}/status`, json('PATCH', { status })),
  deleteAppointment: (id: string) => request<void>(`/api/admin/appointments/${id}`, { method: 'DELETE' }),

  professionals: () => request<Professional[]>('/api/admin/professionals'),
  createProfessional: (name: string) => request<Professional>('/api/admin/professionals', json('POST', { name, active: true })),
  updateProfessional: (p: Professional) => request<Professional>(`/api/admin/professionals/${p.id}`, json('PUT', { name: p.name, active: p.active })),

  adminServices: () => request<Service[]>('/api/admin/services'),
  createService: (s: ServiceInput) => request<Service>('/api/admin/services', json('POST', s)),
  updateService: (id: number, s: ServiceInput) => request<Service>(`/api/admin/services/${id}`, json('PUT', s)),
  deactivateService: (id: number) => request<void>(`/api/admin/services/${id}`, { method: 'DELETE' }),

  settings: () => request<Clinic>('/api/admin/settings'),
  updateSettings: (s: SettingsInput) => request<Clinic>('/api/admin/settings', json('PUT', s)),

  uploadPhoto: (file: File, slot: PhotoSlot, caption = '') => {
    const fd = new FormData()
    fd.append('file', file); fd.append('slot', slot); fd.append('caption', caption)
    return request<Photo>('/api/admin/photos', { method: 'POST', body: fd })
  },
  updatePhoto: (p: Photo) => request<Photo>(`/api/admin/photos/${p.id}`, json('PUT', { caption: p.caption, sortOrder: p.sortOrder })),
  deletePhoto: (id: number) => request<void>(`/api/admin/photos/${id}`, { method: 'DELETE' }),
}
