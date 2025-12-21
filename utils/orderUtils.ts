import { supabase } from '../supabaseClient';

/**
 * Generate unique order number in format: TFC-YYYYMMDD-XXXX
 */
export const generateOrderNumber = async (): Promise<string> => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Get count of orders today
    const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today.toISOString().slice(0, 10)}T00:00:00`)
        .lt('created_at', `${today.toISOString().slice(0, 10)}T23:59:59`);

    const orderNum = String((count || 0) + 1).padStart(4, '0');
    return `TFC-${dateStr}-${orderNum}`;
};

/**
 * Create a Stripe checkout session
 */
export const createCheckoutSession = async (items: any[], clientId?: string) => {
    try {
        // Generate order number
        const orderNumber = await generateOrderNumber();

        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + item.price, 0);
        const fee = subtotal * 0.15; // 15% service fee
        const total = subtotal + fee;

        // Create pending order in database
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([{
                client_id: clientId,
                order_number: orderNumber,
                total_amount: total,
                status: 'pending',
                currency: 'usd',
                items: items,
            }])
            .select()
            .single();

        if (orderError) throw orderError;

        // Call Edge Function to create Stripe session
        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
            body: {
                orderId: order.id,
                orderNumber: orderNumber,
                items: items,
                totalAmount: total,
                successUrl: `${window.location.origin}/#/portal/purchases?success=true&order=${orderNumber}`,
                cancelUrl: `${window.location.origin}/#/gallery`,
            },
        });

        if (error) throw error;

        return {
            sessionId: data.sessionId,
            orderNumber: orderNumber,
        };
    } catch (error) {
        console.error('Error creating checkout session:', error);
        throw error;
    }
};

/**
 * Process a refund for an order
 */
export const processRefund = async (orderId: string, amount: number, reason: string) => {
    try {
        const { data, error } = await supabase.functions.invoke('process-refund', {
            body: {
                orderId,
                amount,
                reason,
            },
        });

        if (error) throw error;

        // Update local order record
        await supabase
            .from('orders')
            .update({
                amount_refunded: amount,
                refund_reason: reason,
                refunded_at: new Date().toISOString(),
            })
            .eq('id', orderId);

        return data;
    } catch (error) {
        console.error('Error processing refund:', error);
        throw error;
    }
};

/**
 * Get order details with items
 */
export const getOrderDetails = async (orderId: string) => {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching order:', error);
        throw error;
    }
};

/**
 * Get user's order history
 */
export const getUserOrders = async (clientId: string) => {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching orders:', error);
        throw error;
    }
};
