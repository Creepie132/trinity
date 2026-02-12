'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { toast } from 'sonner'
import { Plus, Trash2, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'

interface OrgUser {
  id: string
  email: string
  role: string
  user_id: string | null
  joined_at: string
}

export default function UsersSettingsPage() {
  const { t } = useLanguage()
  const { user, orgId, isLoading: authLoading } = useAuth()
  const [users, setUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState<'owner' | 'manager' | 'user'>('user')
  const [isOwner, setIsOwner] = useState(false)

  // Check if current user is owner
  useEffect(() => {
    if (!orgId || !user) return
    
    supabase
      .from('org_users')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setIsOwner(data?.role === 'owner')
      })
  }, [orgId, user])

  // Load users
  useEffect(() => {
    if (!orgId) return
    loadUsers()
  }, [orgId])

  const loadUsers = async () => {
    if (!orgId) return
    
    setLoading(true)
    const { data, error } = await supabase
      .from('org_users')
      .select('id, email, role, user_id, joined_at')
      .eq('org_id', orgId)
      .order('joined_at', { ascending: false })

    if (error) {
      console.error('Error loading users:', error)
      toast.error('שגיאה בטעינת משתמשים')
    } else {
      setUsers(data || [])
    }
    setLoading(false)
  }

  const handleAddUser = async () => {
    if (!orgId || !newUserEmail) return

    try {
      const response = await fetch('/api/org/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          email: newUserEmail.toLowerCase().trim(),
          role: newUserRole,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'שגיאה בהוספת משתמש')
        return
      }

      toast.success(result.message || 'המשתמש נוסף בהצלחה')
      
      // Reload users
      await loadUsers()
      
      setNewUserEmail('')
      setNewUserRole('user')
      setAddDialogOpen(false)
    } catch (error: any) {
      toast.error(`שגיאה: ${error.message}`)
    }
  }

  const handleRemoveUser = async (userEmail: string) => {
    if (!orgId) return
    if (user?.email?.toLowerCase() === userEmail.toLowerCase()) {
      toast.error('לא ניתן להסיר את עצמך')
      return
    }
    if (!confirm('האם אתה בטוח שברצונך להסיר משתמש זה?')) return
    
    try {
      const response = await fetch('/api/org/invite-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          email: userEmail,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'שגיאה בהסרת משתמש')
        return
      }

      toast.success(result.message || 'המשתמש הוסר בהצלחה')
      
      // Reload users
      await loadUsers()
    } catch (error: any) {
      toast.error(`שגיאה: ${error.message}`)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (!isOwner) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-semibold text-gray-900 mb-2">גישה מוגבלת</p>
            <p className="text-gray-600">רק בעלי ארגון יכולים לנהל משתמשים</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ניהול משתמשים</h1>
          <p className="text-gray-600 mt-1">
            הוסף והסר משתמשים מהארגון שלך
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 ml-2" />
          הוסף משתמש
        </Button>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            משתמשי הארגון ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map((orgUser) => (
              <div key={orgUser.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">{orgUser.email}</p>
                    {orgUser.user_id ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        מחובר
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200">
                        ממתין לחיבור
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {orgUser.role === 'owner' && 'בעלים'}
                      {orgUser.role === 'manager' && 'מנהל'}
                      {orgUser.role === 'user' && 'משתמש'}
                    </Badge>
                    {!orgUser.user_id && (
                      <p className="text-xs text-gray-500">
                        יחובר אוטומטית בכניסה הראשונה
                      </p>
                    )}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleRemoveUser(orgUser.email)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {users.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>אין משתמשים נוספים בארגון</p>
                <p className="text-sm mt-1">לחץ על "הוסף משתמש" כדי להתחיל</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הוסף משתמש לארגון</DialogTitle>
            <DialogDescription>
              הזן אימייל ובחר הרשאה. המשתמש יחובר אוטומטית בכניסה הראשונה עם Google.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Email Input */}
            <div>
              <Label htmlFor="email">אימייל *</Label>
              <Input
                id="email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>

            {/* Role Selection */}
            <div>
              <Label htmlFor="role">תפקיד *</Label>
              <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as 'owner' | 'manager' | 'user')}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">
                    <div className="py-1">
                      <p className="font-semibold">בעלים</p>
                      <p className="text-xs text-gray-500">גישה מלאה לכל המערכת</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="py-1">
                      <p className="font-semibold">מנהל</p>
                      <p className="text-xs text-gray-500">ניהול לקוחות ותשלומים</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="user">
                    <div className="py-1">
                      <p className="font-semibold">משתמש</p>
                      <p className="text-xs text-gray-500">צפייה בלבד</p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
              💡 המשתמש יקבל גישה אוטומטית בכניסה הראשונה דרך Google Auth
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              ביטול
            </Button>
            <Button 
              onClick={handleAddUser} 
              disabled={!newUserEmail}
              className="bg-blue-600 hover:bg-blue-700"
            >
              הוסף משתמש
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
