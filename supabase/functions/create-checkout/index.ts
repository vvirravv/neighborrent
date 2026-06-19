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
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    })

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

    // 1. Створюємо запис оренди зі статусом pending_payment
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .insert({
        item_id,
        renter_id,
        owner_id,
        start_time,
        end_time,
        hours,
        total_price,
        deposit_hold,
        status: 'pending_payment',
      })
      .select('id')
      .single()

    if (rentalError) throw new Error(rentalError.message)

    // 2. Рахуємо суми
    const rentalAmount = Math.round(total_price * 100) // в центах
    const depositAmount = Math.round(deposit_hold * 100)

    // 3. Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Оренда: ${item_title}`,
              description: `${hours} год · застава $${deposit_hold} заморожується окремо`,
            },
            unit_amount: rentalAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}&rental_id=${rental.id}`,
      cancel_url: `${origin}/item/${item_id}`,
      metadata: {
        rental_id: rental.id,
        item_id,
        renter_id,
      },
    })

    return new Response(
      JSON.stringify({ url: session.url, rental_id: rental.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
