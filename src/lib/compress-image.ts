/**
 * compress-image.ts
 * Client-side image compression using Canvas API.
 * Zero dependencies — works in all modern browsers.
 *
 * Usage:
 *   import { compressImage } from '@/lib/compress-image'
 *   const compressed = await compressImage(file)            // default: 1200px, 0.82 quality
 *   const thumb      = await compressImage(file, 400, 0.75) // thumbnail
 */

/**
 * Compress an image File/Blob using Canvas.
 * @param file     Source image file
 * @param maxDim   Max width OR height in pixels (default 1200)
 * @param quality  JPEG quality 0..1 (default 0.82)
 * @returns        Compressed File (image/jpeg). Falls back to original on error.
 */
export async function compressImage(
  file: File,
  maxDim = 1200,
  quality = 0.82,
): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const { width, height } = img
      let newW = width
      let newH = height

      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          newW = maxDim
          newH = Math.round((height / width) * maxDim)
        } else {
          newH = maxDim
          newW = Math.round((width / height) * maxDim)
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width  = newW
      canvas.height = newH

      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(file); return }

      ctx.drawImage(img, 0, 0, newW, newH)

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          const outName = file.name.replace(/\.[^.]+$/, '.jpg')
          resolve(new File([blob], outName, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file) // fallback: return original unchanged
    }

    img.src = url
  })
}
