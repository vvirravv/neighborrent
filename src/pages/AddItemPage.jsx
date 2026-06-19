import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ImageUpload from '../components/ImageUpload'

const CATEGORIES = [
  { id: 'tools', label: '🔧 Інструменти' },
  { id: 'sport', label: '🚲 Спорт' },
  { id: 'home', label: '🏠 Дім' },
  { id: 'tech', label: '📷 Техніка' },
  { id: 'other', label: '📦 Інше' },
]

export default function AddItemPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  useEffect(() => { document.title = 'Додати річ — NeighborRent' }, [])
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', category: 'tools',
    price_per_hour: '', deposit: '', address: '',
    lat: '', lng: '',
  })
  const [images, setImages] = useState([])

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function getLocation() {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
          const data = await res.json()
          setForm(prev => ({
            ...prev, lat, lng,
            address: data.display_name?.split(',').slice(0, 3).join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
          }))
        } catch {
          setForm(prev => ({ ...prev, lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` }))
        }
        setLocating(false)
      },
      (err) => {
        setLocating(false)
        if (err.code === 1) {
          setError('Геолокацію заблоковано. Натисни 🔒 в адресному рядку → Дозволи сайту → Геолокація → Дозволити. Або введи координати вручну нижче.')
        } else if (err.code === 2) {
          setError('Геолокація недоступна. Введи координати вручну нижче.')
        } else {
          setError('Не вдалося отримати локацію. Введи координати вручну нижче.')
        }
      }
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.lat || !form.lng) {
      setError('Натисни «Визначити локацію» — вона потрібна для карти')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('items').insert({
      owner_id: user.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      price_per_hour: parseFloat(form.price_per_hour),
      deposit: parseFloat(form.deposit) || 0,
      address: form.address,
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),
      images,
      is_available: true,
    })

    setLoading(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 20, paddingBottom: 100 }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 4 }}>Додати річ</h2>
        <p style={{ color: 'var(--gray)', fontSize: '0.85rem', marginBottom: 24 }}>
          Заробляй на тому, що збирає пил вдома
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Назва *</label>
            <input
              className="form-input"
              placeholder="Дриль Bosch, велосипед Trek..."
              value={form.title}
              onChange={e => set('title', e.target.value)}
              required maxLength={80}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Категорія *</label>
            <select
              className="form-input"
              value={form.category}
              onChange={e => set('category', e.target.value)}
            >
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Фото (до 5 штук)</label>
            <ImageUpload images={images} onChange={setImages} />
          </div>

          <div className="form-group">
            <label className="form-label">Опис</label>
            <textarea
              className="form-input"
              placeholder="Стан, особливості, умови..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Ціна ₴/год *</label>
              <input
                className="form-input"
                type="number" min="0.5" step="0.5" placeholder="2.00"
                value={form.price_per_hour}
                onChange={e => set('price_per_hour', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Застава $</label>
              <input
                className="form-input"
                type="number" min="0" step="1" placeholder="30"
                value={form.deposit}
                onChange={e => set('deposit', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Локація *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                placeholder="Адреса або район (наприклад: Печерськ, Київ)"
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
                ✓ Координати отримано: {parseFloat(form.lat).toFixed(4)}, {parseFloat(form.lng).toFixed(4)}
              </div>
            ) : (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginBottom: 6 }}>
                  Або введи координати вручну{' '}
                  <a href="https://maps.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--green)' }}>
                    (знайти на Google Maps →)
                  </a>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input
                    className="form-input"
                    type="number" step="any" placeholder="Широта (50.4501)"
                    value={form.lat}
                    onChange={e => set('lat', e.target.value)}
                  />
                  <input
                    className="form-input"
                    type="number" step="any" placeholder="Довгота (30.5234)"
                    value={form.lng}
                    onChange={e => set('lng', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div style={{
              background: '#fee2e2', color: 'var(--red)', padding: '10px 14px',
              borderRadius: 8, fontSize: '0.85rem', marginBottom: 16
            }}>
              {error}
            </div>
          )}

          {form.title && form.price_per_hour && (
            <div style={{
              background: 'var(--green-light)', border: '1px solid var(--green)',
              borderRadius: 12, padding: 16, marginBottom: 16
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--green-dark)', marginBottom: 8 }}>
                Попередній перегляд
              </div>
              <div style={{ fontWeight: 700 }}>{form.title}</div>
              <div style={{ color: 'var(--green)', fontWeight: 800, fontSize: '1.1rem' }}>
                ₴{form.price_per_hour}/год
                {form.deposit && <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--gray)', marginLeft: 8 }}>застава ₴{form.deposit}</span>}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={loading}
          >
            {loading
              ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Зберігаю...</>
              : '✓ Опублікувати річ'
            }
          </button>
        </form>
      </div>
    </div>
  )
}
