import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BookingEmailRequest {
    adminEmail: string
    customerName: string
    customerEmail: string
    customerPhone: string
    serviceType: string
    bookingDate: string
    bookingTime: string
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { adminEmail, customerName, customerEmail, customerPhone, serviceType, bookingDate, bookingTime }: BookingEmailRequest = await req.json()

        // Format date for email
        const formatEmailDate = (dateString: string): string => {
            try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) return dateString;
                return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            } catch {
                return dateString;
            }
        };

        const formattedDate = formatEmailDate(bookingDate);

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'TFC Media <noreply@tfcmediagroup.com>',
                to: [adminEmail],
                subject: 'New Booking Request Received!',
                html: `
          <!DOCTYPE html>
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #00D9FF 0%, #0099FF 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">📅 New Booking Request!</h1>
              </div>
              
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <h2>Customer Information</h2>
                <p><strong>Name:</strong> ${customerName}</p>
                <p><strong>Email:</strong> ${customerEmail}</p>
                <p><strong>Phone:</strong> ${customerPhone || 'Not provided'}</p>
                
                <h2>Booking Details</h2>
                <p><strong>Service:</strong> ${serviceType}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${bookingTime}</p>
                
                <p style="margin-top: 30px;">Please review and confirm this booking in your admin panel.</p>
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
        console.error('Error in send-booking-email:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
