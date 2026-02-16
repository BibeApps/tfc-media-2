// =====================================================
// Stripe Webhook Handler - Invoice Auto-Onboarding
// =====================================================
// Handles Stripe webhook events for invoice payments
// Auto-creates users, projects, and records payments
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
        const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

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

        // Handle Payment Intent Success (Embedded Checkout)
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;

            if (paymentIntent.metadata?.payment_type === 'gallery_order') {
                console.log('Processing gallery order (PaymentIntent):', paymentIntent.metadata.order_id);

                // Update order status
                const { error: updateError } = await supabaseAdmin
                    .from('orders')
                    .update({
                        status: 'paid',
                        stripe_payment_intent_id: paymentIntent.id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', paymentIntent.metadata.order_id);

                if (updateError) {
                    console.error('Error updating order:', updateError);
                    throw new Error('Failed to update order status');
                }

                console.log('Successfully processed gallery order:', paymentIntent.metadata.order_id);

                // Fetch order details for email
                const { data: orderData, error: orderFetchError } = await supabaseAdmin
                    .from('orders')
                    .select(`
                        id,
                        order_number,
                        total_amount,
                        created_at,
                        profiles!orders_client_id_fkey (
                            name,
                            email
                        ),
                        order_items (
                            count
                        )
                    `)
                    .eq('id', paymentIntent.metadata.order_id)
                    .single();

                if (orderFetchError) {
                    console.error('Error fetching order for email:', orderFetchError);
                } else if (orderData && orderData.profiles) {
                    // Send confirmation email
                    try {
                        const itemCount = orderData.order_items?.[0]?.count || 0;
                        const customerEmail = paymentIntent.metadata.user_email || orderData.profiles.email;
                        const customerName = orderData.profiles.name || 'Valued Customer';

                        const emailHtml = buildGalleryOrderConfirmationEmail({
                            customerName,
                            orderNumber: orderData.order_number,
                            itemCount,
                            totalAmount: orderData.total_amount,
                            orderDate: new Date(orderData.created_at).toLocaleDateString(),
                            portalUrl: `${Deno.env.get('APP_URL') || 'http://localhost:3000'}/#/portal/downloads`
                        });

                        const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                            },
                            body: JSON.stringify({
                                to: customerEmail,
                                subject: `Order Confirmation - ${orderData.order_number}`,
                                html: emailHtml
                            })
                        });

                        if (!emailResponse.ok) {
                            console.error('Failed to send confirmation email:', await emailResponse.text());
                        } else {
                            console.log('Confirmation email sent to:', customerEmail);
                        }
                    } catch (emailError) {
                        console.error('Error sending confirmation email:', emailError);
                        // Don't fail the webhook if email fails
                    }
                }

                return new Response(JSON.stringify({ success: true, type: 'gallery_order_intent' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                });
            }
        }

        // Only handle successful checkout sessions
        if (event.type !== 'checkout.session.completed') {
            return new Response(JSON.stringify({ received: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        const session = event.data.object as Stripe.Checkout.Session

        // Handle Gallery Orders
        if (session.metadata?.payment_type === 'gallery_order') {
            console.log('Processing gallery order:', session.metadata.order_id)

            const { error: updateError } = await supabaseAdmin
                .from('orders')
                .update({
                    status: 'paid',
                    stripe_session_id: session.id,
                    stripe_payment_intent_id: session.payment_intent as string,
                    updated_at: new Date().toISOString()
                })
                .eq('id', session.metadata.order_id)

            if (updateError) {
                console.error('Error updating order:', updateError)
                throw new Error('Failed to update order status')
            }

            console.log('Successfully processed gallery order:', session.metadata.order_number)

            // TODO: Trigger email notification if needed (e.g. via separate function or Resend directly)

            return new Response(JSON.stringify({ success: true, type: 'gallery_order' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // Check if this is an invoice payment
        if (session.metadata?.payment_type !== 'invoice') {
            console.log('Not an invoice payment, skipping')
            return new Response(JSON.stringify({ received: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        console.log('Processing invoice payment for:', session.metadata.invoice_number)

        // Get invoice details
        const invoiceId = session.metadata.invoice_id
        const { data: invoice, error: invoiceError } = await supabaseAdmin
            .from('invoices')
            .select(`
                *,
                service_type:service_types(name, description),
                session:sessions(date, thumbnail)
            `)
            .eq('id', invoiceId)
            .single()

        if (invoiceError || !invoice) {
            throw new Error(`Invoice not found: ${invoiceId}`)
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
            // Get updated invoice for email
            const { data: updatedInvoice } = await supabaseAdmin
                .from('invoices')
                .select('*')
                .eq('id', invoiceId)
                .single()

            if (updatedInvoice) {
                // Import email service (we'll need to call it differently in Edge Function)
                const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

                if (RESEND_API_KEY) {
                    // Build payment confirmation email HTML
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

                    // Send via Resend
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
            }
        } catch (emailErr) {
            console.error('Failed to send payment confirmation email:', emailErr)
            // Don't fail the whole process if email fails
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
    const statusText = params.isFullyPaid ? 'Fully Paid' : 'Partial Payment'

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

// Helper function to build gallery order confirmation email
function buildGalleryOrderConfirmationEmail(params: {
    customerName: string
    orderNumber: string
    itemCount: number
    totalAmount: number
    orderDate: string
    portalUrl: string
}): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #0EA5E9 0%, #0EA5E9dd 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
                <h1 style="color: white; margin: 0; font-size: 28px;">Order Confirmed!</h1>
            </div>
            
            <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; margin-bottom: 20px;">Hi ${params.customerName},</p>
                
                <p style="font-size: 16px; margin-bottom: 30px;">
                    Thank you for your purchase! Your order has been confirmed and your files are ready to download.
                </p>
                
                <div style="background: #f9fafb; border-left: 4px solid #0EA5E9; padding: 20px; margin: 30px 0; border-radius: 4px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280;">Order Number:</td>
                            <td style="padding: 8px 0; text-align: right; font-weight: 600;">${params.orderNumber}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280;">Order Date:</td>
                            <td style="padding: 8px 0; text-align: right;">${params.orderDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280;">Items Purchased:</td>
                            <td style="padding: 8px 0; text-align: right;">${params.itemCount} file${params.itemCount !== 1 ? 's' : ''}</td>
                        </tr>
                        <tr style="border-top: 2px solid #e5e7eb;">
                            <td style="padding: 12px 0; font-weight: 600;">Total Paid:</td>
                            <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #0EA5E9;">$${params.totalAmount.toFixed(2)}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="background: #d1fae5; border: 1px solid #6ee7b7; padding: 15px; border-radius: 6px; margin: 30px 0; text-align: center;">
                    <p style="margin: 0; color: #065f46; font-weight: 600;">
                        ✓ Your files are ready for download!
                    </p>
                </div>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                    Access your purchased files anytime from your client portal:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${params.portalUrl}" style="display: inline-block; background: #0EA5E9; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Download Your Files
                    </a>
                </div>
                
                <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                    <strong>Important:</strong> Please download and back up your files as soon as possible.
                </p>
                
                <p style="font-size: 16px; margin-bottom: 30px;">
                    If you have any questions about your order, please don't hesitate to contact us.
                </p>
                
                <p style="font-size: 16px; margin-bottom: 5px;">Best regards,</p>
                <p style="font-size: 16px; margin: 0; font-weight: 600; color: #0EA5E9;">The TFC Media Team</p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
                <p style="margin: 5px 0;">© ${new Date().getFullYear()} TFC Media Group. All rights reserved.</p>
                <p style="margin: 5px 0;">This is an automated order confirmation.</p>
            </div>
        </body>
        </html>
    `
}
