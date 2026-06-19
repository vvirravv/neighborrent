import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
        start_time, end_time, hours,
        total_price, deposit_hold,
        status: 'pending_payment',
      })
      .select('id')
      .single()

    if (rentalError) throw new Error(rentalError.message)

    // 2. Monobank: сума в копійках (1 ₴ = 100 копійок)
    const amountKopecks = Math.round(total_price * 100)

    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/mono-webhook`

    const monoRes = await fetch('https://api.monobank.ua/api/merchant/invoice/create', {
      method: 'POST',
      headers: {
        'X-Token': Deno.env.get('MONO_TOKEN')!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountKopecks,
        ccy: 980, // UAH
        merchantPaymInfo: {
          reference: rental.id,
          destination: `Оренда: ${item_title}`,
          comment: `NeighborRent · ${hours} год`,
        },
        redirectUrl: `${origin}/success?rental_id=${rental.id}`,
        webHookUrl: webhookUrl,
      }),
    })

    if (!monoRes.ok) {
      const errText = await monoRes.text()
      throw new Error(`Monobank error: ${errText}`)
    }

    const mono = await monoRes.json()

    // Зберігаємо invoiceId для перевірки
    await supabase
      .from('rentals')
      .update({ stripe_session_id: mono.invoiceId }) // використовуємо існуюче поле
      .eq('id', rental.id)

    return new Response(
      JSON.stringify({ url: mono.pageUrl, rental_id: rental.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
