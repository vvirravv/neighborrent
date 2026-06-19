// Supabase Edge Function: notify-rental
// Вызывается при создании/обновлении аренды
// Отправляет email через Resend (https://resend.com — бесплатно 3000/мес)
//
// ДЕПЛОЙ:
//   supabase functions deploy notify-rental
//   supabase secrets set RESEND_API_KEY=re_xxxx FROM_EMAIL=noreply@yourdomain.com

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'NeighborRent <noreply@neighborrent.app>'

serve(async (req) => {
  try {
    const { rental_id, event } = await req.json()
    // event: 'created' | 'confirmed' | 'completed' | 'cancelled'

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch rental with all related data
    const { data: rental, error } = await supabase
      .from('rentals')
      .select(`
        *,
        items(title, price_per_hour),
        renter:profiles!rentals_renter_id_fkey(full_name, phone),
        owner:profiles!rentals_owner_id_fkey(full_name, phone)
      `)
      .eq('id', rental_id)
      .single()

    if (error || !rental) throw new Error('Rental not found')

    // Get emails from auth.users
    const { data: renterUser } = await supabase.auth.admin.getUserById(rental.renter_id)
    const { data: ownerUser } = await supabase.auth.admin.getUserById(rental.owner_id)

    const renterEmail = renterUser?.user?.email
    const ownerEmail = ownerUser?.user?.email

    const itemTitle = rental.items?.title || 'Вещь'
    const startDate = new Date(rental.start_time).toLocaleString('ru-RU')
    const totalPrice = rental.total_price

    const emails: { to: string; subject: string; html: string }[] = []

    if (event === 'created') {
      // To owner: new booking request
      if (ownerEmail) emails.push({
        to: ownerEmail,
        subject: `🔔 Новый запрос на аренду: ${itemTitle}`,
        html: emailTemplate({
          title: 'Новый запрос на аренду',
          body: `
            <p>Привет, ${rental.owner?.full_name || 'сосед'}!</p>
            <p><strong>${rental.renter?.full_name || 'Пользователь'}</strong> хочет арендовать вашу вещь:</p>
            <div class="highlight">
              <strong>${itemTitle}</strong><br/>
              📅 ${startDate}<br/>
              ⏱ ${rental.hours} ч.<br/>
              💰 $${totalPrice}
            </div>
            <p>Зайдите в приложение чтобы принять или отклонить запрос.</p>
          `
        })
      })
      // To renter: request sent
      if (renterEmail) emails.push({
        to: renterEmail,
        subject: `✅ Запрос на аренду отправлен: ${itemTitle}`,
        html: emailTemplate({
          title: 'Запрос отправлен',
          body: `
            <p>Привет, ${rental.renter?.full_name || 'сосед'}!</p>
            <p>Твой запрос на аренду отправлен владельцу.</p>
            <div class="highlight">
              <strong>${itemTitle}</strong><br/>
              📅 ${startDate}<br/>
              ⏱ ${rental.hours} ч.<br/>
              💰 $${totalPrice}
            </div>
            <p>Мы сообщим, как только владелец подтвердит.</p>
          `
        })
      })
    }

    if (event === 'confirmed') {
      if (renterEmail) emails.push({
        to: renterEmail,
        subject: `🎉 Аренда подтверждена: ${itemTitle}`,
        html: emailTemplate({
          title: 'Аренда подтверждена!',
          body: `
            <p>Привет, ${rental.renter?.full_name || 'сосед'}!</p>
            <p>Владелец подтвердил твою аренду. Можешь забирать!</p>
            <div class="highlight">
              <strong>${itemTitle}</strong><br/>
              📅 ${startDate}<br/>
              📞 ${rental.owner?.phone || 'Контакт в приложении'}
            </div>
          `
        })
      })
    }

    if (event === 'completed') {
      if (renterEmail) emails.push({
        to: renterEmail,
        subject: `⭐ Оцени аренду: ${itemTitle}`,
        html: emailTemplate({
          title: 'Аренда завершена',
          body: `
            <p>Привет! Аренда завершена. Оставь отзыв о вещи и владельце — это поможет другим соседям.</p>
            <div class="highlight"><strong>${itemTitle}</strong></div>
          `
        })
      })
    }

    // Send all emails via Resend
    const results = await Promise.all(emails.map(e =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: FROM_EMAIL, to: e.to, subject: e.subject, html: e.html }),
      }).then(r => r.json())
    ))

    return new Response(JSON.stringify({ sent: results.length, results }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})

function emailTemplate({ title, body }: { title: string; body: string }) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
  .container { max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  .header { background: #22c55e; padding: 24px; text-align: center; }
  .header h1 { color: white; margin: 0; font-size: 1.2rem; }
  .logo { color: white; font-size: 1.5rem; font-weight: 900; margin-bottom: 8px; }
  .content { padding: 24px; color: #0f172a; font-size: 0.95rem; line-height: 1.6; }
  .highlight { background: #f0fdf4; border-left: 3px solid #22c55e; padding: 14px; border-radius: 8px; margin: 16px 0; }
  .footer { padding: 16px 24px; text-align: center; font-size: 0.75rem; color: #94a3b8; border-top: 1px solid #e2e8f0; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">🏘️ NeighborRent</div>
    <h1>${title}</h1>
  </div>
  <div class="content">${body}</div>
  <div class="footer">NeighborRent · Аренда вещей у соседей · Отписаться</div>
</div>
</body>
</html>`
}
