"use client"

import React, { useRef, useState } from "react"
import { Copy, PlusCircle, SettingsIcon, Trash2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import useMoodboardStore from "@/lib/store/moodboardstore"
import useCanvasStore from "@/lib/store/canvasStore"
import DeleteMoodboardDialog from "./deletemoodboarddialog"

import { CanvasImageItem } from "@/lib/types"
import { autocropTransparentImage } from "@/lib/utils/imageOptimizer"

const Settings = () => {
  const {
    moodboards,
    activeMoodboardId,
    getMoodboardState,
    setMoodboardState,
    region,
    setRegion,
    name,
    setName,
    createMoodboard,
    deleteMoodboard,
    selectMoodboard,
    duplicateMoodboard,
    updateCanvasImage,
    setLoadedMoodboards,
  } = useMoodboardStore()

  const activeMoodboard = getMoodboardState()
  const { canvasRef } = useCanvasStore()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false)

  const handleCreateMoodboard = () => {
    createMoodboard()
    toast.success(`New moodboard created!`)
  }

  const handleDeleteMoodboardClick = () => {
    setIsDeleteDialogOpen(true)
  }

  const handleDuplicateMoodboard = () => {
    if (activeMoodboardId) {
      duplicateMoodboard(activeMoodboardId)
      toast.success("Moodboard duplicated!")
    }
  }

  const handleConfirmDelete = () => {
    if (moodboards.length <= 1) {
      toast.error("Cannot delete the last moodboard.")
      setIsDeleteDialogOpen(false)
      return
    }
    if (activeMoodboardId) {
      deleteMoodboard(activeMoodboardId)
      toast.success("Moodboard deleted!")
    }
    setIsDeleteDialogOpen(false)
  }

  const loadMoodboard = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        let loadedState: any
        const result = e.target?.result
        if (!result) return

        if (file.type === "application/pdf") {
          const pdfjsLib = require("pdfjs-dist")
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
          const pdfData = new Uint8Array(result as ArrayBuffer)
          const loadingTask = pdfjsLib.getDocument({ data: pdfData })
          const pdfDoc = await loadingTask.promise
          const metadata = await pdfDoc.getMetadata()
          const compressedMetadata =
            metadata.info.moodboardData ||
            metadata.metadata?.get("jspdf:metadata")

          if (!compressedMetadata) {
            toast.error("PDF does not contain moodboard data.")
            return
          }
          loadedState = JSON.parse(compressedMetadata)
        } else if (file.type === "application/json") {
          loadedState = JSON.parse(result as string)
        } else {
          toast.error("Unsupported file type. Please load a JSON or PDF file.")
          return
        }

        if (loadedState.name) setName(loadedState.name)
        if (loadedState.region) setRegion(loadedState.region)

        if (
          Array.isArray(loadedState.moodboards) &&
          loadedState.moodboards.length > 0
        ) {
          const restoredMoodboards = loadedState.moodboards.map(
            (moodboard: any, i: number) => {
              const newMoodboardId =
                moodboard.id ||
                `moodboard-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`

              const restoredImages = (moodboard.canvasImages || []).map(
                (img: any) => {
                  const transparentUrl =
                    img.transparentImageUrl ||
                    img.transparent_image_url ||
                    img.transparent_url
                  const hasTransparentImage = Boolean(transparentUrl)
                  const persistedDataUrl =
                    typeof img.src === "string" && img.src.startsWith("data:")
                      ? img.src
                      : typeof img.dataUrl === "string" &&
                          img.dataUrl.startsWith("data:")
                        ? img.dataUrl
                        : null
                  const imageSrc =
                    persistedDataUrl ||
                    transparentUrl ||
                    img.src ||
                    img.originalSrc ||
                    ""

                  return {
                    ...img,
                    src: imageSrc,
                    originalSrc: imageSrc,
                    isProcessing: false,
                  }
                }
              )

              const restoredTexts = (moodboard.canvasTexts || []).map(
                (txt: any) => ({
                  ...txt,
                })
              )

              return {
                id: newMoodboardId,
                name:
                  moodboard.name ||
                  `${loadedState.name || "Moodboard"} - ${i + 1}`,
                canvasImages: restoredImages,
                canvasTexts: restoredTexts,
                selectedGalleryItems: moodboard.selectedGalleryItems || [],
                selectedComboboxItem: moodboard.selectedComboboxItem || "",
              }
            }
          )

          // Replace moodboards in store completely — NO extra or leftover pages!
          setLoadedMoodboards(restoredMoodboards, restoredMoodboards[0]?.id)

          // Background auto-crop if needed for transparent items without pre-rendered data URLs
          restoredMoodboards.forEach((mb: any) => {
            ;(mb.canvasImages || []).forEach((img: any) => {
              const transparentUrl =
                img.transparentImageUrl ||
                img.transparent_image_url ||
                img.transparent_url
              if (
                transparentUrl &&
                (!img.src || !img.src.startsWith("data:"))
              ) {
                autocropTransparentImage(transparentUrl)
                  .then((croppedSrc) => {
                    updateCanvasImage(img.id, {
                      src: croppedSrc,
                      dataUrl: croppedSrc,
                      isProcessing: false,
                    })
                  })
                  .catch(() => {
                    updateCanvasImage(img.id, { isProcessing: false })
                  })
              }
            })
          })
        }

        toast.success("Moodboard state loaded successfully!")
      } catch (error) {
        console.error("Error parsing file:", error)
        toast.error("Failed to load moodboard state. Invalid file.")
      }
    }

    if (file.type === "application/pdf") {
      reader.readAsArrayBuffer(file)
    } else {
      reader.readAsText(file)
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const currentImages = activeMoodboard?.canvasImages || []

    const uploadedCount = currentImages.filter(
      (img: any) => img.uploaded
    ).length

    if (uploadedCount >= 2) {
      toast.error("You can add at most 2 custom images.")
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const src = e.target?.result as string
      if (!src) return
      const img = new Image()
      img.onload = () => {
        const newImage = {
          id: `image-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          src: src,
          originalSrc: src,
          x: 100,
          y: 100,
          width: 200,
          height: (200 * img.height) / img.width,
          currentWidth: 200,
          currentHeight: (200 * img.height) / img.width,
          baseWidth: 200,
          baseHeight: (200 * img.height) / img.width,
          resizable: false,
          uploaded: true,
        }
        const updatedCanvasImages = [...currentImages, newImage]
        setMoodboardState({
          ...activeMoodboard,
          canvasImages: updatedCanvasImages,
        })
        toast.success("Image added to canvas!")
      }
      img.src = src
    }
    reader.readAsDataURL(file)
    if (event.target) {
      event.target.value = ""
    }
  }

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button className="rounded-sm" variant="outline" size="icon">
            <SettingsIcon className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>
              Manage your moodboard settings here.
            </SheetDescription>
          </SheetHeader>
          <div className="grid flex-1 auto-rows-min gap-6 px-4 py-4">
            <div className="grid gap-3">
              <Label className="text-sm font-semibold tracking-wider text-gray-500 uppercase">
                Moodboards (Slides)
              </Label>

              {/* PPT-style vertical list of slides */}
              <div className="flex max-h-75 flex-col gap-2 overflow-y-auto rounded-md border bg-gray-50 p-2 pr-1">
                {moodboards.map((mb, index) => {
                  const isActive = mb.id === activeMoodboardId
                  const imgCount = mb.canvasImages?.length || 0
                  const textCount = mb.canvasTexts?.length || 0

                  return (
                    <div
                      key={mb.id}
                      onClick={() => selectMoodboard(mb.id)}
                      className={`group relative flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all duration-200 ${
                        isActive
                          ? "border-blue-500 bg-white shadow-sm ring-1 ring-blue-500/20"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {/* Slide number */}
                      <span
                        className={`font-mono text-xs font-medium ${isActive ? "text-blue-600" : "text-gray-400"}`}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      {/* Mock slide preview box */}
                      <div
                        className={`flex h-10 w-16 items-center justify-center rounded border text-[10px] ${isActive ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 bg-gray-100 text-gray-500"}`}
                      >
                        <div className="text-center leading-none">
                          <div className="font-semibold">{imgCount} Img</div>
                          <div className="mt-0.5 text-[8px]">
                            {textCount} Text
                          </div>
                        </div>
                      </div>

                      {/* Slide title / info */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm font-medium ${isActive ? "text-gray-900" : "text-gray-700"}`}
                        >
                          {name} - {index + 1}
                        </p>
                      </div>

                      {/* Quick delete button on slide */}
                      {moodboards.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (mb.id === activeMoodboardId) {
                              handleDeleteMoodboardClick()
                            } else {
                              deleteMoodboard(mb.id)
                              toast.success("Moodboard deleted!")
                            }
                          }}
                          className="rounded p-1 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-600"
                          title="Delete Slide"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Actions box for creating and copying */}
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-gray-100/50 p-3">
                <Button
                  onClick={handleCreateMoodboard}
                  variant="outline"
                  className="flex h-9 items-center justify-center gap-1.5 bg-white text-xs"
                >
                  <PlusCircle className="h-4 w-4 text-emerald-600" />
                  New Slide
                </Button>
                <Button
                  onClick={handleDuplicateMoodboard}
                  variant="outline"
                  className="flex h-9 items-center justify-center gap-1.5 bg-white text-xs"
                >
                  <Copy className="h-4 w-4 text-blue-600" />
                  Copy Active
                </Button>
              </div>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="moodboard-name">Moodboard Name</Label>
              <Input
                id="moodboard-name"
                value={name || ""}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-3">
              <Label>Region</Label>
              <Select
                onValueChange={(value) => setRegion(value)}
                value={region || "CA"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="USA">United States</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3">
              <Label>Load Moodboard</Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={loadMoodboard}
                className="hidden"
                accept=".json,.pdf"
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                Load from file
              </Button>
            </div>
            {/* Custom images section removed - now in subheader */}
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">Close</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <DeleteMoodboardDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}

export default Settings
