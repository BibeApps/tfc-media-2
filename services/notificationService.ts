import { supabase } from '../supabaseClient';
import { resend, isResendConfigured } from './resendClient';
import { orderPlacedTemplate } from './emailTemplates/orderPlaced';
import { bookingCreatedTemplate } from './emailTemplates/bookingCreated';
import { orderCompletedTemplate } from './emailTemplates/orderCompleted';
import { bookingConfirmedTemplate } from './emailTemplates/bookingConfirmed';

// Notification event types
export type NotificationEvent = 'order_placed' | 'booking_created' | 'order_completed' | 'booking_confirmed';
export type NotificationChannel = 'email' | 'sms';
export type RecipientType = 'client' | 'admin';

interface NotificationSettings {
    email_enabled: boolean;
    email_from_name: string;
    email_from_address: string;
    sms_enabled: boolean;
    twilio_phone_number: string;
    notifications: {
        [key: string]: {
            email: boolean;
            sms: boolean;
            recipients: RecipientType[];
        };
    };
}

interface UserProfile {
    id: string;
    email: string;
    name: string;
    phone?: string;
    notification_project_updates?: boolean;
    notification_downloads?: boolean;
}

class NotificationService {
    /**
     * Get notification settings from database
     */
    private async getNotificationSettings(): Promise<NotificationSettings | null> {
        try {
            const { data, error } = await supabase
                .from('notification_settings')
                .select('*')
                .maybeSingle();

            if (error) {
                console.error('Error fetching notification settings:', error);
                return null;
            }

            if (!data) {
                console.warn('No notification settings found in database. Please configure notification settings.');
                return null;
            }

            return data as NotificationSettings;
        } catch (err) {
            console.error('Error in getNotificationSettings:', err);
            return null;
        }
    }

    /**
     * Get user profile from database
     */
    private async getUserProfile(userId: string): Promise<UserProfile | null> {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, name, phone, notification_project_updates, notification_downloads')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching user profile:', error);
                return null;
            }

            return data as UserProfile;
        } catch (err) {
            console.error('Error in getUserProfile:', err);
            return null;
        }
    }

    /**
     * Check if notification should be sent based on admin settings and user preferences
     */
    private async shouldSendNotification(
        eventType: NotificationEvent,
        userId: string,
        channel: NotificationChannel,
        recipientType: RecipientType
    ): Promise<boolean> {
        // 1. Check admin settings
        const settings = await this.getNotificationSettings();
        if (!settings) {
            console.log('No notification settings found');
            return false;
        }

        // Check if channel is enabled globally
        if (channel === 'email' && !settings.email_enabled) {
            console.log('Email notifications disabled globally');
            return false;
        }
        if (channel === 'sms' && !settings.sms_enabled) {
            console.log('SMS notifications disabled globally');
            return false;
        }

        // Check if this event is enabled for this channel
        const eventConfig = settings.notifications[eventType];
        if (!eventConfig) {
            console.log(`No configuration found for event: ${eventType}`);
            return false;
        }

        if (channel === 'email' && !eventConfig.email) {
            console.log(`Email disabled for event: ${eventType}`);
            return false;
        }
        if (channel === 'sms' && !eventConfig.sms) {
            console.log(`SMS disabled for event: ${eventType}`);
            return false;
        }

        // Check if this recipient type should receive this notification
        if (!eventConfig.recipients.includes(recipientType)) {
            console.log(`Recipient type ${recipientType} not configured for event: ${eventType}`);
            return false;
        }

        // 2. Check user preferences (only for client recipients)
        if (recipientType === 'client') {
            const user = await this.getUserProfile(userId);
            if (!user) {
                console.log('User profile not found');
                return false;
            }

            // Map events to user preference fields
            const preferenceMap: Record<NotificationEvent, keyof UserProfile> = {
                'order_placed': 'notification_project_updates',
                'booking_created': 'notification_project_updates',
                'order_completed': 'notification_downloads',
                'booking_confirmed': 'notification_project_updates',
            };

            const preferenceField = preferenceMap[eventType];
            if (preferenceField && user[preferenceField] === false) {
                console.log(`User has opted out of ${preferenceField}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Send email notification
     */
    private async sendEmail(to: string, subject: string, html: string, fromName: string, fromAddress: string): Promise<boolean> {
        if (!isResendConfigured()) {
            console.error('Resend is not configured. Cannot send email.');
            return false;
        }

        try {
            const { data, error } = await resend!.emails.send({
                from: `${fromName} <${fromAddress}>`,
                to: [to],
                subject: subject,
                html: html,
            });

            if (error) {
                console.error('Error sending email:', error);
                return false;
            }

            return true;
        } catch (err) {
            console.error('Error in sendEmail:', err);
            return false;
        }
    }

    /**
     * Send SMS notification via Supabase Edge Function
     */
    private async sendSMS(to: string, message: string, fromNumber: string): Promise<boolean> {
        try {
            const { data, error } = await supabase.functions.invoke('send-sms', {
                body: {
                    to: to,
                    message: message,
                },
            });

            if (error) {
                console.error('Error calling send-sms function:', error);
                return false;
            }

            if (!data.success) {
                console.error('SMS sending failed:', data.error);
                return false;
            }

            console.log('SMS sent successfully:', data.messageSid);
            return true;
        } catch (err) {
            console.error('Error in sendSMS:', err);
            return false;
        }
    }

    /**
     * Main notification dispatch function
     */
    async sendNotification(eventType: NotificationEvent, userId: string, data: any): Promise<void> {
        console.log(`[DEBUG] sendNotification called: eventType=${eventType}, userId=${userId}`, data);

        const settings = await this.getNotificationSettings();
        if (!settings) {
            console.error('Cannot send notification: settings not found');
            return;
        }
        console.log('[DEBUG] Notification settings found:', { email_enabled: settings.email_enabled });

        const user = await this.getUserProfile(userId);
        if (!user) {
            console.error('Cannot send notification: user not found');
            return;
        }
        console.log('[DEBUG] User profile found:', { email: user.email, name: user.name });

        // Determine recipient type (client or admin)
        const recipientType: RecipientType = 'client'; // Default to client, can be overridden

        // Send email if enabled
        if (await this.shouldSendNotification(eventType, userId, 'email', recipientType)) {
            console.log('[DEBUG] shouldSendNotification returned true, preparing email...');
            let subject = '';
            let html = '';

            switch (eventType) {
                case 'order_placed':
                    subject = `Order Confirmation - #${data.orderNumber}`;
                    html = orderPlacedTemplate({
                        orderNumber: data.orderNumber,
                        total: data.total,
                        items: data.items,
                        customerName: user.name,
                    });
                    break;

                case 'order_completed':
                    subject = `Your Order is Ready! - #${data.orderNumber}`;
                    html = orderCompletedTemplate({
                        orderNumber: data.orderNumber,
                        customerName: user.name,
                        downloadUrl: data.downloadUrl,
                    });
                    break;

                case 'booking_confirmed':
                    subject = 'Booking Confirmed!';
                    html = bookingConfirmedTemplate({
                        bookingId: data.bookingId,
                        serviceType: data.serviceType,
                        confirmedDate: data.confirmedDate,
                        confirmedTime: data.confirmedTime,
                        customerName: user.name,
                    });
                    break;

                default:
                    console.warn(`No email template for event: ${eventType}`);
                    return;
            }
            console.log('[DEBUG] Email template prepared, calling Edge Function...');

            // Send email via Supabase Edge Function
            try {
                const { error } = await supabase.functions.invoke('send-email', {
                    body: {
                        to: user.email,
                        subject: subject,
                        html: html,
                    },
                });

                if (error) {
                    console.error(`Failed to send ${eventType} email:`, error);
                }
            } catch (err) {
                console.error(`Error sending ${eventType} email:`, err);
            }
        } else {
            console.log('[DEBUG] shouldSendNotification returned false - email not sent');
        }

        // Send SMS if enabled
        if (await this.shouldSendNotification(eventType, userId, 'sms', recipientType)) {
            if (!user.phone) {
                console.log('User has no phone number, skipping SMS');
                return;
            }

            let message = '';

            switch (eventType) {
                case 'order_placed':
                    message = `Your order #${data.orderNumber} has been confirmed! Total: $${data.total.toFixed(2)}`;
                    break;

                case 'order_completed':
                    message = `Your order #${data.orderNumber} is ready for download! Visit your client portal to download.`;
                    break;

                case 'booking_confirmed':
                    message = `Your booking for ${data.serviceType} on ${data.confirmedDate} at ${data.confirmedTime} has been confirmed!`;
                    break;

                default:
                    console.warn(`No SMS template for event: ${eventType}`);
                    return;
            }

            await this.sendSMS(user.phone, message, settings.twilio_phone_number);
        }
    }

    /**
     * Send notification to admin
     */
    async sendAdminNotification(eventType: NotificationEvent, data: any): Promise<void> {

        const settings = await this.getNotificationSettings();
        if (!settings) {
            console.error('Cannot send admin notification: settings not found');
            return;
        }

        // Get admin email from site_settings.contact_email
        let adminEmail = 'support@tfcmediagroup.com'; // Fallback
        try {
            const { data: siteSettings, error } = await supabase
                .from('site_settings')
                .select('contact_email')
                .maybeSingle();

            if (!error && siteSettings?.contact_email) {
                adminEmail = siteSettings.contact_email;
            }
        } catch (err) {
            console.error('Error fetching admin email from site_settings:', err);
        }

        // Check if admin should receive this notification
        const eventConfig = settings.notifications[eventType];
        if (!eventConfig || !eventConfig.recipients.includes('admin')) {
            console.log(`Admin not configured to receive ${eventType} notifications`);
            return;
        }

        // Send email to admin using Supabase Edge Function (like other emails)
        if (settings.email_enabled && eventConfig.email) {

            let subject = '';
            let message = '';

            switch (eventType) {
                case 'booking_created':
                    subject = 'New Booking Received!';
                    message = `
                        <h2>New Booking Request</h2>
                        <p><strong>Customer:</strong> ${data.customerName}</p>
                        <p><strong>Email:</strong> ${data.customerEmail}</p>
                        <p><strong>Phone:</strong> ${data.customerPhone || 'Not provided'}</p>
                        <p><strong>Service:</strong> ${data.serviceType}</p>
                        <p><strong>Date:</strong> ${data.bookingDate}</p>
                        <p><strong>Time:</strong> ${data.bookingTime}</p>
                        <p>Please review and confirm this booking in the admin panel.</p>
                    `;
                    break;

                default:
                    console.warn(`No admin email template for event: ${eventType}`);
                    return;
            }

            console.log(`Sending email via Supabase Edge Function with subject: "${subject}"`);

            try {
                const { error } = await supabase.functions.invoke('send-booking-email', {
                    body: {
                        adminEmail: adminEmail,
                        customerName: data.customerName,
                        customerEmail: data.customerEmail,
                        customerPhone: data.customerPhone,
                        serviceType: data.serviceType,
                        bookingDate: data.bookingDate,
                        bookingTime: data.bookingTime,
                    },
                });

                if (error) {
                    console.error(`❌ Failed to send admin notification email:`, error);
                }
            } catch (err) {
                console.error(`❌ Error sending admin notification:`, err);
            }
        }
    }
}

// Export singleton instance
export const notificationService = new NotificationService();
