"use client"

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
} from "react"
import useMoodboardStore from "@/lib/store/moodboardstore"
import useCanvasStore from "@/lib/store/canvasStore"
import DraggableImage from "./draggableimage"
import DraggableText from "./draggabletext"
import { VisualCropper } from "./visualcropper"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  CanvasImageItem,
  CanvasTextItem,
  DropPosition,
  AddImagePayload,
  CanvasRefActions,
} from "@/lib/types"
import {
  downscaleImageForApi,
  autocropTransparentImage,
  removeWhiteBackground,
} from "@/lib/utils/imageOptimizer"

const DEFAULT_INITIAL_CANVAS_IMAGE_SIZE = 100
const PIXELS_PER_UNIT = 10

const Canvas = forwardRef<CanvasRefActions, {}>((props, ref) => {
  // Pull states & explicit setters directly matching your global store architecture
  const getMoodboardState = useMoodboardStore(
    (state) => state.getMoodboardState
  )
  const setMoodboardState = useMoodboardStore(
    (state) => state.setMoodboardState
  )
  const selectedItemIds = useMoodboardStore((state) => state.selectedItemIds)
  const setSelectedItemIds = useMoodboardStore(
    (state) => state.setSelectedItemIds
  )
  const clearSelectedItems = useMoodboardStore(
    (state) => state.clearSelectedItems
  )
  const toggleSelectedItem = useMoodboardStore(
    (state) => state.toggleSelectedItem
  )
  const addCanvasImage = useMoodboardStore((state) => state.addCanvasImage)
  const deleteCanvasItem = useMoodboardStore((state) => state.deleteCanvasItem)
  const updateCanvasImage = useMoodboardStore(
    (state) => state.updateCanvasImage
  )
  const updateCanvasText = useMoodboardStore((state) => state.updateCanvasText)
  const addCanvasText = useMoodboardStore((state) => state.addCanvasText)
  const isTextMode = useMoodboardStore((state) => state.isTextMode)
  const setIsTextMode = useMoodboardStore((state) => state.setIsTextMode)
  const groupSelectedItems = useMoodboardStore(
    (state) => state.groupSelectedItems
  )
  const ungroupSelectedItems = useMoodboardStore(
    (state) => state.ungroupSelectedItems
  )
  const undo = useMoodboardStore((state) => state.undo)
  const redo = useMoodboardStore((state) => state.redo)
  const resizingImageId = useMoodboardStore((state) => state.resizingImageId)
  const setResizingImageId = useMoodboardStore(
    (state) => state.setResizingImageId
  )

  const setCanvasRef = useCanvasStore((state) => state.setCanvasRef)

  const activeMoodboard = getMoodboardState()
  const canvasImages = (activeMoodboard?.canvasImages ||
    []) as unknown as CanvasImageItem[]
  const canvasTexts = (activeMoodboard?.canvasTexts || []) as CanvasTextItem[]
  const canvasRef = useRef<HTMLDivElement>(null)

  // Internal clipboard buffer for copying/pasting canvas elements
  const copiedItemsRef = useRef<{
    images: CanvasImageItem[]
    texts: CanvasTextItem[]
  }>({
    images: [],
    texts: [],
  })

  // Crop state variables
  const [cropItem, setCropItem] = useState<CanvasImageItem | null>(null)
  const [cropLeft, setCropLeft] = useState(0)
  const [cropRight, setCropRight] = useState(0)
  const [cropTop, setCropTop] = useState(0)
  const [cropBottom, setCropBottom] = useState(0)

  const startCrop = (id: string | number) => {
    const item = canvasImages.find((img) => img.id === id)
    if (item) {
      setCropItem(item)
      setCropLeft(0)
      setCropRight(0)
      setCropTop(0)
      setCropBottom(0)
    }
  }

  const applyCrop = () => {
    if (!cropItem) return

    const imageElement = new Image()
    imageElement.crossOrigin = "anonymous"
    imageElement.src = cropItem.src

    imageElement.onload = () => {
      const naturalWidth = imageElement.naturalWidth
      const naturalHeight = imageElement.naturalHeight

      const x = (cropLeft / 100) * naturalWidth
      const y = (cropTop / 100) * naturalHeight
      const width = ((100 - cropLeft - cropRight) / 100) * naturalWidth
      const height = ((100 - cropTop - cropBottom) / 100) * naturalHeight

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")

      if (ctx) {
        ctx.drawImage(imageElement, x, y, width, height, 0, 0, width, height)

        const croppedDataUrl = canvas.toDataURL("image/png")

        const prevWidth = cropItem.currentWidth || 100
        const prevHeight = cropItem.currentHeight || 100
        const newWidth = prevWidth * ((100 - cropLeft - cropRight) / 100)
        const newHeight = prevHeight * ((100 - cropTop - cropBottom) / 100)

        updateCanvasImage(cropItem.id, {
          src: croppedDataUrl,
          dataUrl: croppedDataUrl,
          currentWidth: newWidth,
          currentHeight: newHeight,
          baseWidth: newWidth,
          baseHeight: newHeight,
        })

        toast.success("Image cropped successfully")
      }
      setCropItem(null)
    }
  }

  // Helper to get all element IDs in the same group
  const getGroupMemberIds = (id: number | string): (number | string)[] => {
    const imgItem = canvasImages.find((img) => img.id === id)
    const txtItem = canvasTexts.find((txt) => txt.id === id)
    const groupId = imgItem?.groupId || txtItem?.groupId
    if (!groupId) return [id]

    const imgGroupIds = canvasImages
      .filter((img) => img.groupId === groupId)
      .map((img) => img.id)
    const txtGroupIds = canvasTexts
      .filter((txt) => txt.groupId === groupId)
      .map((txt) => txt.id)
    return [...imgGroupIds, ...txtGroupIds]
  }

  const addImageToCanvas = (
    item: AddImagePayload,
    dropPosition?: DropPosition
  ) => {
    const transparentUrl =
      item.transparentImageUrl ||
      (item as any).transparent_image_url ||
      (item as any).transparent_url ||
      (item as any).transparentUrl

    const hasTransparentImage = Boolean(transparentUrl)
    const imageSrc = (() => {
      let src = transparentUrl || item.image || item.src
      if (!src) return null
      if (src.startsWith("//")) src = "https:" + src
      return src
    })()

    if (!imageSrc) {
      console.warn("Item has no image source.")
      return
    }

    const extractDimensions = (title: string) => {
      const match = title.match(/(\d+)x(\d+)/i)
      if (match) {
        // Product naming: Height x Length (Width)
        // match[1] = Height, match[2] = Length / Width
        return {
          height: parseInt(match[1], 10),
          width: parseInt(match[2], 10),
        }
      }
      return null
    }

    // Calculate dimensions synchronously from title (no network load needed)
    let initialWidth: number
    let initialHeight: number
    const dimensions = extractDimensions(item.title || item.alt || "")

    if (item.customWidth && item.customHeight) {
      initialWidth = item.customWidth * PIXELS_PER_UNIT
      initialHeight = item.customHeight * PIXELS_PER_UNIT
    } else if (dimensions) {
      initialWidth = dimensions.width * PIXELS_PER_UNIT
      initialHeight = dimensions.height * PIXELS_PER_UNIT
    } else {
      // Fallback default size for uploads without dimension info
      const defSize = item.uploadedFromSubheader
        ? 30 * PIXELS_PER_UNIT
        : DEFAULT_INITIAL_CANVAS_IMAGE_SIZE
      initialWidth = defSize
      initialHeight = defSize
    }

    let x = 0
    let y = 0
    if (canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect()
      if (dropPosition) {
        x = dropPosition.x - canvasRect.left - initialWidth / 2
        y = dropPosition.y - canvasRect.top - initialHeight / 2
      } else {
        x = canvasRect.width - initialWidth - 50
        y = 50
      }
    }

    const newId = Date.now()

    // 1. Add image to canvas INSTANTLY (~< 20ms) — show skeleton while autocropping
    const newImage: CanvasImageItem = {
      id: newId,
      src: imageSrc,
      originalSrc: imageSrc,
      // Persist the transparent cut-out source so export→import round-trips it,
      // letting restore route pillows through autocrop-only (→ trimmed PNG).
      transparentImageUrl: transparentUrl || undefined,
      alt: item.title || item.alt || "Pillow Asset",
      x,
      y,
      originalWidth: initialWidth,
      originalHeight: initialHeight,
      baseWidth: initialWidth,
      baseHeight: initialHeight,
      currentWidth: initialWidth,
      currentHeight: initialHeight,
      pillowUrl: item.url,
      withInsertID: item.withInsertID,
      withoutInsertID: item.withoutInsertID,
      uploadedFromSubheader: !!item.uploadedFromSubheader,
      isProcessing: item.uploadedFromSubheader ? false : true,
    }

    addCanvasImage(newImage, true)
    setSelectedItemIds([newId])

    // If uploaded directly from subheader/user, do not remove background automatically.
    // The user can click the "Remove BG" toolbar button at any time.
    if (item.uploadedFromSubheader) {
      updateCanvasImage(newId, { isProcessing: false })
      return
    }

    // 2. Autocrop transparent padding in background (non-blocking, exports as lossless PNG)
    if (hasTransparentImage) {
      const runAutocrop = async () => {
        let croppedSrc = imageSrc
        try {
          croppedSrc = await autocropTransparentImage(imageSrc)
        } catch (err) {
          console.warn("Autocrop failed, using original:", err)
        }
        updateCanvasImage(newId, {
          src: croppedSrc,
          dataUrl: croppedSrc,
          isProcessing: false,
        })
      }
      runAutocrop()
    } else {
      handleRemoveBackground(newId, imageSrc)
    }
  }

  const handleRemoveBackground = async (id: number | string, src: string) => {
    updateCanvasImage(id, { isProcessing: true }, true)
    try {
      const optimizedSrc = await downscaleImageForApi(src, 500)
      // Client-side background removal — no server round-trip, no SSRF surface
      const base64data = await removeWhiteBackground(optimizedSrc)
      // Solution 2A: Automatically crop transparent padding from background-removed image
      const trimmedDataUrl = await autocropTransparentImage(base64data)
      // Final transparent image — commit to history
      updateCanvasImage(id, {
        src: trimmedDataUrl,
        dataUrl: trimmedDataUrl,
        isProcessing: false,
      })
    } catch (error) {
      console.error("Failed to remove background:", error)
      // Failed — still commit current state to history so the image is recorded
      updateCanvasImage(id, { isProcessing: false })
    }
  }
  useImperativeHandle(ref, () => ({
    addImageToCanvas,
    handleRemoveBackground,
  }))

  // Sync resizingImageId — clear if the resizing item is no longer selected
  useEffect(() => {
    if (resizingImageId) {
      const isStillSelected = selectedItemIds.some(
        (selId) => String(selId) === String(resizingImageId)
      )
      if (!isStillSelected) {
        setResizingImageId(null)
      }
    }
  }, [selectedItemIds, resizingImageId, setResizingImageId])

  const handleCanvasItemClick = useCallback(
    (e: React.MouseEvent, id: number | string) => {
      e.stopPropagation()
      const memberIds = getGroupMemberIds(id)
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        const isSelected = selectedItemIds.includes(id)
        if (isSelected) {
          setSelectedItemIds(
            selectedItemIds.filter((x) => !memberIds.includes(x))
          )
        } else {
          setSelectedItemIds([...new Set([...selectedItemIds, ...memberIds])])
        }
      } else {
        setSelectedItemIds(memberIds)
      }
    },
    [selectedItemIds, setSelectedItemIds]
  ) // Dependencies

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTextMode) {
      const rect = canvasRef.current!.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const newText = {
        id: `text-${Date.now()}`,
        text: "Text",
        x,
        y,
        fontWeight: "normal",
        fontSize: 14,
      }
      addCanvasText(newText)
      setIsTextMode(false)
      return
    }
    clearSelectedItems()
  }

  const handleDrag = useCallback(
    (e: any, ui: { x: number; y: number }, id: number | string) => {
      const isMultiSelectActive = e.shiftKey || e.ctrlKey || e.metaKey
      const isDraggingUnselected = !selectedItemIds.includes(id)

      let newSelectedIds = [...selectedItemIds]

      if (isDraggingUnselected) {
        if (!isMultiSelectActive) {
          newSelectedIds = getGroupMemberIds(id)
          setSelectedItemIds(newSelectedIds)
        }
      }

      newSelectedIds.forEach((selectedId) => {
        const img = canvasImages.find((img) => img.id === selectedId)
        const txt = canvasTexts.find((txt) => txt.id === selectedId)

        if (!img && !txt) return

        const baseX = img?.x || txt?.x || 0
        const baseY = img?.y || txt?.y || 0

        const targetItemX =
          canvasImages.find((i) => i.id === id)?.x ||
          canvasTexts.find((t) => t.id === id)?.x ||
          0
        const targetItemY =
          canvasImages.find((i) => i.id === id)?.y ||
          canvasTexts.find((t) => t.id === id)?.y ||
          0

        const deltaX = selectedId === id ? ui.x - baseX : ui.x - targetItemX
        const deltaY = selectedId === id ? ui.y - baseY : ui.y - targetItemY

        if (img)
          updateCanvasImage(
            selectedId,
            { x: baseX + deltaX, y: baseY + deltaY },
            true
          )
        if (txt)
          updateCanvasText(
            selectedId,
            { x: baseX + deltaX, y: baseY + deltaY },
            true
          )
      })
    },
    [
      selectedItemIds,
      canvasImages,
      canvasTexts,
      updateCanvasImage,
      updateCanvasText,
      setSelectedItemIds,
    ]
  )

  const handleDragStop = useCallback(
    (e: any, ui: { x: number; y: number }, id: number | string) => {
      const isMultiSelectActive = e.shiftKey || e.ctrlKey || e.metaKey
      const isDraggingUnselected = !selectedItemIds.includes(id)

      let finalSelectedIds = [...selectedItemIds]
      if (isDraggingUnselected && !isMultiSelectActive) {
        finalSelectedIds = getGroupMemberIds(id)
      }

      finalSelectedIds.forEach((selectedId) => {
        const img = canvasImages.find((img) => img.id === selectedId)
        const txt = canvasTexts.find((txt) => txt.id === selectedId)
        if (!img && !txt) return

        const baseX = img?.x || txt?.x || 0
        const baseY = img?.y || txt?.y || 0

        const targetItemX =
          canvasImages.find((i) => i.id === id)?.x ||
          canvasTexts.find((t) => t.id === id)?.x ||
          0
        const targetItemY =
          canvasImages.find((i) => i.id === id)?.y ||
          canvasTexts.find((t) => t.id === id)?.y ||
          0

        const deltaX = selectedId === id ? ui.x - baseX : ui.x - targetItemX
        const deltaY = selectedId === id ? ui.y - baseY : ui.y - targetItemY

        if (img)
          updateCanvasImage(selectedId, {
            x: baseX + deltaX,
            y: baseY + deltaY,
          })
        if (txt)
          updateCanvasText(selectedId, { x: baseX + deltaX, y: baseY + deltaY })
      })
    },
    [
      selectedItemIds,
      canvasImages,
      canvasTexts,
      updateCanvasImage,
      updateCanvasText,
    ]
  )

  const handleResizeStop = useCallback(
    (id: number | string, newWidth: number, newHeight: number) => {
      updateCanvasImage(id, {
        currentWidth: newWidth,
        currentHeight: newHeight,
        baseWidth: newWidth,
        baseHeight: newHeight,
      })
    },
    [updateCanvasImage]
  )

  const handleDeleteItem = useCallback(
    (id: string | number) => {
      deleteCanvasItem(id)
      clearSelectedItems()
    },
    [deleteCanvasItem, clearSelectedItems]
  )

  const handleDuplicate = useCallback(
    (targetId?: string | number) => {
      const idsToDuplicate = (() => {
        if (targetId !== undefined) {
          const item =
            canvasImages.find((img) => img.id === targetId) ||
            canvasTexts.find((txt) => txt.id === targetId)
          if (item?.groupId) {
            const groupImgs = canvasImages
              .filter((img) => img.groupId === item.groupId)
              .map((img) => img.id)
            const groupTxts = canvasTexts
              .filter((txt) => txt.groupId === item.groupId)
              .map((txt) => txt.id)
            return [...new Set([...groupImgs, ...groupTxts])]
          }
          return [targetId]
        }
        return selectedItemIds
      })()

      if (idsToDuplicate.length === 0) return

      const groupIdMap = new Map<string, string>()
      const getNewGroupId = (oldGroupId?: string) => {
        if (!oldGroupId) return undefined
        if (!groupIdMap.has(oldGroupId)) {
          groupIdMap.set(
            oldGroupId,
            `group-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
          )
        }
        return groupIdMap.get(oldGroupId)
      }

      const newSelectedIds: (string | number)[] = []

      canvasImages
        .filter((img) => idsToDuplicate.includes(img.id))
        .forEach((img) => {
          const newId = `image-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
          const duplicate: CanvasImageItem = {
            ...JSON.parse(JSON.stringify(img)),
            id: newId,
            x: img.x + 20,
            y: img.y + 20,
            groupId: getNewGroupId(img.groupId),
          }
          addCanvasImage(duplicate, true)
          newSelectedIds.push(newId)
        })

      canvasTexts
        .filter((txt) => idsToDuplicate.includes(txt.id))
        .forEach((txt) => {
          const newId = `text-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
          const duplicate: CanvasTextItem = {
            ...JSON.parse(JSON.stringify(txt)),
            id: newId,
            x: txt.x + 20,
            y: txt.y + 20,
            groupId: getNewGroupId(txt.groupId),
          }
          addCanvasText(duplicate)
          newSelectedIds.push(newId)
        })

      if (newSelectedIds.length > 0) {
        setSelectedItemIds(newSelectedIds)
        toast.success(
          `Duplicated ${newSelectedIds.length} item${newSelectedIds.length > 1 ? "s" : ""}`
        )
      }
    },
    [
      canvasImages,
      canvasTexts,
      selectedItemIds,
      addCanvasImage,
      addCanvasText,
      setSelectedItemIds,
    ]
  )

  const handleResetSize = useCallback(
    (id: string | number) => {
      const item = canvasImages.find((img) => img.id === id)
      if (!item) return
      const origW = item.originalWidth || item.baseWidth
      const origH = item.originalHeight || item.baseHeight
      updateCanvasImage(id, {
        currentWidth: origW,
        currentHeight: origH,
        baseWidth: origW,
        baseHeight: origH,
      })
    },
    [canvasImages, updateCanvasImage]
  )

  const handleUpdateText = useCallback(
    (id: string, newProps: Partial<CanvasTextItem>) => {
      updateCanvasText(id, newProps)
    },
    [updateCanvasText]
  )

  const handleImageDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    // Handle OS files dropped onto the canvas
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files)
      const imageFiles = files.filter((file) => file.type.startsWith("image/"))
      for (const file of imageFiles) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const src = event.target?.result as string
          if (src) {
            addImageToCanvas(
              {
                src,
                title: file.name,
                uploadedFromSubheader: true,
                customWidth: 30,
                customHeight: 30,
              },
              { x: e.clientX, y: e.clientY }
            )
            toast.success(`Loaded dropped file: ${file.name}`)
          }
        }
        reader.readAsDataURL(file)
      }
      return
    }

    const sourceType = e.dataTransfer.getData("source/type")
    if (sourceType !== "gallery") return

    const transparentImageUrl = e.dataTransfer.getData("transparentImageUrl")

    const item: AddImagePayload = {
      image: e.dataTransfer.getData("image/src"),
      transparentImageUrl: transparentImageUrl || undefined,
      title: e.dataTransfer.getData("image/alt"),
      withInsertID: e.dataTransfer.getData("withInsertID"),
      withoutInsertID: e.dataTransfer.getData("withoutInsertID"),
      url:
        e.dataTransfer.getData("pillowUrl") ||
        e.dataTransfer.getData("pillowURL"),
    }
    addImageToCanvas(item, { x: e.clientX, y: e.clientY })
  }

  const addToCart = (id: string | number) => {
    const cartUrl = `https://www.tonicliving.ca/cart/add?id=${id}&quantity=1`
    const newTab = window.open(cartUrl, "_blank", "noopener")
    if (newTab) {
      setTimeout(() => {
        newTab.close()
      }, 1500)
    } else {
      console.error("Failed to open tab (popup blocker?)")
    }
  }

  const bringToFront = (id: number | string) => {
    const activeMB = getMoodboardState()
    if (!activeMB) return
    const imageToMove = activeMB.canvasImages.find((img: any) => img.id === id)
    if (!imageToMove) return
    const filteredImages = activeMB.canvasImages.filter(
      (img: any) => img.id !== id
    )
    setMoodboardState({ canvasImages: [...filteredImages, imageToMove] })
  }

  const sendToBack = (id: number | string) => {
    const activeMB = getMoodboardState()
    if (!activeMB) return
    const imageToMove = activeMB.canvasImages.find((img: any) => img.id === id)
    if (!imageToMove) return
    const filteredImages = activeMB.canvasImages.filter(
      (img: any) => img.id !== id
    )
    setMoodboardState({ canvasImages: [imageToMove, ...filteredImages] })
  }

  useEffect(() => {
    if (selectedItemIds.length > 0 && canvasRef.current) {
      canvasRef.current.focus()
    }
  }, [selectedItemIds])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTextMode) {
        setIsTextMode(false)
      }
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [isTextMode, setIsTextMode])

  useEffect(() => {
    const MOVE_AMOUNT = 5
    const SMALL_MOVE_AMOUNT = 1

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      const isEditingText =
        activeEl &&
        (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")
      if (isEditingText) return

      // Undo / Redo keyboard shortcuts
      if (e.metaKey || e.ctrlKey) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault()
          if (e.shiftKey) {
            redo()
          } else {
            undo()
          }
          return
        }
        if (e.key.toLowerCase() === "y") {
          e.preventDefault()
          redo()
          return
        }
      }

      if (!selectedItemIds || selectedItemIds.length === 0) return

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        selectedItemIds.forEach((id) => {
          deleteCanvasItem(id)
        })
        clearSelectedItems()
        return
      }

      if (e.metaKey || e.ctrlKey) {
        if (e.key.toLowerCase() === "g") {
          e.preventDefault()
          if (e.shiftKey) {
            ungroupSelectedItems()
          } else {
            groupSelectedItems()
          }
          return
        }

        // ⌘D: Duplicate selected items
        if (e.key.toLowerCase() === "d") {
          e.preventDefault()
          handleDuplicate()
          return
        }

        if (e.key.toLowerCase() === "c") {
          e.preventDefault()
          const selectedImages = canvasImages.filter((img) =>
            selectedItemIds.includes(img.id)
          )
          const selectedTexts = canvasTexts.filter((txt) =>
            selectedItemIds.includes(txt.id)
          )

          if (selectedImages.length > 0 || selectedTexts.length > 0) {
            copiedItemsRef.current = {
              images: JSON.parse(JSON.stringify(selectedImages)),
              texts: JSON.parse(JSON.stringify(selectedTexts)),
            }
            // Write a tag to the system clipboard
            navigator.clipboard.writeText("__canvas_copy__").catch((err) => {
              console.warn("Failed to write to system clipboard:", err)
            })
            toast.success(
              `Copied ${selectedImages.length + selectedTexts.length} items`
            )
          }
          return
        }

        selectedItemIds.forEach((id) => {
          const isText = typeof id === "string" && id.startsWith("text-")
          if (isText) {
            e.preventDefault()
            const txtItem = canvasTexts.find((text) => text.id === id)
            if (!txtItem) return

            if (e.key === "b") {
              updateCanvasText(id, {
                fontWeight: txtItem.fontWeight === "bold" ? "normal" : "bold",
              })
            } else if (e.key === "=" || e.key === "+") {
              updateCanvasText(id, { fontSize: txtItem.fontSize + 2 })
            } else if (e.key === "-" || e.key === "_") {
              updateCanvasText(id, {
                fontSize: Math.max(8, txtItem.fontSize - 2),
              })
            }
          }
        })
        return
      }

      const moveBy = e.shiftKey ? SMALL_MOVE_AMOUNT : MOVE_AMOUNT
      const isArrowKey = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(e.key)

      if (isArrowKey) {
        e.preventDefault()
        selectedItemIds.forEach((id) => {
          const img = canvasImages.find((img) => img.id === id)
          if (img) {
            let newX = img.x
            let newY = img.y
            if (e.key === "ArrowUp") newY -= moveBy
            if (e.key === "ArrowDown") newY += moveBy
            if (e.key === "ArrowLeft") newX -= moveBy
            if (e.key === "ArrowRight") newX += moveBy
            updateCanvasImage(id, { x: newX, y: newY })
          }

          const txt = canvasTexts.find((txt) => txt.id === id)
          if (txt) {
            let newX = txt.x
            let newY = txt.y
            if (e.key === "ArrowUp") newY -= moveBy
            if (e.key === "ArrowDown") newY += moveBy
            if (e.key === "ArrowLeft") newX -= moveBy
            if (e.key === "ArrowRight") newX += moveBy
            updateCanvasText(id, { x: newX, y: newY })
          }
        })
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [
    selectedItemIds,
    canvasImages,
    canvasTexts,
    deleteCanvasItem,
    updateCanvasImage,
    updateCanvasText,
    clearSelectedItems,
    groupSelectedItems,
    ungroupSelectedItems,
    undo,
    redo,
    handleDuplicate,
  ])

  // Expose reference via canvasStore
  useEffect(() => {
    setCanvasRef({
      current: { addImageToCanvas, handleRemoveBackground, startCrop },
    } as any)
    return () => setCanvasRef(null)
  }, [addImageToCanvas, setCanvasRef])

  // Paste event listener for direct pasting
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true")
      ) {
        return
      }

      // 1. If the clipboard data contains our specific canvas tag, paste internal items
      const isCanvasPaste =
        e.clipboardData?.getData("text/plain") === "__canvas_copy__"
      if (
        isCanvasPaste &&
        (copiedItemsRef.current.images.length > 0 ||
          copiedItemsRef.current.texts.length > 0)
      ) {
        e.preventDefault()
        const newSelectedIds: (string | number)[] = []
        const groupIdMap = new Map<string, string>()
        const getNewGroupId = (oldGroupId?: string) => {
          if (!oldGroupId) return undefined
          if (!groupIdMap.has(oldGroupId)) {
            groupIdMap.set(
              oldGroupId,
              `group-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
            )
          }
          return groupIdMap.get(oldGroupId)
        }

        copiedItemsRef.current.images.forEach((img) => {
          const newId = `image-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
          const pastedImg = {
            ...img,
            id: newId,
            x: img.x + 20,
            y: img.y + 20,
            groupId: getNewGroupId(img.groupId),
          }
          addCanvasImage(pastedImg)
          newSelectedIds.push(newId)
        })

        copiedItemsRef.current.texts.forEach((txt) => {
          const newId = `text-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
          const pastedTxt = {
            ...txt,
            id: newId,
            x: txt.x + 20,
            y: txt.y + 20,
            groupId: getNewGroupId(txt.groupId),
          }
          addCanvasText(pastedTxt)
          newSelectedIds.push(newId)
        })

        setSelectedItemIds(newSelectedIds)
        toast.success(
          `Pasted ${newSelectedIds.length} item${newSelectedIds.length > 1 ? "s" : ""}`
        )
        return
      }

      // 2. Otherwise fallback to system file/URL pastes
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) {
            const reader = new FileReader()
            reader.onload = (event) => {
              const src = event.target?.result as string
              if (src) {
                addImageToCanvas({
                  src,
                  title: "Pasted Image",
                  uploadedFromSubheader: true,
                  customWidth: 30,
                  customHeight: 30,
                })
                toast.success("Image pasted to canvas!")
              }
            }
            reader.readAsDataURL(file)
          }
          e.preventDefault()
          return
        }
        if (item.type === "text/plain") {
          item.getAsString((text) => {
            const isUrl =
              text.startsWith("http://") || text.startsWith("https://")
            if (isUrl) {
              addImageToCanvas({ src: text, title: "Pasted Link" })
              toast.success("Image URL pasted to canvas!")
            }
          })
        }
      }
    }

    window.addEventListener("paste", handlePaste)
    return () => window.removeEventListener("paste", handlePaste)
  }, [canvasImages, canvasTexts])

  return (
    <>
      <div
        ref={canvasRef}
        id="canvasDiv"
        className="relative h-full grow overflow-hidden rounded-lg border-2 border-dashed border-gray-400"
        style={{ cursor: isTextMode ? "text" : "default" }}
        onDrop={handleImageDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={handleCanvasClick}
        tabIndex={0}
      >
        {canvasImages.length === 0 && canvasTexts.length === 0 && (
          <div className="flex h-full items-center justify-center text-gray-400">
            Drop images here
          </div>
        )}
        {canvasImages.map((img) => (
          <DraggableImage
            key={img.id}
            img={img}
            onStop={handleDragStop}
            onDrag={handleDrag}
            onClick={handleCanvasItemClick}
            isSelected={selectedItemIds.includes(img.id)}
            isResizing={
              resizingImageId !== null &&
              String(resizingImageId) === String(img.id)
            }
            setIsResizing={(active: boolean) =>
              setResizingImageId(active ? img.id : null)
            }
            onBringToFront={bringToFront}
            onSendToBack={sendToBack}
            onDeleteItem={handleDeleteItem}
            addToCart={addToCart}
            onResizeStop={handleResizeStop}
            onCrop={startCrop}
            onDuplicate={handleDuplicate}
            onResetSize={handleResetSize}
          />
        ))}
        {Array.isArray(canvasTexts) &&
          canvasTexts.map((text) => (
            <DraggableText
              key={text.id}
              text={text}
              onStop={handleDragStop}
              onDrag={handleDrag}
              onClick={handleCanvasItemClick}
              isSelected={selectedItemIds.includes(text.id)}
              onUpdateText={handleUpdateText}
              onDeleteItem={handleDeleteItem}
            />
          ))}
      </div>

      {/* Crop Dialog Modal */}
      {cropItem && (
        <Dialog
          open={!!cropItem}
          onOpenChange={(open) => {
            if (!open) setCropItem(null)
          }}
        >
          <DialogContent className="rounded-lg bg-white p-6 shadow-xl ring-1 ring-black/5 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Crop Canvas Image
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-gray-500">
                Adjust top, bottom, left, and right sliders to crop the active
                selection.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2">
              <VisualCropper
                src={cropItem.src}
                crop={{
                  top: cropTop,
                  bottom: cropBottom,
                  left: cropLeft,
                  right: cropRight,
                }}
                onChange={(newCrop) => {
                  setCropTop(newCrop.top)
                  setCropBottom(newCrop.bottom)
                  setCropLeft(newCrop.left)
                  setCropRight(newCrop.right)
                }}
              />
            </div>

            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="text-xs"
                onClick={() => setCropItem(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={applyCrop}
                className="rounded bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
              >
                Apply Crop
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
})

Canvas.displayName = "Canvas"

export default Canvas
