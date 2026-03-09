'use client'

import { useCallback, useState } from 'react'
import { ProposalData } from './proposal-types'
import { buildProposalHTML } from './proposal-html'

export function useGeneratePDF() {
  const [loading, setLoading] = useState(false)

  const generate = useCallback(async (data: ProposalData) => {
    setLoading(true)
    try {
      // Динамический импорт — не грузить при SSR
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ])

      // Загрузить логотип как base64 (из Supabase Storage или local)
      let logoDataUri = ''
      if (data.seller.logo) {
        try {
          const res = await fetch(data.seller.logo)
          const blob = await res.blob()
          logoDataUri = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(blob)
          })
        } catch {
          /* лого не критично */
        }
      }

      // Рендерим HTML во временный div
      const html = buildProposalHTML(data, logoDataUri)
      const container = document.createElement('div')
      container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;width:794px'
      container.innerHTML = html
      document.body.appendChild(container)

      // Ждём загрузки шрифта Heebo
      await document.fonts.ready

      // Рендерим canvas
      const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794,
        logging: false,
      })

      document.body.removeChild(container)

      // Создаём PDF A4
      const pdf = new jsPDF({ unit: 'px', format: 'a4', orientation: 'portrait' })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`proposal_${data.docNumber}.pdf`)
    } finally {
      setLoading(false)
    }
  }, [])

  return { generate, loading }
}
