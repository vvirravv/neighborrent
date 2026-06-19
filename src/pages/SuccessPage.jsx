import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function SuccessPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('checking') // 'checking' | 'ok' | 'pending' | 'error'

  const rentalId = params.get('rental_id')
  const sessionId = params.get('session_id')

  useEffect(() => {
    document.title = 'Оплата — NeighborRent'
    if (rentalId && sessionId) {
      verifyStripePayment()
    } else if (rentalId) {
      pollStatus()
    } else {
      setStatus('pending')
    }
  }, [])

  async function verifyStripePayment() {
    try {
      const { data, error } = await supabase.functions.invoke('verify-stripe-payment', {
        body: { session_id: sessionId, rental_id: rentalId },
      })

      if (error || data?.error) {
        setStatus('error')
        return
      }

      if (data?.paid) {
        setStatus('ok')
      } else {
        // Stripe ще обробляє — поллімо статус
        pollStatus()
      }
    } catch {
      pollStatus()
    }
  }

  async function pollStatus(attempts = 0) {
    const { data } = await supabase
      .from('rentals')
      .select('status')
      .eq('id', rentalId)
      .single()

    if (data?.status === 'pending' || data?.status === 'active') {
      setStatus('ok')
    } else if (attempts < 5) {
      setTimeout(() => pollStatus(attempts + 1), 1000)
    } else {
      setStatus('pending')
    }
  }

  if (status === 'checking') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        background: 'var(--light)'
      }}>
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
        <p style={{ color: 'var(--gray)' }}>Перевіряємо оплату...</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center',
        background: 'var(--light)'
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>⚠️</div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8 }}>
          Оплата не пройшла
        </h1>
        <p style={{ color: 'var(--gray)', marginBottom: 24 }}>
          Спробуй ще раз або зв'яжись з підтримкою.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          На головну
        </button>
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center',
        background: 'var(--light)'
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>⏳</div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8 }}>
          Оплата обробляється
        </h1>
        <p style={{ color: 'var(--gray)', marginBottom: 24 }}>
          Stripe підтвердить платіж за кілька хвилин. Перевір «Мої оренди».
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/rentals')}>
          Мої оренди
        </button>
      </div>
    )
  }

  // status === 'ok'
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #fff 60%)'
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%', background: 'var(--green)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: '2.5rem', marginBottom: 24,
        boxShadow: '0 8px 32px rgba(34,197,94,0.35)',
        animation: 'successPop 0.4s ease'
      }}>
        ✓
      </div>

      <h1 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: 8 }}>
        Оплата пройшла!
      </h1>
      <p style={{ color: 'var(--gray)', fontSize: '1rem', marginBottom: 8 }}>
        Запит на оренду надіслано власнику
      </p>
      <p style={{ color: 'var(--gray)', fontSize: '0.85rem', marginBottom: 32 }}>
        Застава заморожена і повернеться після успішного повернення речі 🔒
      </p>

      <div style={{
        background: 'white', border: '1px solid var(--border)', borderRadius: 16,
        padding: 20, marginBottom: 24, width: '100%', maxWidth: 340, textAlign: 'left'
      }}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.9rem' }}>Що далі?</div>
        {[
          ['1', 'Власник отримає запит і підтвердить'],
          ['2', 'Домовтесь про передачу речі в чаті'],
          ['3', 'Після повернення власник підтвердить — застава повернеться на картку'],
        ].map(([num, text]) => (
          <div key={num} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', background: 'var(--green-light)',
              color: 'var(--green-dark)', fontWeight: 800, fontSize: '0.75rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              {num}
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--gray)' }}>{text}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 340 }}>
        <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => navigate('/rentals')}>
          📦 Мої оренди
        </button>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/')}>
          На карту
        </button>
      </div>

      <style>{`
        @keyframes successPop {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
