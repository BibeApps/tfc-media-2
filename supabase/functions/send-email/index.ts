import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

function getCorsHeaders(req: Request) {
    const origin = req.headers.get('Origin') || ''
    const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map((o: string) => o.trim())
    const isAllowed = allowedOrigins.includes(origin)
    return {
        'Access-Control-Allow-Origin': isAllowed ? origin : (allowedOrigins[0] || ''),
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }
}

interface EmailRequest {
    to: string
    subject: string
    html: string
    from?: string
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: getCorsHeaders(req) })
    }

    try {
        // Verify the caller is authenticated
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing authorization header' }),
                { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
            )
        }

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

        const { to, subject, html, from }: EmailRequest = await req.json()

        console.log('📧 Sending email to:', to, 'subject:', subject)

        // Validate input
        if (!to || !subject || !html) {
            console.error('❌ Missing required fields')
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Missing required fields: to, subject, html'
                }),
                {
                    status: 400,
                    headers: {
                        ...getCorsHeaders(req),
                        'Content-Type': 'application/json',
                    }
                }
            )
        }

        if (!RESEND_API_KEY) {
            console.error('❌ RESEND_API_KEY not configured')
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Email service not configured'
                }),
                {
                    status: 500,
                    headers: {
                        ...getCorsHeaders(req),
                        'Content-Type': 'application/json',
                    }
                }
            )
        }

        const emailPayload = {
            from: from || 'TFC Media <noreply@tfcmediagroup.com>',
            to: [to],
            subject: subject,
            html: html,
        }

        console.log('📤 Calling Resend API...')
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify(emailPayload),
        })

        const data = await res.json()
        console.log('📬 Resend response:', res.status, data)

        if (!res.ok) {
            console.error('❌ Resend API error:', data)
            return new Response(
                JSON.stringify({
                    success: false,
                    error: data.message || 'Failed to send email'
                }),
                {
                    status: res.status,
                    headers: {
                        ...getCorsHeaders(req),
                        'Content-Type': 'application/json',
                    }
                }
            )
        }

        console.log('✅ Email sent successfully! ID:', data.id)
        return new Response(JSON.stringify({ success: true, data }), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('❌ Error in send-email:', error)
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to send email'
        }), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
