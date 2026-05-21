import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { cotisation_id, amount, contributor_name, contributor_phone } = await req.json()

    if (!cotisation_id || !amount || !contributor_name || !contributor_phone) {
      return new Response(
        JSON.stringify({ error: 'cotisation_id, amount, contributor_name, and contributor_phone are required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Fetch Cotisation and Owner info
    const { data: cotisation, error: cotError } = await supabaseAdmin
      .from('cotisations')
      .select('title, owner_id')
      .eq('id', cotisation_id)
      .single()

    if (cotError || !cotisation) {
      return new Response(JSON.stringify({ error: 'Cotisation not found' }), {
        status: 404,
        headers: corsHeaders,
      })
    }

    const { data: owner, error: ownerError } = await supabaseAdmin
      .from('users')
      .select('paystack_subaccount_id')
      .eq('id', cotisation.owner_id)
      .single()

    if (ownerError || !owner) {
      return new Response(JSON.stringify({ error: 'Cotisation owner not found' }), {
        status: 404,
        headers: corsHeaders,
      })
    }

    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!paystackSecret) {
      return new Response(
        JSON.stringify({ error: 'PAYSTACK_SECRET_KEY environment variable is not set' }),
        { status: 500, headers: corsHeaders }
      )
    }

    // Generate contribution reference ID
    const contributionId = crypto.randomUUID()

    // 2. Prepare Paystack Initialize Payload
    const cleanPhone = contributor_phone.replace(/[^0-9]/g, '')
    const email = `${cleanPhone}@mastercota.com`
    
    // Amount in subunits (e.g. 1000 FCFA -> 100000 subunits)
    const amountInSubunits = Math.round(amount * 100)

    const payload: any = {
      email,
      amount: amountInSubunits,
      reference: contributionId,
    }

    // Split parameters if owner has set up their subaccount
    if (owner.paystack_subaccount_id) {
      payload.subaccount = owner.paystack_subaccount_id
      payload.bearer = 'subaccount' // Subaccount bears the Paystack fee, so platform commission remains 1% net
    }

    // 3. Call Paystack API
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    if (!response.ok || !data.status) {
      return new Response(
        JSON.stringify({ error: data.message || 'Failed to initialize transaction with Paystack' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // 4. Create pending contribution record in Supabase
    const { error: contribError } = await supabaseAdmin
      .from('contributions')
      .insert({
        id: contributionId,
        cotisation_id,
        contributor_name,
        contributor_phone,
        amount,
        status: 'pending',
        paystack_reference: contributionId,
      })

    if (contribError) {
      return new Response(
        JSON.stringify({ error: `Failed to register contribution record: ${contribError.message}` }),
        { status: 500, headers: corsHeaders }
      )
    }

    return new Response(
      JSON.stringify({
        authorization_url: data.data.authorization_url,
        reference: contributionId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
