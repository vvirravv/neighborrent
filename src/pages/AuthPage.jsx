import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ERROR_MAP = {
  'Invalid login credentials': 'Невірний email або пароль',
  'Email not confirmed': 'Підтвердіть email — лист надіслано при реєстрації',
  'User already registered': 'Користувач з таким email вже існує',
  'Password should be at least 6 characters': 'Пароль має бути не менше 6 символів',
  'Unable to validate email address: invalid format': 'Невірний формат email',
  'signup is disabled': 'Реєстрація тимчасово недоступна',
  'Email rate limit exceeded': 'Забагато спроб, зачекайте трохи',
}

function translateError(msg) {
  if (!msg) return ''
  for (const [en, uk] of Object.entries(ERROR_MAP)) {
    if (msg.toLowerCase().includes(en.toLowerCase())) return uk
  }
  return msg
}

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [showPass, setShowPass] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  useEffect(() => { document.title = 'NeighborRent — Вхід' }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      setLoading(false)
      if (error) setError(translateError(error.message))
      else navigate('/')
    } else {
      const { data, error } = await signUp(email, password, fullName)
      setLoading(false)
      if (error) {
        setError(translateError(error.message))
      } else if (data?.user && !data?.session) {
        setInfo('✉️ Лист надіслано на ' + email + '. Підтвердіть email та увійдіть.')
        setMode('login')
      } else {
        navigate('/')
      }
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #fff 60%)', padding: 16
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🏘️</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900 }}>
            Neighbor<span style={{ color: 'var(--green)' }}>Rent</span>
          </h1>
          <p style={{ color: 'var(--gray)', fontSize: '0.9rem', marginTop: 4 }}>
            Оренда речей у сусідів
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 28 }}>
          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {['login', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={m === mode ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ flex: 1 }}
              >
                {m === 'login' ? 'Увійти' : 'Реєстрація'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label">Ім'я</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Іван Петренко"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Пароль</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem',
                    color: 'var(--gray)', padding: 0
                  }}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: '#fee2e2', color: 'var(--red)', padding: '10px 14px',
                borderRadius: 8, fontSize: '0.85rem', marginBottom: 16
              }}>
                {error}
              </div>
            )}

            {info && (
              <div style={{
                background: 'var(--green-light)', color: 'var(--green-dark)', padding: '10px 14px',
                borderRadius: 8, fontSize: '0.85rem', marginBottom: 16
              }}>
                {info}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={loading}
            >
              {loading
                ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Завантаження...</>
                : mode === 'login' ? 'Увійти' : 'Створити акаунт'
              }
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.8rem', color: 'var(--gray)' }}>
          {mode === 'signup'
            ? 'Реєструючись, ви погоджуєтесь з умовами використання'
            : 'Немає акаунту? Натисни «Реєстрація» вище'
          }
        </p>
      </div>
    </div>
  )
}
