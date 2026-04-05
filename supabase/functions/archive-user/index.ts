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

        // Prevent archiving yourself
        if (userId === caller.id) {
            return new Response(
                JSON.stringify({ error: 'You cannot archive your own account' }),
                { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
            )
        }

        // Check if user exists and is not already archived
        const { data: targetProfile, error: profileFetchError } = await supabaseAdmin
            .from('profiles')
            .select('id, name, email, role, archived_at')
            .eq('id', userId)
            .single()

        if (profileFetchError || !targetProfile) {
            return new Response(
                JSON.stringify({ error: 'User not found' }),
                { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
            )
        }

        if (targetProfile.archived_at) {
            return new Response(
                JSON.stringify({ error: 'User is already archived' }),
                { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
            )
        }

        // Prevent archiving other admins
        if (targetProfile.role === 'admin') {
            return new Response(
                JSON.stringify({ error: 'Cannot archive admin accounts' }),
                { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
            )
        }

        // Step 1: Set archived_at, archived_by, and status on profiles
        const { error: archiveError } = await supabaseAdmin
            .from('profiles')
            .update({
                archived_at: new Date().toISOString(),
                archived_by: caller.id,
                status: 'archived'
            })
            .eq('id', userId)

        if (archiveError) {
            console.error('Error archiving profile:', archiveError)
            return new Response(
                JSON.stringify({ error: 'Failed to archive user profile' }),
                { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
            )
        }

        // Step 2: Ban the user in Supabase Auth (prevents login, reversible)
        const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            ban_duration: '876600h' // ~100 years
        })

        if (banError) {
            console.error('Error banning user in Auth:', banError)
            // Rollback the profile archive since ban failed
            await supabaseAdmin
                .from('profiles')
                .update({ archived_at: null, archived_by: null, status: 'inactive' })
                .eq('id', userId)
            return new Response(
                JSON.stringify({ error: 'Failed to disable user authentication' }),
                { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
            )
        }

        // Step 3: Clean up ephemeral data (cart, favorites)
        const cleanupResults: Record<string, string> = {}

        const { error: cartError } = await supabaseAdmin
            .from('cart')
            .delete()
            .eq('user_id', userId)
        cleanupResults.cart = cartError ? `error: ${cartError.message}` : 'cleaned'

        const { error: favError } = await supabaseAdmin
            .from('favorites')
            .delete()
            .eq('client_id', userId)
        cleanupResults.favorites = favError ? `error: ${favError.message}` : 'cleaned'

        // Step 4: Count retained records for the response summary
        const { count: orderCount } = await supabaseAdmin
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', userId)

        const { count: invoiceCount } = await supabaseAdmin
            .from('invoices')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', userId)

        const { count: ticketCount } = await supabaseAdmin
            .from('support_tickets')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)

        // Step 5: Log to audit_logs
        await supabaseAdmin
            .from('audit_logs')
            .insert({
                action: 'client_archived',
                performed_by: caller.id,
                target_user_id: userId,
                details: {
                    client_name: targetProfile.name,
                    client_email: targetProfile.email,
                    retained_orders: orderCount || 0,
                    retained_invoices: invoiceCount || 0,
                    retained_tickets: ticketCount || 0,
                    cleanup: cleanupResults
                }
            })
            .then(() => {})
            .catch((err: Error) => console.warn('Audit log warning:', err.message))

        return new Response(
            JSON.stringify({
                success: true,
                message: `Client "${targetProfile.name}" has been archived`,
                summary: {
                    archived_user: targetProfile.email,
                    auth_disabled: true,
                    retained_records: {
                        orders: orderCount || 0,
                        invoices: invoiceCount || 0,
                        support_tickets: ticketCount || 0
                    },
                    cleaned_up: cleanupResults
                }
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
