import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProjectUpdateEmailRequest {
    clientName: string
    clientEmail: string
    projectName: string
    updates: {
        status?: { old: string; new: string }
        progress?: { old: number; new: number }
        currentStep?: { old: string; new: string }
    }
    portalUrl: string
}

const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { clientName, clientEmail, projectName, updates, portalUrl }: ProjectUpdateEmailRequest = await req.json()

        // Build update summary
        const updateItems: string[] = []

        if (updates.status) {
            updateItems.push(`
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <strong style="color: #6b7280;">Status:</strong>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #ef4444; text-decoration: line-through;">${formatStatus(updates.status.old)}</span>
            <span style="color: #10b981; margin-left: 10px;">→ ${formatStatus(updates.status.new)}</span>
          </td>
        </tr>
      `)
        }

        if (updates.progress) {
            updateItems.push(`
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <strong style="color: #6b7280;">Progress:</strong>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #ef4444; text-decoration: line-through;">${updates.progress.old}%</span>
            <span style="color: #10b981; margin-left: 10px;">→ ${updates.progress.new}%</span>
          </td>
        </tr>
      `)
        }

        if (updates.currentStep) {
            updateItems.push(`
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <strong style="color: #6b7280;">Current Step:</strong>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #ef4444; text-decoration: line-through;">${updates.currentStep.old}</span>
            <span style="color: #10b981; margin-left: 10px;">→ ${updates.currentStep.new}</span>
          </td>
        </tr>
      `)
        }

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'TFC Media <noreply@tfcmediagroup.com>',
                to: [clientEmail],
                subject: `Project Update: "${projectName}"`,
                html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Project Update</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #00D9FF 0%, #0099FF 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">📢 Project Update</h1>
              </div>
              
              <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; margin-bottom: 20px;">Hi ${clientName},</p>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                  We have an update on your project <strong>"${projectName}"</strong>!
                </p>
                
                <div style="background: #f0f9ff; border-left: 4px solid #00D9FF; padding: 20px; margin: 30px 0; border-radius: 4px;">
                  <h2 style="margin-top: 0; color: #111827; font-size: 18px; margin-bottom: 15px;">What's Changed</h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    ${updateItems.join('')}
                  </table>
                </div>
                
                ${updates.status?.new === 'completed' ? `
                  <div style="background: #d1fae5; border: 1px solid #10b981; padding: 20px; border-radius: 6px; margin: 30px 0; text-align: center;">
                    <p style="margin: 0; color: #065f46; font-size: 18px; font-weight: bold;">
                      🎉 Congratulations! Your project is complete!
                    </p>
                  </div>
                ` : ''}
                
                ${updates.status?.new === 'uploaded' ? `
                  <div style="background: #e0e7ff; border: 1px solid #6366f1; padding: 20px; border-radius: 6px; margin: 30px 0; text-align: center;">
                    <p style="margin: 0; color: #3730a3; font-size: 18px; font-weight: bold;">
                      📦 Your deliverables are ready!
                    </p>
                    <p style="margin: 10px 0 0 0; color: #4338ca; font-size: 14px;">
                      Check your portal to download your files.
                    </p>
                  </div>
                ` : ''}
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                  You can view the full project details and track progress in your client portal.
                </p>
                
                <div style="text-align: center; margin: 40px 0;">
                  <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #00D9FF 0%, #0099FF 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 217, 255, 0.3);">
                    View Project Details
                  </a>
                </div>
                
                <p style="font-size: 16px; margin-bottom: 10px;">
                  If you have any questions, please don't hesitate to reach out.
                </p>
                
                <p style="font-size: 16px; margin-bottom: 30px;">
                  Thank you for choosing TFC Media!
                </p>
                
                <p style="font-size: 16px; margin-bottom: 5px;">Best regards,</p>
                <p style="font-size: 16px; margin: 0; font-weight: 600; color: #00D9FF;">The TFC Media Team</p>
              </div>
              
              <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
                <p style="margin: 5px 0;">© ${new Date().getFullYear()} TFC Media Group. All rights reserved.</p>
                <p style="margin: 5px 0;">This is an automated project update notification.</p>
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
        console.error('Error in send-project-update-email function:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
