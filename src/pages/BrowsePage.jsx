import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function makeIcon(price) {
  return new L.DivIcon({
    html: `<div style="
      background:#22c55e;color:white;font-size:11px;font-weight:700;
      padding:4px 8px;border-radius:12px;white-space:nowrap;
      box-shadow:0 2px 8px rgba(0,0,0,.25);border:2px solid white;
      display:inline-block;cursor:pointer;
    ">₴${price}/год</div>`,
    className: '',
    iconAnchor: [24, 16],
  })
}

function MapAutoFit({ items, userPos }) {
  const map = useMap()
  useEffect(() => {
    if (items.length > 0) {
      const validItems = items.filter(i => i.lat && i.lng)
      if (validItems.length === 0) return
      if (userPos) {
        map.flyTo(userPos, 14, { duration: 1 })
      } else {
        const bounds = L.latLngBounds(validItems.map(i => [i.lat, i.lng]))
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, duration: 1 })
      }
    }
  }, [items])
  return null
}

const CATEGORIES = [
  { id: 'all', label: 'Всі', icon: '🔍' },
  { id: 'tools', label: 'Інструменти', icon: '🔧' },
  { id: 'sport', label: 'Спорт', icon: '🚲' },
  { id: 'home', label: 'Дім', icon: '🏠' },
  { id: 'tech', label: 'Техніка', icon: '📷' },
  { id: 'other', label: 'Інше', icon: '📦' },
]

const DEFAULT_CENTER = [50.4501, 30.5234]

function pluralItems(n) {
  if (n % 10 === 1 && n % 100 !== 11) return `${n} річ`
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return `${n} речі`
  return `${n} речей`
}

export default function BrowsePage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [userPos, setUserPos] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => setUserPos(null)
    )
    fetchItems()
  }, [])

  useEffect(() => { document.title = 'NeighborRent — Речі поруч' }, [])

  async function fetchItems() {
    setLoading(true)
    const { data, error } = await supabase
      .from('items')
      .select('*, profiles(full_name, rating)')
      .eq('is_available', true)
      .order('created_at', { ascending: false })
    if (!error) setItems(data || [])
    setLoading(false)
  }

  const filtered = items.filter(item => {
    const catOk = category === 'all' || item.category === category
    const searchOk = !search || item.title.toLowerCase().includes(search.toLowerCase())
    return catOk && searchOk
  })

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', flexDirection: 'column' }}>
      {/* Search */}
      <div style={{ background: 'white', padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--light)', border: '1.5px solid var(--border)',
          borderRadius: 10, padding: '8px 12px'
        }}>
          <span>🔍</span>
          <input
            style={{ border: 'none', background: 'none', outline: 'none', flex: 1, fontSize: '0.9rem' }}
            placeholder="Дриль, велосипед, намет..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <span style={{ cursor: 'pointer', color: 'var(--gray)' }} onClick={() => setSearch('')}>✕</span>}
        </div>
      </div>

      {/* Category pills */}
      <div style={{
        display: 'flex', gap: 6, padding: '8px 12px', overflowX: 'auto',
        flexShrink: 0, background: 'white', borderBottom: '1px solid var(--border)',
        scrollbarWidth: 'none'
      }}>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCategory(c.id)} style={{
            background: category === c.id ? 'var(--green)' : 'var(--light)',
            color: category === c.id ? 'white' : 'var(--dark)',
            border: `1px solid ${category === c.id ? 'var(--green)' : 'var(--border)'}`,
            borderRadius: 20, padding: '5px 12px', fontSize: '0.78rem',
            fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.15s'
          }}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Map + List */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Map */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <MapContainer center={DEFAULT_CENTER} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
            <MapAutoFit items={items} userPos={userPos} />

            {userPos && (
              <Marker position={userPos}>
                <Popup>📍 Ви тут</Popup>
              </Marker>
            )}

            {filtered.map(item => item.lat && item.lng ? (
              <Marker key={item.id} position={[item.lat, item.lng]} icon={makeIcon(item.price_per_hour)}>
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    {item.images?.[0] && (
                      <img src={item.images[0]} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6, marginBottom: 6 }} />
                    )}
                    <strong>{item.title}</strong>
                    <div style={{ color: 'var(--green)', fontWeight: 700, margin: '4px 0' }}>
                      ₴{item.price_per_hour}/год
                    </div>
                    <button onClick={() => navigate(`/item/${item.id}`)} style={{
                      background: 'var(--green)', color: 'white', border: 'none',
                      borderRadius: 6, padding: '5px 12px', cursor: 'pointer', width: '100%',
                      fontSize: '0.8rem', fontWeight: 600
                    }}>
                      Детальніше →
                    </button>
                  </div>
                </Popup>
              </Marker>
            ) : null)}
          </MapContainer>
        </div>

        {/* Item list */}
        <div style={{ width: 300, flexShrink: 0, overflowY: 'auto', borderLeft: '1px solid var(--border)', background: 'white' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">{items.length === 0 ? '🏘️' : '🔍'}</div>
              <h3>{items.length === 0 ? 'Речей ще немає' : 'Нічого не знайдено'}</h3>
              <p>{items.length === 0 ? 'Будь першим — додай річ!' : 'Спробуй іншу категорію'}</p>
              {items.length === 0 && (
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/add')}>
                  + Додати річ
                </button>
              )}
            </div>
          ) : (
            <div style={{ padding: 8 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray)', padding: '4px 8px 8px', fontWeight: 600 }}>
                {pluralItems(filtered.length)} поруч
              </div>
              {filtered.map(item => (
                <ItemCard key={item.id} item={item} onClick={() => navigate(`/item/${item.id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ItemCard({ item, onClick }) {
  const EMOJI = { tools: '🔧', sport: '🚲', home: '🏠', tech: '📷', other: '📦' }
  return (
    <div onClick={onClick} style={{
      display: 'flex', gap: 10, padding: '10px 8px', borderRadius: 12,
      cursor: 'pointer', transition: 'background 0.15s', marginBottom: 4,
      border: '1px solid var(--border)'
    }}
      onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
      onMouseLeave={e => e.currentTarget.style.background = ''}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 10, overflow: 'hidden',
        background: 'var(--green-light)', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem'
      }}>
        {item.images?.[0]
          ? <img src={item.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : EMOJI[item.category] || '📦'
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginBottom: 4 }}>
          👤 {item.profiles?.full_name || 'Анонімно'}
          {item.profiles?.rating && ` · ⭐ ${item.profiles.rating}`}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: 'var(--green)', fontSize: '0.85rem' }}>₴{item.price_per_hour}/год</span>
          {item.deposit > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--gray)' }}>застава ₴{item.deposit}</span>}
        </div>
      </div>
    </div>
  )
}
