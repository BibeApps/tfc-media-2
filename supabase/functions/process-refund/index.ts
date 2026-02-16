// =====================================================
// Process Refund - Supabase Edge Function
// =====================================================
// This Edge Function processes refunds via Stripe API
// for completed orders.
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

function getCorsHeaders(req: Request) {
    const origin = req.headers.get('Origin') || ''
    const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '*').split(',')
    const isAllowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin)
    return {
        'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: getCorsHeaders(req) })
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

        // Initialize Supabase client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        )

        // Parse request body
        const { orderId, amount, reason } = await req.json()

        // Validate required fields
        if (!orderId || !amount) {
            throw new Error('Missing required fields')
        }

        // Get order from database
        const { data: order, error: orderError } = await supabaseClient
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single()

        if (orderError || !order) {
            throw new Error('Order not found')
        }

        // Check if order has a payment intent
        if (!order.stripe_payment_intent_id) {
            throw new Error('No payment intent found for this order')
        }

        // Create refund in Stripe
        const refund = await stripe.refunds.create({
            payment_intent: order.stripe_payment_intent_id,
            amount: Math.round(amount * 100), // Convert to cents
            reason: 'requested_by_customer',
            metadata: {
                order_id: orderId,
                order_number: order.order_number,
                refund_reason: reason || 'No reason provided',
            },
        })

        // Update order in database
        const { error: updateError } = await supabaseClient
            .from('orders')
            .update({
                status: 'refunded',
                amount_refunded: amount,
                refund_reason: reason,
                refunded_at: new Date().toISOString(),
            })
            .eq('id', orderId)

        if (updateError) {
            throw new Error('Failed to update order: ' + updateError.message)
        }

        return new Response(
            JSON.stringify({
                success: true,
                refundId: refund.id,
                amount: refund.amount / 100,
            }),
            {
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('Error processing refund:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
