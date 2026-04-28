-- ================================================
-- TRINITY CRM — Add quantity to visit_services
-- 2026-04-28
-- ================================================
-- Семантика: price = цена за единицу, quantity = кол-во
-- Итоговая стоимость позиции = price * quantity
-- Вычисляется на клиенте, в БД не дублируется

ALTER TABLE visit_services
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

-- Validate: quantity must be >= 1
ALTER TABLE visit_services
  ADD CONSTRAINT visit_services_quantity_positive
  CHECK (quantity >= 1);
