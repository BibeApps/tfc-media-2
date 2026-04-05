-- =============================================================================
-- Migration: Fix RLS policies across all tables
-- Date: 2026-04-03
-- Summary:
--   1. Enable RLS on audit_logs, blackout_dates, bookings (were UNRESTRICTED)
--   2. Create is_admin() helper to avoid recursive RLS on profiles table
--   3. Fix dangerous invoice "payment token" policy (exposed all invoices)
--   4. Fix dangerous invoice_payments INSERT policy (anyone could create records)
--   5. Fix support_tickets INSERT (require auth + enforce user_id)
--   6. Add proper policies for all tables with globe icon but no migrations
-- =============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1: Helper function — avoids RLS recursion when checking profiles.role
-- SECURITY DEFINER bypasses RLS on profiles, so admin policies on profiles
-- itself don't cause infinite recursion.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- STEP 2: Enable RLS on the 3 UNRESTRICTED tables
-- ---------------------------------------------------------------------------
ALTER TABLE bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE blackout_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs    ENABLE ROW LEVEL SECURITY;
-- audit_logs intentionally has NO client policies below — service_role
-- (used by edge functions) bypasses RLS, so audit writes still work.

-- ---------------------------------------------------------------------------
-- STEP 3: BOOKINGS policies
-- Public can book (anonymous form), clients see/edit own by email, admins all
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can create bookings"        ON bookings;
DROP POLICY IF EXISTS "Clients can view own bookings"     ON bookings;
DROP POLICY IF EXISTS "Admins can view all bookings"      ON bookings;
DROP POLICY IF EXISTS "Clients can update own bookings"   ON bookings;
DROP POLICY IF EXISTS "Admins can update bookings"        ON bookings;
DROP POLICY IF EXISTS "Admins can delete bookings"        ON bookings;

CREATE POLICY "Public can create bookings"
  ON bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Clients can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (client_email = (SELECT email FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can view all bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Clients can update own bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING  (client_email = (SELECT email FROM profiles WHERE id = auth.uid()))
  WITH CHECK (client_email = (SELECT email FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- STEP 4: BLACKOUT_DATES policies
-- Public read (booking form needs to block these dates), admin write
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view blackout dates"    ON blackout_dates;
DROP POLICY IF EXISTS "Admins can manage blackout dates"  ON blackout_dates;

CREATE POLICY "Public can view blackout dates"
  ON blackout_dates FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage blackout dates"
  ON blackout_dates FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- STEP 5: Fix INVOICES — drop the policy that exposed all invoiced to anyone
-- Token-based access is now handled via get_invoice_by_payment_token() RPC
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view invoice by payment token" ON invoices;

CREATE OR REPLACE FUNCTION public.get_invoice_by_payment_token(p_token text)
RETURNS TABLE (LIKE invoices)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM invoices
  WHERE payment_token::text = p_token
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- STEP 6: Fix INVOICE_PAYMENTS — remove the anyone-can-insert policy
-- Service role (Stripe webhook) bypasses RLS; regular users must not insert
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can create invoice payments" ON invoice_payments;

-- ---------------------------------------------------------------------------
-- STEP 7: Fix SUPPORT_TICKETS INSERT — require auth and enforce user_id
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;

CREATE POLICY "Authenticated users can create tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- STEP 8: PROFILES policies
-- Users see/edit own row; admins see all (uses is_admin() to avoid recursion)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile"    ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles"  ON profiles;
DROP POLICY IF EXISTS "Users can update own profile"  ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING  (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------------------
-- STEP 9: EVENTS — public read, admin write
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view events"    ON events;
DROP POLICY IF EXISTS "Admins can manage events"  ON events;

CREATE POLICY "Public can view events"
  ON events FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage events"
  ON events FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- STEP 10: EVENT_CATEGORIES — public read, admin write
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view event categories"    ON event_categories;
DROP POLICY IF EXISTS "Admins can manage event categories"  ON event_categories;

CREATE POLICY "Public can view event categories"
  ON event_categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage event categories"
  ON event_categories FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- STEP 11: GALLERY_ITEMS — public read (watermarked), admin write
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view gallery items"    ON gallery_items;
DROP POLICY IF EXISTS "Admins can manage gallery items"  ON gallery_items;

CREATE POLICY "Public can view gallery items"
  ON gallery_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage gallery items"
  ON gallery_items FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- STEP 12: FAVORITES — authenticated users manage only their own
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own favorites" ON favorites;

CREATE POLICY "Users can manage own favorites"
  ON favorites FOR ALL
  TO authenticated
  USING  (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- ---------------------------------------------------------------------------
-- STEP 13: SERVICE_TYPES — public read (booking form), admin write
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view service types"    ON service_types;
DROP POLICY IF EXISTS "Admins can manage service types"  ON service_types;

CREATE POLICY "Public can view service types"
  ON service_types FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage service types"
  ON service_types FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- STEP 14: SITE_SETTINGS — public read, admin update (single-record table)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view site settings"    ON site_settings;
DROP POLICY IF EXISTS "Admins can update site settings"  ON site_settings;

CREATE POLICY "Public can view site settings"
  ON site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can update site settings"
  ON site_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- STEP 15: TEAM_MEMBERS — public read, admin write
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view team members"    ON team_members;
DROP POLICY IF EXISTS "Admins can manage team members"  ON team_members;

CREATE POLICY "Public can view team members"
  ON team_members FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage team members"
  ON team_members FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- STEP 16: NOTIFICATION_SETTINGS — admin only (contains Twilio credentials)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage notification settings" ON notification_settings;

CREATE POLICY "Admins can manage notification settings"
  ON notification_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- STEP 17: PORTAL_PROJECTS — admin only
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage portal projects" ON portal_projects;

CREATE POLICY "Admins can manage portal projects"
  ON portal_projects FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- STEP 18: PORTFOLIO_PROJECTS — public read, admin write
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view portfolio projects"    ON portfolio_projects;
DROP POLICY IF EXISTS "Admins can manage portfolio projects"  ON portfolio_projects;

CREATE POLICY "Public can view portfolio projects"
  ON portfolio_projects FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage portfolio projects"
  ON portfolio_projects FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
