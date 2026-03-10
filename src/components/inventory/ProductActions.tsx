import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, PenLine, Trash2, ArrowLeftRight } from 'lucide-react'
import { Product } from '@/types/inventory'
import { useState } from 'react'
import EditProductSheet from './EditProductSheet'
import ProductMovementSheet from './ProductMovementSheet'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useInventory } from '@/hooks/useInventory'

interface ProductActionsProps {
  product: Product
}

export default function ProductActions({ product }: ProductActionsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const { deleteProduct } = useInventory()

  const handleDelete = async () => {
    try {
      await deleteProduct(product.id)
    } catch (error) {
      console.error('Failed to delete product:', error)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsEditing(true)}>
            <PenLine className="w-4 h-4 mr-2" />
            Редактировать
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsMoving(true)}>
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Движение товара
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setShowDeleteAlert(true)}
            className="text-red-600"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Удалить
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditProductSheet 
        product={product}
        open={isEditing}
        onClose={() => setIsEditing(false)}
      />

      <ProductMovementSheet
        product={product}
        open={isMoving}
        onClose={() => setIsMoving(false)}
      />

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить товар?</AlertDialogTitle>
            <AlertDialogDescription>
              Товар будет помечен как неактивный. Историю движений можно будет просмотреть в отчетах.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}