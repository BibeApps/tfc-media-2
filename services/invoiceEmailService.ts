import { supabase } from '../supabaseClient';
import { invoiceCreatedTemplate } from './emailTemplates/invoiceCreated';
import { paymentReceivedTemplate } from './emailTemplates/paymentReceived';
import { Invoice, InvoicePayment } from '../types';

interface SendInvoiceEmailParams {
    invoice: Invoice;
    paymentLink: string;
}

interface SendPaymentConfirmationParams {
    invoice: Invoice;
    payment: InvoicePayment;
}

/**
 * Send invoice creation email to client via Supabase Edge Function
 */
export const sendInvoiceEmail = async ({ invoice, paymentLink }: SendInvoiceEmailParams): Promise<boolean> => {
    try {
        console.log('📧 Generating invoice email HTML...');
        const emailHtml = invoiceCreatedTemplate({
            invoiceNumber: invoice.invoice_number,
            clientName: invoice.client_name,
            title: invoice.title,
            totalAmount: invoice.total_amount,
            amountDue: invoice.amount_due,
            paymentType: invoice.payment_type,
            dueDate: invoice.due_date || undefined,
            paymentLink: paymentLink,
            notes: invoice.notes || undefined,
        });

        console.log('📤 Invoking send-email Edge Function...');
        console.log('Recipient:', invoice.client_email);
        console.log('Subject:', `Invoice ${invoice.invoice_number} from TFC Media`);

        const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
                to: invoice.client_email,
                subject: `Invoice ${invoice.invoice_number} from TFC Media`,
                html: emailHtml,
                from: 'TFC Media <noreply@tfcmediagroup.com>',
            },
        });

        console.log('📬 Edge Function response:', { data, error });

        if (error) {
            console.error('❌ Error from Edge Function:', error);
            return false;
        }

        if (!data?.success) {
            console.error('❌ Email sending failed:', data);
            return false;
        }

        console.log(`✅ Invoice email sent successfully to ${invoice.client_email}`);
        return true;
    } catch (error) {
        console.error('❌ Exception in sendInvoiceEmail:', error);
        return false;
    }
};

/**
 * Send payment confirmation email to client via Supabase Edge Function
 */
export const sendPaymentConfirmationEmail = async ({ invoice, payment }: SendPaymentConfirmationParams): Promise<boolean> => {
    try {
        const isFullyPaid = invoice.status === 'fully_paid';

        const emailHtml = paymentReceivedTemplate({
            invoiceNumber: invoice.invoice_number,
            clientName: invoice.client_name,
            title: invoice.title,
            paymentAmount: payment.amount,
            totalAmount: invoice.total_amount,
            amountPaid: invoice.amount_paid,
            remainingBalance: invoice.amount_due,
            paymentMethod: payment.payment_method || 'Card',
            paymentDate: payment.created_at,
            isFullyPaid: isFullyPaid,
        });

        const subject = isFullyPaid
            ? `Payment Received - Invoice ${invoice.invoice_number} Fully Paid!`
            : `Payment Received - Invoice ${invoice.invoice_number}`;

        const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
                to: invoice.client_email,
                subject: subject,
                html: emailHtml,
                from: 'TFC Media <noreply@tfcmediagroup.com>',
            },
        });

        if (error) {
            console.error('Error sending payment confirmation email:', error);
            return false;
        }

        if (!data?.success) {
            console.error('Failed to send payment confirmation email:', data?.error);
            return false;
        }

        console.log(`✅ Payment confirmation email sent to ${invoice.client_email}`);
        return true;
    } catch (error) {
        console.error('Error sending payment confirmation email:', error);
        return false;
    }
};

/**
 * Send payment reminder email (optional - for future use)
 */
export const sendPaymentReminderEmail = async (invoice: Invoice): Promise<boolean> => {
    // TODO: Implement payment reminder template
    console.log('Payment reminder email not yet implemented');
    return false;
};

interface SendPaymentRequestParams {
    invoice: Invoice;
    amountRequested: number;
    paymentLink: string;
}

/**
 * Send a partial payment request email
 */
export const sendPaymentRequestEmail = async ({ invoice, amountRequested, paymentLink }: SendPaymentRequestParams): Promise<boolean> => {
    try {
        console.log('📧 Generating payment request email HTML...');

        // Reuse the invoice created template but specific to this request
        const emailHtml = invoiceCreatedTemplate({
            invoiceNumber: invoice.invoice_number,
            clientName: invoice.client_name,
            title: `Payment Request: ${invoice.title}`,
            totalAmount: invoice.total_amount,
            amountDue: amountRequested, // Show the requested installment amount as due now
            paymentType: 'partial',
            dueDate: invoice.due_date || undefined,
            paymentLink: paymentLink,
            notes: invoice.notes || undefined,
        });

        console.log('📤 Invoking send-email Edge Function...');

        const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
                to: invoice.client_email,
                subject: `Payment Request: $${amountRequested.toFixed(2)} for Invoice ${invoice.invoice_number}`,
                html: emailHtml,
                from: 'TFC Media <noreply@tfcmediagroup.com>',
            },
        });

        if (error) {
            console.error('❌ Error sending payment request:', error);
            return false;
        }

        if (!data?.success) {
            console.error('❌ Email sending failed:', data);
            return false;
        }

        console.log(`✅ Payment request sent to ${invoice.client_email}`);
        return true;
    } catch (error) {
        console.error('❌ Exception in sendPaymentRequestEmail:', error);
        return false;
    }
};

