import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { rental_id, has_damage } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: rental, error } = await supabase
      .from('rentals')
      .select('*')
      .eq('id', rental_id)
      .single()

    if (error || !rental) throw new Error('Оренду не знайдено')
    if (rental.status !== 'active') throw new Error('Оренда не активна')

    // Сума власника = оренда без сервісного збору (total_price / 1.15)
    const ownerAmount = Math.round((rental.total_price / 1.15) * 100) / 100

    if (rental.stripe_payment_intent_id && rental.deposit_hold > 0 && !has_damage) {
      // Повертаємо заставу орендарю через Stripe
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
        apiVersion: '2023-10-16',
        httpClient: Stripe.createFetchHttpClient(),
      })

      await stripe.refunds.create({
        payment_intent: rental.stripe_payment_intent_id,
        amount: Math.round(rental.deposit_hold * 100),
        reason: 'requested_by_customer',
      })
    }

    const depositStatus = has_damage ? 'forfeited' : 'released'

    // Оновлюємо статус оренди
    await supabase
      .from('rentals')
      .update({ status: 'completed', deposit_status: depositStatus })
      .eq('id', rental_id)

    // Зараховуємо баланс власнику (атомарно — читаємо + оновлюємо)
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', rental.owner_id)
      .single()

    await supabase
      .from('profiles')
      .update({ balance: ((ownerProfile?.balance || 0) + ownerAmount) })
      .eq('id', rental.owner_id)

    return new Response(
      JSON.stringify({ success: true, owner_credited: ownerAmount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
