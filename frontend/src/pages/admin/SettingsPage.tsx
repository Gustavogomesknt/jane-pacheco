import { useEffect, useState, type ChangeEvent } from 'react'
import { api, ApiError, type Category, type Clinic, type Photo, type PhotoSlot, type Professional, type Service } from '../../api'
import { CATS, WD_FULL, toHM } from '../../lib/format'
import { Frame } from '../../components/Frame'
import { useToast } from '../../components/Toast'

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Não foi possível salvar.')

export default function SettingsPage() {
  const toast = useToast()
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [pros, setPros] = useState<Professional[]>([])
  const [uploading, setUploading] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.settings(), api.adminServices(), api.professionals()])
      .then(([c, s, p]) => { setClinic(c); setServices(s); setPros(p) })
      .catch(() => toast('Não foi possível carregar os ajustes.'))
  }, [toast])

  if (!clinic) return <div className="skeleton" style={{ height: 400 }} />

  const set = <K extends keyof Clinic>(k: K, v: Clinic[K]) => setClinic({ ...clinic, [k]: v })
  const hourOpts = Array.from({ length: 37 }, (_, i) => toHM(5 * 60 + i * 30))

  async function saveSettings() {
    if (!clinic) return
    try {
      const { heroPhoto: _h, aboutPhoto: _a, gallery: _g, ...rest } = clinic
      setClinic(await api.updateSettings(rest))
      toast('Alterações salvas.')
    } catch (e) { toast(errMsg(e)) }
  }

  async function upload(e: ChangeEvent<HTMLInputElement>, slot: PhotoSlot) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(slot)
    try { await api.uploadPhoto(file, slot); setClinic(await api.settings()); toast('Foto enviada.') }
    catch (err) { toast(errMsg(err)) }
    finally { setUploading(null) }
  }

  async function savePhoto(p: Photo) {
    try { await api.updatePhoto(p); toast('Legenda salva.') } catch (e) { toast(errMsg(e)) }
  }

  async function removePhoto(p: Photo) {
    if (!window.confirm('Remover esta foto do site?')) return
    try { await api.deletePhoto(p.id); setClinic(await api.settings()) } catch (e) { toast(errMsg(e)) }
  }

  async function saveService(s: Service) {
    const { id, ...body } = s
    try {
      const saved = id > 0 ? await api.updateService(id, body) : await api.createService(body)
      setServices(list => list.map(x => (x.id === id ? saved : x)))
      toast('Tratamento salvo.')
    } catch (e) { toast(errMsg(e)) }
  }

  async function savePro(p: Professional) {
    try {
      const saved = p.id > 0 ? await api.updateProfessional(p) : await api.createProfessional(p.name)
      setPros(list => list.map(x => (x.id === p.id ? saved : x)))
      toast('Equipe atualizada.')
    } catch (e) { toast(errMsg(e)) }
  }

  const editSvc = (id: number, patch: Partial<Service>) => setServices(list => list.map(s => (s.id === id ? { ...s, ...patch } : s)))
  const editPro = (id: number, patch: Partial<Professional>) => setPros(list => list.map(p => (p.id === id ? { ...p, ...patch } : p)))

  return (
    <div className="settings">
      <div className="panel">
        <h3>Clínica e site</h3>
        <div className="field"><label>Nome</label><input value={clinic.name} onChange={e => set('name', e.target.value)} /></div>
        <div className="field"><label>Frase de apresentação</label><textarea rows={2} value={clinic.tagline} onChange={e => set('tagline', e.target.value)} /></div>
        <div className="field"><label>Sobre a clínica</label><textarea rows={5} value={clinic.about} onChange={e => set('about', e.target.value)} /></div>
        <div className="field"><label>Endereço</label><input value={clinic.address} placeholder="Rua, número, bairro, cidade" onChange={e => set('address', e.target.value)} /></div>
        <div className="row2">
          <div className="field"><label>WhatsApp da clínica</label><input inputMode="tel" value={clinic.whatsApp} placeholder="(11) 98765-4321" onChange={e => set('whatsApp', e.target.value)} /></div>
          <div className="field"><label>Instagram</label><input value={clinic.instagram} onChange={e => set('instagram', e.target.value)} /></div>
        </div>
      </div>

      <div>
        <div className="panel">
          <h3>Horários</h3>
          <div className="row2">
            <div className="field"><label>Abre às</label><select value={clinic.open} onChange={e => set('open', e.target.value)}>{hourOpts.map(h => <option key={h}>{h}</option>)}</select></div>
            <div className="field"><label>Fecha às</label><select value={clinic.close} onChange={e => set('close', e.target.value)}>{hourOpts.map(h => <option key={h}>{h}</option>)}</select></div>
          </div>
          <div className="field"><label>Intervalo da agenda</label>
            <select value={clinic.slotMin} onChange={e => set('slotMin', Number(e.target.value))}>{[15, 30, 60].map(v => <option key={v} value={v}>{v} minutos</option>)}</select>
          </div>
          <div className="field"><label>Dias em que a clínica fecha</label>
            <div className="days">{WD_FULL.map((w, i) => (
              <label key={i}><input type="checkbox" checked={clinic.closedDays.includes(i)}
                onChange={e => set('closedDays', e.target.checked ? [...clinic.closedDays, i] : clinic.closedDays.filter(d => d !== i))} />{w}</label>
            ))}</div>
          </div>
          <button className="btn primary" style={{ marginTop: 16 }} onClick={saveSettings}>Salvar clínica e horários</button>
        </div>

        <div className="panel">
          <h3>Equipe</h3>
          <div className="prolist">
            {pros.map(p => (
              <div className="pr" key={p.id}>
                <input value={p.name} onChange={e => editPro(p.id, { name: e.target.value })} aria-label="Nome da profissional" />
                <button className="btn sm" onClick={() => savePro(p)}>Salvar</button>
                {p.id > 0 && <button className="btn sm danger" onClick={() => { const u = { ...p, active: !p.active }; editPro(p.id, u); savePro(u) }}>{p.active ? 'Desativar' : 'Reativar'}</button>}
              </div>
            ))}
          </div>
          <button className="btn sm" style={{ marginTop: 10 }} onClick={() => setPros([...pros, { id: -Date.now(), name: '', active: true }])}>Adicionar profissional</button>
        </div>
      </div>

      <div className="panel full">
        <h3>Fotos do site</h3>
        <div className="photo-grid">
          {(['hero', 'about'] as const).map(slot => {
            const p = slot === 'hero' ? clinic.heroPhoto : clinic.aboutPhoto
            return (
              <div className="photo-card" key={slot}>
                <Frame photo={p} arch index={slot === 'hero' ? 0 : 3} className={uploading === slot ? 'uploading' : ''} />
                <label className="btn sm" style={{ cursor: 'pointer' }}>
                  {p ? 'Trocar' : 'Enviar'} foto {slot === 'hero' ? 'da capa' : 'do "Sobre"'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => upload(e, slot)} />
                </label>
              </div>
            )
          })}
        </div>
        <h3 style={{ marginTop: 28 }}>Galeria</h3>
        <div className="photo-grid">
          {clinic.gallery.map(p => (
            <div className="photo-card" key={p.id}>
              <Frame photo={p} />
              <input value={p.caption} placeholder="Legenda" onChange={e => set('gallery', clinic.gallery.map(g => (g.id === p.id ? { ...g, caption: e.target.value } : g)))} onBlur={() => savePhoto(p)} />
              <button className="btn sm danger" onClick={() => removePhoto(p)}>Remover</button>
            </div>
          ))}
          <label className={`upload-tile ${uploading === 'gallery' ? 'uploading' : ''}`}>
            <span>{uploading === 'gallery' ? 'Enviando…' : 'Adicionar foto à galeria'}<br /><small>JPG, PNG ou WebP, até 10 MB</small></span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => upload(e, 'gallery')} />
          </label>
        </div>
      </div>

      <div className="panel full">
        <h3>Tratamentos</h3>
        <div className="tablewrap" style={{ borderRadius: 14 }}>
          <table>
            <thead><tr><th>Nome</th><th>Descrição no site</th><th>Categoria</th><th className="num">Min</th><th className="num">R$</th><th /></tr></thead>
            <tbody>
              {services.map(s => (
                <tr key={s.id} style={{ opacity: s.active ? 1 : 0.5 }}>
                  <td style={{ minWidth: 170 }}><input value={s.name} onChange={e => editSvc(s.id, { name: e.target.value })} /></td>
                  <td style={{ minWidth: 260 }}><input value={s.description} onChange={e => editSvc(s.id, { description: e.target.value })} /></td>
                  <td><select value={s.category} onChange={e => editSvc(s.id, { category: e.target.value as Category })}>
                    {(Object.keys(CATS) as Category[]).map(k => <option key={k} value={k}>{CATS[k]}</option>)}</select></td>
                  <td style={{ width: 90 }}><input type="number" min={5} step={5} value={s.durationMin} onChange={e => editSvc(s.id, { durationMin: Number(e.target.value) })} /></td>
                  <td style={{ width: 100 }}><input type="number" min={0} step={5} value={s.price} onChange={e => editSvc(s.id, { price: Number(e.target.value) })} /></td>
                  <td><div className="row-actions">
                    <button className="btn sm" onClick={() => saveService(s)}>Salvar</button>
                    {s.id > 0 && <button className="btn sm danger" onClick={() => { const u = { ...s, active: !s.active }; editSvc(s.id, u); saveService(u) }}>{s.active ? 'Ocultar' : 'Mostrar'}</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn sm" style={{ marginTop: 10 }}
          onClick={() => setServices([...services, { id: -Date.now(), name: '', description: '', category: 'facial', durationMin: 60, price: 0, sortOrder: services.length, active: true }])}>
          Adicionar tratamento
        </button>
      </div>
    </div>
  )
}
