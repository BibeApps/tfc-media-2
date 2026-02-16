import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Verify the caller is an authenticated admin
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Create a Supabase client with the service role key
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Verify caller's JWT and check admin role
        const callerClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )
        const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser()
        if (callerError || !caller) {
            return new Response(
                JSON.stringify({ success: false, error: 'Invalid or expired token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }
        const { data: callerProfile } = await supabaseAdmin
            .from('profiles').select('role').eq('id', caller.id).single()
        if (!callerProfile || callerProfile.role !== 'admin') {
            return new Response(
                JSON.stringify({ success: false, error: 'Admin access required' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get the request body
        const { email, password, name, role, phone, company, address, city, state, zip, country } = await req.json()

        console.log('Creating user:', { email, name, role })

        // Create user in Auth with admin API (bypasses email confirmation)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                name,
                role
            }
        })

        if (authError) {
            console.error('Auth error:', authError)
            throw authError
        }

        if (!authData.user) {
            throw new Error('No user data returned')
        }

        console.log('Auth user created:', authData.user.id)

        // Determine account_type based on role
        const accountType = role === 'admin' ? 'admin' : 'customer'

        // Create profile record
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: authData.user.id,
                email,
                name,
                role,
                account_type: accountType,
                phone: phone || null,
                company: company || null,
                address: address || null,
                city: city || null,
                state: state || null,
                zip: zip || null,
                country: country || 'USA',
                status: 'onboarding',
                member_since: new Date().toISOString(),
                total_spent: 0
            })

        if (profileError) {
            console.error('Profile error:', profileError)
            // Try to delete the auth user if profile creation failed
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
            throw profileError
        }

        console.log('Profile created successfully')

        return new Response(
            JSON.stringify({
                success: true,
                user: authData.user,
                message: 'User created successfully'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message || 'Unknown error occurred'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
