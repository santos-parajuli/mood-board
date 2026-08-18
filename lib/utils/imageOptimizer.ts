import { Mode } from "@/lib/types"

/**
 * Client-side Image Optimization Utilities
 * 1A: Downscales high-res images before background/transparency processing.
 * 2A: Automatically crops empty transparent padding around cutout images.
 * 3A: Removes white backgrounds client-side (replaces the old /api/removebg route).
 */

/**
 * 1A: Downscales an image client-side to max dimensions (default 800px) and compresses it.
 * Significantly cuts server bandwidth and API processing time.
 */
export async function downscaleImageForApi(
  imageUrl: string,
  maxDimension: number = 800
): Promise<string> {
  return new Promise((resolve, reject) => {
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
      // Export as compressed JPEG to keep payload small (~100KB)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85)
      resolve(dataUrl)
    }

    img.onerror = () => {
      // Fallback to original URL if CORS or load fails
      resolve(imageUrl)
    }

    img.src = imageUrl
  })
}

/**
 * 2A: Automatically trims/crops transparent padding around a PNG image.
 * Optimized: Downscales FIRST to reduce pixel loop size, and yields to UI.
 */
export async function autocropTransparentImage(
  imageUrl: string,
  padding: number = 8,
  maxDimension: number = 1000
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = async () => {
      let width = img.naturalWidth
      let height = img.naturalHeight

      // 1. YIELD TO UI: Let React paint the "Processing" skeleton before we freeze the thread
      await new Promise((r) => setTimeout(r, 0))

      // 2. PRE-DOWNSCALE: Shrink the image BEFORE scanning pixels to reduce loop size by ~80%
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

      // Draw the downscaled image
      ctx.drawImage(img, 0, 0, width, height)

      try {
        const imageData = ctx.getImageData(0, 0, width, height)
        const data = imageData.data

        let minX = width
        let minY = height
        let maxX = 0
        let maxY = 0
        let foundPixel = false

        // Scan pixels for non-transparent alpha values (> 15)
        // This loop is now running on a much smaller image array
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

        // If no solid pixels found or crop bounds match full size, return downscaled image
        if (
          !foundPixel ||
          (minX === 0 &&
            minY === 0 &&
            maxX === width - 1 &&
            maxY === height - 1)
        ) {
          resolve(canvas.toDataURL("image/png"))
          return
        }

        // Add optional small padding around subject
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
          canvas, // Draw from the downscaled canvas, not the original huge image
          minX,
          minY,
          croppedWidth,
          croppedHeight,
          0,
          0,
          croppedWidth,
          croppedHeight
        )

        // Export as lossless PNG to preserve transparent alpha channels
        const outputDataUrl = cropCanvas.toDataURL("image/png")
        resolve(outputDataUrl)
      } catch (err) {
        // If canvas is tainted (CORS), return original URL gracefully
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
 * Mirrors the old /api/removebg endpoint (same auto-threshold algorithm) but runs
 * entirely in the browser via Canvas 2D — no server round-trip, no SSRF surface.
 *
 * The returned image keeps its original dimensions; callers should follow up
 * with autocropTransparentImage() to trim any surrounding transparent padding.
 */
export async function removeWhiteBackground(
  imageUrl: string,
  mode: Mode = "auto"
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = async () => {
      // YIELD TO UI: Let React paint the "Processing" skeleton before we freeze the thread
      await new Promise((r) => setTimeout(r, 0))

      const width = img.naturalWidth
      const height = img.naturalHeight

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")

      if (!ctx || width === 0 || height === 0) {
        resolve(imageUrl)
        return
      }

      ctx.drawImage(img, 0, 0)

      try {
        const imageData = ctx.getImageData(0, 0, width, height)
        const data = imageData.data

        // Step 1: Determine a dynamic threshold for white removal
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

        // Step 2: Make white pixels transparent based on the threshold
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          if (r >= threshold && g >= threshold && b >= threshold) {
            data[i + 3] = 0 // Set alpha to 0 (transparent)
          }
        }

        ctx.putImageData(imageData, 0, 0)

        // Export as lossless PNG to preserve transparent alpha channels
        resolve(canvas.toDataURL("image/png"))
      } catch (err) {
        // If canvas is tainted (CORS) or getImageData fails, fall back gracefully
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
