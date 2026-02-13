// ================================================
// TRINITY CRM - Inventory System Types
// Version: 2.23.0
// ================================================

/**
 * Product (товар/услуга на складе)
 */
export interface Product {
  id: string
  org_id: string
  name: string
  description?: string
  barcode?: string
  sku?: string
  category?: string
  purchase_price?: number
  sell_price: number
  quantity: number
  min_quantity: number
  unit: string
  image_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Transaction types for inventory movement
 */
export type InventoryTransactionType = 
  | 'purchase'    // Покупка (увеличение склада)
  | 'sale'        // Продажа (уменьшение склада)
  | 'return'      // Возврат (увеличение склада)
  | 'adjustment'  // Коррекция (установка точного значения)
  | 'write_off'   // Списание (уменьшение склада)

/**
 * Inventory Transaction (движение товара)
 */
export interface InventoryTransaction {
  id: string
  org_id: string
  product_id: string
  type: InventoryTransactionType
  quantity: number
  price_per_unit?: number
  total_price?: number
  related_payment_id?: string
  related_visit_id?: string
  notes?: string
  created_at: string
  
  // Joined data
  products?: Product
}

/**
 * Create Product DTO
 */
export interface CreateProductDTO {
  name: string
  description?: string
  barcode?: string
  sku?: string
  category?: string
  purchase_price?: number
  sell_price: number
  quantity?: number
  min_quantity?: number
  unit?: string
  image_url?: string
}

/**
 * Update Product DTO
 */
export interface UpdateProductDTO {
  name?: string
  description?: string
  barcode?: string
  sku?: string
  category?: string
  purchase_price?: number
  sell_price?: number
  quantity?: number
  min_quantity?: number
  unit?: string
  image_url?: string
  is_active?: boolean
}

/**
 * Create Inventory Transaction DTO
 */
export interface CreateInventoryTransactionDTO {
  product_id: string
  type: InventoryTransactionType
  quantity: number
  price_per_unit?: number
  total_price?: number
  related_payment_id?: string
  related_visit_id?: string
  notes?: string
}
