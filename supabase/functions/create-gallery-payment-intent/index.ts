// =====================================================
// Gallery Payment Intent - Supabase Edge Function
// =====================================================
// Creates a Stripe Payment Intent for embedded gallery checkout
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

        // Create Supabase admin client for validation
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

        // Parse request body
        const {
            orderId,
            amount,
            userEmail
        } = await req.json()

        // Validate required fields
        if (!orderId || !amount || !userEmail) {
            throw new Error('Missing required fields')
        }

        // SERVER-SIDE VALIDATION: Verify the amount matches the order total
        const { data: orderData, error: orderError } = await supabaseAdmin
            .from('orders')
            .select('total_amount, status')
            .eq('id', orderId)
            .single()

        if (orderError || !orderData) {
            throw new Error('Order not found')
        }

        if (orderData.status !== 'pending') {
            throw new Error('Order has already been processed')
        }

        // Verify amounts match (allow 1 cent difference for rounding)
        const amountDifference = Math.abs(orderData.total_amount - amount)
        if (amountDifference > 0.01) {
            console.error('Amount mismatch:', {
                clientAmount: amount,
                serverAmount: orderData.total_amount,
                difference: amountDifference
            })
            throw new Error('Payment amount does not match order total')
        }

        console.log('Creating payment intent for order:', orderId, 'Amount:', amount)

        // Create Stripe PaymentIntent with CARD ONLY (includes Apple/Google Pay)
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: 'usd',
            receipt_email: userEmail,
            payment_method_types: ['card'], // Restricts to card payments (includes Apple/Google Pay wallets)
            metadata: {
                order_id: orderId,
                payment_type: 'gallery_order',
                user_email: userEmail,
            },
        })

        console.log('Payment intent created:', paymentIntent.id)

        return new Response(
            JSON.stringify({
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('Error creating payment intent:', error)
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
