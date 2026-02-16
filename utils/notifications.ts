import { supabase } from '../supabaseClient';

interface NotificationPayload {
    to: string;
    subject?: string;
    message: string;
    type: 'email' | 'sms';
    event: string;
}

/**
 * Send email notification via Edge Function
 */
export const sendEmailNotification = async (
    to: string,
    subject: string,
    message: string,
    event: string
) => {
    try {
        const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
                to,
                subject,
                message,
                event,
            },
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

/**
 * Send SMS notification via Edge Function
 */
export const sendSMSNotification = async (
    to: string,
    message: string,
    event: string
) => {
    try {
        const { data, error } = await supabase.functions.invoke('send-sms', {
            body: {
                to,
                message,
                event,
            },
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error sending SMS:', error);
        throw error;
    }
};

/**
 * Send order confirmation notification
 */
export const sendOrderConfirmation = async (
    email: string,
    orderNumber: string,
    totalAmount: number,
    items: any[]
) => {
    const subject = `Order Confirmation - ${orderNumber}`;
    const message = `
    Thank you for your order!
    
    Order Number: ${orderNumber}
    Total: $${totalAmount.toFixed(2)}
    Items: ${items.length}
    
    You can view your order details in your account dashboard.
    
    Best regards,
    TFC Media Team
  `;

    return sendEmailNotification(email, subject, message, 'order_placed');
};

/**
 * Send booking confirmation notification
 */
export const sendBookingConfirmation = async (
    email: string,
    bookingDate: string,
    serviceType: string
) => {
    const subject = 'Booking Confirmation - TFC Media';
    const message = `
    Your booking has been confirmed!
    
    Service: ${serviceType}
    Date: ${bookingDate}
    
    We'll send you a reminder closer to your booking date.
    
    Best regards,
    TFC Media Team
  `;

    return sendEmailNotification(email, subject, message, 'booking_confirmed');
};

/**
 * Send project ready notification
 */
export const sendProjectReadyNotification = async (
    email: string,
    phone: string | null,
    projectName: string
) => {
    const emailSubject = 'Your Project Files Are Ready!';
    const emailMessage = `
    Great news! Your project "${projectName}" is complete and ready for download.
    
    Log in to your account to download your files.
    
    Best regards,
    TFC Media Team
  `;

    await sendEmailNotification(email, emailSubject, emailMessage, 'project_files_ready');

    // Send SMS if phone number provided
    if (phone) {
        const smsMessage = `TFC Media: Your project "${projectName}" is ready for download! Log in to your account to access your files.`;
        await sendSMSNotification(phone, smsMessage, 'project_files_ready');
    }
};

/**
 * Get notification settings from database
 */
export const getNotificationSettings = async () => {
    try {
        const { data, error } = await supabase
            .from('notification_settings')
            .select('*')
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching notification settings:', error);
        return null;
    }
};
