import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helper to convert hex string to Uint8Array for signature verification
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const signature = req.headers.get('x-paystack-signature')
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing x-paystack-signature header' }), { status: 400 })
    }

    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!paystackSecret) {
      return new Response(
        JSON.stringify({ error: 'PAYSTACK_SECRET_KEY environment variable is not set' }),
        { status: 500 }
      )
    }

    const bodyText = await req.text()

    // 1. Verify HMAC SHA512 Signature
    const encoder = new TextEncoder()
    const secretKeyData = encoder.encode(paystackSecret)
    const bodyData = encoder.encode(bodyText)

    const key = await crypto.subtle.importKey(
      'raw',
      secretKeyData,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['verify']
    )

    const isSignatureValid = await crypto.subtle.verify(
      'HMAC',
      key,
      hexToBytes(signature),
      bodyData
    )

    if (!isSignatureValid) {
      console.error('Webhook signature mismatch!')
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 })
    }

    // 2. Parse payload
    const event = JSON.parse(bodyText)
    console.log(`Received Paystack event: ${event.event}`)

    // 3. Handle charge.success
    if (event.event === 'charge.success') {
      const { reference, status, channel } = event.data

      if (status === 'success') {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // Update the contribution status to 'paid'
        const { data, error } = await supabaseAdmin
          .from('contributions')
          .update({
            status: 'paid',
            payment_method: channel || 'mobile_money',
          })
          .eq('paystack_reference', reference)
          .select()

        if (error) {
          console.error(`Error updating contribution status: ${error.message}`)
          return new Response(JSON.stringify({ error: error.message }), { status: 500 })
        }

        console.log(`Successfully processed payment. Reference: ${reference}, Status: ${status}`)
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error(`Webhook processing error: ${error.message}`)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
