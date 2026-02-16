-- Fix payment token generation to use URL-safe encoding
-- This replaces the base64 encoding with a hex encoding that doesn't have URL-unsafe characters

CREATE OR REPLACE FUNCTION generate_payment_token()
RETURNS TEXT AS $$
BEGIN
    -- Generate a secure random token using hex encoding (URL-safe)
    -- 32 bytes = 64 character hex string
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Update existing tokens to be URL-safe (optional - only if you want to regenerate)
-- UPDATE invoices SET payment_token = generate_payment_token() WHERE payment_token IS NOT NULL;
