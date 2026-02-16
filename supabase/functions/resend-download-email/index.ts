import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { downloadPackageReadyTemplate } from '../../../services/emailTemplates/downloadPackageReady.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

interface RequestBody {
    package_id: string;
    zip_url: string;
    expires_at: string;
    item_count: number;
    file_size: number;
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { package_id, zip_url, expires_at, item_count, file_size }: RequestBody = await req.json();

        // Get package details with event name
        const { data: pkg, error: pkgError } = await supabase
            .from('download_packages')
            .select(`
                *,
                orders (
                    id,
                    client_id,
                    order_items (
                        gallery_items (
                            sessions (
                                name
                            )
                        )
                    )
                )
            `)
            .eq('id', package_id)
            .single();

        if (pkgError || !pkg) {
            throw new Error('Package not found');
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('email, name')
            .eq('id', pkg.orders.client_id)
            .single();

        if (profileError || !profile || !profile.email) {
            throw new Error('User profile not found');
        }

        if (!RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY not configured');
        }

        // Get event name
        const eventName = pkg.orders.order_items?.[0]?.gallery_items?.sessions?.name || 'Your Event';

        // Generate email content
        const emailTemplate = downloadPackageReadyTemplate(
            profile.name || 'Valued Client',
            eventName,
            item_count,
            file_size,
            zip_url,
            new Date(expires_at)
        );

        // Send email via Resend
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

        if (!emailResponse.ok) {
            throw new Error(`Failed to send email: ${JSON.stringify(emailData)}`);
        }

        return new Response(
            JSON.stringify({
                success: true,
                email_id: emailData.id,
                sent_to: profile.email
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );
    } catch (error: any) {
        console.error('Error resending download email:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        );
    }
});
