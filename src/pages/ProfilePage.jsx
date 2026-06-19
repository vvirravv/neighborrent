import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function ProfilePage() {
  const { user, profile, signOut, fetchProfile } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [myItems, setMyItems] = useState([])
  const [rentalsCount, setRentalsCount] = useState(0)
  const [pendingEarnings, setPendingEarnings] = useState(0)
  const [form, setForm] = useState({ full_name: '', phone: '', address: '' })
  const [saved, setSaved] = useState(false)
  const [payoutCard, setPayoutCard] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawDone, setWithdrawDone] = useState(false)
  const [withdrawError, setWithdrawError] = useState('')

  useEffect(() => { document.title = 'Профіль — NeighborRent' }, [])

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
      })
      setPayoutCard(profile.payout_card || '')
    }
    fetchMyItems()
    fetchPendingEarnings()
  }, [profile])

  async function fetchMyItems() {
    const [{ data: items }, { count }] = await Promise.all([
      supabase.from('items').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
      supabase.from('rentals').select('*', { count: 'exact', head: true }).or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`)
    ])
    setMyItems(items || [])
    setRentalsCount(count || 0)
  }

  async function fetchPendingEarnings() {
    // Активні оренди де я — власник (гроші ще не зараховані)
    const { data } = await supabase
      .from('rentals')
      .select('total_price')
      .eq('owner_id', user.id)
      .in('status', ['pending', 'active'])

    const total = (data || []).reduce((sum, r) => sum + (r.total_price / 1.15), 0)
    setPendingEarnings(Math.round(total * 100) / 100)
  }

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name,
        phone: form.phone,
        address: form.address,
        payout_card: payoutCard || null,
      })
      .eq('id', user.id)

    setSaving(false)
    if (!error) {
      await fetchProfile(user.id)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  async function handleWithdraw() {
    setWithdrawError('')
    const amount = parseFloat(withdrawAmount) || (profile?.balance || 0)
    if (!payoutCard.trim()) { setWithdrawError('Введи номер картки'); return }
    if (amount <= 0) { setWithdrawError('Немає коштів для виводу'); return }
    if (amount > (profile?.balance || 0)) { setWithdrawError('Недостатньо коштів'); return }

    setWithdrawing(true)

    // Зберігаємо картку і запит на вивід
    await supabase.from('profiles').update({ payout_card: payoutCard }).eq('id', user.id)

    const { error } = await supabase.from('withdrawal_requests').insert({
      owner_id: user.id,
      amount,
      payout_card: payoutCard,
    })

    if (!error) {
      // Блокуємо баланс (знімаємо суму — платформа переказує вручну)
      await supabase.from('profiles')
        .update({ balance: (profile?.balance || 0) - amount })
        .eq('id', user.id)
      await fetchProfile(user.id)
      setWithdrawDone(true)
      setWithdrawAmount('')
      setTimeout(() => setWithdrawDone(false), 4000)
    } else {
      setWithdrawError(error.message)
    }
    setWithdrawing(false)
  }

  async function toggleAvailable(itemId, current) {
    await supabase.from('items').update({ is_available: !current }).eq('id', itemId)
    fetchMyItems()
  }

  async function deleteItem(itemId) {
    if (!confirm('Видалити річ?')) return
    await supabase.from('items').delete().eq('id', itemId)
    fetchMyItems()
  }

  async function handleSignOut() {
    await signOut()
    navigate('/auth')
  }

  const EMOJI = { tools: '🔧', sport: '🚲', home: '🏠', tech: '📷', other: '📦' }
  const initials = (profile?.full_name || user?.email || 'U')[0].toUpperCase()
  const balance = profile?.balance || 0

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 100px' }}>

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: 'var(--green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: '1.6rem', flexShrink: 0
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
              {profile?.full_name || 'Без імені'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>{user?.email}</div>
            <div style={{ fontSize: '0.8rem', marginTop: 2 }}>
              ⭐ {profile?.rating || '5.0'} · {myItems.length} речей · {rentalsCount} оренд
            </div>
          </div>
        </div>

        {saved && (
          <div style={{
            background: 'var(--green-light)', color: 'var(--green-dark)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 16,
            fontWeight: 600, fontSize: '0.85rem'
          }}>
            ✓ Профіль збережено
          </div>
        )}

        {/* Wallet */}
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>💰 Гаманець</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{
              background: 'var(--green-light)', border: '1px solid var(--green)',
              borderRadius: 12, padding: '12px 14px'
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--green-dark)', fontWeight: 600, marginBottom: 4 }}>
                Доступно для виводу
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--green)' }}>
                ₴{balance.toFixed(0)}
              </div>
            </div>
            <div style={{
              background: 'var(--light)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 14px'
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--gray)', fontWeight: 600, marginBottom: 4 }}>
                В процесі оренди
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--dark)' }}>
                ₴{pendingEarnings.toFixed(0)}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--gray)', marginBottom: 14 }}>
            🔒 Кошти «в процесі» зараховуються після підтвердження повернення речі
          </div>

          {withdrawDone && (
            <div style={{
              background: 'var(--green-light)', color: 'var(--green-dark)',
              borderRadius: 8, padding: '10px 12px', marginBottom: 12,
              fontSize: '0.85rem', fontWeight: 600
            }}>
              ✓ Запит на вивід надіслано! Переказ надійде протягом 1-2 днів.
            </div>
          )}

          {withdrawError && (
            <div style={{
              background: '#fee2e2', color: 'var(--red)', borderRadius: 8,
              padding: '10px 12px', marginBottom: 12, fontSize: '0.85rem'
            }}>
              {withdrawError}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="form-label">Картка для виводу</label>
            <input
              className="form-input"
              placeholder="4441 1144 4441 1144"
              value={payoutCard}
              onChange={e => setPayoutCard(e.target.value)}
            />
          </div>

          {balance > 0 && (
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Сума (₴)</label>
              <input
                className="form-input"
                type="number"
                placeholder={`до ₴${balance.toFixed(0)}`}
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                max={balance}
                min={1}
              />
            </div>
          )}

          <button
            className="btn btn-primary btn-full"
            disabled={balance <= 0 || withdrawing}
            onClick={handleWithdraw}
          >
            {withdrawing
              ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Надсилаю...</>
              : balance > 0
                ? `💸 Вивести ₴${withdrawAmount || balance.toFixed(0)}`
                : 'Немає коштів для виводу'
            }
          </button>
        </div>

        {/* Profile form */}
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontWeight: 700 }}>Профіль</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setEditing(!editing)}
            >
              {editing ? 'Скасувати' : '✏️ Змінити'}
            </button>
          </div>

          {editing ? (
            <>
              {[
                { key: 'full_name', label: "Ім'я", placeholder: 'Іван Петренко' },
                { key: 'phone', label: 'Телефон', placeholder: '+380 99 123 4567' },
                { key: 'address', label: 'Район', placeholder: 'Печерськ, Київ' },
              ].map(f => (
                <div key={f.key} className="form-group">
                  <label className="form-label">{f.label}</label>
                  <input
                    className="form-input"
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
              <button
                className="btn btn-primary btn-full"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Зберігаю...' : 'Зберегти'}
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['📱', 'Телефон', profile?.phone || 'Не вказано'],
                ['📍', 'Район', profile?.address || 'Не вказано'],
                ['💳', 'Картка', profile?.payout_card || 'Не вказана'],
              ].map(([icon, label, val]) => (
                <div key={label} style={{ display: 'flex', gap: 8, fontSize: '0.9rem' }}>
                  <span>{icon}</span>
                  <span style={{ color: 'var(--gray)' }}>{label}:</span>
                  <span style={{ fontWeight: 600 }}>{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My items */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 700 }}>Мої речі ({myItems.length})</span>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/add')}>
              + Додати
            </button>
          </div>

          {myItems.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px' }}>
              <div className="empty-state-icon">📦</div>
              <h3>Немає речей</h3>
              <p>Додай першу та починай заробляти</p>
            </div>
          ) : (
            myItems.map(item => (
              <div key={item.id} className="card" style={{ padding: '12px 14px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.6rem' }}>{EMOJI[item.category] || '📦'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--green)', fontWeight: 600 }}>
                      ₴{item.price_per_hour}/год
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      onClick={() => toggleAvailable(item.id, item.is_available)}
                      className={`badge ${item.is_available ? 'badge-green' : 'badge-red'}`}
                      style={{ cursor: 'pointer', border: 'none' }}
                      title="Натисни щоб змінити"
                    >
                      {item.is_available ? '✓ Доступна' : '✗ Схована'}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => deleteItem(item.id)}
                      title="Видалити"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sign out */}
        <button className="btn btn-danger btn-full" onClick={handleSignOut}>
          Вийти з акаунту
        </button>
      </div>
    </div>
  )
}
