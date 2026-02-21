'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Plus, Edit, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

interface MessageTemplate {
  id: string
  org_id: string
  name: string
  content: string
  category: string
  variables: string[]
  is_active: boolean
  created_at: string
}

const CATEGORIES = [
  { value: 'reminder', label: 'תזכורת / Reminder', color: 'bg-blue-500' },
  { value: 'birthday', label: 'יום הולדת / Birthday', color: 'bg-pink-500' },
  { value: 'followup', label: 'חזרת לקוח / Follow-up', color: 'bg-green-500' },
  { value: 'promotion', label: 'מבצע / Promotion', color: 'bg-orange-500' },
  { value: 'custom', label: 'אישי / Custom', color: 'bg-purple-500' },
]

const VARIABLES = [
  '{first_name}',
  '{last_name}',
  '{phone}',
  '{org_name}',
  '{time}',
  '{date}',
  '{days}',
  '{message}',
]

export default function TemplatesPage() {
  const router = useRouter()
  const { t, dir } = useLanguage()
  const { orgId } = useAuth()

  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    content: '',
    category: 'custom',
  })

  // Load templates
  useEffect(() => {
    loadTemplates()
  }, [orgId])

  async function loadTemplates() {
    if (!orgId) return

    try {
      const response = await fetch(`/api/templates?org_id=${orgId}`)
      const data = await response.json()
      setTemplates(data)
    } catch (error) {
      console.error('Failed to load templates:', error)
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  function openDialog(template?: MessageTemplate) {
    if (template) {
      setEditingTemplate(template)
      setFormData({
        name: template.name,
        content: template.content,
        category: template.category,
      })
    } else {
      setEditingTemplate(null)
      setFormData({ name: '', content: '', category: 'custom' })
    }
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!orgId || !formData.name || !formData.content) {
      toast.error('Fill all fields')
      return
    }

    try {
      const url = '/api/templates'
      const method = editingTemplate ? 'PUT' : 'POST'
      const body: any = {
        org_id: orgId,
        name: formData.name,
        content: formData.content,
        category: formData.category,
      }

      if (editingTemplate) {
        body.id = editingTemplate.id
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to save template')

      toast.success(editingTemplate ? 'Template updated' : 'Template created')
      setDialogOpen(false)
      loadTemplates()
    } catch (error) {
      console.error('Save template error:', error)
      toast.error('Failed to save template')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete template?')) return

    try {
      const response = await fetch(`/api/templates?id=${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete')

      toast.success('Template deleted')
      loadTemplates()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete template')
    }
  }

  function renderPreview(content: string) {
    return content
      .replace(/{first_name}/g, 'יוסי')
      .replace(/{last_name}/g, 'כהן')
      .replace(/{phone}/g, '050-1234567')
      .replace(/{org_name}/g, 'הסלון שלנו')
      .replace(/{time}/g, '14:30')
      .replace(/{date}/g, '25/12/2024')
      .replace(/{days}/g, '30')
      .replace(/{message}/g, '20% הנחה על כל השירותים!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/settings')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowRight className={`w-6 h-6 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Message Templates / תבניות הודעות
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage SMS templates / נהל תבניות SMS
            </p>
          </div>
        </div>
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </div>

      {/* Variables Guide */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            Available Variables / משתנים זמינים:
          </h3>
          <div className="flex flex-wrap gap-2">
            {VARIABLES.map((v) => (
              <code
                key={v}
                className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded text-sm"
              >
                {v}
              </code>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid gap-4">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No templates yet. Create your first one!
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => {
            const category = CATEGORIES.find((c) => c.value === template.category)
            return (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{template.name}</h3>
                        <Badge className={`${category?.color} text-white`}>
                          {category?.label}
                        </Badge>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                        {template.content}
                      </p>
                      <div className="text-xs text-gray-500">
                        Created: {new Date(template.created_at).toLocaleDateString('he-IL')}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setPreviewTemplate(template)
                          setPreviewOpen(true)
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDialog(template)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'New Template'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name / שם</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Birthday Greeting"
              />
            </div>
            <div>
              <Label>Category / קטגוריה</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Content / תוכן</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={5}
                dir="rtl"
                placeholder="שלום {first_name}! ..."
              />
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <Label className="text-sm font-semibold">Preview:</Label>
              <p className="text-sm mt-2 whitespace-pre-wrap" dir="rtl">
                {renderPreview(formData.content)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preview / תצוגה מקדימה</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div>
                <Label>Original:</Label>
                <p className="text-sm mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded" dir="rtl">
                  {previewTemplate.content}
                </p>
              </div>
              <div>
                <Label>With Example Data:</Label>
                <p className="text-sm mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded" dir="rtl">
                  {renderPreview(previewTemplate.content)}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
