"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  Upload,
  Crop,
  X,
  Image as ImageIcon,
  Link as LinkIcon,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import useMoodboardStore from "@/lib/store/moodboardstore"
import { VisualCropper } from "@/components/canvas/visualcropper"
import { PillowSelector } from "@/components/pillowselector"
import { OnboardingSlideshow } from "@/components/onboarding/onboardingslideshow"
import { OnboardingProgress } from "@/components/onboarding/onboardingprogress"

const steps = [
  { id: "basics", title: "Moodboard Basics" },
  { id: "pillow", title: "Comfort Style" },
  { id: "space", title: "Your Space" },
]

import { SettingsFormData } from "@/lib/types"

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

const contentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
}

export default function SettingsOnboardingForm() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Zustand Store Actions
  const {
    setRegion,
    setName,
    setFavoritePillows,
    setSpaceImage,
    setColor,
    setFabricMaterial,
    setPattern,
    addCanvasImage,
    allPillowData,
  } = useMoodboardStore()

  // Crop dialog state
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false)
  const [cropValues, setCropValues] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  })
  const cropCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const [formData, setFormData] = useState<SettingsFormData>({
    moodboardName: "",
    region: "",
    favoritePillows: [],
    spaceImage: null,
    imagePreview: "",
  })

  const updateFormData = (field: keyof SettingsFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      updateFormData("spaceImage", file)
      updateFormData("imagePreview", URL.createObjectURL(file))
    } else {
      toast.error("Please upload an image file")
    }
  }

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateFormData("spaceImage", null)
    updateFormData("imagePreview", "")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // Load an image file into formData (shared by file input, drag-drop, and paste)
  const loadImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please provide an image file")
      return
    }
    updateFormData("spaceImage", file)
    updateFormData("imagePreview", URL.createObjectURL(file))
  }, [])

  // Load an image from a URL string
  const loadImageFromUrl = useCallback((url: string) => {
    // Create a temporary image to validate the URL
    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      // Convert to blob for File object
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d")
      ctx?.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "pasted-image.png", {
            type: "image/png",
          })
          updateFormData("spaceImage", file)
          updateFormData("imagePreview", url)
          toast.success("Image loaded from URL!")
        }
      }, "image/png")
    }
    img.onerror = () => {
      toast.error("Failed to load image from URL")
    }
    img.src = url
  }, [])

  // Drag-and-drop handlers for step 3
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        loadImageFile(files[0])
        return
      }

      // Check for dropped URL
      const url = e.dataTransfer.getData("text/plain")
      if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
        loadImageFromUrl(url)
      }
    },
    [loadImageFile, loadImageFromUrl]
  )

  // Paste event listener for step 3
  useEffect(() => {
    if (currentStep !== 2) return

    const handlePaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")
      ) {
        return
      }

      const items = e.clipboardData?.items
      if (!items) return

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) {
            loadImageFile(file)
            e.preventDefault()
            toast.success("Image pasted!")
          }
          return
        }
        if (item.type === "text/plain") {
          item.getAsString((text) => {
            const isUrl =
              text.startsWith("http://") || text.startsWith("https://")
            if (
              isUrl &&
              (text.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)/i) ||
                text.includes("image"))
            ) {
              loadImageFromUrl(text)
            }
          })
        }
      }
    }

    window.addEventListener("paste", handlePaste)
    return () => window.removeEventListener("paste", handlePaste)
  }, [currentStep, loadImageFile, loadImageFromUrl])

  // Crop dialog logic
  const handleCropApply = useCallback(() => {
    if (!formData.imagePreview) return

    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const sx = Math.round((cropValues.left / 100) * img.naturalWidth)
      const sy = Math.round((cropValues.top / 100) * img.naturalHeight)
      const sw = Math.round(
        ((100 - cropValues.left - cropValues.right) / 100) * img.naturalWidth
      )
      const sh = Math.round(
        ((100 - cropValues.top - cropValues.bottom) / 100) * img.naturalHeight
      )
      if (sw <= 0 || sh <= 0) {
        toast.error("Invalid crop area")
        return
      }
      canvas.width = sw
      canvas.height = sh
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], "cropped-reference.png", {
            type: "image/png",
          })
          const newPreviewUrl = URL.createObjectURL(blob)
          updateFormData("spaceImage", croppedFile)
          updateFormData("imagePreview", newPreviewUrl)
          setIsCropDialogOpen(false)
          setCropValues({ top: 0, bottom: 0, left: 0, right: 0 })
          toast.success("Image cropped!")
        }
      }, "image/png")
    }
    img.src = formData.imagePreview
  }, [formData.imagePreview, cropValues])

  const nextStep = () =>
    currentStep < steps.length - 1 && setCurrentStep((prev) => prev + 1)
  const prevStep = () => currentStep > 0 && setCurrentStep((prev) => prev - 1)

  const isStepValid = () => {
    if (currentStep === 0)
      return formData.moodboardName.trim() !== "" && formData.region !== ""
    if (currentStep === 1) return formData.favoritePillows.length > 0
    if (currentStep === 2) return formData.spaceImage !== null
    return true
  }

  const handleSubmit = () => {
    setIsSubmitting(true)
    setName(formData.moodboardName)
    setRegion(formData.region)
    setFavoritePillows(formData.favoritePillows)
    setSpaceImage(formData.spaceImage, formData.imagePreview)
    setColor([])
    setFabricMaterial([])
    setPattern([])

    // Auto-insert reference image and favorite pillows into canvas
    const refImageSize = 280
    const startX = 50
    const startY = 50

    // Insert reference space image (no background removal)
    if (formData.imagePreview) {
      addCanvasImage(
        {
          id: `ref-image-${Date.now()}`,
          src: formData.imagePreview,
          originalSrc: formData.imagePreview,
          alt: "Reference Space",
          x: startX,
          y: startY,
          originalWidth: 400,
          originalHeight: 400,
          baseWidth: refImageSize,
          baseHeight: refImageSize,
          currentWidth: refImageSize,
          currentHeight: refImageSize,
          uploaded: true,
        },
        true
      )
    }

    // Insert favorite pillows in a non-overlapping grid to the right
    // Use the same sizing logic as addImageToCanvas in canvas.tsx
    const PIXELS_PER_UNIT = 10
    const DEFAULT_SIZE = 100
    const pillowGap = 20
    const pillowsPerRow = 3

    // Pre-compute pillow sizes to layout the grid properly
    const pillowEntries = formData.favoritePillows
      .map((pillowId) => allPillowData.find((p: any) => p.id === pillowId))
      .filter(Boolean)

    let pillowStartX = startX + refImageSize + 30
    let currentRowY = startY
    let currentCol = 0
    let currentRowMaxHeight = 0

    pillowEntries.forEach((pillowData: any, index: number) => {
      if (!pillowData?.image_url) return

      // Extract dimensions from pillow name (e.g. "18x18", "20x20")
      const match = (pillowData.name || "").match(/(\d+)x(\d+)/i)
      let pillowWidth: number
      let pillowHeight: number

      if (match) {
        pillowWidth = parseInt(match[2], 10) * PIXELS_PER_UNIT
        pillowHeight = parseInt(match[1], 10) * PIXELS_PER_UNIT
      } else {
        pillowWidth = DEFAULT_SIZE
        pillowHeight = DEFAULT_SIZE
      }

      // Wrap to next row
      if (currentCol >= pillowsPerRow) {
        currentCol = 0
        currentRowY += currentRowMaxHeight + pillowGap
        currentRowMaxHeight = 0
      }

      const x = pillowStartX + currentCol * (pillowWidth + pillowGap)
      const y = currentRowY
      currentRowMaxHeight = Math.max(currentRowMaxHeight, pillowHeight)
      currentCol++

      addCanvasImage(
        {
          id: `pillow-onboard-${Date.now()}-${index}`,
          src: pillowData.image_url,
          originalSrc: pillowData.image_url,
          alt: pillowData.name || "Favorite Pillow",
          x,
          y,
          originalWidth: pillowWidth,
          originalHeight: pillowHeight,
          baseWidth: pillowWidth,
          baseHeight: pillowHeight,
          currentWidth: pillowWidth,
          currentHeight: pillowHeight,
          pillowUrl: pillowData.pillow_url || "",
          withInsertID: pillowData.with_insert_id || null,
          withoutInsertID: pillowData.cover_only_id || null,
          isProcessing: true,
        },
        true
      )
    })

    setTimeout(() => {
      toast.success("Settings workspace configured successfully!")
      router.replace("/moodboard")
      setIsSubmitting(false)
    }, 1000)
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4 md:p-8 lg:p-12">
      <div className="grid h-full w-full max-w-5xl items-center gap-8 lg:grid-cols-2 lg:gap-16">
        {/* Sub-Component 1: Text Presentation Slideshow */}
        <OnboardingSlideshow activeSlide={currentStep} />

        {/* Column 2: Form Interface */}
        <div className="w-full">
          {/* Sub-Component 2: Progress Tracker Bar */}
          <OnboardingProgress
            steps={steps}
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
          />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="overflow-hidden rounded-3xl border shadow-lg">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={contentVariants}
                >
                  {/* Step 1: Basics */}
                  {currentStep === 0 && (
                    <>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl">
                          Create your Moodboard Workspace
                        </CardTitle>
                        <CardDescription>
                          Let&apos;s map out the core identity of your curation
                          board.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="h-72 space-y-4 overflow-y-auto pt-2">
                        <motion.div variants={fadeInUp} className="space-y-1.5">
                          <Label htmlFor="moodboardName">Moodboard Name</Label>
                          <Input
                            id="moodboardName"
                            placeholder="Client's Name, Project, or Theme"
                            value={formData.moodboardName}
                            onChange={(e) =>
                              updateFormData("moodboardName", e.target.value)
                            }
                            className="rounded-xl"
                          />
                        </motion.div>
                        <motion.div variants={fadeInUp} className="space-y-1.5">
                          <Label htmlFor="region">Your Region</Label>
                          <Select
                            value={formData.region}
                            onValueChange={(value) =>
                              updateFormData("region", value)
                            }
                          >
                            <SelectTrigger id="region" className="rounded-xl">
                              <SelectValue placeholder="Select localization / region" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USA">USA</SelectItem>
                              <SelectItem value="CA">CANADA</SelectItem>
                            </SelectContent>
                          </Select>
                        </motion.div>
                      </CardContent>
                    </>
                  )}

                  {/* Step 2: Cushion Selector */}
                  {currentStep === 1 && (
                    <>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl">
                          Select Your Cushion Vibe
                        </CardTitle>
                        <CardDescription>
                          Search and pick up to 5 pillows (
                          {formData.favoritePillows.length}/5 selected)
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="h-72 space-y-4 overflow-y-auto pt-2">
                        <motion.div variants={fadeInUp} className="space-y-2">
                          <Label>Pillow Curation</Label>
                          <PillowSelector
                            selectedPillows={formData.favoritePillows}
                            onChange={(newPillows) =>
                              updateFormData("favoritePillows", newPillows)
                            }
                            maxSelections={5}
                          />
                        </motion.div>
                      </CardContent>
                    </>
                  )}

                  {/* Step 3: Space Image Upload */}
                  {currentStep === 2 && (
                    <>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl">
                          Upload Your Reference Space
                        </CardTitle>
                        <CardDescription>
                          Drag & drop, paste, or click to upload your space
                          image.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="h-72 space-y-4 overflow-y-auto pt-2">
                        <motion.div variants={fadeInUp} className="w-full">
                          <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          {!formData.imagePreview ? (
                            <div
                              onClick={() => fileInputRef.current?.click()}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={handleDrop}
                              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 transition-all duration-200 ${
                                isDragOver
                                  ? "scale-[1.02] border-primary bg-primary/5"
                                  : "border-muted-foreground/20 hover:border-primary/50 hover:bg-accent/50"
                              }`}
                            >
                              <div className="rounded-full bg-muted p-3">
                                <Upload
                                  className={`h-6 w-6 transition-colors ${isDragOver ? "text-primary" : "text-muted-foreground"}`}
                                />
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-medium">
                                  {isDragOver
                                    ? "Drop image here"
                                    : "Click, drag & drop, or paste"}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Supports JPG, PNG, GIF, WebP
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="relative h-[220px] w-full overflow-hidden rounded-2xl border bg-slate-900 flex items-center justify-center">
                              <img
                                src={formData.imagePreview}
                                alt="Space preview"
                                className="h-[-webkit-fill-available] max-w-full max-h-full object-contain"
                              />
                              <div className="absolute top-2 right-2 flex gap-1.5">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="gap-1 rounded-lg bg-background/80 backdrop-blur-sm hover:bg-background"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setCropValues({
                                      top: 0,
                                      bottom: 0,
                                      left: 0,
                                      right: 0,
                                    })
                                    setIsCropDialogOpen(true)
                                  }}
                                >
                                  <Crop className="h-3.5 w-3.5" /> Crop
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="rounded-lg"
                                  onClick={removeImage}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      </CardContent>
                    </>
                  )}

                  {/* Crop Dialog */}
                  <Dialog
                    open={isCropDialogOpen}
                    onOpenChange={setIsCropDialogOpen}
                  >
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Crop Reference Image</DialogTitle>
                      </DialogHeader>
                      <div className="py-2">
                        {formData.imagePreview && (
                          <VisualCropper
                            src={formData.imagePreview}
                            crop={cropValues}
                            onChange={(newCrop) => setCropValues(newCrop)}
                          />
                        )}
                      </div>
                      <DialogFooter className="gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => setIsCropDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleCropApply}>Apply Crop</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </motion.div>
              </AnimatePresence>

              {/* Navigation Action Buttons Container */}
              <CardFooter className="flex justify-between border-t bg-muted/50 px-6 py-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={prevStep}
                  disabled={currentStep === 0 || isSubmitting}
                  className="gap-1.5 rounded-xl"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button
                  type="button"
                  onClick={
                    currentStep < steps.length - 1 ? nextStep : handleSubmit
                  }
                  disabled={!isStepValid() || isSubmitting}
                  className="gap-1.5 rounded-xl"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />{" "}
                      Configuring...
                    </>
                  ) : currentStep < steps.length - 1 ? (
                    <>
                      Next <ChevronRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Complete Setup <Check className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
