'use client'

import { useState, useEffect } from 'react'
import { Bot, Plus, Pencil, Trash2, Save, X, Loader2, Check, ToggleLeft, ToggleRight, GripVertical } from 'lucide-react'
import { toast } from 'sonner'

type Category = 'product' | 'pricing' | 'faq' | 'contacts' | 'custom'

interface KnowledgeItem {
  id: string
  category: Category
  title: string
  content: string
  is_active: boolean
  sort_order: number
  updated_at: string
}

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: 'product',  label: 'Продукт',  color: 'bg-blue-100 text-blue-700' },
  { value: 'pricing',  label: 'Цены',     color: 'bg-green-100 text-green-700' },
  { value: 'faq',      label: 'FAQ',      color: 'bg-purple-100 text-purple-700' },
  { value: 'contacts', label: 'Контакты', color: 'bg-orange-100 text-orange-700' },
  { value: 'custom',   label: 'Другое',   color: 'bg-slate-100 text-slate-700' },
]

const EMPTY_FORM = { category: 'faq' as Category, title: '', content: '', is_active: true, sort_order: 0 }

export default function PersonalBotPage() {
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/personal-bot-knowledge')
      if (!res.ok) throw new Error()
      setItems(await res.json())
    } catch {
      toast.error('Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim()) return toast.error('Заполните название и содержание')
    setSaving(true)
    try {
      const isEdit = !!editingId
      const res = await fetch('/api/personal-bot-knowledge', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: editingId, ...form } : form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(isEdit ? '✓ Обновлено' : '✓ Добавлено')
      setEditingId(null)
      setShowAdd(false)
      setForm(EMPTY_FORM)
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(item: KnowledgeItem) {
    try {
      await fetch('/api/personal-bot-knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, is_active: !item.is_active }),
      })
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i))
    } catch {
      toast.error('Ошибка')
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/personal-bot-knowledge?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Удалено')
      setItems(prev => prev.filter(i => i.id !== id))
    } catch {
      toast.error('Ошибка удаления')
    } finally {
      setDeletingId(null)
    }
  }

  function startEdit(item: KnowledgeItem) {
    setEditingId(item.id)
    setShowAdd(false)
    setForm({ category: item.category, title: item.title, content: item.content, is_active: item.is_active, sort_order: item.sort_order })
  }

  function cancelEdit() {
    setEditingId(null)
    setShowAdd(false)
    setForm(EMPTY_FORM)
  }

  const catInfo = (cat: Category) => CATEGORIES.find(c => c.value === cat)!

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )


  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-md">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Личный бот — База знаний</h1>
            <p className="text-sm text-slate-500">Что бот знает и как отвечает на вопросы</p>
          </div>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditingId(null); setForm(EMPTY_FORM) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
          <Plus className="w-4 h-4" />
          Добавить запись
        </button>
      </div>

      {/* Форма добавления / редактирования */}
      {(showAdd || editingId) && (
        <div className="bg-white rounded-2xl border-2 border-violet-200 shadow-lg p-6 space-y-4">
          <h2 className="font-bold text-slate-800">{editingId ? '✏️ Редактировать запись' : '➕ Новая запись'}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Категория</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as Category })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Порядок сортировки</label>
              <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Название</label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Например: Тарифные планы"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Содержание</label>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
              placeholder="Подробное описание — бот будет использовать этот текст при ответе"
              rows={5}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm resize-none" />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${form.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {form.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {form.is_active ? 'Активна' : 'Отключена'}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Сохраняю...' : 'Сохранить'}
            </button>
            <button onClick={cancelEdit}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-all">
              <X className="w-4 h-4" />
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Список записей */}
      <div className="space-y-3">
        {items.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>База знаний пуста — добавьте первую запись</p>
          </div>
        )}
        {items.map(item => (
          <div key={item.id}
            className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${item.is_active ? 'border-slate-100' : 'border-slate-100 opacity-60'} ${editingId === item.id ? 'ring-2 ring-violet-300' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${catInfo(item.category).color}`}>
                    {catInfo(item.category).label}
                  </span>
                  {!item.is_active && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">отключена</span>}
                </div>
                <h3 className="font-semibold text-slate-800 text-sm mb-1">{item.title}</h3>
                <p className="text-slate-500 text-sm line-clamp-2 whitespace-pre-wrap">{item.content}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => handleToggle(item)}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                  title={item.is_active ? 'Отключить' : 'Включить'}>
                  {item.is_active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => startEdit(item)}
                  className="p-2 rounded-lg hover:bg-violet-50 transition-colors text-slate-400 hover:text-violet-600">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id}
                  className="p-2 rounded-lg hover:bg-red-50 transition-colors text-slate-400 hover:text-red-500">
                  {deletingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
