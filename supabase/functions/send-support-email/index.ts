// Edge Function to send support ticket email notifications
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

function getCorsHeaders(req: Request) {
    const origin = req.headers.get('Origin') || ''
    const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map((o: string) => o.trim())
    const isAllowed = allowedOrigins.includes(origin)
    return {
        'Access-Control-Allow-Origin': isAllowed ? origin : (allowedOrigins[0] || ''),
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }
}

function escapeHtml(str: string): string {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

const PRIORITY_COLORS: Record<string, string> = {
    urgent: '#f44336',
    high: '#ff9800',
    medium: '#2196F3',
    low: '#4CAF50',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: getCorsHeaders(req) })
    }

    try {
        const { ticketNumber, name, email, subject, message, priority } = await req.json()

        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
        if (!RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY not configured')
        }

        const APP_URL = Deno.env.get('APP_URL') || 'https://tfcmediagroup.com'

        // HTML-escape all user-supplied fields before embedding in templates
        const safeName = escapeHtml(name || '')
        const safeEmail = escapeHtml(email || '')
        const safeSubject = escapeHtml(subject || '')
        const safeMessage = escapeHtml(message || '')
        const safeTicketNumber = escapeHtml(String(ticketNumber || ''))
        // Priority is restricted to known values — use only if in allowed set
        const safePriority = Object.keys(PRIORITY_COLORS).includes(priority) ? priority : 'low'
        const priorityColor = PRIORITY_COLORS[safePriority]

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const { data: settings } = await supabaseAdmin
            .from('site_settings')
            .select('contact_email')
            .single()

        const adminEmail = settings?.contact_email || 'admin@tfcmedia.com'

        // Send email to admin
        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'TFC Media Support <noreply@tfcmediagroup.com>',
                to: [adminEmail],
                subject: `New Support Ticket #${safeTicketNumber}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <style>
                                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                .header { background-color: #1a1a1a; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                                .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                                .ticket-info { background-color: #fff; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0; }
                                .priority-label { color: ${priorityColor}; font-weight: bold; }
                                .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h1>New Support Ticket</h1>
                                </div>
                                <div class="content">
                                    <h2>Ticket #${safeTicketNumber}</h2>
                                    <div class="ticket-info">
                                        <p><strong>Priority:</strong> <span class="priority-label">${safePriority.toUpperCase()}</span></p>
                                        <p><strong>From:</strong> ${safeName}</p>
                                        <p><strong>Email:</strong> ${safeEmail}</p>
                                        <p><strong>Subject:</strong> ${safeSubject}</p>
                                    </div>
                                    <h3>Message:</h3>
                                    <p style="background-color: #fff; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${safeMessage}</p>
                                    <a href="${APP_URL}/#/admin/support" class="button">View in Support Manager</a>
                                    <p style="margin-top: 30px; font-size: 12px; color: #666;">
                                        This ticket was submitted on ${new Date().toLocaleString()}
                                    </p>
                                </div>
                                <div class="footer">
                                    <p>TFC Media Support System</p>
                                </div>
                            </div>
                        </body>
                    </html>
                `,
            }),
        })

        // Send confirmation email to user
        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'TFC Media Support <noreply@tfcmediagroup.com>',
                to: [email],
                subject: `Support Ticket Received - #${safeTicketNumber}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <style>
                                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                .header { background-color: #1a1a1a; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                                .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                                .ticket-box { background-color: #fff; border: 2px solid #4CAF50; padding: 15px; margin: 20px 0; border-radius: 5px; text-align: center; }
                                .ticket-number { font-size: 24px; font-weight: bold; color: #4CAF50; }
                                .info-box { background-color: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; }
                                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h1>Ticket Received</h1>
                                </div>
                                <div class="content">
                                    <p>Dear ${safeName},</p>
                                    <p>Thank you for contacting TFC Media support. We've received your support request and will respond as soon as possible.</p>
                                    <div class="ticket-box">
                                        <p style="margin: 0; font-size: 14px; color: #666;">Your Ticket Number</p>
                                        <p class="ticket-number">#${safeTicketNumber}</p>
                                    </div>
                                    <h3>Ticket Details:</h3>
                                    <p><strong>Subject:</strong> ${safeSubject}</p>
                                    <p><strong>Priority:</strong> ${safePriority.charAt(0).toUpperCase() + safePriority.slice(1)}</p>
                                    <div class="info-box">
                                        <p><strong>What happens next?</strong></p>
                                        <ul style="margin: 10px 0; padding-left: 20px;">
                                            <li>Our support team will review your ticket</li>
                                            <li>We typically respond within 24 hours</li>
                                            <li>You'll receive an email when we respond</li>
                                        </ul>
                                    </div>
                                    <p style="margin-top: 30px;">Best regards,<br>TFC Media Support Team</p>
                                </div>
                                <div class="footer">
                                    <p>This is an automated message. Please do not reply directly to this email.</p>
                                    <p>TFC Media Group &copy; ${new Date().getFullYear()}</p>
                                </div>
                            </div>
                        </body>
                    </html>
                `,
            }),
        })

        return new Response(
            JSON.stringify({ success: true, message: 'Support emails sent successfully' }),
            { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error sending support emails:', error)
        return new Response(
            JSON.stringify({ error: 'Failed to send support emails' }),
            { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
    }
})
