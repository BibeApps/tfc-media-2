import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function getCorsHeaders(req: Request) {
    const origin = req.headers.get('Origin') || ''
    const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '*').split(',')
    const isAllowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin)
    return {
        'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: getCorsHeaders(req) })
    }

    try {
        // Verify the caller is an authenticated admin
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing authorization header' }),
                { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
            )
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        )
        const callerClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )
        const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser()
        if (callerError || !caller) {
            return new Response(
                JSON.stringify({ success: false, error: 'Invalid or expired token' }),
                { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
            )
        }
        const { data: callerProfile } = await supabaseAdmin
            .from('profiles').select('role').eq('id', caller.id).single()
        if (!callerProfile || callerProfile.role !== 'admin') {
            return new Response(
                JSON.stringify({ success: false, error: 'Admin access required' }),
                { status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
            )
        }

        const { to, message } = await req.json()

        // Validate input
        if (!to || !message) {
            throw new Error('Missing required fields: to, message')
        }

        // Get Twilio credentials from environment
        const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
        const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
        const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')

        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
            throw new Error('Twilio credentials not configured in Supabase environment')
        }

        // Create Basic Auth header for Twilio API
        const authHeader = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)

        // Send SMS using Twilio API
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`

        const formData = new URLSearchParams()
        formData.append('To', to)
        formData.append('From', TWILIO_PHONE_NUMBER)
        formData.append('Body', message)

        const res = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${authHeader}`,
            },
            body: formData.toString(),
        })

        const data = await res.json()

        if (!res.ok) {
            console.error('Twilio API error:', data)
            throw new Error(data.message || 'Failed to send SMS')
        }

        console.log('SMS sent successfully:', data.sid)

        return new Response(
            JSON.stringify({ success: true, messageSid: data.sid }),
            {
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('Error sending SMS:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            {
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
