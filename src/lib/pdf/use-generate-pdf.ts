'use client'

import { useCallback, useState } from 'react'
import { ProposalData } from './proposal-types'
import { buildProposalHTML } from './proposal-html'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export function useGeneratePDF() {
  const [loading, setLoading] = useState(false)

  // Внутренняя функция: HTML → canvas → PDF blob
  const buildPDFBlob = async (data: ProposalData): Promise<Blob> => {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ])

    // Загрузить логотип
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
      } catch {}
    }

    const html = buildProposalHTML(data, logoDataUri)

    // Изолированный iframe — не трогает основной DOM
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:none;visibility:hidden'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument!
    iframeDoc.open()
    iframeDoc.write(html)
    iframeDoc.close()

    // Ждём шрифты и изображения
    await new Promise(resolve => setTimeout(resolve, 1200))

    const element = iframeDoc.body.firstElementChild as HTMLElement
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794,
      logging: false,
    })

    document.body.removeChild(iframe)

    const pdf = new jsPDF({ unit: 'px', format: 'a4', orientation: 'portrait' })
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width

    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfWidth, pdfHeight)
    return pdf.output('blob')
  }

  // Скачать локально
  const download = useCallback(async (data: ProposalData) => {
    setLoading(true)
    try {
      const blob = await buildPDFBlob(data)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `proposal_${data.docNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }, [])

  // Загрузить в Supabase Storage → вернуть signed URL (3 дня)
  const uploadAndGetLink = useCallback(async (data: ProposalData): Promise<string> => {
    setLoading(true)
    try {
      const blob = await buildPDFBlob(data)
      const supabase = createSupabaseBrowserClient()
      const fileName = `proposal_${data.docNumber}_${Date.now()}.pdf`
      const filePath = `proposals/${fileName}`

      // Загрузить в bucket 'documents'
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, blob, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (uploadError) throw new Error(uploadError.message)

      // Signed URL на 3 дня = 259200 секунд
      const { data: signedData, error: signError } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 259200)

      if (signError || !signedData?.signedUrl) throw new Error('Failed to create signed URL')

      return signedData.signedUrl
    } finally {
      setLoading(false)
    }
  }, [])

  // Скачать PDF из готового HTML-строки (для Payment Report и других шаблонов)
  // footerData: { orgName, contacts, docNumber, label } — рисуется на каждой странице через jsPDF
  const downloadRaw = useCallback(async (
    html: string,
    filename: string,
    footerData?: { orgName: string; contacts: string; docNumber: string; label: string }
  ) => {
    setLoading(true)
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ])

      // A4: 210x297mm. Футер = 14mm снизу. Контент занимает 283mm на страницу.
      const PAGE_W_MM = 210
      const PAGE_H_MM = 297
      const FOOTER_H_MM = 14
      const CONTENT_H_MM = PAGE_H_MM - FOOTER_H_MM // 283mm контента на страницу

      // px на странице = 794px → 210mm; 1mm = 794/210 px
      const MM_TO_PX = 794 / PAGE_W_MM
      const CONTENT_H_PX = Math.round(CONTENT_H_MM * MM_TO_PX) // ~1069px

      // Iframe — высокий чтобы всё влезло
      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:8000px;border:none;visibility:hidden'
      document.body.appendChild(iframe)

      const iframeDoc = iframe.contentDocument!
      iframeDoc.open()
      iframeDoc.write(html)
      iframeDoc.close()

      await new Promise(resolve => setTimeout(resolve, 1800))

      const element = iframeDoc.body.firstElementChild as HTMLElement
      const contentHeight = element.scrollHeight
      iframe.style.height = contentHeight + 'px'
      await new Promise(resolve => setTimeout(resolve, 300))

      // Рендерим ВЕСЬ контент в один большой canvas (scale:2 для качества)
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794,
        height: contentHeight,
        windowWidth: 794,
        windowHeight: contentHeight,
        logging: false,
      })

      document.body.removeChild(iframe)

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

      // canvas.width = 794*2 = 1588px (scale:2), canvas.height = contentHeight*2
      // Нарезаем canvas по страницам
      const SLICE_H_PX = CONTENT_H_PX * 2 // учитываем scale:2
      const totalPages = Math.ceil(canvas.height / SLICE_H_PX)

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage()

        // Вырезаем нужный срез из canvas
        const srcY = page * SLICE_H_PX
        const srcH = Math.min(SLICE_H_PX, canvas.height - srcY)

        const pageCanvas = document.createElement('canvas')
        pageCanvas.width = canvas.width
        pageCanvas.height = srcH
        const ctx = pageCanvas.getContext('2d')!
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)

        const sliceData = pageCanvas.toDataURL('image/jpeg', 0.92)
        // Рисуем срез в контентной зоне (без футера)
        const sliceH_mm = (srcH / (canvas.width)) * PAGE_W_MM
        pdf.addImage(sliceData, 'JPEG', 0, 0, PAGE_W_MM, Math.min(sliceH_mm, CONTENT_H_MM))

        // Футер — рисуем напрямую через jsPDF на каждой странице
        if (footerData) {
          // Тёмный прямоугольник
          pdf.setFillColor(27, 42, 74) // #1B2A4A
          pdf.rect(0, PAGE_H_MM - FOOTER_H_MM, PAGE_W_MM, FOOTER_H_MM, 'F')

          // Левая часть: название + контакты
          pdf.setFontSize(8)
          pdf.setTextColor(212, 170, 80) // #D4AA50
          pdf.text(footerData.orgName, 8, PAGE_H_MM - FOOTER_H_MM + 5)
          pdf.setTextColor(180, 190, 210)
          pdf.setFontSize(7)
          pdf.text(footerData.contacts, 8, PAGE_H_MM - FOOTER_H_MM + 10)

          // Правая часть: Trinity CRM + номер
          pdf.setFontSize(7)
          pdf.setTextColor(120, 140, 170)
          const rightText = `${footerData.label} #${footerData.docNumber}`
          const rightW = pdf.getTextWidth(rightText)
          pdf.text(rightText, PAGE_W_MM - 8 - rightW, PAGE_H_MM - FOOTER_H_MM + 5)
          pdf.setTextColor(180, 190, 210)
          const brandText = 'Trinity CRM'
          const brandW = pdf.getTextWidth(brandText)
          pdf.text(brandText, PAGE_W_MM - 8 - brandW, PAGE_H_MM - FOOTER_H_MM + 10)
        }
      }

      const blob = pdf.output('blob')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }, [])

  // Backward compatibility: generate = download
  const generate = download

  return { generate, download, downloadRaw, uploadAndGetLink, loading }
}
