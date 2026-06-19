import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = [
  { id: '', label: 'Всі категорії' },
  { id: 'tools', label: '🔧 Інструменти' },
  { id: 'sport', label: '🚲 Спорт' },
  { id: 'home', label: '🏠 Дім' },
  { id: 'tech', label: '📷 Техніка' },
  { id: 'other', label: '📦 Інше' },
]

const CAT_LABELS = { tools: '🔧', sport: '🚲', home: '🏠', tech: '📷', other: '📦' }

function makeRequestIcon(emoji) {
  return new L.DivIcon({
    html: `<div style="background:#3b82f6;color:white;font-size:14px;
      padding:4px 8px;border-radius:12px;white-space:nowrap;
      box-shadow:0 2px 8px rgba(0,0,0,.25);border:2px solid white;
      display:inline-block;cursor:pointer;">${emoji}</div>`,
    className: '',
    iconAnchor: [20, 16],
  })
}

function MapAutoFit({ requests }) {
  const map = useMap()
  useEffect(() => {
    if (requests.length === 0) return
    const bounds = requests
      .filter(r => r.lat && r.lng)
      .map(r => [r.lat, r.lng])
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    }
  }, [requests])
  return null
}

function AddRequestForm({ onClose, onAdded }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    title: '', description: '', category: 'other', address: '', lat: '', lng: '',
  })
  const [locating, setLocating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function getLocation() {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
          const data = await res.json()
          set('lat', lat)
          set('lng', lng)
          set('address', data.display_name?.split(',').slice(0, 3).join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        } catch {
          set('lat', lat)
          set('lng', lng)
          set('address', `${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        }
        setLocating(false)
      },
      err => {
        setLocating(false)
        setError(err.code === 1
          ? 'Геолокацію заблоковано. Введи координати вручну.'
          : 'Не вдалося визначити локацію. Введи вручну.')
      }
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.lat || !form.lng) {
      setError('Потрібні координати — натисни «📍 Моя» або введи вручну')
      return
    }
    if (!form.title.trim()) {
      setError('Напиши що саме шукаєш')
      return
    }
    setLoading(true)
    const { error: err } = await supabase.from('rental_requests').insert({
      user_id: user.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),
      address: form.address || null,
    })
    setLoading(false)
    if (err) setError(err.message)
    else { onAdded(); onClose() }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 9999, display: 'flex', alignItems: 'flex-end',
    }}>
      <div style={{
        background: 'white', width: '100%', borderRadius: '20px 20px 0 0',
        padding: 24, maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>🔍 Що шукаєш?</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--gray)' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Що потрібно? *</label>
            <input
              className="form-input"
              placeholder="Праска для волосся, намет, дриль..."
              value={form.title}
              onChange={e => set('title', e.target.value)}
              required maxLength={80}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Категорія</label>
            <select
              className="form-input"
              value={form.category}
              onChange={e => set('category', e.target.value)}
            >
              {CATEGORIES.slice(1).map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Деталі (необов'язково)</label>
            <textarea
              className="form-input"
              placeholder="На який термін, особливі вимоги..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Район пошуку *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                placeholder="Ваш район або адреса"
                value={form.address}
                onChange={e => set('address', e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={getLocation}
                disabled={locating}
                style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {locating ? '...' : '📍 Моя'}
              </button>
            </div>
            {form.lat ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--green)', marginTop: 4 }}>
                ✓ {parseFloat(form.lat).toFixed(4)}, {parseFloat(form.lng).toFixed(4)}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <input
                  className="form-input"
                  type="number" step="any" placeholder="Широта"
                  value={form.lat}
                  onChange={e => set('lat', e.target.value)}
                />
                <input
                  className="form-input"
                  type="number" step="any" placeholder="Довгота"
                  value={form.lng}
                  onChange={e => set('lng', e.target.value)}
                />
              </div>
            )}
          </div>

          {error && (
            <div style={{
              background: '#fee2e2', color: 'var(--red)', padding: '10px 14px',
              borderRadius: 8, fontSize: '0.85rem', marginBottom: 12
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={loading}
          >
            {loading ? 'Публікую...' : '✓ Опублікувати запит'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function RequestsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    document.title = 'Запити — NeighborRent'
    fetchRequests()
  }, [])

  async function fetchRequests() {
    setLoading(true)
    const { data } = await supabase
      .from('rental_requests')
      .select('*, profiles(full_name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  async function deleteRequest(id) {
    if (!confirm('Видалити запит?')) return
    await supabase.from('rental_requests').delete().eq('id', id)
    fetchRequests()
  }

  async function fulfillRequest(id) {
    await supabase.from('rental_requests').update({ status: 'fulfilled' }).eq('id', id)
    fetchRequests()
  }

  const filtered = categoryFilter
    ? requests.filter(r => r.category === categoryFilter)
    : requests

  function timeAgo(date) {
    const diff = Math.floor((Date.now() - new Date(date)) / 60000)
    if (diff < 1) return 'щойно'
    if (diff < 60) return `${diff} хв тому`
    const h = Math.floor(diff / 60)
    if (h < 24) return `${h} год тому`
    const d = Math.floor(h / 24)
    return `${d} д тому`
  }

  const expiresIn = (exp) => {
    const diff = Math.ceil((new Date(exp) - Date.now()) / 86400000)
    if (diff <= 0) return 'минув'
    return `ще ${diff} д`
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header bar */}
      <div style={{
        background: 'white', borderBottom: '1px solid var(--border)',
        padding: '10px 16px', flexShrink: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>🔍 Запити</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--gray)', marginLeft: 8 }}>
              {filtered.length} активних
            </span>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowForm(true)}
          >
            + Додати
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id)}
              style={{
                whiteSpace: 'nowrap', flexShrink: 0, padding: '4px 12px',
                borderRadius: 20, border: '1px solid var(--border)',
                background: categoryFilter === c.id ? 'var(--green)' : 'white',
                color: categoryFilter === c.id ? 'white' : 'var(--dark)',
                fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* View toggle */}
      <div style={{
        display: 'flex', background: 'var(--light)', padding: '6px 16px',
        gap: 6, flexShrink: 0, borderBottom: '1px solid var(--border)',
      }}>
        {[
          { id: 'list', label: '☰ Список' },
          { id: 'map', label: '🗺 Карта' },
        ].map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={v.id === view ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* MAP VIEW */}
        {view === 'map' && (
          <MapContainer
            center={[50.45, 30.52]}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="© OpenStreetMap"
            />
            <MapAutoFit requests={filtered} />
            {filtered.filter(r => r.lat && r.lng).map(r => (
              <Marker
                key={r.id}
                position={[r.lat, r.lng]}
                icon={makeRequestIcon(CAT_LABELS[r.category] || '📦')}
              >
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{r.title}</div>
                    {r.description && (
                      <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: 6 }}>{r.description}</div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 8 }}>
                      👤 {r.profiles?.full_name || 'Анонім'} · {timeAgo(r.created_at)}
                    </div>
                    <a
                      href="/add"
                      style={{
                        display: 'block', background: '#22c55e', color: 'white',
                        textAlign: 'center', padding: '6px 12px', borderRadius: 8,
                        fontWeight: 600, fontSize: '0.8rem', textDecoration: 'none',
                      }}
                    >
                      Запропонувати річ →
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}

        {/* LIST VIEW */}
        {view === 'list' && (
          <div style={{ height: '100%', overflowY: 'auto', padding: '12px 16px 100px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <div className="spinner" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state" style={{ marginTop: 40 }}>
                <div className="empty-state-icon">🔍</div>
                <h3>Немає запитів</h3>
                <p>Першим опублікуй що шукаєш — сусіди допоможуть!</p>
                <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
                  + Додати запит
                </button>
              </div>
            ) : (
              filtered.map(r => {
                const isOwn = r.user_id === user?.id
                return (
                  <div key={r.id} className="card" style={{ marginBottom: 10, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>
                          {CAT_LABELS[r.category] || '📦'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{r.title}</div>
                          {r.description && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginTop: 2 }}>
                              {r.description}
                            </div>
                          )}
                        </div>
                      </div>
                      {isOwn && (
                        <span style={{
                          flexShrink: 0, fontSize: '0.65rem', background: 'var(--green-light)',
                          color: 'var(--green-dark)', padding: '2px 8px', borderRadius: 10, fontWeight: 700,
                        }}>
                          Мій
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--gray)', marginBottom: 10 }}>
                      <span>👤 {r.profiles?.full_name || 'Анонім'}</span>
                      {r.address && <><span>·</span><span>📍 {r.address.split(',')[0]}</span></>}
                      <span>·</span>
                      <span>{timeAgo(r.created_at)}</span>
                      {r.expires_at && <><span>·</span><span style={{ color: '#f59e0b' }}>⏱ {expiresIn(r.expires_at)}</span></>}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      {!isOwn && (
                        <a
                          href="/add"
                          className="btn btn-primary btn-sm"
                          style={{ textDecoration: 'none', flex: 1, textAlign: 'center' }}
                        >
                          💡 Запропонувати річ
                        </a>
                      )}
                      {isOwn && (
                        <>
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ flex: 1 }}
                            onClick={() => fulfillRequest(r.id)}
                          >
                            ✓ Знайшов
                          </button>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => deleteRequest(r.id)}
                            title="Видалити"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {showForm && (
        <AddRequestForm
          onClose={() => setShowForm(false)}
          onAdded={fetchRequests}
        />
      )}
    </div>
  )
}
