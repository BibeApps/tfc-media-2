// =====================================================
// Invoice Checkout Session - Supabase Edge Function
// =====================================================
// Creates a Stripe Checkout Session for invoice payments
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno'

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
        // Get Stripe secret key from environment
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
        if (!stripeKey) {
            throw new Error('STRIPE_SECRET_KEY not configured')
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createFetchHttpClient(),
        })

        // Parse request body
        const {
            invoiceId,
            invoiceNumber,
            amount,
            clientEmail,
            clientName,
            title,
            successUrl,
            cancelUrl
        } = await req.json()

        // Validate required fields
        if (!invoiceId || !invoiceNumber || !amount || !clientEmail) {
            throw new Error('Missing required fields')
        }

        console.log('Creating checkout session for invoice:', invoiceNumber)

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `Invoice ${invoiceNumber}`,
                        description: title || 'TFC Media Invoice Payment',
                    },
                    unit_amount: Math.round(amount * 100), // Convert to cents
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            customer_email: clientEmail,
            client_reference_id: invoiceId,
            metadata: {
                invoice_id: invoiceId,
                invoice_number: invoiceNumber,
                client_name: clientName,
                payment_type: 'invoice',
            },
        })

        console.log('Checkout session created:', session.id)

        return new Response(
            JSON.stringify({
                sessionId: session.id,
                url: session.url
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('Error creating invoice checkout session:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
