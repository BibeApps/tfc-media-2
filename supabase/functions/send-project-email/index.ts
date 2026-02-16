import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProjectEmailRequest {
    clientName: string
    clientEmail: string
    projectName: string
    serviceType: string
    eventDate: string
    portalUrl: string
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { clientName, clientEmail, projectName, serviceType, eventDate, portalUrl }: ProjectEmailRequest = await req.json()

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'TFC Media <noreply@tfcmediagroup.com>',
                to: [clientEmail],
                subject: `Your Project "${projectName}" Has Been Added`,
                html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Project Added</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #00D9FF 0%, #0099FF 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Project Added!</h1>
              </div>
              
              <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; margin-bottom: 20px;">Hi ${clientName},</p>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                  Great news! Your project <strong>"${projectName}"</strong> has been added to our system and we're excited to get started!
                </p>
                
                <div style="background: #f9fafb; border-left: 4px solid #00D9FF; padding: 20px; margin: 30px 0; border-radius: 4px;">
                  <h2 style="margin-top: 0; color: #111827; font-size: 18px;">Project Details</h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Project Name:</td>
                      <td style="padding: 8px 0; color: #111827;">${projectName}</td>
                    </tr>
                    ${serviceType ? `
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Service Type:</td>
                      <td style="padding: 8px 0; color: #111827;">${serviceType}</td>
                    </tr>
                    ` : ''}
                    ${eventDate ? `
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Event Date:</td>
                      <td style="padding: 8px 0; color: #111827;">${new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                  You can track your project's progress in real-time through your personalized client portal. We'll send you periodic updates as your project moves through each stage, from planning to completion.
                </p>
                
                <div style="text-align: center; margin: 40px 0;">
                  <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #00D9FF 0%, #0099FF 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 217, 255, 0.3);">
                    View Your Project
                  </a>
                </div>
                
                <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 6px; margin: 30px 0;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>📧 Stay Updated:</strong> You'll receive email notifications when your project status changes or when new deliverables are ready.
                  </p>
                </div>
                
                <p style="font-size: 16px; margin-bottom: 10px;">
                  If you have any questions or concerns, please don't hesitate to reach out to us.
                </p>
                
                <p style="font-size: 16px; margin-bottom: 30px;">
                  We're looking forward to creating something amazing for you!
                </p>
                
                <p style="font-size: 16px; margin-bottom: 5px;">Best regards,</p>
                <p style="font-size: 16px; margin: 0; font-weight: 600; color: #00D9FF;">The TFC Media Team</p>
              </div>
              
              <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
                <p style="margin: 5px 0;">© ${new Date().getFullYear()} TFC Media Group. All rights reserved.</p>
                <p style="margin: 5px 0;">This is an automated notification from your project management system.</p>
              </div>
            </body>
          </html>
        `,
            }),
        })

        const data = await res.json()

        if (!res.ok) {
            console.error('Resend API error:', data)
            throw new Error(data.message || 'Failed to send email')
        }

        return new Response(JSON.stringify({ success: true, data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('Error in send-project-email function:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
