// =====================================================
// Stripe Checkout Session - Supabase Edge Function
// =====================================================
// Creates a Stripe Checkout Session for gallery item purchases.
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

        // Accept only order ID from client — items and prices come from DB
        const { orderId, orderNumber, successUrl, cancelUrl } = await req.json()

        if (!orderId || !orderNumber) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // Fetch the order and its items JSONB from DB
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .select('id, items')
            .eq('id', orderId)
            .single()

        if (orderError || !order) {
            return new Response(
                JSON.stringify({ error: 'Order not found' }),
                { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        // Extract gallery item IDs from order items JSONB
        const orderItems: any[] = order.items || []
        const itemIds = orderItems.map((item: any) => item.id).filter(Boolean)

        if (itemIds.length === 0) {
            return new Response(
                JSON.stringify({ error: 'No valid items found in order' }),
                { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Fetch current prices from gallery_items — source of truth for pricing
        const { data: galleryItems, error: galleryError } = await supabaseAdmin
            .from('gallery_items')
            .select('id, title, price, watermarked_url')
            .in('id', itemIds)

        if (galleryError) throw galleryError

        const itemPriceMap = new Map((galleryItems || []).map(gi => [gi.id, gi]))

        // Build Stripe line items using DB prices only
        const lineItems = orderItems.map((item: any) => {
            const dbItem = itemPriceMap.get(item.id)
            return {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: dbItem?.title || item.title || 'Gallery Item',
                        description: '',
                        images: dbItem?.watermarked_url ? [dbItem.watermarked_url] : [],
                    },
                    unit_amount: Math.round((dbItem?.price || 0) * 100),
                },
                quantity: 1,
            }
        })

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            client_reference_id: orderId,
            metadata: {
                order_id: orderId,
                order_number: orderNumber,
            },
        })

        return new Response(
            JSON.stringify({ sessionId: session.id, url: session.url }),
            { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 200 }
        )
    } catch (error) {
        console.error('Error creating checkout session:', error)
        return new Response(
            JSON.stringify({ error: 'Failed to create checkout session' }),
            { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
