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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized user token' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const { business_name, settlement_bank, account_number } = await req.json()
    if (!business_name || !settlement_bank || !account_number) {
      return new Response(
        JSON.stringify({ error: 'business_name, settlement_bank, and account_number are required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!paystackSecret) {
      return new Response(
        JSON.stringify({ error: 'PAYSTACK_SECRET_KEY environment variable is not set' }),
        { status: 500, headers: corsHeaders }
      )
    }

    // Call Paystack to create subaccount
    const response = await fetch('https://api.paystack.co/subaccount', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        business_name,
        settlement_bank,
        account_number,
        percentage_charge: 1.0, // 1% commission to platform, 99% to subaccount
      }),
    })

    const data = await response.json()
    if (!response.ok || !data.status) {
      return new Response(
        JSON.stringify({ error: data.message || 'Failed to create subaccount in Paystack' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const subaccountCode = data.data.subaccount_code

    // Save in user profile in Supabase database using service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ paystack_subaccount_id: subaccountCode })
      .eq('id', user.id)

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: corsHeaders,
      })
    }

    return new Response(JSON.stringify({ subaccount_code: subaccountCode }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
