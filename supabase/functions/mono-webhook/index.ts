import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const payload = await req.json()
    // payload.status: "created" | "processing" | "hold" | "success" | "failure" | "reversed" | "expired"
    // payload.reference = rental_id

    const rentalId = payload.reference
    if (!rentalId) return new Response('ok')

    if (payload.status === 'success') {
      await supabase
        .from('rentals')
        .update({ status: 'pending' })
        .eq('id', rentalId)
    } else if (payload.status === 'failure' || payload.status === 'expired' || payload.status === 'reversed') {
      await supabase
        .from('rentals')
        .update({ status: 'cancelled' })
        .eq('id', rentalId)
    }

    return new Response('ok')
  } catch (err) {
    return new Response(err.message, { status: 400 })
  }
})
