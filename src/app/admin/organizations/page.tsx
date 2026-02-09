'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export default function OrganizationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')

  const [newOrg, setNewOrg] = useState({
    name: '',
    email: '',
    phone: '',
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

  const handleCreateOrg = async () => {
    if (!newOrg.name || !newOrg.email) {
      return
    }

    await createOrg.mutateAsync(newOrg)
    setAddDialogOpen(false)
    setNewOrg({ name: '', email: '', phone: '', category: 'other', plan: 'basic' })
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

  const handleAddUser = async () => {
    if (!selectedOrgId || !newUserEmail) return
    
    await addUser.mutateAsync({
      orgId: selectedOrgId,
      email: newUserEmail,
    })
    
    setNewUserEmail('')
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
                  <TableHead>שם הארגון</TableHead>
                  <TableHead>קטגוריה</TableHead>
                  <TableHead>תוכנית</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>SMS</TableHead>
                  <TableHead>Payments</TableHead>
                  <TableHead>Analytics</TableHead>
                  <TableHead>תאריך</TableHead>
                  <TableHead>פעולות</TableHead>
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
              צור ארגון חדש במערכת
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם העסק *</Label>
              <Input
                value={newOrg.name}
                onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                placeholder="שם העסק"
              />
            </div>
            <div>
              <Label>אימייל *</Label>
              <Input
                type="email"
                value={newOrg.email}
                onChange={(e) => setNewOrg({ ...newOrg, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <Label>טלפון</Label>
              <Input
                type="tel"
                value={newOrg.phone}
                onChange={(e) => setNewOrg({ ...newOrg, phone: e.target.value })}
                placeholder="050-1234567"
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
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleCreateOrg} disabled={!newOrg.name || !newOrg.email}>
              צור ארגון
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
              הזן כתובת אימייל של המשתמש החדש
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>אימייל</Label>
            <Input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleAddUser} disabled={!newUserEmail}>
              הוסף משתמש
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
