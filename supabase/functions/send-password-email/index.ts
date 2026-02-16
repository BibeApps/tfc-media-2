import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    const { email, name, tempPassword, isReset } = await req.json()

    // Get Resend API key from environment
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured')
    }

    // Determine email subject and content based on context
    const subject = isReset
      ? 'Your TFC Media Password Has Been Reset'
      : 'Your TFC Media Account - Temporary Password'

    const headerTitle = isReset ? 'Password Reset' : 'Welcome to TFC Media'
    const introText = isReset
      ? 'Your password has been reset by an administrator. Below is your new temporary password.'
      : 'Your account has been created by an administrator. Below is your temporary password to access your account.'

    // Send email using Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'TFC Media <noreply@tfcmediagroup.com>',
        to: [email],
        subject: subject,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #1a1a1a; color: white; padding: 20px; text-align: center; }
                .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
                .password-box { background-color: #fff; border: 2px solid #4CAF50; padding: 15px; margin: 20px 0; border-radius: 5px; text-align: center; }
                .password { font-size: 24px; font-weight: bold; color: #4CAF50; letter-spacing: 2px; }
                .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>${headerTitle}</h1>
                </div>
                <div class="content">
                  <p>Dear ${name},</p>
                  
                  <p>${introText}</p>
                  
                  <div class="password-box">
                    <p style="margin: 0; font-size: 14px; color: #666;">Temporary Password</p>
                    <p class="password">${tempPassword}</p>
                  </div>
                  
                  <div class="warning">
                    <strong>⚠️ IMPORTANT:</strong> For security reasons, please change this password immediately after logging in.
                  </div>
                  
                  <p><strong>Next Steps:</strong></p>
                  <ol>
                    ${isReset ? '' : '<li>Check your email for a confirmation link from Supabase</li><li>Click the confirmation link to verify your email</li>'}
                    <li>Visit the login page and use your email and temporary password above</li>
                    <li>You'll be prompted to create a new password</li>
                  </ol>
                  
                  <a href="${Deno.env.get('APP_URL') || 'http://localhost:3001'}/#/login" class="button">Go to Login</a>
                  
                  <p style="margin-top: 30px;">If you have any questions, please contact your administrator.</p>
                  
                  <p>Best regards,<br>TFC Media Team</p>
                </div>
                <div class="footer">
                  <p>This is an automated message. Please do not reply to this email.</p>
                </div>
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

    console.log('Email sent successfully:', data)

    return new Response(
      JSON.stringify({ success: true, messageId: data.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
