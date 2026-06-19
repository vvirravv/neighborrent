import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

export default function NotFoundPage() {
  const navigate = useNavigate()
  useEffect(() => { document.title = '404 — NeighborRent' }, [])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--light)', padding: 24, textAlign: 'center'
    }}>
      <div style={{ fontSize: '4rem', marginBottom: 16 }}>🏚️</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Сторінку не знайдено</h1>
      <p style={{ color: 'var(--gray)', marginBottom: 24 }}>Такої сторінки не існує</p>
      <button className="btn btn-primary" onClick={() => navigate('/')}>
        На головну
      </button>
    </div>
  )
}
