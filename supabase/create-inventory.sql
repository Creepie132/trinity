-- ================================================
-- TRINITY CRM - Inventory System
-- Migration: Create products and inventory_transactions tables
-- Version: 2.23.0
-- Date: 2026-02-13
-- ================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- TABLE: products
-- Товары/услуги в складе организации
-- ================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  barcode TEXT,
  sku TEXT,
  category TEXT,
  purchase_price DECIMAL(10,2),
  sell_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER DEFAULT 0,
  min_quantity INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'יחידה',
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TABLE: inventory_transactions
-- История движения товаров
-- ================================================
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'sale', 'return', 'adjustment', 'write_off')),
  quantity INTEGER NOT NULL,
  price_per_unit DECIMAL(10,2),
  total_price DECIMAL(10,2),
  related_payment_id UUID REFERENCES payments(id),
  related_visit_id UUID REFERENCES visits(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- INDEXES for performance
-- ================================================

-- Products: query by org_id + active status
CREATE INDEX IF NOT EXISTS products_org_id_idx ON products(org_id);
CREATE INDEX IF NOT EXISTS products_org_active_idx ON products(org_id, is_active);
CREATE INDEX IF NOT EXISTS products_barcode_idx ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS products_sku_idx ON products(sku) WHERE sku IS NOT NULL;

-- Inventory transactions: query by org_id + product_id
CREATE INDEX IF NOT EXISTS inventory_transactions_org_id_idx ON inventory_transactions(org_id);
CREATE INDEX IF NOT EXISTS inventory_transactions_product_id_idx ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS inventory_transactions_created_at_idx ON inventory_transactions(created_at DESC);

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================

-- Enable RLS on both tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Products: Users can only see products from their organization
CREATE POLICY "Users can view their org's products" ON products
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert products in their org" ON products
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org's products" ON products
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM org_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their org's products" ON products
  FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM org_users WHERE user_id = auth.uid()
    )
  );

-- Inventory Transactions: Users can only see transactions from their organization
CREATE POLICY "Users can view their org's transactions" ON inventory_transactions
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert transactions in their org" ON inventory_transactions
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_users WHERE user_id = auth.uid()
    )
  );

-- ================================================
-- TRIGGER: Update updated_at timestamp on products
-- ================================================
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at_trigger
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_products_updated_at();

-- ================================================
-- COMMENTS for documentation
-- ================================================

COMMENT ON TABLE products IS 'Товары и услуги в складе организации';
COMMENT ON TABLE inventory_transactions IS 'История движения товаров (покупка, продажа, возврат, списание)';

COMMENT ON COLUMN products.quantity IS 'Текущее количество на складе';
COMMENT ON COLUMN products.min_quantity IS 'Минимальный остаток для уведомлений';
COMMENT ON COLUMN products.unit IS 'Единица измерения (יחידה, קילוגרם, ליטר, и т.д.)';
COMMENT ON COLUMN products.is_active IS 'Активен ли товар (false = архив)';

COMMENT ON COLUMN inventory_transactions.type IS 'Тип операции: purchase (покупка), sale (продажа), return (возврат), adjustment (коррекция), write_off (списание)';
COMMENT ON COLUMN inventory_transactions.quantity IS 'Количество товара в операции (может быть отрицательным для списаний)';
COMMENT ON COLUMN inventory_transactions.related_payment_id IS 'Связь с платежом (если применимо)';
COMMENT ON COLUMN inventory_transactions.related_visit_id IS 'Связь с визитом (если применимо)';

-- ================================================
-- END OF MIGRATION
-- ================================================
