'use client'

import { useState } from 'react'
import { Building2, Plus, Pencil, Power, PowerOff, ArrowLeft } from 'lucide-react'
import { useBranches, useCreateBranch, useUpdateBranch } from '@/hooks/useBranches'
import { useLanguage } from '@/contexts/LanguageContext'
import { useBranch } from '@/contexts/BranchContext'
import { useOrganization } from '@/hooks/useOrganization'
import { useFeatures } from '@/hooks/useFeatures'
import Link from 'next/link'

const translations = {
  he: {
    title: 'ניהול סניפים',
    subtitle: 'הוסף וערוך סניפים של העסק שלך',
    back: 'חזרה להגדרות',
    mainBranch: 'סניף ראשי',
    addBranch: 'הוסף סניף',
    branchName: 'שם הסניף',
    orgName: 'שם הארגון (לסניף)',
    address: 'כתובת',
    phone: 'טלפון',
    save: 'שמור',
    cancel: 'ביטול',
    active: 'פעיל',
    inactive: 'לא פעיל',
    activate: 'הפעל',
    deactivate: 'השבת',
    edit: 'ערוך',
    noBranches: 'אין סניפים עדיין',
    noBranchesDesc: 'לחץ על "הוסף סניף" כדי ליצור את הסניף הראשון שלך',
    required: 'שדה חובה',
    switchTo: 'עבור לסניף זה',
  },
  ru: {
    title: 'Управление филиалами',
    subtitle: 'Добавляйте и редактируйте филиалы вашего бизнеса',
    back: 'Назад к настройкам',
    mainBranch: 'Главный филиал',
    addBranch: 'Добавить филиал',
    branchName: 'Название филиала',
    orgName: 'Название организации (для филиала)',
    address: 'Адрес',
    phone: 'Телефон',
    save: 'Сохранить',
    cancel: 'Отмена',
    active: 'Активен',
    inactive: 'Неактивен',
    activate: 'Активировать',
    deactivate: 'Деактивировать',
    edit: 'Изменить',
    noBranches: 'Нет филиалов',
    noBranchesDesc: 'Нажмите «Добавить филиал» чтобы создать первый филиал',
    required: 'Обязательное поле',
    switchTo: 'Переключиться',
  },
}

interface FormState {
  branchName: string
  orgName: string
  address: string
  phone: string
}

const empty: FormState = { branchName: '', orgName: '', address: '', phone: '' }

export default function BranchesPage() {
  const { language } = useLanguage()
  const locale = language === 'he' ? 'he' : 'ru'
  const tr = translations[locale]

  const { data: branches = [], isLoading } = useBranches()
  const { data: mainOrg } = useOrganization()
  const features = useFeatures()
  const createBranch = useCreateBranch()
  const updateBranch = useUpdateBranch()
  const { activeOrgId, mainOrgId, switchBranch } = useBranch()

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(empty)
  const [errors, setErrors] = useState<Partial<FormState>>({})

  const isRtl = locale === 'he'

  const validate = () => {
    const e: Partial<FormState> = {}
    if (!form.branchName.trim()) e.branchName = tr.required
    if (!form.orgName.trim()) e.orgName = tr.required
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleCreate = async () => {
    if (!validate()) return
    await createBranch.mutateAsync({
      branchName: form.branchName.trim(),
      orgName: form.orgName.trim(),
      address: form.address.trim() || undefined,
      phone: form.phone.trim() || undefined,
    })
    setForm(empty)
    setShowForm(false)
  }

  const handleEditSave = async () => {
    if (!editId) return
    if (!form.branchName.trim()) {
      setErrors({ branchName: tr.required })
      return
    }
    await updateBranch.mutateAsync({
      id: editId,
      name: form.branchName.trim(),
      address: form.address.trim() || undefined,
      phone: form.phone.trim() || undefined,
    })
    setEditId(null)
    setForm(empty)
  }

  const toggleActive = (id: string, current: boolean) => {
    updateBranch.mutate({ id, is_active: !current })
  }

  const startEdit = (branch: (typeof branches)[0]) => {
    setEditId(branch.id)
    setForm({
      branchName: branch.name,
      orgName: branch.org?.name || '',
      address: branch.address || '',
      phone: branch.phone || '',
    })
    setShowForm(false)
  }

  return (
    <div className="space-y-6 max-w-2xl" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
          {tr.back}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{tr.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{tr.subtitle}</p>
      </div>

      {/* Main org card */}
      {mainOrg && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
              {mainOrg.name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate">{mainOrg.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{tr.mainBranch}</p>
            </div>
            {activeOrgId === mainOrgId ? (
              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium">
                ✓
              </span>
            ) : (
              <button
                onClick={() => mainOrgId && switchBranch(mainOrgId)}
                className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                {tr.switchTo}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Branch list */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-400">...</div>
      ) : branches.length === 0 && !showForm ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-300 dark:border-slate-600 p-8 text-center">
          <Building2 className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="font-medium text-gray-500 dark:text-gray-400">{tr.noBranches}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{tr.noBranchesDesc}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4"
            >
              {editId === branch.id ? (
                /* Edit form inline */
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                      {tr.branchName}
                    </label>
                    <input
                      className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.branchName}
                      onChange={(e) => setForm((f) => ({ ...f, branchName: e.target.value }))}
                    />
                    {errors.branchName && (
                      <p className="text-xs text-red-500 mt-1">{errors.branchName}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                        {tr.address}
                      </label>
                      <input
                        className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.address}
                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                        {tr.phone}
                      </label>
                      <input
                        className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleEditSave}
                      disabled={updateBranch.isPending}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
                    >
                      {tr.save}
                    </button>
                    <button
                      onClick={() => { setEditId(null); setForm(empty) }}
                      className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      {tr.cancel}
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg ${branch.is_active ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gray-400'}`}>
                    {branch.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{branch.name}</p>
                    {branch.address && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{branch.address}</p>
                    )}
                    {!branch.is_active && (
                      <span className="text-xs text-red-500 dark:text-red-400">{tr.inactive}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {activeOrgId === branch.child_org_id ? (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium">
                        ✓
                      </span>
                    ) : branch.is_active ? (
                      <button
                        onClick={() => switchBranch(branch.child_org_id)}
                        className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        {tr.switchTo}
                      </button>
                    ) : null}

                    <button
                      onClick={() => startEdit(branch)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 transition-colors"
                      title={tr.edit}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => toggleActive(branch.id, branch.is_active)}
                      className={`p-2 rounded-lg transition-colors ${
                        branch.is_active
                          ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500'
                          : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600'
                      }`}
                      title={branch.is_active ? tr.deactivate : tr.activate}
                    >
                      {branch.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-blue-200 dark:border-blue-700 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            {tr.addBranch}
          </h3>

          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
              {tr.branchName} *
            </label>
            <input
              autoFocus
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={locale === 'he' ? 'לדוגמה: סניף תל אביב' : 'Например: Филиал Тель-Авив'}
              value={form.branchName}
              onChange={(e) => setForm((f) => ({ ...f, branchName: e.target.value }))}
            />
            {errors.branchName && <p className="text-xs text-red-500 mt-1">{errors.branchName}</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
              {tr.orgName} *
            </label>
            <input
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={locale === 'he' ? 'שם בארגון הפנימי' : 'Внутреннее название'}
              value={form.orgName}
              onChange={(e) => setForm((f) => ({ ...f, orgName: e.target.value }))}
            />
            {errors.orgName && <p className="text-xs text-red-500 mt-1">{errors.orgName}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                {tr.address}
              </label>
              <input
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                {tr.phone}
              </label>
              <input
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              disabled={createBranch.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50"
            >
              {createBranch.isPending ? '...' : tr.save}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(empty); setErrors({}) }}
              className="px-5 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              {tr.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Add button */}
      {!showForm && !editId && features.hasBranches && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          {tr.addBranch}
        </button>
      )}
    </div>
  )
}
