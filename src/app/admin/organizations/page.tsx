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

export default function OrganizationsPage() {
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
      setNewOrg({ name: '', category: 'other', plan: 'basic' })
    }
  }, [addDialogOpen])

  const handleCreateOrg = async () => {
    if (!newOrg.name || !newOrg.category || !newOrg.plan || !selectedOwnerClientId) {
      return
    }

    // BUG FIX 1: Prevent double submit
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)

    try {
      // Call new API route for invitation system
      const response = await fetch('/api/admin/organizations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOrg.name,
          category: newOrg.category,
          plan: newOrg.plan,
          clientId: selectedOwnerClientId,
        }),
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
    } catch (error: any) {
      toast.error(`שגיאה: ${error.message}`)
    } finally {
      setIsSubmitting(false) // BUG FIX 1: Reset submitting state
    }
  }

  const handleToggleFeature = (orgId: string, feature: 'sms' | 'payments' | 'analytics', enabled: boolean) => {
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
    const labels: Record<string, string> = {
      salon: 'מספרה',
      carwash: 'שטיפת רכב',
      clinic: 'מרפאה',
      restaurant: 'מסעדה',
      gym: 'חדר כושר',
      other: 'אחר',
    }
    return labels[category] || category
  }

  const getPlanLabel = (plan: string) => {
    const labels: Record<string, string> = {
      basic: 'בסיסי',
      pro: 'מקצועי',
      enterprise: 'ארגוני',
    }
    return labels[plan] || plan
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ניהול ארגונים</h1>
          <p className="text-gray-600 mt-1">
            סה״כ: {organizations?.length || 0} ארגונים
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="w-4 h-4 ml-2" />
          הוסף ארגון חדש
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="חפש לפי שם או אימייל..."
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
            כל הארגונים
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">טוען נתונים...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם הארגון</TableHead>
                  <TableHead className="text-right">קטגוריה</TableHead>
                  <TableHead className="text-right">תוכנית</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">SMS</TableHead>
                  <TableHead className="text-right">Payments</TableHead>
                  <TableHead className="text-right">Analytics</TableHead>
                  <TableHead className="text-right">תאריך</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
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
                            פעיל
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            חסום
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
                      אין ארגונים במערכת
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הוסף ארגון חדש</DialogTitle>
            <DialogDescription>
              צור ארגון חדש והקצה לקוח כבעלים. הלקוח יוקצה אוטומטית כאשר יתחבר עם Google.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* TASK 1: Client Selector (replaces Owner Name, Email, Phone) */}
            <div>
              <Label>בעלים (בחר לקוח מהמערכת) *</Label>
              {loadingAllClients ? (
                <div className="text-sm text-gray-500 py-2">טוען לקוחות...</div>
              ) : allClients.length > 0 ? (
                <Select value={selectedOwnerClientId} onValueChange={setSelectedOwnerClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר לקוח" />
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
                  אין לקוחות עם אימייל במערכת
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                💡 אם הלקוח כבר התחבר: יוקצה מיד. אם לא: יוזמן ויוקצה אוטומטית בהתחברות הראשונה.
              </p>
            </div>

            <div>
              <Label>שם העסק *</Label>
              <Input
                value={newOrg.name}
                onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                placeholder="שם העסק"
              />
            </div>
            
            <div>
              <Label>קטגוריה</Label>
              <Select value={newOrg.category} onValueChange={(value) => setNewOrg({ ...newOrg, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salon">מספרה</SelectItem>
                  <SelectItem value="carwash">שטיפת רכב</SelectItem>
                  <SelectItem value="clinic">מרפאה</SelectItem>
                  <SelectItem value="restaurant">מסעדה</SelectItem>
                  <SelectItem value="gym">חדר כושר</SelectItem>
                  <SelectItem value="other">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>תוכנית</Label>
              <Select value={newOrg.plan} onValueChange={(value) => setNewOrg({ ...newOrg, plan: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">בסיסי</SelectItem>
                  <SelectItem value="pro">מקצועי</SelectItem>
                  <SelectItem value="enterprise">ארגוני</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setAddDialogOpen(false)}
              disabled={isSubmitting}
            >
              ביטול
            </Button>
            <Button 
              onClick={handleCreateOrg} 
              disabled={!newOrg.name || !selectedOwnerClientId || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                  יוצר...
                </>
              ) : (
                'צור ארגון'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Organization Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>פרטי ארגון</SheetTitle>
          </SheetHeader>
          
          {selectedOrg && (
            <div className="space-y-6 mt-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">מידע כללי</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>שם הארגון</Label>
                    <Input value={selectedOrg.name} disabled />
                  </div>
                  <div>
                    <Label>אימייל</Label>
                    <Input value={selectedOrg.email || ''} disabled />
                  </div>
                  <div>
                    <Label>טלפון</Label>
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
