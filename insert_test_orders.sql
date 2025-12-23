-- =====================================================
-- Order Management - Test Data
-- =====================================================
-- This file creates sample orders for testing the
-- Order Management admin screen.
-- Run AFTER create_order_management_tables.sql
-- =====================================================

-- =====================================================
-- 1. INSERT TEST ORDERS
-- =====================================================

-- Get a sample client ID (first client in profiles table)
DO $$
DECLARE
    sample_client_id UUID;
    sample_gallery_item_id UUID;
BEGIN
    -- Get first client
    SELECT id INTO sample_client_id 
    FROM profiles 
    WHERE role = 'client' 
    LIMIT 1;

    -- Get first gallery item
    SELECT id INTO sample_gallery_item_id 
    FROM gallery_items 
    LIMIT 1;

    -- Insert test orders if client exists
    IF sample_client_id IS NOT NULL THEN
        
        -- Order 1: Completed order
        INSERT INTO orders (
            client_id, 
            order_number, 
            total_amount, 
            status, 
            currency,
            stripe_session_id,
            stripe_payment_intent_id,
            items,
            created_at
        ) VALUES (
            sample_client_id,
            'TFC-20251222-0001',
            249.99,
            'completed',
            'usd',
            'cs_test_a1b2c3d4e5f6g7h8i9j0',
            'pi_test_1234567890abcdef',
            '[{"id": "' || sample_gallery_item_id || '", "title": "Wedding Photo 1", "price": 99.99}, {"id": "' || sample_gallery_item_id || '", "title": "Wedding Photo 2", "price": 150.00}]'::jsonb,
            NOW() - INTERVAL '5 days'
        );

        -- Order 2: Pending order
        INSERT INTO orders (
            client_id, 
            order_number, 
            total_amount, 
            status, 
            currency,
            stripe_session_id,
            items,
            created_at
        ) VALUES (
            sample_client_id,
            'TFC-20251222-0002',
            89.99,
            'pending',
            'usd',
            'cs_test_pending123456',
            '[{"id": "' || sample_gallery_item_id || '", "title": "Portrait Photo", "price": 89.99}]'::jsonb,
            NOW() - INTERVAL '2 hours'
        );

        -- Order 3: Paid order (ready to fulfill)
        INSERT INTO orders (
            client_id, 
            order_number, 
            total_amount, 
            status, 
            currency,
            stripe_session_id,
            stripe_payment_intent_id,
            items,
            created_at
        ) VALUES (
            sample_client_id,
            'TFC-20251222-0003',
            175.50,
            'paid',
            'usd',
            'cs_test_paid987654',
            'pi_test_paid123456',
            '[{"id": "' || sample_gallery_item_id || '", "title": "Event Photo Bundle", "price": 175.50}]'::jsonb,
            NOW() - INTERVAL '1 day'
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
            items,
            created_at
        ) VALUES (
            sample_client_id,
            'TFC-20251220-0001',
            299.99,
            'refunded',
            'usd',
            'cs_test_refunded111',
            'pi_test_refunded222',
            299.99,
            'Customer requested refund - duplicate order',
            NOW() - INTERVAL '1 day',
            '[{"id": "' || sample_gallery_item_id || '", "title": "Premium Package", "price": 299.99}]'::jsonb,
            NOW() - INTERVAL '3 days'
        );

        RAISE NOTICE 'Test orders created successfully!';
    ELSE
        RAISE NOTICE 'No client found. Please create a client profile first.';
    END IF;
END $$;

-- =====================================================
-- 2. VERIFY TEST DATA
-- =====================================================

-- Show all orders
SELECT 
    order_number,
    status,
    total_amount,
    currency,
    created_at
FROM orders
ORDER BY created_at DESC;

-- =====================================================
-- TEST DATA COMPLETE
-- =====================================================
-- You should now see 4 test orders in the Order Management page:
-- - 1 Completed order ($249.99)
-- - 1 Pending order ($89.99)
-- - 1 Paid order ($175.50)
-- - 1 Refunded order ($299.99)
-- =====================================================
