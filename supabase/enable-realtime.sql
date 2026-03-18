-- Enable Realtime for Trinity CRM tables
-- Run this in Supabase SQL editor once (idempotent)

-- Add tables to the supabase_realtime publication
-- (Supabase creates this publication by default)
ALTER PUBLICATION supabase_realtime ADD TABLE visits;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE products;

-- REPLICA IDENTITY FULL enables UPDATE/DELETE payloads to include old row values.
-- Required if you use the `old` field in useRealtimeSync onEvent callbacks.
-- Safe to run multiple times.
ALTER TABLE visits   REPLICA IDENTITY FULL;
ALTER TABLE payments REPLICA IDENTITY FULL;
ALTER TABLE clients  REPLICA IDENTITY FULL;
ALTER TABLE products REPLICA IDENTITY FULL;
