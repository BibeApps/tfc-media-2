-- =====================================================
-- Test Data for Order Management System
-- =====================================================
-- This script inserts sample orders and order items
-- for testing the Order Management UI
-- =====================================================

-- First, let's get a client user ID (we'll use the first client we find)
-- If no client exists, you'll need to create one first

-- =====================================================
-- 1. INSERT TEST ORDERS
-- =====================================================

-- Order 1: Completed order
INSERT INTO orders (
    client_id,
    order_number,
    total_amount,
    status,
    currency,
    stripe_session_id,
    stripe_payment_intent_id,
    created_at
) VALUES (
    (SELECT id FROM profiles WHERE role = 'client' LIMIT 1),
    'TFC-20251222-0001',
    299.99,
    'completed',
    'usd',
    'cs_test_a1b2c3d4e5f6g7h8i9j0',
    'pi_test_1234567890abcdef',
    NOW() - INTERVAL '5 days'
);

-- Order 2: Paid order (recent)
INSERT INTO orders (
    client_id,
    order_number,
    total_amount,
    status,
    currency,
    stripe_session_id,
    stripe_payment_intent_id,
    created_at
) VALUES (
    (SELECT id FROM profiles WHERE role = 'client' LIMIT 1),
    'TFC-20251222-0002',
    450.00,
    'paid',
    'usd',
    'cs_test_b2c3d4e5f6g7h8i9j0k1',
    'pi_test_0987654321fedcba',
    NOW() - INTERVAL '2 days'
);

-- Order 3: Pending order
INSERT INTO orders (
    client_id,
    order_number,
    total_amount,
    status,
    currency,
    stripe_session_id,
    created_at
) VALUES (
    (SELECT id FROM profiles WHERE role = 'client' LIMIT 1),
    'TFC-20251222-0003',
    175.50,
    'pending',
    'usd',
    'cs_test_c3d4e5f6g7h8i9j0k1l2',
    NOW() - INTERVAL '1 hour'
);

-- Order 4: Refunded order
INSERT INTO orders (
    client_id,
    order_number,
    total_amount,
    status,
    currency,
    stripe_session_id,
    stripe_payment_intent_id,
    amount_refunded,
    refund_reason,
    refunded_at,
    created_at
) VALUES (
    (SELECT id FROM profiles WHERE role = 'client' LIMIT 1),
    'TFC-20251220-0001',
    599.99,
    'refunded',
    'usd',
    'cs_test_d4e5f6g7h8i9j0k1l2m3',
    'pi_test_abcdef1234567890',
    599.99,
    'Customer requested cancellation',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '7 days'
);

-- =====================================================
-- 2. INSERT ORDER ITEMS (Optional - for detailed tracking)
-- =====================================================

-- Get the order IDs we just created
DO $$
DECLARE
    order1_id UUID;
    order2_id UUID;
    order3_id UUID;
    order4_id UUID;
    sample_gallery_item_id UUID;
BEGIN
    -- Get order IDs
    SELECT id INTO order1_id FROM orders WHERE order_number = 'TFC-20251222-0001';
    SELECT id INTO order2_id FROM orders WHERE order_number = 'TFC-20251222-0002';
    SELECT id INTO order3_id FROM orders WHERE order_number = 'TFC-20251222-0003';
    SELECT id INTO order4_id FROM orders WHERE order_number = 'TFC-20251220-0001';
    
    -- Get a sample gallery item (if exists)
    SELECT id INTO sample_gallery_item_id FROM gallery_items LIMIT 1;
    
    -- Insert order items for Order 1
    IF order1_id IS NOT NULL THEN
        INSERT INTO order_items (order_id, gallery_item_id, price)
        VALUES 
            (order1_id, sample_gallery_item_id, 149.99),
            (order1_id, sample_gallery_item_id, 150.00);
    END IF;
    
    -- Insert order items for Order 2
    IF order2_id IS NOT NULL THEN
        INSERT INTO order_items (order_id, gallery_item_id, price)
        VALUES 
            (order2_id, sample_gallery_item_id, 225.00),
            (order2_id, sample_gallery_item_id, 225.00);
    END IF;
    
    -- Insert order items for Order 3
    IF order3_id IS NOT NULL THEN
        INSERT INTO order_items (order_id, gallery_item_id, price)
        VALUES (order3_id, sample_gallery_item_id, 175.50);
    END IF;
    
    -- Insert order items for Order 4 (refunded)
    IF order4_id IS NOT NULL THEN
        INSERT INTO order_items (order_id, gallery_item_id, price)
        VALUES 
            (order4_id, sample_gallery_item_id, 299.99),
            (order4_id, sample_gallery_item_id, 300.00);
    END IF;
END $$;

-- =====================================================
-- 3. VERIFY DATA
-- =====================================================

-- Check orders
SELECT 
    order_number,
    total_amount,
    status,
    created_at
FROM orders
ORDER BY created_at DESC;

-- Check order items count
SELECT 
    o.order_number,
    COUNT(oi.id) as item_count,
    SUM(oi.price) as total_price
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.order_number
ORDER BY o.created_at DESC;

-- =====================================================
-- NOTES
-- =====================================================
-- If you need to clear test data:
-- DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'TFC-202512%');
-- DELETE FROM orders WHERE order_number LIKE 'TFC-202512%';
-- =====================================================
