import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

function getCorsHeaders(req: Request) {
    const origin = req.headers.get('Origin') || ''
    const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '*').split(',')
    const isAllowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin)
    return {
        'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }
}

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: getCorsHeaders(req) })
    }

    try {
        // Verify the caller is an authenticated admin
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
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
                JSON.stringify({ error: 'Invalid or expired token' }),
                { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
            )
        }
        const { data: callerProfile } = await supabaseAdmin
            .from('profiles').select('role').eq('id', caller.id).single()
        if (!callerProfile || callerProfile.role !== 'admin') {
            return new Response(
                JSON.stringify({ error: 'Admin access required' }),
                { status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
            )
        }

        // Get the user ID from the request body
        const { userId } = await req.json()

        if (!userId) {
            return new Response(
                JSON.stringify({ error: 'User ID is required' }),
                { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
            )
        }

        // Check if user exists and is actually archived
        const { data: targetProfile, error: profileFetchError } = await supabaseAdmin
            .from('profiles')
            .select('id, name, email, archived_at')
            .eq('id', userId)
            .single()

        if (profileFetchError || !targetProfile) {
            return new Response(
                JSON.stringify({ error: 'User not found' }),
                { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
            )
        }

        if (!targetProfile.archived_at) {
            return new Response(
                JSON.stringify({ error: 'User is not archived' }),
                { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
            )
        }

        // Step 1: Restore the profile
        const { error: restoreError } = await supabaseAdmin
            .from('profiles')
            .update({
                archived_at: null,
                archived_by: null,
                status: 'active'
            })
            .eq('id', userId)

        if (restoreError) {
            console.error('Error restoring profile:', restoreError)
            return new Response(
                JSON.stringify({ error: 'Failed to restore user profile' }),
                { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
            )
        }

        // Step 2: Unban the user in Supabase Auth
        const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            ban_duration: 'none'
        })

        if (unbanError) {
            console.error('Error unbanning user in Auth:', unbanError)
            // Rollback the profile restore
            await supabaseAdmin
                .from('profiles')
                .update({ archived_at: new Date().toISOString(), status: 'archived' })
                .eq('id', userId)
            return new Response(
                JSON.stringify({ error: 'Failed to re-enable user authentication' }),
                { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
            )
        }

        // Step 3: Log to audit_logs
        await supabaseAdmin
            .from('audit_logs')
            .insert({
                action: 'client_restored',
                performed_by: caller.id,
                target_user_id: userId,
                details: {
                    client_name: targetProfile.name,
                    client_email: targetProfile.email
                }
            })
            .then(() => {})
            .catch((err: Error) => console.warn('Audit log warning:', err.message))

        return new Response(
            JSON.stringify({
                success: true,
                message: `Client "${targetProfile.name}" has been restored`,
                restored_user: targetProfile.email
            }),
            { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Unexpected error:', error)
        return new Response(
            JSON.stringify({ error: 'An unexpected error occurred' }),
            { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
    }
})
