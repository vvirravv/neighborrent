import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Новий пароль — NeighborRent'
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) { setError('Паролі не збігаються'); return }
    if (password.length < 6) { setError('Мінімум 6 символів'); return }
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => navigate('/'), 2000)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #fff 60%)', padding: 16
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🏘️</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900 }}>
            Neighbor<span style={{ color: 'var(--green)' }}>Rent</span>
          </h1>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 20 }}>
            🔑 Новий пароль
          </div>

          {done ? (
            <div style={{
              background: 'var(--green-light)', color: 'var(--green-dark)',
              padding: '14px 16px', borderRadius: 10, fontWeight: 600, textAlign: 'center'
            }}>
              ✓ Пароль змінено! Входжу в акаунт...
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {[
                { label: 'Новий пароль', value: password, set: setPassword },
                { label: 'Повторіть пароль', value: confirm, set: setConfirm },
              ].map(({ label, value, set }) => (
                <div className="form-group" key={label}>
                  <label className="form-label">{label}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-input"
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={value}
                      onChange={e => set(e.target.value)}
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
              ))}

              {error && (
                <div style={{
                  background: '#fee2e2', color: 'var(--red)', padding: '10px 14px',
                  borderRadius: 8, fontSize: '0.85rem', marginBottom: 16
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-full"
                disabled={loading}
              >
                {loading
                  ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Зберігаю...</>
                  : 'Зберегти новий пароль'
                }
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
