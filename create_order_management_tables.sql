-- =====================================================
-- Order Management System - Database Migration
-- =====================================================
-- This migration creates the complete order management
-- infrastructure including orders, order_items, and cart tables
-- with proper RLS policies for security.
-- =====================================================

-- =====================================================
-- 1. ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    order_number TEXT UNIQUE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'completed', 'refunded')),
    currency TEXT DEFAULT 'usd',
    stripe_session_id TEXT,
    stripe_payment_intent_id TEXT,
    amount_refunded DECIMAL(10, 2) DEFAULT 0,
    refund_reason TEXT,
    refunded_at TIMESTAMPTZ,
    items JSONB, -- Temporary storage for cart items during checkout
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- =====================================================
-- 2. ORDER ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    gallery_item_id UUID REFERENCES gallery_items(id) ON DELETE SET NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_gallery_item_id ON order_items(gallery_item_id);

-- =====================================================
-- 3. CART TABLE (Optional - for persistent carts)
-- =====================================================
CREATE TABLE IF NOT EXISTS cart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    session_id TEXT, -- For anonymous users
    gallery_item_id UUID REFERENCES gallery_items(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure one item per user/session
    CONSTRAINT unique_user_item UNIQUE(user_id, gallery_item_id),
    CONSTRAINT unique_session_item UNIQUE(session_id, gallery_item_id),
    -- Ensure either user_id or session_id is set
    CONSTRAINT check_user_or_session CHECK (
        (user_id IS NOT NULL AND session_id IS NULL) OR
        (user_id IS NULL AND session_id IS NOT NULL)
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_session_id ON cart(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_gallery_item_id ON cart(gallery_item_id);

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- =====================================================
-- 4.1 ORDERS TABLE POLICIES
-- =====================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
    ON orders FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Clients can only view their own orders
CREATE POLICY "Clients can view own orders"
    ON orders FOR SELECT
    TO authenticated
    USING (client_id = auth.uid());

-- Allow creating orders (for checkout)
CREATE POLICY "Authenticated users can create orders"
    ON orders FOR INSERT
    TO authenticated
    WITH CHECK (client_id = auth.uid() OR client_id IS NULL);

-- Admins can update orders (for refunds, status changes)
CREATE POLICY "Admins can update orders"
    ON orders FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 4.2 ORDER ITEMS TABLE POLICIES
-- =====================================================
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Users can view order items for their orders
CREATE POLICY "Users can view own order items"
    ON order_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND (
                orders.client_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role = 'admin'
                )
            )
        )
    );

-- Allow creating order items during checkout
CREATE POLICY "Can create order items for own orders"
    ON order_items FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND (orders.client_id = auth.uid() OR orders.client_id IS NULL)
        )
    );

-- =====================================================
-- 4.3 CART TABLE POLICIES
-- =====================================================
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage their own cart
CREATE POLICY "Users can manage own cart"
    ON cart FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Anonymous users can manage cart by session
CREATE POLICY "Anonymous users can manage cart by session"
    ON cart FOR ALL
    TO anon
    USING (session_id IS NOT NULL)
    WITH CHECK (session_id IS NOT NULL);

-- =====================================================
-- 5. UPDATED_AT TRIGGER
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for orders table
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for cart table
DROP TRIGGER IF EXISTS update_cart_updated_at ON cart;
CREATE TRIGGER update_cart_updated_at
    BEFORE UPDATE ON cart
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE orders IS 'Stores all customer orders with payment information';
COMMENT ON TABLE order_items IS 'Individual line items for each order';
COMMENT ON TABLE cart IS 'Shopping cart for authenticated and anonymous users';

COMMENT ON COLUMN orders.items IS 'JSONB snapshot of cart items at time of order creation';
COMMENT ON COLUMN orders.stripe_session_id IS 'Stripe Checkout Session ID';
COMMENT ON COLUMN orders.stripe_payment_intent_id IS 'Stripe Payment Intent ID after successful payment';
COMMENT ON COLUMN cart.session_id IS 'Session ID for anonymous users (from localStorage or cookie)';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Insert test data (see test_data.sql)
-- 3. Verify Order Management page works
-- 4. Configure Stripe keys in Settings page
-- =====================================================
