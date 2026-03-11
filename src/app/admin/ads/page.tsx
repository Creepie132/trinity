'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  useAdStats,
  useAdCampaigns,
  useCreateAdCampaign,
  useUpdateAdCampaign,
  useToggleAdActive,
  useDeleteAdCampaign,
  uploadBanner,
} from '@/hooks/useAdmin'
import { 
  Megaphone, 
  Plus,
  Edit,
  Trash,
  TrendingUp,
  MousePointerClick,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { AdCampaign } from '@/types/database'
import { useLanguage } from '@/contexts/LanguageContext'

function AdsPageContent() {
  const { t } = useLanguage()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<AdCampaign | null>(null)
  const [uploading, setUploading] = useState(false)

  const CATEGORIES = [
    { value: 'salon', label: t('admin.orgs.salon') },
    { value: 'carwash', label: t('admin.orgs.carwash') },
    { value: 'clinic', label: t('admin.orgs.clinic') },
    { value: 'restaurant', label: t('admin.orgs.restaurant') },
    { value: 'gym', label: t('admin.orgs.gym') },
    { value: 'other', label: t('admin.orgs.other') },
  ]

  const [newCampaign, setNewCampaign] = useState({
    advertiser_name: '',
    banner_url: '',
    link_url: '',
    target_categories: [] as string[],
    start_date: '',
    end_date: '',
  })

  // Catch unhandled promise rejections in this component
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection in AdsPage:', event.reason)
      event.preventDefault() // Prevent the error from bubbling up
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  const { data: stats, isLoading: statsLoading, error: statsError } = useAdStats()
  const { data: campaigns, isLoading: campaignsLoading, error: campaignsError } = useAdCampaigns()
  
  const createCampaign = useCreateAdCampaign()
  const updateCampaign = useUpdateAdCampaign()
  const toggleActive = useToggleAdActive()
  const deleteCampaign = useDeleteAdCampaign()

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('אנא העלה קובץ תמונה (jpg, png, webp)')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('הקובץ גדול מדי. מקסימום: 5MB')
      return
    }

    try {
      setUploading(true)
      const url = await uploadBanner(file)
      setNewCampaign({ ...newCampaign, banner_url: url })
    } catch (error: any) {
      console.error('Upload error:', error)
      
      let errorMessage = error.message
      
      if (errorMessage.includes('Bucket not found')) {
        errorMessage = 'Storage bucket לא קיים. צור bucket בשם "ad-banners" ב-Supabase Dashboard → Storage'
      } else if (errorMessage.includes('SERVICE_ROLE_KEY')) {
        errorMessage = 'חסר SUPABASE_SERVICE_ROLE_KEY ב-.env.local. הוסף אותו והפעל מחדש את השרת'
      } else if (errorMessage.includes('row-level security')) {
        errorMessage = 'בעיית RLS. ראה הוראות ב-FIX_BANNER_UPLOAD.md'
      }
      
      alert(`שגיאה בהעלאת קובץ: ${errorMessage}`)
    } finally {
      setUploading(false)
    }
  }

  const handleCreateCampaign = async () => {
    if (!newCampaign.advertiser_name || !newCampaign.banner_url || !newCampaign.link_url || !newCampaign.start_date || !newCampaign.end_date) {
      alert('אנא מלא את כל השדות החובה')
      return
    }

    await createCampaign.mutateAsync(newCampaign)
    setAddDialogOpen(false)
    setNewCampaign({
      advertiser_name: '',
      banner_url: '',
      link_url: '',
      target_categories: [],
      start_date: '',
      end_date: '',
    })
  }

  const handleToggleActive = (id: string, isActive: boolean) => {
    toggleActive.mutate({ id, isActive })
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`${t('admin.ads.deleteConfirm')} "${name}"?`)) {
      deleteCampaign.mutate(id)
    }
  }

  const toggleCategory = (category: string) => {
    const current = newCampaign.target_categories
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category]
    setNewCampaign({ ...newCampaign, target_categories: updated })
  }

  const calculateCTR = (clicks: number, impressions: number) => {
    if (impressions === 0) return '0.00'
    return ((clicks / impressions) * 100).toFixed(2)
  }

  const getCampaignStatus = (campaign: AdCampaign) => {
    const now = new Date()
    const start = new Date(campaign.start_date)
    const end = new Date(campaign.end_date)

    if (!campaign.is_active) {
      return { label: t('admin.ads.inactive'), variant: 'secondary' as const, icon: XCircle }
    }
    
    if (now < start) {
      return { label: t('admin.ads.scheduled'), variant: 'default' as const, icon: Clock }
    }
    
    if (now > end) {
      return { label: t('admin.ads.expired'), variant: 'secondary' as const, icon: XCircle }
    }
    
    return { label: t('admin.ads.active'), variant: 'default' as const, icon: CheckCircle2 }
  }

  // Show errors if any
  if (statsError || campaignsError) {
    const error = statsError || campaignsError
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    const isTableMissing = errorMessage.includes('relation') || 
                           errorMessage.includes('does not exist') ||
                           errorMessage.includes('PGRST204')
    
    return (
      <div className="space-y-6">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-xl font-bold text-red-900 mb-2">שגיאה בטעינת נתונים</h2>
          <p className="text-red-700 mb-4">{errorMessage}</p>
          
          {isTableMissing && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="font-semibold text-yellow-900 mb-2">🔧 פתרון:</p>
              <p className="text-sm text-yellow-800 mb-3">
                טבלת ad_campaigns לא קיימת. יש להריץ את ה-SQL הבא ב-Supabase:
              </p>
              <div className="bg-white p-3 rounded border text-xs font-mono overflow-auto max-h-64">
                <pre>{`-- Copy this to Supabase SQL Editor:

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

-- Then refresh this page`}</pre>
              </div>
              <p className="text-xs text-yellow-700 mt-2">
                או выполни полный файл: <code>supabase/schema-v2.sql</code>
              </p>
            </div>
          )}
          
          <Button onClick={() => window.location.reload()} className="mt-4">
            נסה שוב
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('admin.ads.title')}</h1>
          <p className="text-gray-600 mt-1">{t('admin.ads.subtitle')}</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="w-4 h-4 ml-2" />
          {t('admin.ads.addNew')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('admin.ads.activeCampaigns')}</p>
                <p className="text-2xl md:text-3xl font-bold text-green-600 mt-1">
                  {stats?.activeCampaigns || 0}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Megaphone className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('admin.ads.totalClicks')}</p>
                <p className="text-2xl md:text-3xl font-bold text-blue-600 mt-1">
                  {stats?.monthClicks || 0}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <MousePointerClick className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('admin.ads.ctr')}</p>
                <p className="text-2xl md:text-3xl font-bold text-purple-600 mt-1">
                  {stats?.avgCtr || '0.00'}%
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            {t('admin.ads.allCampaigns')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {campaignsLoading ? (
            <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
          ) : (
            <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y">
              {campaigns?.map((campaign: AdCampaign) => {
                const status = getCampaignStatus(campaign)
                const StatusIcon = status.icon
                return (
                  <div key={campaign.id} className="py-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <img src={campaign.banner_url} alt={campaign.advertiser_name} className="w-16 h-10 object-cover rounded border flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{campaign.advertiser_name}</p>
                        <p className="text-xs text-gray-500 truncate">{campaign.link_url}</p>
                      </div>
                      <Badge variant={status.variant} className="flex items-center gap-1 flex-shrink-0">
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" />{campaign.clicks}</span>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{campaign.impressions}</span>
                      <span className="font-medium text-purple-600">{calculateCTR(campaign.clicks, campaign.impressions)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={campaign.is_active} onCheckedChange={(checked) => handleToggleActive(campaign.id, checked)} />
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(campaign.id, campaign.advertiser_name)} className="min-h-[44px]">
                        <Trash className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                )
              })}
              {(!campaigns || campaigns.length === 0) && (
                <div className="text-center py-12 text-gray-500">אין קמפיינים פעילים</div>
              )}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{t('admin.ads.advertiser')}</TableHead>
                  <TableHead className="text-right">{t('admin.ads.title')}</TableHead>
                  <TableHead className="text-right">{t('admin.ads.categories')}</TableHead>
                  <TableHead className="text-right">{t('admin.ads.dates')}</TableHead>
                  <TableHead className="text-right">{t('admin.ads.clicks')}</TableHead>
                  <TableHead className="text-right">{t('admin.ads.impressions')}</TableHead>
                  <TableHead className="text-right">{t('admin.ads.ctr')}</TableHead>
                  <TableHead className="text-right">{t('admin.orgs.status')}</TableHead>
                  <TableHead className="text-right">{t('clients.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns?.map((campaign: AdCampaign) => {
                  const status = getCampaignStatus(campaign)
                  const StatusIcon = status.icon

                  return (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{campaign.advertiser_name}</p>
                          <a 
                            href={campaign.link_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline"
                          >
                            {campaign.link_url}
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <img 
                          src={campaign.banner_url} 
                          alt={campaign.advertiser_name}
                          className="w-20 h-12 object-cover rounded border"
                        />
                      </TableCell>
                      <TableCell>
                        {campaign.target_categories.length === 0 ? (
                          <Badge variant="outline">הכל</Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {campaign.target_categories.map((cat) => (
                              <Badge key={cat} variant="secondary" className="text-xs">
                                {CATEGORIES.find(c => c.value === cat)?.label || cat}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(campaign.start_date), 'dd/MM/yyyy')}</p>
                          <p className="text-gray-500">עד {format(new Date(campaign.end_date), 'dd/MM/yyyy')}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MousePointerClick className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{campaign.clicks}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4 text-gray-400" />
                          <span>{campaign.impressions}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-purple-600">
                          {calculateCTR(campaign.clicks, campaign.impressions)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={campaign.is_active}
                            onCheckedChange={(checked) => handleToggleActive(campaign.id, checked)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(campaign.id, campaign.advertiser_name)}
                          >
                            <Trash className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {(!campaigns || campaigns.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-gray-500">
                      אין קמפיינים פעילים
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Campaign Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>הוסף קמפיין פרסומי</DialogTitle>
            <DialogDescription>
              צור קמפיין באנר חדש למערכת
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם המפרסם *</Label>
              <Input
                value={newCampaign.advertiser_name}
                onChange={(e) => setNewCampaign({ ...newCampaign, advertiser_name: e.target.value })}
                placeholder="שם החברה"
              />
            </div>

            <div>
              <Label>תמונת באנר *</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              {uploading && <p className="text-sm text-gray-500 mt-1">מעלה קובץ...</p>}
              {newCampaign.banner_url && (
                <img 
                  src={newCampaign.banner_url} 
                  alt="Preview" 
                  className="mt-2 w-full h-32 object-cover rounded border"
                />
              )}
            </div>

            <div>
              <Label>קישור יעד *</Label>
              <Input
                type="url"
                value={newCampaign.link_url}
                onChange={(e) => setNewCampaign({ ...newCampaign, link_url: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <Label>קטגוריות יעד</Label>
              <p className="text-sm text-gray-500 mb-2">השאר ריק כדי להציג לכולם</p>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <label key={cat.value} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={newCampaign.target_categories.includes(cat.value)}
                      onChange={() => toggleCategory(cat.value)}
                      className="rounded"
                    />
                    <span className="text-sm">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>תאריך התחלה *</Label>
                <Input
                  type="date"
                  value={newCampaign.start_date}
                  onChange={(e) => setNewCampaign({ ...newCampaign, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>תאריך סיום *</Label>
                <Input
                  type="date"
                  value={newCampaign.end_date}
                  onChange={(e) => setNewCampaign({ ...newCampaign, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              ביטול
            </Button>
            <Button 
              onClick={handleCreateCampaign}
              disabled={!newCampaign.advertiser_name || !newCampaign.banner_url || !newCampaign.link_url || !newCampaign.start_date || !newCampaign.end_date}
            >
              צור קמפיין
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdsPage() {
  return (
    <ErrorBoundary>
      <AdsPageContent />
    </ErrorBoundary>
  )
}
