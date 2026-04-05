// =====================================================
// Gallery Checkout Session - Supabase Edge Function
// =====================================================
// Creates a Stripe Checkout Session for gallery orders.
// Prices are always fetched from the database — never trusted from the client.
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

function getCorsHeaders(req: Request) {
    const origin = req.headers.get('Origin') || ''
    const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(o => o.trim())
    const isAllowed = allowedOrigins.includes(origin)
    return {
        'Access-Control-Allow-Origin': isAllowed ? origin : (allowedOrigins[0] || ''),
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: getCorsHeaders(req) })
    }

    try {
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
        if (!stripeKey) throw new Error('STRIPE_SECRET_KEY not configured')

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createFetchHttpClient(),
        })

        // Accept only item IDs and order metadata from client — prices come from DB
        const { orderId, itemIds, userEmail, successUrl, cancelUrl } = await req.json()

        if (!orderId || !itemIds || !itemIds.length || !userEmail) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // Fetch gallery item prices from DB — source of truth
        const { data: dbItems, error: itemsError } = await supabaseAdmin
            .from('gallery_items')
            .select('id, title, price, watermarked_url, type')
            .in('id', itemIds)

        if (itemsError || !dbItems || dbItems.length !== itemIds.length) {
            return new Response(
                JSON.stringify({ error: 'One or more items not found' }),
                { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        // Build line items using DB prices only
        const lineItems = dbItems.map((item) => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.title,
                    description: `${item.type || 'Photo'} Download`,
                },
                unit_amount: Math.round(item.price * 100),
            },
            quantity: 1,
        }))

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

        return new Response(
            JSON.stringify({ sessionId: session.id, url: session.url }),
            { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 200 }
        )
    } catch (error) {
        console.error('Error creating gallery checkout session:', error)
        return new Response(
            JSON.stringify({ error: 'Failed to create checkout session' }),
            { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
