'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useLanguage } from '@/contexts/LanguageContext'
import { useServices, useDeleteService } from '@/hooks/useServices'
import { CreateServiceDialog } from '@/components/services/CreateServiceDialog'
import { ArrowRight, Plus, Edit, Trash2, Package } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { Service } from '@/types/services'

export default function ServicesPage() {
  const { t, language } = useLanguage()
  const { data: services, isLoading } = useServices()
  const deleteService = useDeleteService()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)

  const handleEdit = (service: Service) => {
    setSelectedService(service)
    setDialogOpen(true)
  }

  const handleDelete = async (service: Service) => {
    const confirmText = language === 'he' 
      ? `האם למחוק את השירות "${service.name}"?`
      : `Удалить услугу "${service.name}"?`
    
    if (!confirm(confirmText)) return

    try {
      await deleteService.mutateAsync(service.id)
      toast.success(t('common.success'))
    } catch (error: any) {
      toast.error(error.message || t('common.error'))
    }
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedService(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <Link href="/settings" className="hover:text-theme-primary">
              {t('settings.title')}
            </Link>
            <ArrowRight className="w-4 h-4" />
            <span>{t('services.title')}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('services.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            ניהול רשימת השירותים של הארגון
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('services.newService')}
        </Button>
      </div>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t('services.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              {t('common.loading')}
            </div>
          ) : !services || services.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('services.emptyState')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {t('services.emptyState.desc')}
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('services.newService')}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('services.name')}</TableHead>
                      <TableHead className="text-right">{t('services.price')}</TableHead>
                      <TableHead className="text-right">{t('services.duration')}</TableHead>
                      <TableHead className="text-right">{t('services.color')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {service.name}
                            </p>
                            {service.name_ru && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {service.name_ru}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {service.price ? `₪${service.price.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {service.duration_minutes} {t('common.minutes')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div
                              className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                              style={{ backgroundColor: service.color }}
                            />
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {service.color}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(service)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(service)}
                              className="text-red-600 hover:text-red-700 dark:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {services.map((service) => (
                  <Card key={service.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {service.name}
                          </h3>
                          {service.name_ru && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {service.name_ru}
                            </p>
                          )}
                        </div>
                        <div
                          className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600"
                          style={{ backgroundColor: service.color }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            {t('services.price')}:
                          </span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                            {service.price ? `₪${service.price.toFixed(2)}` : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            {t('services.duration')}:
                          </span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                            {service.duration_minutes} {t('common.minutes')}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(service)}
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          {t('services.edit')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(service)}
                          className="flex-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t('services.delete')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <CreateServiceDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        service={selectedService}
      />
    </div>
  )
}
