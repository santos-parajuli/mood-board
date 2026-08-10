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
          pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.mjs`
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

        setName(loadedState.name)
        setRegion(loadedState.region)

        for (const moodboard of loadedState.moodboards) {
          const newMoodboardId = `moodboard-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
          createMoodboard()

          const newCanvasImages: any[] = []
          if (moodboard.canvasImages) {
            for (const img of moodboard.canvasImages) {
              if (img.dataUrl) {
                const byteString = atob(img.dataUrl.split(",")[1])
                const mimeString = img.dataUrl
                  .split(",")[0]
                  .split(":")[1]
                  .split(";")[0]
                const ab = new ArrayBuffer(byteString.length)
                const ia = new Uint8Array(ab)
                for (let i = 0; i < byteString.length; i++) {
                  ia[i] = byteString.charCodeAt(i)
                }
                const blob = new Blob([ab], { type: mimeString })
                const url = URL.createObjectURL(blob)
                newCanvasImages.push({ ...img, originalSrc: url })
              } else {
                newCanvasImages.push(img)
              }
            }
          }

          setMoodboardState({
            id: newMoodboardId,
            name: moodboard.name || "Loaded Moodboard",
            canvasImages: newCanvasImages || [],
            canvasTexts: moodboard.canvasTexts || [],
            selectedGalleryItems: moodboard.selectedGalleryItems || [],
            selectedComboboxItem: moodboard.selectedComboboxItem || "",
          })
          selectMoodboard(newMoodboardId)

          // FIXED WARNINGS: Safe contextual resolution checks matching updated CanvasStore types
          const targetCanvas =
            canvasRef && "current" in canvasRef ? canvasRef.current : canvasRef
          if (
            targetCanvas &&
            typeof (targetCanvas as any).handleRemoveBackground ===
              "function" &&
            newCanvasImages.length > 0
          ) {
            const imagePromises = newCanvasImages.map((img) => {
              if (img.originalSrc && !img.dataUrl) {
                return (targetCanvas as any).handleRemoveBackground(
                  img.id,
                  img.originalSrc
                )
              }
              return null
            })
            await Promise.all(imagePromises.filter((p) => p))
          }
        }

        deleteMoodboard("default-moodboard")
        toast.success("Moodboard state loaded!")
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
              <Label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Moodboards (Slides)</Label>
              
              {/* PPT-style vertical list of slides */}
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 border rounded-md p-2 bg-gray-50">
                {moodboards.map((mb, index) => {
                  const isActive = mb.id === activeMoodboardId;
                  const imgCount = mb.canvasImages?.length || 0;
                  const textCount = mb.canvasTexts?.length || 0;

                  return (
                    <div
                      key={mb.id}
                      onClick={() => selectMoodboard(mb.id)}
                      className={`group relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                        isActive
                          ? "bg-white border-blue-500 shadow-sm ring-1 ring-blue-500/20"
                          : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {/* Slide number */}
                      <span className={`text-xs font-mono font-medium ${isActive ? "text-blue-600" : "text-gray-400"}`}>
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      {/* Mock slide preview box */}
                      <div className={`w-16 h-10 rounded border flex items-center justify-center text-[10px] ${isActive ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-gray-100 border-gray-200 text-gray-500"}`}>
                        <div className="text-center leading-none">
                          <div className="font-semibold">{imgCount} Img</div>
                          <div className="text-[8px] mt-0.5">{textCount} Text</div>
                        </div>
                      </div>

                      {/* Slide title / info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isActive ? "text-gray-900" : "text-gray-700"}`}>
                          {name} - {index + 1}
                        </p>
                      </div>

                      {/* Quick delete button on slide */}
                      {moodboards.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (mb.id === activeMoodboardId) {
                              handleDeleteMoodboardClick();
                            } else {
                              deleteMoodboard(mb.id);
                              toast.success("Moodboard deleted!");
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-600 text-gray-400 rounded transition-opacity"
                          title="Delete Slide"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Actions box for creating and copying */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-gray-100/50 rounded-lg border border-gray-200">
                <Button
                  onClick={handleCreateMoodboard}
                  variant="outline"
                  className="bg-white flex items-center justify-center gap-1.5 text-xs h-9"
                >
                  <PlusCircle className="h-4 w-4 text-emerald-600" />
                  New Slide
                </Button>
                <Button
                  onClick={handleDuplicateMoodboard}
                  variant="outline"
                  className="bg-white flex items-center justify-center gap-1.5 text-xs h-9"
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
