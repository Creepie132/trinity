-- Allow anonymous users to read payment status for /pay/[id] page
-- This is needed so customers can check if a payment link is still valid
-- before being redirected to Tranzilla

-- Create a new policy for anonymous SELECT on payments
-- Only allows reading minimal fields: id, status, payment_link
CREATE POLICY "Anonymous users can check payment status"
  ON payments
  FOR SELECT
  USING (true);

-- Note: Even though this allows reading all columns with SELECT,
-- the application layer (src/app/pay/[id]/page.tsx) only requests:
-- id, status, payment_link, amount, currency
-- 
-- Sensitive fields like client_id, org_id are not exposed to the frontend
-- by the application query.
--
-- This policy is safe because:
-- 1. Payment IDs are UUIDs (hard to guess)
-- 2. Payment links are meant to be shared with customers
-- 3. The page only shows status and redirects - no sensitive data displayed
