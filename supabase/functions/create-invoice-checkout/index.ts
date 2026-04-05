// =====================================================
// Invoice Checkout Session - Supabase Edge Function
// =====================================================
// Creates a Stripe Checkout Session for invoice payments.
// Amount is always fetched from the database — never trusted from the client.
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

        // Parse only non-sensitive fields from the client — amount comes from DB
        const { invoiceId, successUrl, cancelUrl } = await req.json()

        if (!invoiceId) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Fetch invoice from DB — source of truth for amount, status, and client info
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        const { data: invoice, error: invoiceError } = await supabaseAdmin
            .from('invoices')
            .select('id, invoice_number, title, amount_due, status, client_email, client_name')
            .eq('id', invoiceId)
            .single()

        if (invoiceError || !invoice) {
            return new Response(
                JSON.stringify({ error: 'Invoice not found' }),
                { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        if (invoice.status === 'fully_paid') {
            return new Response(
                JSON.stringify({ error: 'Invoice is already fully paid' }),
                { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        if (invoice.amount_due <= 0) {
            return new Response(
                JSON.stringify({ error: 'No amount due on this invoice' }),
                { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Create Stripe Checkout Session using DB amount — never client-provided amount
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `Invoice ${invoice.invoice_number}`,
                        description: invoice.title || 'TFC Media Invoice Payment',
                    },
                    unit_amount: Math.round(invoice.amount_due * 100),
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            customer_email: invoice.client_email,
            client_reference_id: invoiceId,
            metadata: {
                invoice_id: invoiceId,
                invoice_number: invoice.invoice_number,
                client_name: invoice.client_name,
                payment_type: 'invoice',
            },
        })

        return new Response(
            JSON.stringify({ sessionId: session.id, url: session.url }),
            { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 200 }
        )
    } catch (error) {
        console.error('Error creating invoice checkout session:', error)
        return new Response(
            JSON.stringify({ error: 'Failed to create checkout session' }),
            { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
