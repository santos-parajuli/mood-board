import { Mode } from "@/lib/types"

/**
 * Client-side Image Optimization Utilities
 * 1A: Downscales high-res images before background/transparency processing.
 * 2A: Automatically crops empty transparent padding around cutout images.
 * 3A: Removes white backgrounds client-side (replaces the old /api/removebg route).
 *
 * REFACTOR NOTES:
 * - NO BLOBS: All functions return base64 Data URIs exclusively.
 * - MAX PIXELS: Strictly capped at 4000x4000.
 * - MAX SIZE: Strictly enforced under 1MB (~1,000,000 base64 characters).
 */

const MAX_DIM = 4000
const MAX_BYTES = 1000000

/**
 * Core Helper: Enforces 4000px max dimension and < 1MB file size.
 * Returns a base64 Data URI. Never returns a Blob.
 */
function exportCompressedDataURL(
  canvas: HTMLCanvasElement,
  hasAlpha: boolean
): string {
  const ctx = canvas.getContext("2d")
  if (!ctx) return ""

  let width = canvas.width
  let height = canvas.height

  // Helper to scale down the canvas in-place
  const scaleCanvas = (scale: number) => {
    const newW = Math.max(1, Math.round(width * scale))
    const newH = Math.max(1, Math.round(height * scale))
    const tmpCanvas = document.createElement("canvas")
    tmpCanvas.width = newW
    tmpCanvas.height = newH
    const tmpCtx = tmpCanvas.getContext("2d")
    if (!tmpCtx) return

    tmpCtx.drawImage(canvas, 0, 0, newW, newH)

    width = newW
    height = newH
    canvas.width = newW
    canvas.height = newH
    ctx.drawImage(tmpCanvas, 0, 0)
  }

  // 1. Enforce max dimension (4000px)
  if (width > MAX_DIM || height > MAX_DIM) {
    const scale = Math.min(MAX_DIM / width, MAX_DIM / height)
    scaleCanvas(scale)
  }

  // 2. Enforce max file size (< 1MB)
  if (hasAlpha) {
    // PNG: We can't adjust quality, so we must scale down dimensions to reduce size
    let dataUrl = canvas.toDataURL("image/png")
    while (dataUrl.length > MAX_BYTES && width > 100 && height > 100) {
      scaleCanvas(0.8)
      dataUrl = canvas.toDataURL("image/png")
    }
    return dataUrl
  } else {
    // JPEG: We can lower quality first, then scale dimensions if still too large
    let quality = 0.85
    let dataUrl = canvas.toDataURL("image/jpeg", quality)

    while (dataUrl.length > MAX_BYTES && quality > 0.1) {
      quality -= 0.1
      dataUrl = canvas.toDataURL("image/jpeg", quality)
    }

    while (dataUrl.length > MAX_BYTES && width > 100 && height > 100) {
      scaleCanvas(0.8)
      dataUrl = canvas.toDataURL("image/jpeg", 0.5) // Hard compress
    }

    return dataUrl
  }
}

/**
 * 1A: Downscales an image client-side and compresses it.
 */
export async function downscaleImageForApi(
  imageUrl: string,
  maxDimension: number = MAX_DIM,
  hasAlpha: boolean = false
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      let width = img.naturalWidth
      let height = img.naturalHeight

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        resolve(imageUrl)
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      // Pass hasAlpha to the exporter
      const compressedDataUrl = exportCompressedDataURL(canvas, hasAlpha)
      resolve(compressedDataUrl)
    }

    img.onerror = () => {
      resolve(imageUrl)
    }

    img.src = imageUrl
  })
}

/**
 * 2A: Automatically trims/crops transparent padding around a PNG image.
 */
export async function autocropTransparentImage(
  imageUrl: string,
  padding: number = 8,
  maxDimension: number = MAX_DIM
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = async () => {
      let width = img.naturalWidth
      let height = img.naturalHeight

      await new Promise((r) => setTimeout(r, 0))

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        resolve(imageUrl)
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      try {
        const imageData = ctx.getImageData(0, 0, width, height)
        const data = imageData.data

        let minX = width
        let minY = height
        let maxX = 0
        let maxY = 0
        let foundPixel = false

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const alphaIndex = (y * width + x) * 4 + 3
            if (data[alphaIndex] > 15) {
              foundPixel = true
              if (x < minX) minX = x
              if (x > maxX) maxX = x
              if (y < minY) minY = y
              if (y > maxY) maxY = y
            }
          }
        }

        if (
          !foundPixel ||
          (minX === 0 &&
            minY === 0 &&
            maxX === width - 1 &&
            maxY === height - 1)
        ) {
          // Export as transparent PNG < 1MB
          resolve(exportCompressedDataURL(canvas, true))
          return
        }

        minX = Math.max(0, minX - padding)
        minY = Math.max(0, minY - padding)
        maxX = Math.min(width - 1, maxX + padding)
        maxY = Math.min(height - 1, maxY + padding)

        const croppedWidth = maxX - minX + 1
        const croppedHeight = maxY - minY + 1

        const cropCanvas = document.createElement("canvas")
        cropCanvas.width = croppedWidth
        cropCanvas.height = croppedHeight
        const cropCtx = cropCanvas.getContext("2d")

        if (!cropCtx) {
          resolve(imageUrl)
          return
        }

        cropCtx.imageSmoothingEnabled = true
        cropCtx.imageSmoothingQuality = "high"
        cropCtx.drawImage(
          canvas,
          minX,
          minY,
          croppedWidth,
          croppedHeight,
          0,
          0,
          croppedWidth,
          croppedHeight
        )

        // Export as transparent PNG < 1MB
        const outputDataUrl = exportCompressedDataURL(cropCanvas, true)
        resolve(outputDataUrl)
      } catch (err) {
        console.warn(
          "Autocrop skipped due to canvas security restriction:",
          err
        )
        resolve(imageUrl)
      }
    }

    img.onerror = () => {
      resolve(imageUrl)
    }

    img.src = imageUrl
  })
}

/**
 * 3A: Removes white/light backgrounds client-side and returns a transparent PNG.
 */
export async function removeWhiteBackground(
  imageUrl: string,
  mode: Mode = "auto"
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = async () => {
      await new Promise((r) => setTimeout(r, 0))

      let width = img.naturalWidth
      let height = img.naturalHeight

      // Enforce strict 4000px limit BEFORE heavy pixel manipulation
      if (width > MAX_DIM || height > MAX_DIM) {
        const scale = Math.min(MAX_DIM / width, MAX_DIM / height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")

      if (!ctx || width === 0 || height === 0) {
        resolve(imageUrl)
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      try {
        const imageData = ctx.getImageData(0, 0, width, height)
        const data = imageData.data

        let threshold = 250
        if (mode === "auto") {
          let totalBrightness = 0
          let count = 0

          for (let i = 0; i < data.length; i += 16 * 4) {
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]
            totalBrightness += (r + g + b) / 3
            count++
          }

          const avgBrightness = count > 0 ? totalBrightness / count : 0
          threshold =
            avgBrightness > 222
              ? 250
              : avgBrightness > 200
                ? 240
                : avgBrightness > 180
                  ? 230
                  : avgBrightness > 160
                    ? 220
                    : 210
        }

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          if (r >= threshold && g >= threshold && b >= threshold) {
            data[i + 3] = 0
          }
        }

        ctx.putImageData(imageData, 0, 0)

        // Export as transparent PNG < 1MB
        resolve(exportCompressedDataURL(canvas, true))
      } catch (err) {
        console.warn(
          "removeWhiteBackground skipped due to canvas security restriction:",
          err
        )
        resolve(imageUrl)
      }
    }

    img.onerror = () => {
      resolve(imageUrl)
    }

    img.src = imageUrl
  })
}
