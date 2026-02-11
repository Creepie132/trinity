'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { 
  useAllOrganizations,
  useOrganization,
  useOrgUsers,
  useCreateOrganization,
  useUpdateOrganization,
  useToggleOrgFeature,
  useToggleOrgActive,
  useAddOrgUser,
  useRemoveOrgUser,
} from '@/hooks/useAdmin'
import { Building2, Plus, Search, Eye, Trash, CheckCircle2, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { Organization } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'

export default function OrganizationsPage() {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [orgClients, setOrgClients] = useState<Array<{id: string, first_name: string, last_name: string, email: string | null}>>([])
  const [loadingClients, setLoadingClients] = useState(false)

  // TASK 1: State for creating org with client assignment
  const [allClients, setAllClients] = useState<Array<{id: string, first_name: string, last_name: string, email: string | null, org_id: string | null}>>([])
  const [loadingAllClients, setLoadingAllClients] = useState(false)
  const [selectedOwnerClientId, setSelectedOwnerClientId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false) // BUG FIX 1: Prevent double submit

  // TASK 1: Toggle between existing/new client
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing')
  const [newClient, setNewClient] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })

  const [newOrg, setNewOrg] = useState({
    name: '',
    category: 'other',
    plan: 'basic',
  })

  const { data: organizations, isLoading } = useAllOrganizations(searchQuery)
  const { data: selectedOrg } = useOrganization(selectedOrgId || undefined)
  const { data: orgUsers } = useOrgUsers(selectedOrgId || undefined)
  
  const createOrg = useCreateOrganization()
  const updateOrg = useUpdateOrganization()
  const toggleFeature = useToggleOrgFeature()
  const toggleActive = useToggleOrgActive()
  const addUser = useAddOrgUser()
  const removeUser = useRemoveOrgUser()

  // TASK 1 & 2: Load all clients when add dialog opens
  useEffect(() => {
    if (addDialogOpen) {
      setLoadingAllClients(true)
      supabase
        .from('clients')
        .select('id, first_name, last_name, email, org_id')
        .not('email', 'is', null) // Only clients with email
        .order('first_name')
        .then(({ data, error }) => {
          if (data && !error) {
            setAllClients(data)
          }
          setLoadingAllClients(false)
        })
    } else {
      setAllClients([])
      setSelectedOwnerClientId('')
      setClientMode('existing')
      setNewClient({ firstName: '', lastName: '', email: '', phone: '' })
      setNewOrg({ name: '', category: 'other', plan: 'basic' })
    }
  }, [addDialogOpen])

  const handleCreateOrg = async () => {
    // Validation based on mode
    if (!newOrg.name || !newOrg.category || !newOrg.plan) {
      return
    }

    if (clientMode === 'existing' && !selectedOwnerClientId) {
      return
    }

    if (clientMode === 'new' && (!newClient.firstName || !newClient.lastName || !newClient.email)) {
      return
    }

    // BUG FIX 1: Prevent double submit
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)

    try {
      // TASK 2: Prepare payload based on mode
      const payload = {
        name: newOrg.name,
        category: newOrg.category,
        plan: newOrg.plan,
        ...(clientMode === 'existing' 
          ? { clientId: selectedOwnerClientId }
          : { 
              newClient: {
                firstName: newClient.firstName,
                lastName: newClient.lastName,
                email: newClient.email,
                phone: newClient.phone || null,
              }
            }
        ),
      }

      // Call new API route for invitation system
      const response = await fetch('/api/admin/organizations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create organization')
      }

      // Success feedback
      if (result.assignment.immediate) {
        toast.success(`ארגון נוצר והבעלים הוקצה מיד!`, {
          description: `${result.client.name} (${result.client.email}) כבר התחבר למערכת.`
        })
      } else if (result.assignment.invitation) {
        toast.success(`ארגון נוצר והזמנה נשלחה!`, {
          description: `${result.client.name} (${result.client.email}) יוקצה אוטומטית כאשר יתחבר עם Google.`
        })
      } else {
        toast.success(`ארגון נוצר בהצלחה!`)
      }

      // Refresh data
      createOrg.mutate({ ...newOrg, email: result.client.email })
      
      setAddDialogOpen(false)
      setNewOrg({ name: '', category: 'other', plan: 'basic' })
      setSelectedOwnerClientId('')
      setNewClient({ firstName: '', lastName: '', email: '', phone: '' })
      setClientMode('existing')
    } catch (error: any) {
      toast.error(`שגיאה: ${error.message}`)
    } finally {
      setIsSubmitting(false) // BUG FIX 1: Reset submitting state
    }
  }

  const handleToggleFeature = (orgId: string, feature: 'sms' | 'payments' | 'analytics' | 'subscriptions', enabled: boolean) => {
    toggleFeature.mutate({ orgId, feature, enabled })
  }

  const handleViewOrg = (orgId: string) => {
    setSelectedOrgId(orgId)
    setSheetOpen(true)
  }

  const handleToggleActive = (orgId: string, isActive: boolean) => {
    toggleActive.mutate({ orgId, isActive })
  }

  // Load clients when dialog opens
  useEffect(() => {
    if (addUserDialogOpen && selectedOrgId) {
      setLoadingClients(true)
      supabase
        .from('clients')
        .select('id, first_name, last_name, email')
        .eq('org_id', selectedOrgId)
        .not('email', 'is', null) // Only clients with email
        .order('first_name')
        .then(({ data, error }) => {
          if (data && !error) {
            setOrgClients(data)
          }
          setLoadingClients(false)
        })
    } else {
      setOrgClients([])
      setSelectedClientId('')
      setNewUserEmail('')
    }
  }, [addUserDialogOpen, selectedOrgId])

  const handleAddUser = async () => {
    // Support both manual email input and client selection
    const emailToAdd = selectedClientId 
      ? orgClients.find(c => c.id === selectedClientId)?.email 
      : newUserEmail
    
    if (!selectedOrgId || !emailToAdd) return
    
    await addUser.mutateAsync({
      orgId: selectedOrgId,
      email: emailToAdd,
    })
    
    setNewUserEmail('')
    setSelectedClientId('')
    setAddUserDialogOpen(false)
  }

  const handleRemoveUser = (userId: string) => {
    if (!selectedOrgId) return
    if (confirm('האם למחוק משתמש זה?')) {
      removeUser.mutate({ userId, orgId: selectedOrgId })
    }
  }

  const getCategoryLabel = (category: string) => {
    const categoryKeys: Record<string, string> = {
      salon: 'admin.orgs.salon',
      carwash: 'admin.orgs.carwash',
      clinic: 'admin.orgs.clinic',
      restaurant: 'admin.orgs.restaurant',
      gym: 'admin.orgs.gym',
      other: 'admin.orgs.other',
    }
    return t(categoryKeys[category]) || category
  }

  const getPlanLabel = (plan: string) => {
    const planKeys: Record<string, string> = {
      basic: 'admin.orgs.basic',
      pro: 'admin.orgs.pro',
      enterprise: 'admin.orgs.enterprise',
    }
    return t(planKeys[plan]) || plan
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.orgs.title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('admin.orgs.total')}: {organizations?.length || 0} {t('admin.orgs.organizations')}
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="w-4 h-4 ml-2" />
          {t('admin.orgs.addNew')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder={t('admin.orgs.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {t('admin.orgs.all')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{t('admin.orgs.name')}</TableHead>
                  <TableHead className="text-right">{t('admin.orgs.category')}</TableHead>
                  <TableHead className="text-right">{t('admin.orgs.plan')}</TableHead>
                  <TableHead className="text-right">{t('admin.orgs.status')}</TableHead>
                  <TableHead className="text-right">SMS</TableHead>
                  <TableHead className="text-right">Payments</TableHead>
                  <TableHead className="text-right">Analytics</TableHead>
                  <TableHead className="text-right">מנויים</TableHead>
                  <TableHead className="text-right">{t('admin.orgs.created')}</TableHead>
                  <TableHead className="text-right">{t('clients.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations?.map((org: Organization) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-sm text-gray-500">{org.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryLabel(org.category)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge>{getPlanLabel(org.plan)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={org.is_active ? 'default' : 'destructive'} className="flex items-center gap-1 w-fit">
                        {org.is_active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            {t('admin.orgs.active')}
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            {t('admin.orgs.inactive')}
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={org.features?.sms || false}
                        onCheckedChange={(checked) => handleToggleFeature(org.id, 'sms', checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={org.features?.payments || false}
                        onCheckedChange={(checked) => handleToggleFeature(org.id, 'payments', checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={org.features?.analytics || false}
                        onCheckedChange={(checked) => handleToggleFeature(org.id, 'analytics', checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={org.features?.subscriptions || false}
                        onCheckedChange={(checked) => handleToggleFeature(org.id, 'subscriptions', checked)}
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(org.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewOrg(org.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!organizations || organizations.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-gray-500">
                      {t('admin.orgs.noOrgs')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Organization Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('admin.orgs.addDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('admin.orgs.addDialog.desc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* TASK 1: Tabs for Existing vs New Client */}
            <Tabs value={clientMode} onValueChange={(v) => setClientMode(v as 'existing' | 'new')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">{t('admin.orgs.existingClient')}</TabsTrigger>
                <TabsTrigger value="new">{t('admin.orgs.newClient')}</TabsTrigger>
              </TabsList>
              
              {/* Existing Client Tab */}
              <TabsContent value="existing" className="space-y-4">
                <div>
                  <Label>{t('admin.orgs.selectClient')} *</Label>
                  {loadingAllClients ? (
                    <div className="text-sm text-gray-500 py-2">{t('admin.orgs.loadingClients')}</div>
                  ) : allClients.length > 0 ? (
                    <Select value={selectedOwnerClientId} onValueChange={setSelectedOwnerClientId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('admin.orgs.selectClientPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {allClients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.first_name} {client.last_name} ({client.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm text-gray-500 py-2 border rounded-md px-3 bg-gray-50">
                      {t('admin.orgs.noClientsWithEmail')}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {t('admin.orgs.autoAssignNote')}
                  </p>
                </div>
              </TabsContent>

              {/* New Client Tab */}
              <TabsContent value="new" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('clients.firstName')} *</Label>
                    <Input
                      value={newClient.firstName}
                      onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
                      placeholder={t('clients.firstName')}
                    />
                  </div>
                  <div>
                    <Label>{t('clients.lastName')} *</Label>
                    <Input
                      value={newClient.lastName}
                      onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
                      placeholder={t('clients.lastName')}
                    />
                  </div>
                </div>
                <div>
                  <Label>{t('clients.email')} *</Label>
                  <Input
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label>{t('clients.phone')}</Label>
                  <Input
                    type="tel"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    placeholder="050-1234567"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {t('admin.orgs.clientCreatedNote')}
                </p>
              </TabsContent>
            </Tabs>

            {/* Organization Details (common for both modes) */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-semibold text-sm">{t('admin.orgs.orgDetails')}</h3>
              
              <div>
                <Label>{t('admin.orgs.businessName')} *</Label>
                <Input
                  value={newOrg.name}
                  onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                  placeholder={t('admin.orgs.businessNamePlaceholder')}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('admin.orgs.category')}</Label>
                  <Select value={newOrg.category} onValueChange={(value) => setNewOrg({ ...newOrg, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salon">{t('admin.orgs.salon')}</SelectItem>
                      <SelectItem value="carwash">{t('admin.orgs.carwash')}</SelectItem>
                      <SelectItem value="clinic">{t('admin.orgs.clinic')}</SelectItem>
                      <SelectItem value="restaurant">{t('admin.orgs.restaurant')}</SelectItem>
                      <SelectItem value="gym">{t('admin.orgs.gym')}</SelectItem>
                      <SelectItem value="other">{t('admin.orgs.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('admin.orgs.plan')}</Label>
                  <Select value={newOrg.plan} onValueChange={(value) => setNewOrg({ ...newOrg, plan: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">{t('admin.orgs.basic')}</SelectItem>
                      <SelectItem value="pro">{t('admin.orgs.pro')}</SelectItem>
                      <SelectItem value="enterprise">{t('admin.orgs.enterprise')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setAddDialogOpen(false)}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleCreateOrg} 
              disabled={
                !newOrg.name || 
                (clientMode === 'existing' && !selectedOwnerClientId) ||
                (clientMode === 'new' && (!newClient.firstName || !newClient.lastName || !newClient.email)) ||
                isSubmitting
              }
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                  {t('admin.orgs.creating')}
                </>
              ) : (
                t('admin.orgs.createOrg')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Organization Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('admin.orgs.orgDetailsSheet')}</SheetTitle>
          </SheetHeader>
          
          {selectedOrg && (
            <div className="space-y-6 mt-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('admin.orgs.generalInfo')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>{t('admin.orgs.name')}</Label>
                    <Input value={selectedOrg.name} disabled />
                  </div>
                  <div>
                    <Label>{t('clients.email')}</Label>
                    <Input value={selectedOrg.email || ''} disabled />
                  </div>
                  <div>
                    <Label>{t('clients.phone')}</Label>
                    <Input value={selectedOrg.phone || ''} disabled />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>קטגוריה</Label>
                      <Badge variant="outline" className="mt-2">{getCategoryLabel(selectedOrg.category)}</Badge>
                    </div>
                    <div>
                      <Label>תוכנית</Label>
                      <Badge className="mt-2">{getPlanLabel(selectedOrg.plan)}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Features */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">פיצ'רים</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>SMS Campaigns</Label>
                    <Switch
                      checked={selectedOrg.features?.sms || false}
                      onCheckedChange={(checked) => handleToggleFeature(selectedOrg.id, 'sms', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Payments</Label>
                    <Switch
                      checked={selectedOrg.features?.payments || false}
                      onCheckedChange={(checked) => handleToggleFeature(selectedOrg.id, 'payments', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Analytics</Label>
                    <Switch
                      checked={selectedOrg.features?.analytics || false}
                      onCheckedChange={(checked) => handleToggleFeature(selectedOrg.id, 'analytics', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>מנויים (Subscriptions)</Label>
                    <Switch
                      checked={selectedOrg.features?.subscriptions || false}
                      onCheckedChange={(checked) => handleToggleFeature(selectedOrg.id, 'subscriptions', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Status Control */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">ניהול גישה</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedOrg.is_active ? (
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={() => handleToggleActive(selectedOrg.id, false)}
                    >
                      <XCircle className="w-4 h-4 ml-2" />
                      חסום גישה
                    </Button>
                  ) : (
                    <Button 
                      className="w-full"
                      onClick={() => handleToggleActive(selectedOrg.id, true)}
                    >
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                      הפעל גישה
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Users */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    משתמשים
                    <Button size="sm" onClick={() => setAddUserDialogOpen(true)}>
                      <Plus className="w-4 h-4 ml-1" />
                      הוסף
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {orgUsers?.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{user.email}</p>
                          <p className="text-sm text-gray-500">
                            {user.role === 'owner' ? 'בעלים' : user.role === 'admin' ? 'מנהל' : 'צוות'}
                          </p>
                        </div>
                        {user.role !== 'owner' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleRemoveUser(user.id)}
                          >
                            <Trash className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {(!orgUsers || orgUsers.length === 0) && (
                      <div className="text-center py-4 text-gray-500">אין משתמשים</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add User Dialog */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הוסף משתמש</DialogTitle>
            <DialogDescription>
              בחר לקוח קיים או הזן אימייל ידנית
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Select from existing clients */}
            <div>
              <Label>בחר לקוח מהמערכת</Label>
              {loadingClients ? (
                <div className="text-sm text-gray-500 py-2">טוען לקוחות...</div>
              ) : orgClients.length > 0 ? (
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר לקוח" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.first_name} {client.last_name} ({client.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm text-gray-500 py-2 border rounded-md px-3 bg-gray-50">
                  אין לקוחות עם אימייל בארגון זה
                </div>
              )}
            </div>

            {/* OR manual email input */}
            <div>
              <Label>או הזן אימייל ידנית</Label>
              <Input
                type="email"
                value={newUserEmail}
                onChange={(e) => {
                  setNewUserEmail(e.target.value)
                  setSelectedClientId('') // Clear selection if typing manually
                }}
                placeholder="user@example.com"
                disabled={!!selectedClientId} // Disable if client selected
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleAddUser} disabled={!selectedClientId && !newUserEmail}>
              הוסף משתמש
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
