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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const {
      item_id, item_title,
      renter_id, owner_id,
      start_time, end_time,
      hours, total_price, deposit_hold,
      origin,
    } = await req.json()

    // 1. Зберігаємо оренду зі статусом pending_payment
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .insert({
        item_id, renter_id, owner_id,
        start_time, end_time,
        hours: Math.round(hours),
        total_price: Math.round(total_price * 100) / 100,
        deposit_hold: deposit_hold || 0,
        status: 'pending_payment',
      })
      .select('id')
      .single()

    if (rentalError) throw new Error(rentalError.message)

    // Stripe мінімум ~₴25 (еквівалент $0.50)
    const grandTotal = total_price + (deposit_hold || 0)
    if (grandTotal < 25) {
      await supabase.from('rentals').delete().eq('id', rental.id)
      throw new Error(`Мінімальна сума оплати ₴25. Зараз ₴${grandTotal.toFixed(0)} — збільш тривалість оренди.`)
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // 2. Stripe Checkout: оренда + збір + застава
    const rentalKopecks = Math.round(total_price * 100)
    const depositKopecks = Math.round((deposit_hold || 0) * 100)

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: 'uah',
          product_data: {
            name: `Оренда: ${item_title}`,
            description: `${hours} год · включає сервісний збір (15%)`,
          },
          unit_amount: rentalKopecks,
        },
        quantity: 1,
      },
    ]

    if (depositKopecks > 0) {
      lineItems.push({
        price_data: {
          currency: 'uah',
          product_data: {
            name: '🔒 Застава (повертається після оренди)',
          },
          unit_amount: depositKopecks,
        },
        quantity: 1,
      })
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/success?rental_id=${rental.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/items/${item_id}`,
      metadata: {
        rental_id: rental.id,
        deposit_amount: String(depositKopecks),
      },
    })

    // 3. Зберігаємо session_id
    await supabase
      .from('rentals')
      .update({ stripe_session_id: session.id })
      .eq('id', rental.id)

    return new Response(
      JSON.stringify({ url: session.url, rental_id: rental.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    // Повертаємо 200 щоб Supabase JS передав тіло відповіді у data
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
