import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useNotifications, requestPushPermission } from '../hooks/useNotifications'

export default function Layout() {
  const { pendingRentals, unreadMessages } = useNotifications()

  useEffect(() => {
    const asked = localStorage.getItem('push_asked')
    if (!asked) {
      setTimeout(() => {
        requestPushPermission()
        localStorage.setItem('push_asked', '1')
      }, 3000)
    }
  }, [])

  const navItems = [
    { to: '/', icon: '🗺️', label: 'Поруч', badge: 0 },
    { to: '/requests', icon: '🔍', label: 'Запити', badge: 0 },
    { to: '/rentals', icon: '📦', label: 'Оренди', badge: pendingRentals + unreadMessages },
    { to: '/add', icon: '➕', label: 'Додати', badge: 0 },
    { to: '/profile', icon: '👤', label: 'Профіль', badge: 0 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{
        background: 'white', borderBottom: '1px solid var(--border)',
        padding: '0 16px', height: 52, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0, zIndex: 10
      }}>
        <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>
          Neighbor<span style={{ color: 'var(--green)' }}>Rent</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <span style={{ fontSize: '1.2rem', cursor: 'pointer' }}>🔔</span>
            {(pendingRentals + unreadMessages) > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: '#ef4444', color: 'white',
                borderRadius: '50%', width: 16, height: 16,
                fontSize: '0.6rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid white'
              }}>
                {(pendingRentals + unreadMessages) > 9 ? '9+' : pendingRentals + unreadMessages}
              </span>
            )}
          </div>
          <span style={{
            fontSize: '0.75rem', background: 'var(--green-light)',
            color: 'var(--green-dark)', padding: '3px 10px', borderRadius: 20, fontWeight: 600
          }}>
            Beta
          </span>
        </div>
      </header>

      {/* Page content */}
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav style={{
        background: 'white', borderTop: '1px solid var(--border)',
        display: 'flex', height: 60, flexShrink: 0, zIndex: 10
      }}>
        {navItems.map(({ to, icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 2,
              fontSize: '0.65rem', fontWeight: 600, textDecoration: 'none',
              color: isActive ? 'var(--green)' : 'var(--gray)',
              borderTop: isActive ? '2px solid var(--green)' : '2px solid transparent',
              transition: 'color 0.15s', position: 'relative',
            })}
          >
            <div style={{ position: 'relative', lineHeight: 1 }}>
              <span style={{ fontSize: '1.3rem' }}>{icon}</span>
              {badge > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -6,
                  background: '#ef4444', color: 'white',
                  borderRadius: '50%', minWidth: 16, height: 16,
                  fontSize: '0.58rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid white', padding: '0 2px',
                }}>
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </div>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
