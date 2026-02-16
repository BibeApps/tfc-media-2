import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { gallery_item_ids, user_id } = await req.json();

        if (!gallery_item_ids || !Array.isArray(gallery_item_ids) || gallery_item_ids.length === 0) {
            throw new Error('gallery_item_ids must be a non-empty array');
        }

        if (!user_id) {
            throw new Error('user_id is required');
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // Generate unique order number
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Determine order type based on item count
        const orderType = gallery_item_ids.length > 1 ? 'bulk_download' : 'instant_download';

        // Calculate retention expiry (6 months from now)
        const retentionExpiresAt = new Date();
        retentionExpiresAt.setMonth(retentionExpiresAt.getMonth() + 6);

        // Create order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                client_id: user_id,
                order_number: orderNumber,
                total_amount: 0,
                status: 'paid',
                order_type: orderType,
                retention_expires_at: retentionExpiresAt.toISOString(),
                currency: 'usd',
            })
            .select()
            .single();

        if (orderError) {
            console.error('Error creating order:', orderError);
            throw orderError;
        }

        // Create order items
        const orderItems = gallery_item_ids.map((id: string) => ({
            order_id: order.id,
            gallery_item_id: id,
            price: 0,
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) {
            console.error('Error creating order items:', itemsError);
            // Rollback: delete the order
            await supabase.from('orders').delete().eq('id', order.id);
            throw itemsError;
        }

        return new Response(
            JSON.stringify({
                success: true,
                order: {
                    id: order.id,
                    order_number: order.order_number,
                    order_type: order.order_type,
                    item_count: gallery_item_ids.length,
                }
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );
    } catch (error) {
        console.error('Function error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
});
