// Edge Function to send support ticket status update emails to clients
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

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

// Status colors are hardcoded — never from user input
const STATUS_MAP: Record<string, { label: string; color: string; emoji: string }> = {
    'new':         { label: 'New',         color: '#3B82F6', emoji: '' },
    'in-progress': { label: 'In Progress', color: '#F59E0B', emoji: '' },
    'resolved':    { label: 'Resolved',    color: '#10B981', emoji: '' },
    'closed':      { label: 'Closed',      color: '#6B7280', emoji: '' },
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: getCorsHeaders(req) })
    }

    try {
        const { ticketNumber, name, email, subject, status, adminResponse } = await req.json()

        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
        if (!RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY not configured')
        }

        // HTML-escape all user-supplied fields
        const safeName = escapeHtml(name || '')
        const safeSubject = escapeHtml(subject || '')
        const safeTicketNumber = escapeHtml(String(ticketNumber || ''))
        const safeAdminResponse = adminResponse ? escapeHtml(adminResponse) : ''

        // Status info uses hardcoded map — color never comes from user input
        const statusInfo = STATUS_MAP[status] || { label: escapeHtml(String(status)), color: '#6B7280', emoji: '' }

        const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'TFC Media Support <noreply@tfcmediagroup.com>',
                to: [email],
                subject: `Support Ticket Update - #${safeTicketNumber}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <style>
                                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                .header { background-color: #1a1a1a; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                                .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                                .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; color: white; background-color: ${statusInfo.color}; margin: 20px 0; }
                                .ticket-box { background-color: #fff; border-left: 4px solid ${statusInfo.color}; padding: 15px; margin: 20px 0; }
                                .response-box { background-color: #e8f5e9; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0; }
                                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h1>Ticket Status Update</h1>
                                </div>
                                <div class="content">
                                    <p>Dear ${safeName},</p>
                                    <p>Your support ticket has been updated:</p>
                                    <div class="ticket-box">
                                        <p><strong>Ticket Number:</strong> #${safeTicketNumber}</p>
                                        <p><strong>Subject:</strong> ${safeSubject}</p>
                                        <p><strong>New Status:</strong> <span class="status-badge">${statusInfo.label}</span></p>
                                    </div>
                                    ${safeAdminResponse ? `
                                        <h3>Response from Support Team:</h3>
                                        <div class="response-box">
                                            <p style="white-space: pre-wrap; margin: 0;">${safeAdminResponse}</p>
                                        </div>
                                    ` : ''}
                                    ${status === 'resolved' ? `
                                        <p style="margin-top: 30px;">
                                            <strong>Your issue has been resolved!</strong><br>
                                            If you have any further questions or if the issue persists, please don't hesitate to create a new support ticket.
                                        </p>
                                    ` : status === 'in-progress' ? `
                                        <p style="margin-top: 30px;">
                                            Our support team is actively working on your request. We'll keep you updated on the progress.
                                        </p>
                                    ` : ''}
                                    <p style="margin-top: 30px;">
                                        Best regards,<br>
                                        TFC Media Support Team
                                    </p>
                                </div>
                                <div class="footer">
                                    <p>This is an automated notification. Please do not reply directly to this email.</p>
                                    <p>TFC Media Group &copy; ${new Date().getFullYear()}</p>
                                </div>
                            </div>
                        </body>
                    </html>
                `,
            }),
        })

        const result = await emailResponse.json()

        return new Response(
            JSON.stringify({ success: true, message: 'Status update email sent successfully', result }),
            { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error sending status update email:', error)
        return new Response(
            JSON.stringify({ error: 'Failed to send status update email' }),
            { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
    }
})
