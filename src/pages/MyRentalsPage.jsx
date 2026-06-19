import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Chat from '../components/Chat'

const STATUS_LABELS = {
  pending_payment: { label: 'Очікує оплати', badge: 'badge-yellow' },
  pending: { label: 'Очікує', badge: 'badge-yellow' },
  active: { label: 'Активна', badge: 'badge-green' },
  completed: { label: 'Завершена', badge: 'badge-gray' },
  cancelled: { label: 'Скасована', badge: 'badge-red' },
}

const DEPOSIT_STATUS = {
  held: { label: 'застава заморожена 🔒', color: 'var(--gray)' },
  released: { label: 'застава повернена ✓', color: 'var(--green-dark)' },
  forfeited: { label: 'застава утримана ⚠️', color: 'var(--red)' },
}

export default function MyRentalsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('renter')
  const [rentals, setRentals] = useState([])
  const [loading, setLoading] = useState(true)
  const [openChatId, setOpenChatId] = useState(null)
  useEffect(() => {
    document.title = 'Мої оренди — NeighborRent'
  }, [])

  useEffect(() => { fetchRentals() }, [tab])

  async function fetchRentals() {
    setLoading(true)
    const field = tab === 'renter' ? 'renter_id' : 'owner_id'
    const { data } = await supabase
      .from('rentals')
      .select('*, items(title, category, price_per_hour), profiles!rentals_renter_id_fkey(full_name)')
      .eq(field, user.id)
      .order('created_at', { ascending: false })

    setRentals(data || [])
    setLoading(false)
  }

  async function updateStatus(id, status) {
    await supabase.from('rentals').update({ status }).eq('id', id)
    const eventMap = { active: 'confirmed', completed: 'completed', cancelled: 'cancelled' }
    if (eventMap[status]) {
      supabase.functions.invoke('notify-rental', {
        body: { rental_id: id, event: eventMap[status] }
      }).catch(() => {})
    }
    fetchRentals()
  }

  async function confirmReturn(rentalId, hasDamage) {
    const msg = hasDamage
      ? 'Підтвердити пошкодження? Застава залишиться на платформі.'
      : 'Підтвердити повернення? Застава повернеться на картку орендаря.'
    if (!confirm(msg)) return

    const { error } = await supabase.functions.invoke('release-deposit', {
      body: { rental_id: rentalId, has_damage: hasDamage },
    })

    if (error) {
      alert('Помилка: ' + error.message)
    }
    fetchRentals()
  }

  const EMOJI = { tools: '🔧', sport: '🚲', home: '🏠', tech: '📷', other: '📦' }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 100px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 16 }}>Мої оренди</h2>

        {/* Tab switch */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { id: 'renter', label: '📦 Я орендую' },
            { id: 'owner', label: '🏠 Здаю своє' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={t.id === tab ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
              style={{ flex: 1 }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" />
          </div>
        ) : rentals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{tab === 'renter' ? '📦' : '🏠'}</div>
            <h3>{tab === 'renter' ? 'Немає активних оренд' : 'Ніхто не орендує ваші речі'}</h3>
            <p style={{ marginBottom: 16 }}>
              {tab === 'renter' ? 'Знайди щось на карті!' : 'Додай першу річ, щоб заробляти'}
            </p>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate(tab === 'renter' ? '/' : '/add')}
            >
              {tab === 'renter' ? 'На карту' : 'Додати річ'}
            </button>
          </div>
        ) : (
          rentals.map(rental => {
            const s = STATUS_LABELS[rental.status] || STATUS_LABELS.pending
            const start = new Date(rental.start_time)
            const end = new Date(rental.end_time)

            return (
              <div key={rental.id} className="card" style={{ marginBottom: 12, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: '1.8rem' }}>{EMOJI[rental.items?.category] || '📦'}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{rental.items?.title}</div>
                      {tab === 'owner' && rental.profiles && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>
                          👤 {rental.profiles.full_name}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`badge ${s.badge}`}>{s.label}</span>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginBottom: 12 }}>
                  🕐 {start.toLocaleDateString('uk-UA')} {start.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                  {' → '}{end.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}{rental.hours}год
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 800, color: 'var(--green)', fontSize: '1rem' }}>
                      ₴{rental.total_price}
                    </span>
                    {rental.deposit_hold > 0 && (
                      <span style={{
                        fontSize: '0.72rem', marginLeft: 6,
                        color: DEPOSIT_STATUS[rental.deposit_status]?.color || 'var(--gray)'
                      }}>
                        {DEPOSIT_STATUS[rental.deposit_status]?.label || `застава ₴${rental.deposit_hold}`}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setOpenChatId(openChatId === rental.id ? null : rental.id)}
                      title="Чат"
                    >
                      💬
                    </button>
                    {rental.status === 'pending' && tab === 'owner' && (
                      <>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => updateStatus(rental.id, 'active')}
                        >
                          Прийняти
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => updateStatus(rental.id, 'cancelled')}
                        >
                          Відхилити
                        </button>
                      </>
                    )}
                    {rental.status === 'active' && tab === 'owner' && (
                      <>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => confirmReturn(rental.id, false)}
                          title={`Застава ₴${rental.deposit_hold} повернеться орендарю на картку`}
                        >
                          📦 Повернув річ
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => confirmReturn(rental.id, true)}
                          title="Є пошкодження — застава залишається на платформі"
                        >
                          ⚠️
                        </button>
                      </>
                    )}
                    {rental.status === 'active' && tab === 'renter' && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          if (confirm('Власник не з\'явився? Ми повернемо гроші. Підтвердити скасування?')) {
                            updateStatus(rental.id, 'cancelled')
                          }
                        }}
                        title="Власник не з'явився — запросити повний рефанд"
                      >
                        🚨 Не з'явився
                      </button>
                    )}
                    {rental.status === 'pending' && tab === 'renter' && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => updateStatus(rental.id, 'cancelled')}
                      >
                        Скасувати
                      </button>
                    )}
                  </div>
                </div>

                {openChatId === rental.id && (
                  <div style={{ padding: '0 16px 16px' }}>
                    <Chat
                      rentalId={rental.id}
                      otherUser={tab === 'renter' ? rental.items?.title : rental.profiles?.full_name}
                    />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
