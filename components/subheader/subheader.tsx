"use client"

import React, { useState, useRef } from "react"
import { PillowSelector } from "../pillowselector"
import { ProductFilter } from "../productfilter"
import useMoodboardStore from "@/lib/store/moodboardstore"
import useCanvasStore from "@/lib/store/canvasStore"
import {
  Undo,
  Redo,
  BringToFront,
  SendToBack,
  Group,
  Ungroup,
  Trash2,
  Type,
  ImagePlus,
  Sparkles,
  Crop,
  Maximize,
} from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

function ToolbarButton({
  onClick,
  disabled = false,
  icon: Icon,
  label,
  active = false,
  destructive = false,
  title,
}: {
  onClick: () => void
  disabled?: boolean
  icon: React.ElementType
  label: string
  active?: boolean
  destructive?: boolean
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      className={`flex min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-md px-2.5 py-1 transition-all duration-150 ${
        disabled
          ? "cursor-not-allowed opacity-30"
          : active
            ? "bg-blue-50 text-blue-600 ring-1 ring-blue-300"
            : destructive
              ? "cursor-pointer text-red-500 hover:bg-red-50 hover:text-red-600"
              : "cursor-pointer text-gray-500 hover:bg-gray-100 hover:text-gray-800"
      } `}
    >
      <Icon className="h-4 w-4" />
      <span className="text-[10px] leading-none font-medium select-none">
        {label}
      </span>
    </button>
  )
}

function Divider() {
  return <div className="mx-1 h-8 w-px shrink-0 bg-gray-200" />
}

function SubHeader() {
  const {
    favoritePillows,
    setFavoritePillows,
    selectedItemIds,
    clearSelectedItems,
    deleteCanvasItem,
    groupSelectedItems,
    ungroupSelectedItems,
    undo,
    redo,
    canUndo,
    canRedo,
    bringActiveToFront,
    sendActiveToBack,
    isTextMode,
    setIsTextMode,
    getMoodboardState,
    resizingImageId,
    setResizingImageId,
  } = useMoodboardStore()

  const canvasRef = useCanvasStore((state) => state.canvasRef)

  // Dialog State
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [imageUrlInput, setImageUrlInput] = useState("")
  const [customWidthInput, setCustomWidthInput] = useState("30")
  const [customHeightInput, setCustomHeightInput] = useState("30")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeMB = getMoodboardState()
  const canvasImages = activeMB?.canvasImages || []
  const canvasTexts = activeMB?.canvasTexts || []

  const hasSelection = selectedItemIds.length > 0
  const canGroup = selectedItemIds.length >= 2

  const canUngroupCheck = selectedItemIds.some((id) => {
    const img = canvasImages.find((i: any) => i.id === id)
    const txt = canvasTexts.find((t: any) => t.id === id)
    return !!(img?.groupId || txt?.groupId)
  })

  // Detect if a single image uploaded from the subheader is selected
  const selectedSubheaderImage = (() => {
    if (selectedItemIds.length === 1) {
      const selectedId = selectedItemIds[0]
      const img = canvasImages.find((i: any) => i.id === selectedId)
      if (img) {
        return img
      }
    }
    return null
  })()

  const handleDeleteSelected = () => {
    selectedItemIds.forEach((id) => deleteCanvasItem(id))
    clearSelectedItems()
    toast.success("Deleted")
  }
  // Handle URL Load
  const handleLoadUrl = () => {
    if (!imageUrlInput.trim()) {
      toast.error("Please enter a valid URL.")
      return
    }
    const targetCanvas =
      canvasRef && "current" in canvasRef ? canvasRef.current : canvasRef
    if (targetCanvas && (targetCanvas as any).addImageToCanvas) {
      const wVal = customWidthInput.trim() ? parseFloat(customWidthInput) : 30
      const hVal = customHeightInput.trim() ? parseFloat(customHeightInput) : 30

      ;(targetCanvas as any).addImageToCanvas({
        src: imageUrlInput.trim(),
        title: "Uploaded via Link",
        uploadedFromSubheader: true,
        customWidth: isNaN(wVal) ? 30 : wVal,
        customHeight: isNaN(hVal) ? 30 : hVal,
      })
      toast.success("Image URL loaded to canvas!")
    } else {
      toast.error("Canvas element not ready.")
    }
    setImageUrlInput("")
    setCustomWidthInput("30")
    setCustomHeightInput("30")
    setIsUploadOpen(false)
  }

  // Handle File Upload from Dialog
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const src = event.target?.result as string
      if (!src) return

      const targetCanvas =
        canvasRef && "current" in canvasRef ? canvasRef.current : canvasRef
      if (targetCanvas && (targetCanvas as any).addImageToCanvas) {
        const wVal = customWidthInput.trim() ? parseFloat(customWidthInput) : 30
        const hVal = customHeightInput.trim()
          ? parseFloat(customHeightInput)
          : 30

        ;(targetCanvas as any).addImageToCanvas({
          src,
          title: file.name,
          uploadedFromSubheader: true,
          customWidth: isNaN(wVal) ? 30 : wVal,
          customHeight: isNaN(hVal) ? 30 : hVal,
        })
        toast.success(`Loaded file: ${file.name}`)
      } else {
        toast.error("Canvas element not ready.")
      }
    }
    reader.readAsDataURL(file)
    setCustomWidthInput("30")
    setCustomHeightInput("30")
    setIsUploadOpen(false)
  }

  return (
    <div className="subheader-wrapper flex w-full items-center border-b bg-white px-4 py-1.5 gap-4">
      {/* Left: Pillow Selector + Product Filter */}
      <div className="flex min-w-90 shrink-0 items-center gap-2">
        <PillowSelector
          selectedPillows={favoritePillows || []}
          onChange={(newPillows) => setFavoritePillows(newPillows)}
          showSelectedPillows={false}
        />
        <ProductFilter />
      </div>

      {/* Right: Ribbon Toolbar */}
      <div className="ml-auto flex items-center gap-0.5 overflow-x-auto">
        {/* Undo / Redo */}
        <ToolbarButton
          onClick={() => {
            undo()
          }}
          disabled={!canUndo()}
          icon={Undo}
          label="Undo"
          title="Undo (⌘Z)"
        />
        <ToolbarButton
          onClick={() => {
            redo()
          }}
          disabled={!canRedo()}
          icon={Redo}
          label="Redo"
          title="Redo (⌘Y)"
        />

        <Divider />

        {/* Add Text & Upload Image */}
        <ToolbarButton
          onClick={() => setIsTextMode(!isTextMode)}
          icon={Type}
          label="Text"
          active={isTextMode}
          title="Click canvas to place text"
        />

        <ToolbarButton
          onClick={() => setIsUploadOpen(true)}
          icon={ImagePlus}
          label="Image"
          title="Add custom image (Upload file / Paste URL)"
        />

        {selectedSubheaderImage && (
          <>
            <Divider />
            {selectedSubheaderImage.uploadedFromSubheader && (
              <ToolbarButton
                onClick={() => {
                  const targetCanvas = canvasRef && "current" in canvasRef ? canvasRef.current : canvasRef
                  if (targetCanvas && (targetCanvas as any).handleRemoveBackground) {
                    ; (targetCanvas as any).handleRemoveBackground(selectedSubheaderImage.id, selectedSubheaderImage.src)
                    toast.success("Removing background...")
                  } else {
                    toast.error("Background removal not ready.")
                  }
                }}
                icon={Sparkles}
                label="Remove BG"
                title="Remove background of custom uploaded image"
                active={selectedSubheaderImage.isProcessing}
                disabled={selectedSubheaderImage.isProcessing}
              />
            )}
            <ToolbarButton
              onClick={() => {
                const isCurrentlyResizing = resizingImageId !== null && String(resizingImageId) === String(selectedSubheaderImage.id)
                setResizingImageId(isCurrentlyResizing ? null : selectedSubheaderImage.id)
              }}
              icon={Maximize}
              label="Resize"
              title="Toggle resize handles for this image"
              active={resizingImageId !== null && String(resizingImageId) === String(selectedSubheaderImage.id)}
            />
            <ToolbarButton
              onClick={() => {
                const targetCanvas = canvasRef && "current" in canvasRef ? canvasRef.current : canvasRef
                if (targetCanvas && (targetCanvas as any).startCrop) {
                  ;(targetCanvas as any).startCrop(selectedSubheaderImage.id)
                } else {
                  toast.error("Crop handler not ready.")
                }
              }}
              icon={Crop}
              label="Crop"
              title="Crop this image selection"
            />
          </>
        )}

        <Divider />

        {/* Arrange */}
        <ToolbarButton
          onClick={() => {
            bringActiveToFront()
          }}
          disabled={!hasSelection}
          icon={BringToFront}
          label="Front"
          title="Bring to Front"
        />
        <ToolbarButton
          onClick={() => {
            sendActiveToBack()
          }}
          disabled={!hasSelection}
          icon={SendToBack}
          label="Back"
          title="Send to Back"
        />

        <Divider />

        {/* Grouping */}
        <ToolbarButton
          onClick={() => {
            groupSelectedItems()
            toast.success("Grouped")
          }}
          disabled={!canGroup}
          icon={Group}
          label="Group"
          title="Group items (⌘G)"
        />
        <ToolbarButton
          onClick={() => {
            ungroupSelectedItems()
            toast.success("Ungrouped")
          }}
          disabled={!canUngroupCheck}
          icon={Ungroup}
          label="Ungroup"
          title="Ungroup items (⌘⇧G)"
        />

        <Divider />

        {/* Delete */}
        <ToolbarButton
          onClick={handleDeleteSelected}
          disabled={!hasSelection}
          icon={Trash2}
          label="Delete"
          destructive
          title="Delete selected (⌫)"
        />
      </div>

      {/* Add Custom Image Dialog */}
      {isUploadOpen && (
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogContent className="rounded-lg bg-white p-6 shadow-xl ring-1 ring-black/5 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Add Custom Image
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-gray-500">
                Upload a local file or paste a web URL link to place it on the
                canvas.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-5 py-4">
              {/* Option 1: File Upload */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700">
                  Option 1: Upload from Computer
                </Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-6 transition-colors hover:border-blue-500"
                >
                  <ImagePlus className="h-8 w-8 text-gray-400" />
                  <span className="text-xs font-medium text-gray-600">
                    Click to browse your computer
                  </span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
              </div>

              {/* Separator */}
              <div className="relative flex items-center justify-center py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <span className="relative bg-white px-3 text-xs font-medium tracking-wider text-gray-400 uppercase">
                  or
                </span>
              </div>

              {/* Option 2: Paste Image URL */}
              <div className="space-y-2">
                <Label
                  htmlFor="image-url-input"
                  className="text-xs font-semibold text-gray-700"
                >
                  Option 2: Paste Image URL link
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="image-url-input"
                    placeholder="https://example.com/pillow.jpg"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLoadUrl()
                    }}
                    className="h-9 flex-1 rounded border-gray-300 text-xs focus:border-blue-500 focus:ring-blue-500"
                  />
                  <Button
                    onClick={handleLoadUrl}
                    className="h-9 rounded bg-primary px-4 text-xs font-medium text-white hover:bg-primary/80"
                  >
                    Load
                  </Button>
                </div>
              </div>

              {/* Dimensions Customizer */}
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-1">
                  <Label
                    htmlFor="custom-height-input"
                    className="text-xs font-semibold text-gray-700"
                  >
                    Height (Units, e.g., 30)
                  </Label>
                  <Input
                    id="custom-height-input"
                    type="number"
                    min="1"
                    placeholder="30"
                    value={customHeightInput}
                    onChange={(e) => setCustomHeightInput(e.target.value)}
                    className="h-9 rounded border-gray-300 text-xs focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="custom-width-input"
                    className="text-xs font-semibold text-gray-700"
                  >
                    Width (Units, e.g., 30)
                  </Label>
                  <Input
                    id="custom-width-input"
                    type="number"
                    min="1"
                    placeholder="30"
                    value={customWidthInput}
                    onChange={(e) => setCustomWidthInput(e.target.value)}
                    className="h-9 rounded border-gray-300 text-xs focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2 border-t pt-4">
              <Button
                variant="outline"
                className="text-xs"
                onClick={() => setIsUploadOpen(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default SubHeader
