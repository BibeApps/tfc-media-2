// Edge Function to reset user password (admin-initiated)
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate a secure random password
function generateSecurePassword(length = 12): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const symbols = '!@#$%^&*'
    const allChars = uppercase + lowercase + numbers + symbols

    let password = ''
    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += symbols[Math.floor(Math.random() * symbols.length)]

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)]
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('')
}

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get the user ID from the request body
        const { userId } = await req.json()

        if (!userId) {
            return new Response(
                JSON.stringify({ error: 'User ID is required' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
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

        // Get user details from profiles table
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('email, name, role')
            .eq('id', userId)
            .single()

        if (profileError || !profile) {
            return new Response(
                JSON.stringify({ error: 'User not found' }),
                {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Generate a secure temporary password
        const tempPassword = generateSecurePassword(12)

        // Update the user's password in Supabase Auth
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: tempPassword }
        )

        if (updateError) {
            console.error('Error updating password:', updateError)
            return new Response(
                JSON.stringify({ error: updateError.message }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Send email to user with temporary password using Resend API directly
        try {
            console.log('Attempting to send password reset email to:', profile.email)

            const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
            if (!RESEND_API_KEY) {
                console.error('RESEND_API_KEY not configured')
            } else {
                const emailResponse = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                    },
                    body: JSON.stringify({
                        from: 'TFC Media <noreply@tfcmediagroup.com>',
                        to: [profile.email],
                        subject: 'Your TFC Media Password Has Been Reset',
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
                                            <h1>Password Reset</h1>
                                        </div>
                                        <div class="content">
                                            <p>Dear ${profile.name},</p>
                                            
                                            <p>Your password has been reset by an administrator. Below is your new temporary password.</p>
                                            
                                            <div class="password-box">
                                                <p style="margin: 0; font-size: 14px; color: #666;">Temporary Password</p>
                                                <p class="password">${tempPassword}</p>
                                            </div>
                                            
                                            <div class="warning">
                                                <strong>⚠️ IMPORTANT:</strong> For security reasons, please change this password immediately after logging in.
                                            </div>
                                            
                                            <p><strong>Next Steps:</strong></p>
                                            <ol>
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

                const emailResult = await emailResponse.json()

                if (!emailResponse.ok) {
                    console.error('Failed to send password email via Resend:', emailResult)
                    console.warn('Password was updated but email failed to send')
                } else {
                    console.log('Password reset email sent successfully via Resend:', emailResult)
                }
            }
        } catch (emailError) {
            console.error('Email sending error:', emailError)
            // Don't fail the request if email fails
        }

        // Log the password reset action
        await supabaseAdmin
            .from('audit_logs')
            .insert({
                action: 'password_reset',
                user_id: userId,
                details: {
                    reset_by: 'admin',
                    user_email: profile.email,
                    user_role: profile.role
                }
            })
            .then(({ error }) => {
                if (error) console.warn('Failed to log audit:', error)
            })

        return new Response(
            JSON.stringify({
                success: true,
                tempPassword: tempPassword,
                message: 'Password reset successfully. Email sent to user.'
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        console.error('Unexpected error:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})

/* To invoke locally:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/reset-user-password' \
    --header 'Authorization: Bearer YOUR_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"userId":"user-uuid-here"}'

*/
