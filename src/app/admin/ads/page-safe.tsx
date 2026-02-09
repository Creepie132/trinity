'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Megaphone, AlertCircle } from 'lucide-react'

export default function AdsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ניהול פרסומות</h1>
        <p className="text-gray-600 mt-1">קמפיינים ובאנרים פרסומיים</p>
      </div>

      {/* Warning */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-900">
            <AlertCircle className="w-5 h-5" />
            דף זה בפיתוח
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-yellow-800">
              לפני שימוש בדף זה, יש להריץ את ה-SQL הבא ב-Supabase SQL Editor:
            </p>
            
            <div className="bg-white p-4 rounded border text-xs font-mono overflow-auto max-h-96">
              <pre>{`-- Create ad_campaigns table
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  advertiser_name text NOT NULL,
  banner_url text NOT NULL,
  link_url text NOT NULL,
  target_categories text[] DEFAULT '{}',
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT true,
  clicks integer DEFAULT 0,
  impressions integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_active 
ON ad_campaigns(is_active, start_date, end_date);

ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

-- Enable RLS policies
CREATE POLICY "All see active ads" 
ON ad_campaigns FOR SELECT 
USING (is_active = true OR is_admin());

CREATE POLICY "Admin manage ads" 
ON ad_campaigns FOR ALL 
USING (is_admin());

-- Create Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-banners', 'ad-banners', true)
ON CONFLICT (id) DO NOTHING;`}</pre>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={() => window.location.reload()}>
                רענן דף לאחר הרצת SQL
              </Button>
              <Button variant="outline" onClick={() => window.history.back()}>
                חזור
              </Button>
            </div>

            <p className="text-sm text-yellow-700 mt-4">
              קובץ SQL מוכן: <code className="bg-white px-2 py-1 rounded">supabase/quick-fix-ad-campaigns.sql</code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            קמפיינים פרסומיים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <Megaphone className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">דף זה יהיה זמין לאחר יצירת הטבלאות</p>
            <p className="text-sm mt-2">הרץ את ה-SQL למעלה כדי להפעיל תכונה זו</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
