-- Add 'cancelled' status to payments table
-- Drop existing constraint
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;

-- Add new constraint with 'cancelled' status
ALTER TABLE payments ADD CONSTRAINT payments_status_check 
  CHECK (status IN ('pending','completed','failed','refunded','cancelled'));
