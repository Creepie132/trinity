'use client'

import { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/contexts/BranchContext'
import {
  BookOpen, Plus, Pencil, Trash2,
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  Link as LinkIcon, Undo, Redo, Image as ImageIcon,
  CheckCircle2, Clock, Globe,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface BlogPost {
  id: string; org_id: string; title: string; slug: string
  cover_image: string | null; content_html: string; excerpt: string | null
  published: boolean; published_at: string | null; created_at: string; updated_at: string
}

const CYR_MAP: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
}
function generateSlug(title: string): string {
  return title.toLowerCase().split('').map(c => CYR_MAP[c] ?? c).join('')
    .replace(/[^\w\s-]/g,'').replace(/[\s_]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')
    || `post-${Date.now()}`
}

const I18N = {
  he: {
    pageTitle:'בלוג', pageSub:'ניהול מאמרים ופרסומים באתר',
    newPost:'פוסט חדש', editPost:'עריכת פוסט', published:'פורסם', draft:'טיוטה',
    noPosts:'אין פוסטים עדיין', noPostsHint:'לחץ "פוסט חדש" כדי להוסיף',
    titleLabel:'כותרת', titlePlaceholder:'כותרת המאמר...',
    slugLabel:'Slug (URL)', coverLabel:'תמונת כותרת (URL)', coverPlaceholder:'https://...',
    excerptLabel:'תקציר', excerptPlaceholder:'תיאור קצר לתצוגה ברשימה...',
    contentLabel:'תוכן המאמר', publishLabel:'פרסם',
    cancel:'ביטול', save:'שמור', saving:'שומר...', deleteConfirm:'למחוק את הפוסט',
    colTitle:'כותרת', colSlug:'Slug', colStatus:'סטטוס', colDate:'תאריך', colActions:'פעולות',
    totalPosts:'פוסטים סה"כ', publishedCount:'מפורסמים',
  },
  ru: {
    pageTitle:'Блог', pageSub:'Управление статьями сайта',
    newPost:'Новая статья', editPost:'Редактировать', published:'Опубликовано', draft:'Черновик',
    noPosts:'Статей пока нет', noPostsHint:'Нажмите "Новая статья" чтобы добавить',
    titleLabel:'Заголовок', titlePlaceholder:'Заголовок статьи...',
    slugLabel:'Slug (URL)', coverLabel:'Обложка (URL изображения)', coverPlaceholder:'https://...',
    excerptLabel:'Краткое описание', excerptPlaceholder:'Короткий анонс для списка статей...',
    contentLabel:'Содержание статьи', publishLabel:'Опубликовать',
    cancel:'Отмена', save:'Сохранить', saving:'Сохранение...', deleteConfirm:'Удалить статью',
    colTitle:'Заголовок', colSlug:'Slug', colStatus:'Статус', colDate:'Дата', colActions:'Действия',
    totalPosts:'Всего статей', publishedCount:'Опубликовано',
  },
}
type S = typeof I18N.ru

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null
  const addLink = () => {
    const url = window.prompt('URL:')
    if (!url) return
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }
  const tools = [
    { icon: Bold,        action: () => editor.chain().focus().toggleBold().run(),                       active: editor.isActive('bold'),               title: 'Bold' },
    { icon: Italic,      action: () => editor.chain().focus().toggleItalic().run(),                     active: editor.isActive('italic'),             title: 'Italic' },
    { icon: Heading2,    action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),         active: editor.isActive('heading',{level:2}),  title: 'H2' },
    { icon: Heading3,    action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),         active: editor.isActive('heading',{level:3}),  title: 'H3' },
    { icon: List,        action: () => editor.chain().focus().toggleBulletList().run(),                 active: editor.isActive('bulletList'),         title: 'Bullet' },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(),                active: editor.isActive('orderedList'),        title: 'Ordered' },
    { icon: LinkIcon,    action: addLink,                                                               active: editor.isActive('link'),               title: 'Link' },
    { icon: Undo,        action: () => editor.chain().focus().undo().run(),                             active: false,                                 title: 'Undo' },
    { icon: Redo,        action: () => editor.chain().focus().redo().run(),                             active: false,                                 title: 'Redo' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
      {tools.map(({ icon: Icon, action, active, title }) => (
        <button key={title} type="button" title={title} onMouseDown={e => { e.preventDefault(); action() }}
          className={cn('p-1.5 rounded-md transition-colors text-gray-600 hover:bg-gray-200', active && 'bg-indigo-100 text-indigo-700')}>
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  )
}

interface PostForm { title:string; slug:string; cover_image:string; excerpt:string; content_html:string; published:boolean }
const EMPTY_FORM: PostForm = { title:'', slug:'', cover_image:'', excerpt:'', content_html:'', published:false }

function PostEditor({ open, post, onClose, s }: { open:boolean; post:BlogPost|null; onClose:()=>void; s:S }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<PostForm>(EMPTY_FORM)
  const [slugTouched, setSlugTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string|null>(null)

  // Инициализация формы при открытии
  useEffect(() => {
    if (open) {
      setError(null)
      if (post) {
        setForm({ title:post.title, slug:post.slug, cover_image:post.cover_image??'',
          excerpt:post.excerpt??'', content_html:post.content_html, published:post.published })
        setSlugTouched(true)
      } else { setForm(EMPTY_FORM); setSlugTouched(false) }
    }
  }, [open, post?.id])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick:false, HTMLAttributes:{ class:'text-indigo-600 underline' } }),
      Placeholder.configure({ placeholder: s.excerptPlaceholder }),
    ],
    content: post?.content_html ?? '',
    onUpdate: ({ editor }) => setForm(f => ({ ...f, content_html: editor.getHTML() })),
    immediatelyRender: false,
  }, [post?.id])

  const up = (key: keyof PostForm, val: string|boolean) => setForm(f => ({ ...f, [key]:val }))
  const handleTitleChange = (val: string) => { up('title',val); if (!slugTouched) up('slug', generateSlug(val)) }
  const handleSlugChange  = (val: string) => { setSlugTouched(true); up('slug', val.toLowerCase().replace(/[^a-z0-9-]/g,'')) }

  const handleSave = async () => {
    if (!form.title.trim() || !form.slug.trim()) return
    setSaving(true); setError(null)
    try {
      const payload = {
        title:form.title.trim(), slug:form.slug.trim(),
        cover_image:form.cover_image.trim()||null,
        excerpt:form.excerpt.trim()||null,
        content_html:form.content_html,
        published:form.published,
        ...(form.published && !post?.published_at ? { published_at: new Date().toISOString() } : {}),
      }
      // org_id берётся ТОЛЬКО из сессии на сервере — клиент его не передаёт
      const url = post ? `/api/website/blog/${post.id}` : '/api/website/blog'
      const res = await fetch(url, {
        method: post ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { const err = await res.json().catch(()=>({})); throw new Error(err?.error ?? `HTTP ${res.status}`) }
      qc.invalidateQueries({ queryKey:['website-blog-posts'] })
      onClose()
    } catch(e) { setError(e instanceof Error ? e.message : 'Ошибка') }
    finally { setSaving(false) }
  }

  const footerContent = (
    <div className="flex items-center justify-between w-full">
      <Button variant="ghost" onClick={onClose} className="text-gray-600">{s.cancel}</Button>
      <Button onClick={handleSave} disabled={!form.title.trim()||!form.slug.trim()||saving}
        className="bg-indigo-600 hover:bg-indigo-700 min-w-[130px] gap-2">
        {saving
          ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{s.saving}</>
          : <><CheckCircle2 className="w-4 h-4" />{s.save}</>}
      </Button>
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} darkHeader showCloseButton={false} width="620px">
      <TrinityModalShell
        open={open}
        onClose={onClose}
        icon={<BookOpen />}
        title={post ? s.editPost : s.newPost}
        subtitle={s.pageSub}
        accentColor="#4f46e5"
        footerContent={footerContent}
        dir="ltr"
      >
        <div className="space-y-5 p-5">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">{s.titleLabel} *</Label>
            <Input autoFocus value={form.title} onChange={e=>handleTitleChange(e.target.value)} placeholder={s.titlePlaceholder} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">{s.slugLabel} *</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-2 rounded border border-gray-200 whitespace-nowrap">/blog/</span>
              <Input value={form.slug} onChange={e=>handleSlugChange(e.target.value)} placeholder="my-post-slug" className="h-10 font-mono text-sm" dir="ltr" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5 text-indigo-500" />{s.coverLabel}</Label>
            <Input value={form.cover_image} onChange={e=>up('cover_image',e.target.value)} placeholder={s.coverPlaceholder} dir="ltr" className="h-10" />
            {form.cover_image && <img src={form.cover_image} alt="preview" className="mt-2 h-24 w-full object-cover rounded-lg border border-gray-200" />}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">{s.excerptLabel}</Label>
            <textarea value={form.excerpt} onChange={e=>up('excerpt',e.target.value)} placeholder={s.excerptPlaceholder} rows={2}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">{s.contentLabel}</Label>
            <div className="border border-gray-200 rounded-lg overflow-hidden min-h-[200px]">
              <EditorToolbar editor={editor} />
              <EditorContent editor={editor}
                className="prose prose-sm max-w-none p-4 min-h-[160px] focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[140px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none" />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <p className="text-sm font-semibold text-gray-800">{s.publishLabel}</p>
              <p className="text-xs text-gray-400 mt-0.5">{form.published ? s.published : s.draft}</p>
            </div>
            <Switch checked={form.published} onCheckedChange={v=>up('published',v)} />
          </div>
        </div>
      </TrinityModalShell>
    </Modal>
  )
}

export default function WebsiteBlogPage() {
  const { language } = useLanguage()
  const s = I18N[language] ?? I18N.ru
  const { orgId } = useAuth()
  const { activeOrgId } = useBranch()
  const effectiveOrgId = activeOrgId ?? orgId ?? ''
  const qc = useQueryClient()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<BlogPost|null>(null)

  const { data: posts = [], isLoading } = useQuery<BlogPost[]>({
    queryKey: ['website-blog-posts', effectiveOrgId],
    queryFn: async () => {
      const res = await fetch('/api/website/blog')
      if (!res.ok) throw new Error('Failed to fetch posts')
      return res.json()
    },
    enabled: !!effectiveOrgId,
  })

  const { mutate: togglePublish } = useMutation({
    mutationFn: async ({ id, published }: { id:string; published:boolean }) => {
      const res = await fetch(`/api/website/blog/${id}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ published, ...(published ? { published_at:new Date().toISOString() } : {}) }),
      })
      if (!res.ok) throw new Error('Toggle failed')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey:['website-blog-posts'] }),
  })

  const { mutate: deletePost } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/website/blog/${id}`, { method:'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey:['website-blog-posts'] }),
  })

  const openNew  = () => { setEditingPost(null); setEditorOpen(true) }
  const openEdit = (p: BlogPost) => { setEditingPost(p); setEditorOpen(true) }
  const handleDelete = (p: BlogPost) => { if (confirm(`${s.deleteConfirm} "${p.title}"?`)) deletePost(p.id) }
  const publishedCount = posts.filter(p => p.published).length

  return (
    <div className="space-y-4 md:space-y-6" dir={language==='he' ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Globe className="w-6 h-6 md:w-7 md:h-7 text-indigo-500" />{s.pageTitle}
          </h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1">{s.pageSub}</p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 shrink-0">
          <Plus className="w-4 h-4" />{s.newPost}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-xs">
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">{s.totalPosts}</p><p className="text-2xl font-bold text-gray-800 mt-0.5">{posts.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">{s.publishedCount}</p><p className="text-2xl font-bold text-emerald-600 mt-0.5">{publishedCount}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" />{s.pageTitle}
            {posts.length > 0 && <Badge variant="secondary" className="text-xs">{posts.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /></div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-14 h-14 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 font-medium">{s.noPosts}</p>
              <p className="text-gray-300 text-sm mt-1">{s.noPostsHint}</p>
            </div>
          ) : (
            <>
              <div className="md:hidden divide-y divide-gray-50">
                {posts.map(p => (
                  <div key={p.id} className="p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      {p.cover_image && <img src={p.cover_image} alt="" className="w-14 h-10 object-cover rounded shrink-0 border" />}
                      <div className="flex-1 min-w-0"><p className="font-semibold text-gray-800 truncate">{p.title}</p><p className="text-xs text-gray-400 font-mono truncate">{p.slug}</p></div>
                      <Badge variant={p.published?'default':'secondary'} className={cn('shrink-0 text-xs',p.published?'bg-emerald-100 text-emerald-700':'')}>{p.published?s.published:s.draft}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={p.published} onCheckedChange={v=>togglePublish({id:p.id,published:v})} />
                      <Button variant="ghost" size="sm" onClick={()=>openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={()=>handleDelete(p)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      {[s.colTitle,s.colSlug,s.colStatus,s.colDate,s.colActions].map(h => (
                        <th key={h} className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {posts.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 max-w-xs">
                          <div className="flex items-center gap-3">
                            {p.cover_image
                              ? <img src={p.cover_image} alt="" className="w-12 h-8 object-cover rounded border shrink-0" />
                              : <div className="w-12 h-8 bg-gray-100 rounded border shrink-0 flex items-center justify-center"><ImageIcon className="w-3 h-3 text-gray-300" /></div>}
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 truncate">{p.title}</p>
                              {p.excerpt && <p className="text-xs text-gray-400 truncate mt-0.5">{p.excerpt}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{p.slug}</code>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Switch checked={p.published} onCheckedChange={v=>togglePublish({id:p.id,published:v})} />
                            <span className={cn('text-xs font-medium flex items-center gap-1', p.published?'text-emerald-600':'text-gray-400')}>
                              {p.published
                                ? <><CheckCircle2 className="w-3 h-3" />{s.published}</>
                                : <><Clock className="w-3 h-3" />{s.draft}</>}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {p.published_at
                            ? format(new Date(p.published_at),'dd.MM.yyyy')
                            : format(new Date(p.created_at),'dd.MM.yyyy')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={()=>openEdit(p)} className="h-8 w-8 p-0">
                              <Pencil className="w-4 h-4 text-indigo-500" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={()=>handleDelete(p)} className="h-8 w-8 p-0 hover:bg-red-50">
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <PostEditor
        open={editorOpen}
        post={editingPost}
        onClose={() => { setEditorOpen(false); setEditingPost(null) }}
        s={s}
      />
    </div>
  )
}
