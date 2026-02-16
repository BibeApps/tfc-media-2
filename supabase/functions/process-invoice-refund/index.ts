// =====================================================
// Process Invoice Refund - Supabase Edge Function
// =====================================================
// Processes a refund for an invoice payment via Stripe
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
        // Verify the caller is an authenticated admin
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get Stripe secret key from environment
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
        if (!stripeKey) {
            throw new Error('STRIPE_SECRET_KEY not configured')
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createFetchHttpClient(),
        })

        // Create Supabase client
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

        // Verify caller's JWT and check admin role
        const callerClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )
        const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser()
        if (callerError || !caller) {
            return new Response(
                JSON.stringify({ success: false, error: 'Invalid or expired token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }
        const { data: callerProfile } = await supabaseAdmin
            .from('profiles').select('role').eq('id', caller.id).single()
        if (!callerProfile || callerProfile.role !== 'admin') {
            return new Response(
                JSON.stringify({ success: false, error: 'Admin access required' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Parse request body
        const { invoiceId, amount, reason } = await req.json()
        console.log('Processing refund for invoice:', invoiceId, 'Amount:', amount)

        // Validate required fields
        if (!invoiceId || !amount) {
            throw new Error('Missing required fields: invoiceId and amount')
        }

        // Get invoice and payment details
        console.log('Fetching invoice details...')
        const { data: invoice, error: invoiceError } = await supabaseAdmin
            .from('invoices')
            .select('*, payments:invoice_payments(*)')
            .eq('id', invoiceId)
            .single()

        if (invoiceError) {
            console.error('Error fetching invoice:', invoiceError)
            throw new Error(`Error fetching invoice: ${invoiceError.message}`)
        }

        if (!invoice) {
            throw new Error(`Invoice not found: ${invoiceId}`)
        }

        console.log('Invoice found:', invoice.invoice_number, 'Total Paid:', invoice.amount_paid)

        // Find the most recent payment with a Stripe payment intent
        const stripePayment = invoice.payments
            ?.filter((p: any) => p.stripe_payment_intent_id && !p.notes?.includes('Refund'))
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

        if (!stripePayment) {
            console.error('No Stripe payment found in payments:', invoice.payments)
            throw new Error('No valid Stripe payment found for this invoice to refund')
        }

        console.log('Found payment intent to refund:', stripePayment.stripe_payment_intent_id)

        // Create refund in Stripe
        let refund;
        try {
            refund = await stripe.refunds.create({
                payment_intent: stripePayment.stripe_payment_intent_id,
                amount: Math.round(amount * 100), // Convert to cents
                reason: 'requested_by_customer', // Default reason enum for Stripe
                metadata: {
                    invoice_id: invoiceId,
                    invoice_number: invoice.invoice_number,
                    customer_reason: reason || ''
                }
            })
            console.log('Stripe refund created:', refund.id)
        } catch (stripeError) {
            console.error('Stripe refund error:', stripeError)
            throw new Error(`Stripe refund failed: ${stripeError.message}`)
        }

        // Record refund in database
        const { error: refundError } = await supabaseAdmin
            .from('invoice_payments')
            .insert({
                invoice_id: invoiceId,
                amount: -amount, // Negative amount for refund
                payment_method: 'stripe_refund',
                stripe_payment_intent_id: refund.id,
                notes: reason ? `Refund: ${reason}` : 'Refund processed'
            })

        if (refundError) {
            console.error('Error recording refund to DB:', refundError)
            // Continue since Stripe refund was successful, but log critical error
        }

        // Update invoice amounts
        const newAmountPaid = Math.max(0, invoice.amount_paid - amount)
        const newAmountDue = invoice.total_amount - newAmountPaid

        let newStatus = invoice.status
        if (newAmountPaid <= 0) {
            newStatus = 'refunded'
        } else if (newAmountPaid < invoice.total_amount) {
            newStatus = 'partial_paid'
        }

        console.log('Updating invoice status to:', newStatus)

        const { error: updateError } = await supabaseAdmin
            .from('invoices')
            .update({
                amount_paid: newAmountPaid,
                amount_due: newAmountDue,
                status: newStatus,
                paid_at: newAmountPaid <= 0 ? null : invoice.paid_at
            })
            .eq('id', invoiceId)

        if (updateError) {
            console.error('Error updating invoice:', updateError)
        }

        // =====================================================
        // SEND REFUND EMAIL
        // =====================================================
        try {
            const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
            if (RESEND_API_KEY && invoice.client_email) {
                console.log('Sending refund email to:', invoice.client_email)

                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                    },
                    body: JSON.stringify({
                        from: 'TFC Media <noreply@tfcmediagroup.com>',
                        to: [invoice.client_email],
                        subject: `Refund Processed - Invoice ${invoice.invoice_number}`,
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                                <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                                    <h2 style="color: #ef4444; margin: 0;">Refund Processed</h2>
                                </div>
                                <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 0 0 8px 8px;">
                                    <p>Hi ${invoice.client_name},</p>
                                    <p>A refund of <strong>$${amount.toFixed(2)}</strong> has been processed for invoice <strong>${invoice.invoice_number}</strong>.</p>
                                    <p>This typically takes 5-10 business days to appear on your statement.</p>
                                    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                                        <p style="margin: 0; color: #991b1b;">Reason: ${reason || 'Requested by customer'}</p>
                                    </div>
                                    <p>If you have any questions, please reply to this email.</p>
                                    <br/>
                                    <p>Best regards,</p>
                                    <p><strong>The TFC Media Team</strong></p>
                                </div>
                            </div>
                        `
                    })
                })
                console.log('Refund email sent')
            }
        } catch (emailErr) {
            console.error('Failed to send refund email:', emailErr)
        }

        // =====================================================
        // UPDATE LINKED PROJECT STATUS
        // =====================================================
        if (invoice.project_id) {
            console.log('Updating linked project:', invoice.project_id)

            // If invoice is fully refunded, cancel the project
            if (newStatus === 'refunded') {
                const { error: projectError } = await supabaseAdmin
                    .from('portal_projects')
                    .update({
                        status: 'cancelled',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', invoice.project_id)

                if (projectError) {
                    console.error('Error updating project status:', projectError)
                } else {
                    console.log('Linked project marked as cancelled')
                }
            }
        }

        console.log('✅ Refund processed successfully')

        return new Response(
            JSON.stringify({
                success: true,
                refund_id: refund.id,
                amount: amount,
                new_status: newStatus
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('Refund Process Error:', error)
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
