// Edge Function — dev auth bypass (désactiver en production)
// Crée une session directement via le service_role key
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { phone } = await req.json()
  if (!phone) {
    return new Response(JSON.stringify({ error: 'phone required' }), { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Créer ou récupérer l'utilisateur
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  let user = existingUsers?.users?.find((u: any) => u.phone === phone)

  if (!user) {
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      phone,
      phone_confirm: true,
    })
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    user = newUser.user
  }

  // Générer un lien magique (session directe)
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: `${phone.replace('+', '')}@dev.mastercota.com`,
  })

  if (linkError) return new Response(JSON.stringify({ error: linkError.message }), { status: 500 })

  return new Response(JSON.stringify({ 
    user_id: user?.id,
    message: 'dev auth ok'
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
