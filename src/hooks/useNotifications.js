import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useNotifications() {
  const { user } = useAuth()
  const [pendingRentals, setPendingRentals] = useState(0)  // запросы на мои вещи
  const [unreadMessages, setUnreadMessages] = useState(0)  // непрочитанные сообщения

  useEffect(() => {
    if (!user) return
    fetchCounts()

    // Realtime: новые аренды
    const rentalChannel = supabase
      .channel('notify:rentals')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'rentals',
        filter: `owner_id=eq.${user.id}`,
      }, (payload) => {
        fetchCounts()
        sendPushNotification('🔔 Новый запрос на аренду', 'Кто-то хочет арендовать вашу вещь')
      })
      .subscribe()

    // Realtime: новые сообщения
    const msgChannel = supabase
      .channel('notify:messages')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
      }, (payload) => {
        // Если сообщение не от меня — увеличиваем счётчик
        if (payload.new.sender_id !== user.id) {
          setUnreadMessages(prev => prev + 1)
          // Web Push
          sendPushNotification('💬 Новое сообщение', 'Вам написали по аренде')
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(rentalChannel)
      supabase.removeChannel(msgChannel)
    }
  }, [user])

  async function fetchCounts() {
    if (!user) return

    // Pending rentals где я владелец
    const { count: rentals } = await supabase
      .from('rentals')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .eq('status', 'pending')
    setPendingRentals(rentals || 0)

    // Непрочитанные: сообщения в моих арендах не от меня,
    // позже которых нет записи в message_reads
    const { data: myRentals } = await supabase
      .from('rentals')
      .select('id')
      .or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`)

    if (!myRentals?.length) { setUnreadMessages(0); return }

    const rentalIds = myRentals.map(r => r.id)

    // Последние прочитанные по каждой аренде
    const { data: reads } = await supabase
      .from('message_reads')
      .select('rental_id, last_read_at')
      .eq('user_id', user.id)

    const readMap = Object.fromEntries((reads || []).map(r => [r.rental_id, r.last_read_at]))

    // Считаем непрочитанные сообщения
    let unread = 0
    for (const rentalId of rentalIds) {
      const lastRead = readMap[rentalId] || '1970-01-01'
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('rental_id', rentalId)
        .neq('sender_id', user.id)
        .gt('created_at', lastRead)
      unread += count || 0
    }
    setUnreadMessages(unread)
  }

  // Отметить сообщения прочитанными для конкретной аренды
  async function markMessagesRead(rentalId) {
    if (!user || !rentalId) return
    await supabase.from('message_reads').upsert({
      user_id: user.id,
      rental_id: rentalId,
      last_read_at: new Date().toISOString(),
    })
    fetchCounts()
  }

  return { pendingRentals, unreadMessages, refetch: fetchCounts, markMessagesRead }
}

// Web Push
export async function requestPushPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function sendPushNotification(title, body, options = {}) {
  if (Notification.permission !== 'granted') return
  // Если страница в фокусе — не показываем (чат уже видно)
  if (!document.hidden) return
  new Notification(title, {
    body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'neighborrent',
    ...options,
  })
}
