import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Chat from '../components/Chat'

export default function ItemPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [activeRentalId, setActiveRentalId] = useState(null)
  const [imgIdx, setImgIdx] = useState(0)
  const [booking, setBooking] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchItem()
    const toLocal = (d) => {
      const off = d.getTimezoneOffset()
      return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
    }
    setStartTime(toLocal(new Date(Date.now() + 60 * 60000)))
    setEndTime(toLocal(new Date(Date.now() + 3 * 3600000)))
  }, [id])

  useEffect(() => {
    if (item) document.title = `${item.title} — NeighborRent`
  }, [item])

  function calcHours() {
    if (!startTime || !endTime) return 0
    const diff = (new Date(endTime) - new Date(startTime)) / 3600000
    return Math.max(0, Math.round(diff * 10) / 10)
  }

  async function fetchItem() {
    const { data, error } = await supabase
      .from('items')
      .select('*, profiles(id, full_name, rating, rentals_count)')
      .eq('id', id)
      .single()

    if (error || !data) navigate('/')
    else { setItem(data); setLoading(false) }
  }

  async function handleBook() {
    if (!startTime || !endTime) { setError('Вкажи час початку та кінця'); return }
    const hrs = calcHours()
    if (hrs <= 0) { setError('Час закінчення має бути пізніше початку'); return }
    setError('')
    setBooking(true)

    const totalPrice = +(item.price_per_hour * hrs * 1.15).toFixed(2)

    const { data, error: fnError } = await supabase.functions.invoke('create-stripe-checkout', {
      body: {
        item_id: item.id,
        item_title: item.title,
        renter_id: user.id,
        owner_id: item.owner_id,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        hours: Math.round(hrs),
        total_price: totalPrice,
        deposit_hold: item.deposit,
        origin: window.location.origin,
      },
    })

    setBooking(false)

    if (fnError || data?.error) {
      // Суpabase ховає справжню помилку — витягуємо з контексту
      let msg = data?.error || fnError?.message || 'Помилка оплати'
      if (fnError?.context) {
        try {
          const ctx = await fnError.context.json()
          if (ctx?.error) msg = ctx.error
        } catch {}
      }
      setError(msg)
      return
    }

    window.location.href = data.url
  }

  if (loading) return <div className="page-loader"><div className="spinner" /></div>

  const rent = +(item.price_per_hour * calcHours()).toFixed(2)
  const fee = +(rent * 0.15).toFixed(2)
  const total = +(rent + fee).toFixed(2)
  const grandTotal = +(total + (item.deposit || 0)).toFixed(2)
  const isOwner = user?.id === item.owner_id
  const EMOJI = { tools: '🔧', sport: '🚲', home: '🏠', tech: '📷', other: '📦' }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 0 100px' }}>

        {/* Back + Image */}
        <div style={{ position: 'relative', height: 220, background: 'var(--green-light)', overflow: 'hidden' }}>
          {item.images?.length > 0 ? (
            <>
              <img
                src={item.images[imgIdx]}
                alt={item.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {item.images.length > 1 && (
                <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
                  {item.images.map((_, i) => (
                    <button
                      key={i} onClick={() => setImgIdx(i)}
                      style={{
                        width: i === imgIdx ? 20 : 8, height: 8, borderRadius: 4,
                        background: i === imgIdx ? 'white' : 'rgba(255,255,255,0.5)',
                        border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '5rem' }}>
              {EMOJI[item.category] || '📦'}
            </div>
          )}
          <button
            onClick={() => navigate(-1)}
            style={{
              position: 'absolute', top: 12, left: 12, background: 'white',
              border: 'none', borderRadius: 10, padding: '6px 12px',
              fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            ← Назад
          </button>
        </div>

        {/* Info */}
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, flex: 1 }}>{item.title}</h1>
            <span className={`badge ${item.is_available ? 'badge-green' : 'badge-red'}`}>
              {item.is_available ? '✓ Вільна' : '✗ Зайнята'}
            </span>
          </div>

          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--green)', marginBottom: 4 }}>
            ₴{item.price_per_hour}<span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--gray)' }}>/год</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--gray)', marginBottom: 16 }}>
            💰 Застава ₴{item.deposit} · заморозка, не списання
          </div>

          {item.description && (
            <p style={{ fontSize: '0.9rem', color: 'var(--gray)', marginBottom: 16, lineHeight: 1.6 }}>
              {item.description}
            </p>
          )}

          <div className="divider" />

          {/* Owner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: 'var(--green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 800, fontSize: '1.1rem'
            }}>
              {(item.profiles?.full_name || 'А')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                {item.profiles?.full_name || 'Анонімно'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>
                ⭐ {item.profiles?.rating || '5.0'} · {item.profiles?.rentals_count || 0} оренд
              </div>
            </div>
          </div>

          {item.address && (
            <div style={{ fontSize: '0.85rem', color: 'var(--gray)', marginBottom: 16 }}>
              📍 {item.address}
            </div>
          )}

          <div className="divider" />

          {/* CTA */}
          {isOwner ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{
                flex: 1, background: 'var(--light)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 14, textAlign: 'center', color: 'var(--gray)', fontSize: '0.9rem'
              }}>
                Це ваша річ
              </div>
              <button className="btn btn-secondary" onClick={() => navigate('/profile')}>
                ✏️ Управління
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-lg btn-full"
              disabled={!item.is_available}
              onClick={() => setShowModal(true)}
            >
              {item.is_available ? '🤝 Орендувати' : 'Річ зайнята'}
            </button>
          )}

          {activeRentalId && (
            <div style={{ marginTop: 20 }}>
              <Chat
                rentalId={activeRentalId}
                otherUser={isOwner ? 'орендарем' : item.profiles?.full_name}
              />
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">Бронювання</div>
            <div className="modal-sub">{item.title}</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Початок</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Кінець</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                />
              </div>
            </div>

            {calcHours() > 0 && (
              <div style={{ fontSize: '0.8rem', color: 'var(--green)', marginBottom: 12, fontWeight: 600 }}>
                ⏱ {calcHours()} год. оренди
              </div>
            )}

            {/* Price breakdown */}
            <div style={{ background: 'var(--light)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              {[
                ['Оренда', `₴${rent.toFixed(0)}`],
                ['Сервісний збір (15%)', `₴${fee.toFixed(0)}`],
                ['Застава (заморозка)', `₴${item.deposit} 🔒`],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '4px 0' }}>
                  <span style={{ color: 'var(--gray)' }}>{label}</span>
                  <span>{val}</span>
                </div>
              ))}
              <div className="divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                <span>До сплати</span>
                <span style={{ color: 'var(--green)' }}>₴{grandTotal.toFixed(0)}</span>
              </div>
            </div>

            {grandTotal > 0 && grandTotal < 25 && (
              <div style={{
                background: '#fff7ed', color: '#92400e', padding: '10px 14px',
                borderRadius: 8, fontSize: '0.85rem', marginBottom: 12, border: '1px solid #fed7aa'
              }}>
                Мінімальна сума оплати ₴25. Збільш тривалість оренди.
              </div>
            )}

            {error && (
              <div style={{
                background: '#fee2e2', color: 'var(--red)', padding: '10px 14px',
                borderRadius: 8, fontSize: '0.85rem', marginBottom: 12
              }}>
                {error}
              </div>
            )}

            {/* Stripe badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
              fontSize: '0.75rem', color: 'var(--gray)', marginBottom: 14
            }}>
              <span>🔒</span>
              <span>Безпечна оплата через <strong>Stripe</strong> · застава повернеться після оренди</span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
                Скасувати
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 2 }}
                disabled={booking || calcHours() <= 0 || grandTotal < 25}
                onClick={handleBook}
              >
                {booking
                  ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Перенаправляю...</>
                  : `💳 Оплатити ₴${grandTotal.toFixed(0)}`
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
