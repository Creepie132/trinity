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

  // Backward compatibility: generate = download
  const generate = download

  return { generate, download, uploadAndGetLink, loading }
}
