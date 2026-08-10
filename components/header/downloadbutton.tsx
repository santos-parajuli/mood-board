"use client"

import React, { useState } from "react"
import jsPDF from "jspdf"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import useMoodboardStore from "@/lib/store/moodboardstore"
import {
  CanvasImageItem,
  CanvasTextItem,
  HighQualityImageResult,
  SocialMediaPlatform,
} from "@/lib/types"

const DownloadButton = () => {
  const { moodboards, getMoodboardState, region, name } = useMoodboardStore()
  const activeMoodboard = getMoodboardState()
  const [isDownloading, setIsDownloading] = useState<boolean>(false)

  // Calculate quality & scale dynamically based on image dimensions
  const getAdaptiveImageSettings = (width: number, height: number) => {
    const totalPixels = width * height

    // Very High Resolution (> 3 Megapixels) -> Compress more
    if (totalPixels > 3_000_000) {
      return { scaleFactor: 1.5, jpegQuality: 0.7 }
    }
    // Medium Resolution (1 - 3 Megapixels) -> Moderate Compression
    else if (totalPixels > 1_000_000) {
      return { scaleFactor: 2.0, jpegQuality: 0.8 }
    }
    // Low/Small Resolution (< 1 Megapixel) -> Keep High Quality
    else {
      return { scaleFactor: 2.5, jpegQuality: 0.9 }
    }
  }

  // Adaptive data URL processing for main images (JPEG)
  const toAdaptiveDataUrl = async (
    url: string
  ): Promise<HighQualityImageResult> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        const { scaleFactor, jpegQuality } = getAdaptiveImageSettings(
          img.naturalWidth,
          img.naturalHeight
        )

        const canvas = document.createElement("canvas")
        canvas.width = img.naturalWidth * scaleFactor
        canvas.height = img.naturalHeight * scaleFactor
        const ctx = canvas.getContext("2d")

        if (ctx) {
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"
          ctx.scale(scaleFactor, scaleFactor)
          ctx.drawImage(img, 0, 0)
        }

        resolve({
          dataUrl: canvas.toDataURL("image/jpeg", jpegQuality),
          width: img.naturalWidth,
          height: img.naturalHeight,
        })
      }
      img.onerror = reject
      img.src = url
    })
  }

  // PNG variant — preserves transparency for UI icons and logos
  const toHighQualityPngDataUrl = async (
    url: string
  ): Promise<HighQualityImageResult> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        const QUALITY_SCALE_FACTOR = 2
        const canvas = document.createElement("canvas")
        canvas.width = img.naturalWidth * QUALITY_SCALE_FACTOR
        canvas.height = img.naturalHeight * QUALITY_SCALE_FACTOR
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"
          ctx.scale(QUALITY_SCALE_FACTOR, QUALITY_SCALE_FACTOR)
          ctx.drawImage(img, 0, 0)
        }
        resolve({
          dataUrl: canvas.toDataURL("image/png"),
          width: img.naturalWidth,
          height: img.naturalHeight,
        })
      }
      img.onerror = reject
      img.src = url
    })
  }

  const addImageWithCover = async (
    pdf: jsPDF,
    imgData: string,
    x: number,
    y: number,
    targetWidth: number,
    targetHeight: number,
    forceFormat?: "PNG" | "JPEG",
    uploadedFromSubheader?: boolean
  ): Promise<void> => {
    const sourceMayHaveAlpha =
      imgData.startsWith("data:image/webp") ||
      imgData.startsWith("data:image/png")

    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const { scaleFactor } = getAdaptiveImageSettings(
          img.naturalWidth,
          img.naturalHeight
        )
        const canvas = document.createElement("canvas")
        canvas.width = targetWidth * scaleFactor
        canvas.height = targetHeight * scaleFactor
        const ctx = canvas.getContext("2d")

        if (ctx) {
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"

          if (!uploadedFromSubheader) {
            // object-contain
            const imgAspect = img.naturalWidth / img.naturalHeight
            const targetAspect = targetWidth / targetHeight
            let drawW = canvas.width
            let drawH = canvas.height
            let drawX = 0
            let drawY = 0

            if (imgAspect > targetAspect) {
              drawH = canvas.width / imgAspect
              drawY = (canvas.height - drawH) / 2
            } else {
              drawW = canvas.height * imgAspect
              drawX = (canvas.width - drawW) / 2
            }
            ctx.drawImage(img, drawX, drawY, drawW, drawH)
          } else {
            // object-cover
            const imgAspect = img.naturalWidth / img.naturalHeight
            const targetAspect = targetWidth / targetHeight
            let sourceX = 0,
              sourceY = 0,
              sourceWidth = img.naturalWidth,
              sourceHeight = img.naturalHeight

            if (imgAspect > targetAspect) {
              sourceWidth = sourceHeight * targetAspect
              sourceX = (img.naturalWidth - sourceWidth) / 2
            } else {
              sourceHeight = sourceWidth / targetAspect
              sourceY = (img.naturalHeight - sourceHeight) / 2
            }

            ctx.drawImage(
              img,
              sourceX,
              sourceY,
              sourceWidth,
              sourceHeight,
              0,
              0,
              canvas.width,
              canvas.height
            )
          }
        }

        const outputFormat =
          forceFormat ?? (sourceMayHaveAlpha ? "PNG" : "JPEG")

        pdf.addImage(
          outputFormat === "PNG"
            ? canvas.toDataURL("image/png")
            : canvas.toDataURL("image/jpeg", 0.85),
          outputFormat,
          x,
          y,
          targetWidth,
          targetHeight,
          undefined,
          "NONE"
        )
        resolve()
      }
      img.onerror = () => resolve() // Defensive fallback: skip failed image
      img.src = imgData
    })
  }

  const handleDownload = async () => {
    if (!moodboards || !moodboards.length) {
      toast.error("No moodboards to download")
      return
    }

    setIsDownloading(true)
    const downloadPromise = new Promise<string>(async (resolve, reject) => {
      try {
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "pt",
          format: [950, 612],
          hotfixes: ["px_scaling"],
        })

        pdf.setFontSize(12)

        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = pdf.internal.pageSize.getHeight()

        // Layout constants
        const headerHeight = 60
        const padding = 20
        const sectionGap = 15
        const indexAreaWidth = 220
        const canvasAreaWidth = pdfWidth - indexAreaWidth - sectionGap
        const canvasTopPadding = headerHeight + padding
        const canvasBottomPadding = pdfHeight - 60 - padding

        // Load footer logo once
        const logoData = await toHighQualityPngDataUrl("/toniclogo.png")

        for (let index = 0; index < moodboards.length; index++) {
          const moodboard = moodboards[index]
          if (index > 0) pdf.addPage()

          const canvasImages: CanvasImageItem[] = (moodboard.canvasImages ||
            []) as CanvasImageItem[]
          const canvasTexts: CanvasTextItem[] = (moodboard.canvasTexts ||
            []) as CanvasTextItem[]

          const imagesWithData: CanvasImageItem[] = await Promise.all(
            canvasImages.map(async (img) => {
              try {
                if (img.src && img.src.startsWith("data:")) {
                  return {
                    ...img,
                    dataUrl: img.src,
                    naturalWidth: img.width || img.baseWidth,
                    naturalHeight: img.height || img.baseHeight,
                  }
                }
                if (img.dataUrl) {
                  return img
                }
                const { dataUrl, width, height } = await toAdaptiveDataUrl(
                  img.originalSrc || img.src
                )
                return {
                  ...img,
                  dataUrl,
                  naturalWidth: width,
                  naturalHeight: height,
                }
              } catch (e) {
                console.warn(`Failed to process image: ${img.src}`, e)
                return img
              }
            })
          )

          // Calculate bounding box
          let minX = Infinity,
            minY = Infinity,
            maxX = 0,
            maxY = 0

          canvasImages.forEach((img) => {
            minX = Math.min(minX, img.x)
            minY = Math.min(minY, img.y)
            maxX = Math.max(maxX, img.x + img.baseWidth)
            maxY = Math.max(maxY, img.y + img.baseHeight)
          })

          canvasTexts.forEach((text) => {
            const textWidth = pdf.getStringUnitWidth(text.text) * text.fontSize
            const textHeight = text.fontSize
            minX = Math.min(minX, text.x)
            minY = Math.min(minY, text.y)
            maxX = Math.max(maxX, text.x + textWidth)
            maxY = Math.max(maxY, text.y + textHeight)
          })

          if (canvasImages.length === 0 && canvasTexts.length === 0) {
            minX = 0
            minY = 0
            maxX = 0
            maxY = 0
          }

          // Scale to fit canvas area
          const contentWidth = maxX - minX
          const contentHeight = maxY - minY
          const availableCanvasWidth = canvasAreaWidth - 2 * padding
          const availableCanvasHeight = canvasBottomPadding - canvasTopPadding
          const scaleX =
            contentWidth > 0 ? availableCanvasWidth / contentWidth : 1
          const scaleY =
            contentHeight > 0 ? availableCanvasHeight / contentHeight : 1
          const uniformScale = Math.min(scaleX, scaleY)
          const scaledContentWidth = contentWidth * uniformScale
          const scaledContentHeight = contentHeight * uniformScale

          let offsetX = 10
          const hasUploadedImages =
            activeMoodboard?.canvasImages?.some((img: any) => img.uploaded) ??
            false
          if (!hasUploadedImages) {
            offsetX = (availableCanvasWidth - scaledContentWidth) / 2
          }
          const offsetY = (availableCanvasHeight - scaledContentHeight) / 2

          // Draw canvas images
          for (const image of imagesWithData) {
            const scaledX = padding + offsetX + (image.x - minX) * uniformScale
            const scaledY =
              canvasTopPadding + offsetY + (image.y - minY) * uniformScale
            const scaledWidth = image.baseWidth * uniformScale
            const scaledHeight = image.baseHeight * uniformScale
            if (image.dataUrl) {
              await addImageWithCover(
                pdf,
                image.dataUrl,
                scaledX,
                scaledY,
                scaledWidth,
                scaledHeight,
                undefined,
                image.uploadedFromSubheader
              )
            }
          }

          // Draw texts
          for (const text of canvasTexts) {
            const scaledX = padding + offsetX + (text.x - minX) * uniformScale
            const scaledY =
              canvasTopPadding +
              offsetY +
              (text.y - minY) * uniformScale +
              text.fontSize * uniformScale
            const scaledFontSize = Math.max(4, text.fontSize * uniformScale)
            pdf.setFontSize(scaledFontSize)
            pdf.text(text.text, scaledX, scaledY)
          }

          // Divider between canvas & index
          pdf.setDrawColor(200, 200, 200)
          const dividerX = canvasAreaWidth + sectionGap / 2
          const footerDividerY = pdfHeight - 40 - 10
          pdf.line(dividerX, headerHeight, dividerX, footerDividerY)

          // Index section
          const uniqueIndexItems: CanvasImageItem[] = []
          const seenUrls = new Set<string>()
          for (const image of imagesWithData) {
            if (image.pillowUrl && !seenUrls.has(image.pillowUrl)) {
              seenUrls.add(image.pillowUrl)
              uniqueIndexItems.push(image)
            }
          }

          let yPosition = canvasTopPadding
          const indexX = canvasAreaWidth + sectionGap + padding
          const indexContentWidth = indexAreaWidth - 2 * padding
          const thumbSize = 30
          const textLineHeight = 12
          const itemSpacing = 15

          pdf.setFontSize(9)
          pdf.setTextColor(40, 40, 40)

          for (const image of uniqueIndexItems) {
            const thumbAspect = image.baseWidth / image.baseHeight
            let thumbWidth = thumbSize,
              thumbHeight = thumbSize

            if (thumbAspect > 1) {
              thumbHeight = thumbSize / thumbAspect
            } else {
              thumbWidth = thumbSize * thumbAspect
            }

            if (image.dataUrl) {
              await addImageWithCover(
                pdf,
                image.dataUrl,
                indexX,
                yPosition,
                thumbWidth,
                thumbHeight
              )
            }
            const textX = indexX + thumbWidth + 8
            const textWidth = indexContentWidth - thumbWidth - 8
            pdf.setTextColor(0, 0, 255)

            const textLines: string[] = pdf.splitTextToSize(
              image.alt || "",
              textWidth
            )
            const textHeight = textLines.length * textLineHeight
            const baseUrl =
              region === "CA"
                ? "https://www.tonicliving.ca"
                : "https://www.tonicliving.com"
            const productUrl = `${baseUrl}/products/${image.pillowUrl?.split("/").pop() || ""}`

            textLines.forEach((line, i) => {
              const lineY =
                yPosition +
                thumbHeight / 2 -
                textHeight / 2 +
                i * textLineHeight +
                textLineHeight
              pdf.text(line, textX, lineY)
              const lineMetricWidth = pdf.getTextWidth(line)
              pdf.link(
                textX,
                lineY - textLineHeight + 2,
                lineMetricWidth,
                textLineHeight,
                {
                  url: productUrl,
                }
              )
            })
            pdf.setTextColor(40, 40, 40)
            yPosition += Math.max(thumbHeight, textHeight) + itemSpacing
          }

          // Footer section
          const footerY = pdfHeight - 40
          pdf.setDrawColor(200, 200, 200)
          pdf.line(padding, footerY - 10, pdfWidth - padding, footerY - 10)

          const logoWidth = 145
          const logoHeight = 26.5
          try {
            await addImageWithCover(
              pdf,
              logoData.dataUrl,
              padding,
              footerY,
              logoWidth,
              logoHeight,
              "PNG"
            )
            const tonicUrl =
              region === "CA"
                ? "https://www.tonicliving.ca"
                : "https://www.tonicliving.com"
            pdf.link(padding, footerY, logoWidth, logoHeight, { url: tonicUrl })
          } catch (e) {
            console.log("Could not load footer logo", e)
          }

          const flexGap = 20
          const sectionY = footerY + 10
          const addressX = padding + logoWidth + flexGap

          pdf.setFontSize(9)
          pdf.setTextColor(80, 80, 80)
          pdf.text("36 Northline Rd. No. 6", addressX, sectionY)
          pdf.text("Toronto, ON M4B 3E2", addressX, sectionY + 12)

          const contactX = addressX + 120
          pdf.text("416-699-9879", contactX, sectionY)
          pdf.text("designhelp@tonicliving.com", contactX, sectionY + 12)

          let socialX = pdfWidth - 120
          const socialSize = 15
          const socialSpacing = 25
          const socialMedia: SocialMediaPlatform[] = [
            {
              icon: "/Instagram.png",
              url: "https://www.instagram.com/tonicliving/",
            },
            {
              icon: "/Facebook.png",
              url: "https://www.facebook.com/tonicliving/",
            },
            {
              icon: "/Pinterest.png",
              url: "https://www.pinterest.com/tonicliving/",
            },
          ]

          for (const platform of socialMedia) {
            try {
              const iconData = await toHighQualityPngDataUrl(platform.icon)
              await addImageWithCover(
                pdf,
                iconData.dataUrl,
                socialX,
                footerY + 5,
                socialSize,
                socialSize,
                "PNG"
              )
              pdf.link(socialX, footerY + 5, socialSize, socialSize, {
                url: platform.url,
              })
              socialX += socialSpacing
            } catch (e) {
              console.log(`Could not load ${platform.icon} icon`, e)
            }
          }
        }

        const cleanedMoodboards = moodboards.map((board) => ({
          ...board,
          canvasImages: (board.canvasImages || []).map((img) => {
            const { dataUrl, src, ...rest } = img
            return rest
          }),
        }))
        const metadata = { moodboards: cleanedMoodboards, name, region }

        pdf.addMetadata(JSON.stringify(metadata), "jspdf:metadata")
        pdf.save(`${name || "moodboard"}.pdf`)
        resolve("Mood boards downloaded successfully!")
      } catch (error) {
        console.error("Error during PDF generation:", error)
        reject("Failed to download mood boards")
      } finally {
        setIsDownloading(false)
      }
    })

    toast.promise(downloadPromise, {
      loading: "Generating Your Mood Boards...",
      success: (message) => message,
      error: (err: any) => err,
    })
  }

  return (
    <Button
      className="bg-primary text-primary-foreground hover:bg-primary/90"
      onClick={handleDownload}
      disabled={isDownloading}
    >
      {isDownloading ? "Downloading..." : "Download"}
    </Button>
  )
}

export default DownloadButton
