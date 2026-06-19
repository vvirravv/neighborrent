import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../hooks/useNotifications'

export default function Chat({ rentalId, otherUser }) {
  const { user, profile } = useAuth()
  const { markMessagesRead } = useNotifications()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    if (!rentalId) return
    fetchMessages()
    markMessagesRead(rentalId) // сбрасываем бейдж при открытии

    // Realtime subscription
    const channel = supabase
      .channel(`chat:${rentalId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `rental_id=eq.${rentalId}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [rentalId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(full_name)')
      .eq('rental_id', rentalId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    const { error } = await supabase.from('messages').insert({
      rental_id: rentalId,
      sender_id: user.id,
      content: text.trim(),
    })
    if (!error) setText('')
    setSending(false)
  }

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 16,
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      height: 360
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', background: 'var(--light)',
        borderBottom: '1px solid var(--border)',
        fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8
      }}>
        💬 Чат {otherUser ? `з ${otherUser}` : ''}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--gray)', fontSize: '0.85rem', marginTop: 20 }}>
            Напиши перше повідомлення 👋
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === user.id
          return (
            <div key={msg.id} style={{
              display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start'
            }}>
              <div style={{
                maxWidth: '75%', padding: '8px 12px', borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: isMe ? 'var(--green)' : 'var(--light)',
                color: isMe ? 'white' : 'var(--dark)',
                fontSize: '0.88rem', lineHeight: 1.4
              }}>
                {!isMe && (
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, marginBottom: 3, opacity: 0.7 }}>
                    {msg.profiles?.full_name || 'Користувач'}
                  </div>
                )}
                {msg.content}
                <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: 3, textAlign: 'right' }}>
                  {new Date(msg.created_at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} style={{
        display: 'flex', gap: 8, padding: '10px 12px',
        borderTop: '1px solid var(--border)', background: 'white'
      }}>
        <input
          style={{
            flex: 1, padding: '9px 12px', border: '1.5px solid var(--border)',
            borderRadius: 10, fontSize: '0.9rem', outline: 'none'
          }}
          placeholder="Написати повідомлення..."
          value={text}
          onChange={e => setText(e.target.value)}
          onFocus={e => e.target.style.borderColor = 'var(--green)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          style={{
            background: 'var(--green)', color: 'white', border: 'none',
            borderRadius: 10, padding: '0 16px', fontWeight: 700,
            cursor: 'pointer', fontSize: '1.1rem', transition: 'background 0.15s'
          }}
        >
          {sending ? '...' : '↑'}
        </button>
      </form>
    </div>
  )
}
