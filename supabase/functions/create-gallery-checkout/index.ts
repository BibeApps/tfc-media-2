// =====================================================
// Gallery Checkout Session - Supabase Edge Function
// =====================================================
// Creates a Stripe Checkout Session for gallery orders
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
            orderId,
            items,
            userEmail,
            successUrl,
            cancelUrl
        } = await req.json()

        // Validate required fields
        if (!orderId || !items || !items.length || !userEmail) {
            throw new Error('Missing required fields')
        }

        console.log('Creating gallery checkout session for order:', orderId)

        // Map items to Stripe line items
        const lineItems = items.map((item: any) => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.title,
                    description: `${item.type} Download`,
                },
                unit_amount: Math.round(item.price * 100), // Convert to cents
            },
            quantity: 1,
        }));

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            customer_email: userEmail,
            client_reference_id: orderId,
            metadata: {
                order_id: orderId,
                payment_type: 'gallery_order',
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
        console.error('Error creating gallery checkout session:', error)
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
