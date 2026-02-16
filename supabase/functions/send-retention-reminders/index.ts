import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const APP_URL = Deno.env.get('APP_URL') || 'https://tfcmediagroup.com';

// Retention reminder email template
const getRetentionReminderEmail = (
    clientName: string,
    daysRemaining: number,
    itemCount: number,
    downloadsUrl: string
) => {
    const urgency = daysRemaining <= 7 ? 'urgent' : daysRemaining <= 30 ? 'warning' : 'info';
    const urgencyColor = urgency === 'urgent' ? '#dc3545' : urgency === 'warning' ? '#ffc107' : '#17a2b8';
    const urgencyBg = urgency === 'urgent' ? '#f8d7da' : urgency === 'warning' ? '#fff3cd' : '#d1ecf1';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: ${urgencyColor}; color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .content { padding: 40px 30px; }
    .button { display: inline-block; padding: 16px 32px; background: #667eea; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
    .countdown { font-size: 64px; font-weight: 700; text-align: center; margin: 30px 0; color: ${urgencyColor}; line-height: 1; }
    .countdown-label { font-size: 18px; text-align: center; color: #666; margin-top: 10px; }
    .info-box { background: ${urgencyBg}; border-left: 4px solid ${urgencyColor}; padding: 20px; margin: 24px 0; border-radius: 4px; }
    .button-container { text-align: center; margin: 30px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Download Reminder</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px;">Hi ${clientName},</p>
      <p style="font-size: 16px;">This is a ${urgency === 'urgent' ? 'final' : 'friendly'} reminder that your media will be archived soon.</p>
      
      <div class="countdown">${daysRemaining}</div>
      <div class="countdown-label">day${daysRemaining === 1 ? '' : 's'} remaining</div>
      
      <div class="info-box">
        <p style="margin: 0; font-size: 18px; font-weight: 600; text-align: center;">
          You have <strong>${itemCount} ${itemCount === 1 ? 'item' : 'items'}</strong> available for download
        </p>
      </div>
      
      <div class="button-container">
        <a href="${downloadsUrl}" class="button">Download Now</a>
      </div>
      
      <p style="font-size: 16px; margin-top: 30px;">Best regards,<br><strong>TFC Media Team</strong></p>
    </div>
  </div>
</body>
</html>`;

    return {
        subject: `${daysRemaining} days remaining to download your media`,
        html
    };
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const now = new Date();

        // Define reminder intervals (days before expiry)
        const reminderIntervals = [90, 30, 15, 7];

        let totalReminders = 0;
        const results: any[] = [];

        // Check each interval
        for (const daysBeforeExpiry of reminderIntervals) {
            // Calculate target date (start of day that is X days from now)
            const targetDate = new Date(now);
            targetDate.setDate(targetDate.getDate() + daysBeforeExpiry);
            targetDate.setHours(0, 0, 0, 0); // Reset to start of day FIRST

            // Set time range for the entire day
            const startOfDay = new Date(targetDate);
            // startOfDay is already at 00:00:00

            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);

            console.log(`🔍 Checking ${daysBeforeExpiry}-day reminders:`);
            console.log(`   Start: ${startOfDay.toISOString()}`);
            console.log(`   End: ${endOfDay.toISOString()}`);

            // Find orders expiring in this window
            const { data: orders, error } = await supabase
                .from('orders')
                .select(`
                    id,
                    order_number,
                    retention_expires_at,
                    client_id,
                    created_at,
                    order_items (
                        id,
                        gallery_items (
                            id,
                            title
                        )
                    )
                `)
                .gte('retention_expires_at', startOfDay.toISOString())
                .lte('retention_expires_at', endOfDay.toISOString())
                .eq('archived', false);

            if (error) {
                console.error(`❌ Error fetching orders for ${daysBeforeExpiry}-day interval:`, error);
                continue;
            }

            console.log(`📊 Query returned ${orders?.length || 0} orders`);
            if (orders && orders.length > 0) {
                console.log(`   Orders found:`, orders.map(o => ({
                    number: o.order_number,
                    expires: o.retention_expires_at
                })));
            }

            if (!orders || orders.length === 0) {
                console.log(`⏭️  No orders found for ${daysBeforeExpiry}-day interval`);
                continue;
            }

            console.log(`📧 Found ${orders.length} order(s) expiring in ${daysBeforeExpiry} days`);

            // Send reminder for each order
            for (const order of orders) {
                try {
                    // Fetch profile separately to avoid foreign key issues
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('email, name')
                        .eq('id', order.client_id)
                        .single();

                    if (profileError || !profile || !profile.email) {
                        console.warn(`⚠️ No email found for order ${order.order_number}, client_id: ${order.client_id}`);
                        continue;
                    }

                    const itemCount = order.order_items?.length || 0;
                    const downloadsUrl = `${APP_URL}/portal/downloads`;

                    // Generate email content
                    const emailTemplate = getRetentionReminderEmail(
                        profile.name || 'Valued Client',
                        daysBeforeExpiry,
                        itemCount,
                        downloadsUrl
                    );

                    // Send email via Resend
                    if (RESEND_API_KEY) {
                        try {
                            const emailResponse = await fetch('https://api.resend.com/emails', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                                },
                                body: JSON.stringify({
                                    from: 'TFC Media <noreply@tfcmediagroup.com>',
                                    to: [profile.email],
                                    subject: emailTemplate.subject,
                                    html: emailTemplate.html,
                                }),
                            });

                            const emailData = await emailResponse.json();

                            if (emailResponse.ok) {
                                console.log(`✅ Sent ${daysBeforeExpiry}-day reminder to ${profile.email}`);
                                console.log(`   Order: ${order.order_number}, Items: ${itemCount}, Email ID: ${emailData.id}`);
                            } else {
                                console.error(`❌ Failed to send email to ${profile.email}:`, emailData);
                            }
                        } catch (emailError) {
                            console.error(`❌ Email error for order ${order.order_number}:`, emailError);
                        }
                    } else {
                        console.warn(`⚠️ RESEND_API_KEY not set - would send to ${profile.email}`);
                        console.log(`   Order: ${order.order_number}, Items: ${itemCount}`);
                    }


                    totalReminders++;
                    results.push({
                        order_number: order.order_number,
                        email: profile.email,
                        days_remaining: daysBeforeExpiry,
                        item_count: itemCount,
                        expires_at: order.retention_expires_at
                    });

                } catch (emailError) {
                    console.error(`Failed to send reminder for order ${order.order_number}:`, emailError);
                }
            }
        }

        console.log(`✅ Sent ${totalReminders} retention reminders`);

        return new Response(
            JSON.stringify({
                success: true,
                reminders_sent: totalReminders,
                results: results,
                message: `Sent ${totalReminders} retention reminder(s)`
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );

    } catch (error) {
        console.error('❌ Function error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        );
    }
});
