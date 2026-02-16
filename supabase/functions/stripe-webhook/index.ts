// =====================================================
// Stripe Webhook Handler - Gallery Orders & Invoices
// =====================================================
// Handles Stripe webhook events for:
// 1. Gallery purchases (orders)
// 2. Invoice payments (auto-onboarding)
// 3. Refunds for both
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

// Helper function to generate temporary password
function generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let password = 'TFC-2026-'
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get Stripe webhook secret
        const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
        if (!webhookSecret) {
            throw new Error('STRIPE_WEBHOOK_SECRET not configured')
        }

        // Get Stripe secret key
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
        if (!stripeKey) {
            throw new Error('STRIPE_SECRET_KEY not configured')
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createFetchHttpClient(),
        })

        // Verify webhook signature
        const signature = req.headers.get('stripe-signature')
        if (!signature) {
            throw new Error('No stripe-signature header')
        }

        const body = await req.text()
        const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)

        console.log('Received Stripe event:', event.type)

        // Create Supabase admin client
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

        // Handle different event types
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session

            // Determine if this is a gallery order or invoice payment
            if (session.metadata?.payment_type === 'invoice') {
                // INVOICE PAYMENT FLOW
                return await handleInvoicePayment(session, supabaseAdmin)
            } else if (session.metadata?.order_id) {
                // GALLERY ORDER FLOW
                return await handleGalleryOrder(session, supabaseAdmin)
            } else {
                console.log('Unknown payment type, skipping')
                return new Response(JSON.stringify({ received: true }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                })
            }
        } else if (event.type === 'charge.refunded') {
            // REFUND FLOW
            const charge = event.data.object as Stripe.Charge
            return await handleRefund(charge, supabaseAdmin)
        } else {
            // Other event types
            return new Response(JSON.stringify({ received: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

    } catch (error) {
        console.error('Webhook error:', error)
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

// =====================================================
// GALLERY ORDER HANDLER
// =====================================================
async function handleGalleryOrder(session: Stripe.Checkout.Session, supabaseAdmin: any) {
    console.log('Processing gallery order:', session.metadata?.order_number)

    const orderId = session.metadata?.order_id
    if (!orderId) {
        throw new Error('No order_id in metadata')
    }

    // Update order status to completed
    const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
            status: 'completed',
            stripe_payment_intent_id: session.payment_intent,
            paid_at: new Date().toISOString(),
        })
        .eq('id', orderId)

    if (updateError) {
        console.error('Error updating order:', updateError)
        throw new Error(`Failed to update order: ${updateError.message}`)
    }

    console.log('✅ Gallery order completed:', session.metadata?.order_number)

    return new Response(
        JSON.stringify({
            success: true,
            order_id: orderId,
            order_number: session.metadata?.order_number,
        }),
        {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        }
    )
}

// =====================================================
// INVOICE PAYMENT HANDLER
// =====================================================
async function handleInvoicePayment(session: Stripe.Checkout.Session, supabaseAdmin: any) {
    console.log('Processing invoice payment for:', session.metadata?.invoice_number)

    // Get invoice details
    const invoiceId = session.metadata?.invoice_id
    console.log('Looking up invoice with ID:', invoiceId)
    console.log('Invoice ID type:', typeof invoiceId)

    const { data: invoice, error: invoiceError } = await supabaseAdmin
        .from('invoices')
        .select(`
            *,
            service_type:service_types(name, description),
            session:sessions!invoices_session_id_fkey(date, thumbnail)
        `)
        .eq('id', invoiceId)
        .single()

    if (invoiceError) {
        console.error('Invoice lookup error:', invoiceError)
        console.error('Error details:', JSON.stringify(invoiceError))
    }

    if (invoiceError || !invoice) {
        throw new Error(`Invoice not found: ${invoiceId}. Error: ${JSON.stringify(invoiceError)}`)
    }

    console.log('Found invoice:', invoice.invoice_number)

    // =====================================================
    // STEP 1: Ensure User Exists
    // =====================================================

    let clientId: string | null = invoice.client_id

    if (!clientId) {
        console.log('Checking if user exists:', invoice.client_email)

        // Check if user already exists (by email only, any role)
        const { data: existingUser, error: userLookupError } = await supabaseAdmin
            .from('profiles')
            .select('id, role')
            .eq('email', invoice.client_email)
            .maybeSingle()

        if (userLookupError) {
            console.error('Error looking up user:', userLookupError)
        }

        if (existingUser) {
            console.log('User already exists:', existingUser.id, 'with role:', existingUser.role)
            clientId = existingUser.id
        } else {
            console.log('Creating new user for:', invoice.client_email)

            // Generate temp password
            const tempPassword = generateTempPassword()

            // Create user via Edge Function
            const { data: newUserData, error: userError } = await supabaseAdmin.functions.invoke('create-admin-user', {
                body: {
                    email: invoice.client_email,
                    password: tempPassword,
                    name: invoice.client_name,
                    role: 'client',
                }
            })

            if (userError || !newUserData?.user) {
                console.error('Error creating user:', userError)
                throw new Error('Failed to create user')
            }

            clientId = newUserData.user.id
            console.log('Created new user:', clientId)

            // Send welcome email with temp password
            try {
                await supabaseAdmin.functions.invoke('send-password-email', {
                    body: {
                        email: invoice.client_email,
                        name: invoice.client_name,
                        tempPassword: tempPassword,
                        isReset: false
                    }
                })
                console.log('Sent welcome email to:', invoice.client_email)
            } catch (emailErr) {
                console.error('Failed to send welcome email:', emailErr)
                // Don't fail the whole process if email fails
            }
        }

        // Link invoice to client
        console.log('Linking invoice to client:', clientId)
        const { error: linkError } = await supabaseAdmin
            .from('invoices')
            .update({ client_id: clientId })
            .eq('id', invoiceId)

        if (linkError) {
            console.error('Error linking invoice to client:', linkError)
        } else {
            console.log('Successfully linked invoice to client')
        }
    }

    // =====================================================
    // STEP 2: Ensure Project Exists
    // =====================================================

    let projectId: string | null = invoice.project_id

    if (!projectId && clientId) {
        console.log('Creating project for invoice:', invoice.invoice_number)

        // Create project
        const { data: newProject, error: projectError } = await supabaseAdmin
            .from('portal_projects')
            .insert({
                client_id: clientId,
                name: invoice.title,
                client_name: invoice.client_name,
                client_email: invoice.client_email,
                service_type: invoice.service_type?.name || '',
                event_date: invoice.session?.date || null,
                status: 'not_started',
                progress: 0,
                current_step: 'Planning',
                total_steps: 10,
                manager: 'Admin',
                transaction_id: invoice.invoice_number,
                cover_image: invoice.session?.thumbnail || ''
            })
            .select()
            .single()

        if (projectError) {
            console.error('Error creating project:', projectError)
            console.error('Project error details:', JSON.stringify(projectError))
        } else if (newProject) {
            projectId = newProject.id
            console.log('Created project:', projectId)

            // Link invoice to project
            console.log('Linking invoice to project:', projectId)
            const { error: projectLinkError } = await supabaseAdmin
                .from('invoices')
                .update({ project_id: projectId })
                .eq('id', invoiceId)

            if (projectLinkError) {
                console.error('Error linking invoice to project:', projectLinkError)
            } else {
                console.log('Successfully linked invoice to project')
            }

            // Send project created email
            try {
                const portalUrl = `${Deno.env.get('APP_URL') || 'http://localhost:3000'}/#/portal`
                await supabaseAdmin.functions.invoke('send-project-email', {
                    body: {
                        clientName: invoice.client_name,
                        clientEmail: invoice.client_email,
                        projectName: invoice.title,
                        serviceType: invoice.service_type?.name || '',
                        eventDate: invoice.session?.date || '',
                        portalUrl: portalUrl
                    }
                })
                console.log('Sent project email to:', invoice.client_email)
            } catch (emailErr) {
                console.error('Failed to send project email:', emailErr)
            }
        }
    } else if (!clientId) {
        console.log('Skipping project creation - no client_id available')
    } else {
        console.log('Project already exists for this invoice')
    }

    // =====================================================
    // STEP 3: Record Payment
    // =====================================================

    const paymentAmount = (session.amount_total ?? 0) / 100 // Convert from cents

    console.log('Recording payment:', paymentAmount)

    // Insert payment record
    const { data: newPayment, error: paymentError } = await supabaseAdmin
        .from('invoice_payments')
        .insert({
            invoice_id: invoiceId,
            amount: paymentAmount,
            payment_method: 'stripe',
            stripe_payment_intent_id: session.payment_intent as string,
            notes: `Stripe Checkout: ${session.id}`
        })
        .select()
        .single()

    if (paymentError) {
        throw new Error(`Failed to record payment: ${paymentError.message}`)
    }

    console.log('Payment recorded:', newPayment.id)

    // =====================================================
    // STEP 4: Update Invoice Status
    // =====================================================

    const newAmountPaid = invoice.amount_paid + paymentAmount
    const newAmountDue = invoice.total_amount - newAmountPaid
    const newStatus = newAmountDue <= 0 ? 'fully_paid' : 'partial_paid'

    const { error: updateError } = await supabaseAdmin
        .from('invoices')
        .update({
            amount_paid: newAmountPaid,
            amount_due: newAmountDue,
            status: newStatus,
            paid_at: newStatus === 'fully_paid' ? new Date().toISOString() : null
        })
        .eq('id', invoiceId)

    if (updateError) {
        throw new Error(`Failed to update invoice: ${updateError.message}`)
    }

    console.log('Invoice updated to status:', newStatus)

    // =====================================================
    // STEP 5: Send Payment Confirmation Email
    // =====================================================

    try {
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

        if (RESEND_API_KEY) {
            const isFullyPaid = newStatus === 'fully_paid'
            const emailHtml = buildPaymentConfirmationEmail({
                invoiceNumber: invoice.invoice_number,
                clientName: invoice.client_name,
                title: invoice.title,
                paymentAmount: paymentAmount,
                totalAmount: invoice.total_amount,
                amountPaid: newAmountPaid,
                remainingBalance: newAmountDue,
                paymentMethod: 'Card',
                paymentDate: new Date().toISOString(),
                isFullyPaid: isFullyPaid
            })

            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                    from: 'TFC Media <noreply@tfcmediagroup.com>',
                    to: [invoice.client_email],
                    subject: isFullyPaid
                        ? `Payment Received - Invoice ${invoice.invoice_number} Fully Paid!`
                        : `Payment Received - Invoice ${invoice.invoice_number}`,
                    html: emailHtml
                })
            })

            console.log('Sent payment confirmation email to:', invoice.client_email)
        }
    } catch (emailErr) {
        console.error('Failed to send payment confirmation email:', emailErr)
    }

    console.log('✅ Invoice payment processed successfully!')

    return new Response(
        JSON.stringify({
            success: true,
            invoice_number: invoice.invoice_number,
            client_id: clientId,
            project_id: projectId,
            payment_amount: paymentAmount,
            new_status: newStatus
        }),
        {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        }
    )
}

// =====================================================
// REFUND HANDLER
// =====================================================
async function handleRefund(charge: Stripe.Charge, supabaseAdmin: any) {
    console.log('Processing refund for charge:', charge.id)

    // 1. Check if this is an ORDER refund
    const { data: order } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('stripe_payment_intent_id', charge.payment_intent)
        .maybeSingle()

    if (order) {
        // Update order with refund info
        const { error } = await supabaseAdmin
            .from('orders')
            .update({
                amount_refunded: charge.amount_refunded / 100,
                refunded_at: new Date().toISOString(),
                status: 'refunded'
            })
            .eq('id', order.id)

        if (error) {
            console.error('Error updating order refund:', error)
        } else {
            console.log('✅ Order refund processed:', order.order_number)
        }
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Check if this is an INVOICE refund
    const { data: payment } = await supabaseAdmin
        .from('invoice_payments')
        .select('*, invoice:invoices(*)')
        .eq('stripe_payment_intent_id', charge.payment_intent)
        .maybeSingle()

    if (payment && payment.invoice) {
        const invoice = payment.invoice
        console.log('Found invoice for refund:', invoice.invoice_number)

        const refundAmount = charge.amount_refunded / 100

        // Determine new status
        // Calculate total refunded from ALL payments + this new one
        // (This is a simplified logic, assuming this webhook event represents a new refund)

        // We insert a negative payment record to track this refund
        const { error: refundRecordError } = await supabaseAdmin
            .from('invoice_payments')
            .insert({
                invoice_id: invoice.id,
                amount: -refundAmount,
                payment_method: 'stripe_refund_webhook',
                stripe_payment_intent_id: charge.id, // Use the refund ID or charge ID
                notes: 'Refund processed via Stripe content'
            })

        if (refundRecordError) console.error('Error logging refund payment:', refundRecordError)

        // Update Invoice Totals
        const newAmountPaid = Math.max(0, invoice.amount_paid - refundAmount)
        const newAmountDue = invoice.total_amount - newAmountPaid

        let newStatus = invoice.status
        if (newAmountPaid <= 0) {
            newStatus = 'pending'
        } else if (newAmountPaid < invoice.total_amount) {
            newStatus = 'partial_paid'
        }

        const { error: updateError } = await supabaseAdmin
            .from('invoices')
            .update({
                amount_paid: newAmountPaid,
                amount_due: newAmountDue,
                status: newStatus,
                paid_at: newStatus === 'fully_paid' ? invoice.paid_at : null
            })
            .eq('id', invoice.id)

        if (updateError) {
            console.error('Error updating invoice status:', updateError)
        } else {
            console.log('✅ Invoice refund processed:', invoice.invoice_number)
        }

        // Cancel Project if fully refunded
        if (newStatus === 'pending' && invoice.project_id) {
            await supabaseAdmin
                .from('portal_projects')
                .update({ status: 'cancelled' })
                .eq('id', invoice.project_id)
            console.log('Project cancelled due to refund')
        }

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log('No order or invoice found for this refund.')
    return new Response(
        JSON.stringify({ success: true, message: 'No matching record found' }),
        {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        }
    )
}

// Helper function to build payment confirmation email
function buildPaymentConfirmationEmail(params: {
    invoiceNumber: string
    clientName: string
    title: string
    paymentAmount: number
    totalAmount: number
    amountPaid: number
    remainingBalance: number
    paymentMethod: string
    paymentDate: string
    isFullyPaid: boolean
}): string {
    const statusColor = params.isFullyPaid ? '#10b981' : '#f59e0b'

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <div style="font-size: 48px; margin-bottom: 10px;">✓</div>
                <h1 style="color: white; margin: 0; font-size: 28px;">Payment Received!</h1>
            </div>
            
            <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; margin-bottom: 20px;">Hi ${params.clientName},</p>
                
                <p style="font-size: 16px; margin-bottom: 30px;">
                    Thank you! We've received your payment for <strong>${params.title}</strong>.
                </p>
                
                <div style="background: #f9fafb; border-left: 4px solid ${statusColor}; padding: 20px; margin: 30px 0; border-radius: 4px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280;">Invoice Number:</td>
                            <td style="padding: 8px 0; text-align: right; font-weight: 600;">${params.invoiceNumber}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280;">Payment Amount:</td>
                            <td style="padding: 8px 0; text-align: right; font-weight: 600; color: ${statusColor};">$${params.paymentAmount.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280;">Payment Method:</td>
                            <td style="padding: 8px 0; text-align: right;">${params.paymentMethod}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280;">Payment Date:</td>
                            <td style="padding: 8px 0; text-align: right;">${new Date(params.paymentDate).toLocaleDateString()}</td>
                        </tr>
                        <tr style="border-top: 2px solid #e5e7eb;">
                            <td style="padding: 12px 0; font-weight: 600;">Total Invoice Amount:</td>
                            <td style="padding: 12px 0; text-align: right; font-weight: 600;">$${params.totalAmount.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280;">Total Paid:</td>
                            <td style="padding: 8px 0; text-align: right; color: #10b981;">$${params.amountPaid.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: 600;">Remaining Balance:</td>
                            <td style="padding: 8px 0; text-align: right; font-weight: 600; color: ${params.isFullyPaid ? '#10b981' : '#f59e0b'};">
                                $${params.remainingBalance.toFixed(2)}
                            </td>
                        </tr>
                    </table>
                </div>
                
                <div style="background: ${params.isFullyPaid ? '#d1fae5' : '#fef3c7'}; border: 1px solid ${params.isFullyPaid ? '#6ee7b7' : '#fbbf24'}; padding: 15px; border-radius: 6px; margin: 30px 0; text-align: center;">
                    <p style="margin: 0; color: ${params.isFullyPaid ? '#065f46' : '#92400e'}; font-weight: 600;">
                        ${params.isFullyPaid ? '🎉 Invoice Fully Paid!' : '⚠️ Partial Payment - Balance Remaining'}
                    </p>
                </div>
                
                ${params.isFullyPaid ? `
                    <p style="font-size: 16px; margin-bottom: 20px;">
                        Your invoice is now fully paid! Thank you for your business.
                    </p>
                ` : `
                    <p style="font-size: 16px; margin-bottom: 20px;">
                        You have a remaining balance of <strong>$${params.remainingBalance.toFixed(2)}</strong>. 
                        We'll send you a reminder when the next payment is due.
                    </p>
                `}
                
                <p style="font-size: 16px; margin-bottom: 30px;">
                    If you have any questions about this payment, please don't hesitate to contact us.
                </p>
                
                <p style="font-size: 16px; margin-bottom: 5px;">Best regards,</p>
                <p style="font-size: 16px; margin: 0; font-weight: 600; color: #0EA5E9;">The TFC Media Team</p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
                <p style="margin: 5px 0;">© ${new Date().getFullYear()} TFC Media Group. All rights reserved.</p>
                <p style="margin: 5px 0;">This is an automated payment confirmation.</p>
            </div>
        </body>
        </html>
    `
}
