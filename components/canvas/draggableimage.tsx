"use client"

import "react-resizable/css/styles.css"

import {
  BringToFront,
  Copy,
  Crop,
  ExternalLink,
  Maximize,
  RotateCcw,
  SendToBack,
  ShoppingCart,
  Trash2,
} from "lucide-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import React, { useRef, useState, useEffect } from "react"

import Draggable, { DraggableData, DraggableEvent } from "react-draggable"
import { ResizableBox, ResizeCallbackData } from "react-resizable"
import { Skeleton } from "@/components/ui/skeleton"

import { DraggableImageProps } from "@/lib/types"

function DraggableImageComponent({
  img,
  onStop,
  onDrag,
  onClick,
  isSelected,
  isResizing: isResizingProp = false,
  setIsResizing: setIsResizingProp,
  onBringToFront,
  onSendToBack,
  onDeleteItem,
  addToCart,
  onResizeStop,
  onCrop,
  onDuplicate,
  onResetSize,
}: DraggableImageProps) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const [internalIsResizing, setInternalIsResizing] = useState(false)
  const [activeHandle, setActiveHandle] = useState<string>("")
  const [liveWidth, setLiveWidth] = useState<number | null>(null)
  const [liveHeight, setLiveHeight] = useState<number | null>(null)

  // Cooldown & drag refs: suppress click-outside detection while dragging handles or right after resize stop
  const resizeCooldownRef = useRef(false)
  const isDraggingHandleRef = useRef(false)

  // Sync internal state when external isResizingProp (Subheader button) activates
  useEffect(() => {
    if (isResizingProp) {
      setInternalIsResizing(true)
    }
  }, [isResizingProp])

  // Controlled or uncontrolled resizing mode
  const isResizing = isResizingProp || internalIsResizing
  const setIsResizing = (val: boolean) => {
    setInternalIsResizing(val)
    if (setIsResizingProp) setIsResizingProp(val)
  }

  // PIXELS_PER_UNIT = 10 (10px = 1 inch)
  const currentInchesWidth = Math.round((liveWidth ?? img.currentWidth) / 10)
  const currentInchesHeight = Math.round((liveHeight ?? img.currentHeight) / 10)
  // Height x Length formatting
  const displayLabel = `${currentInchesHeight}" × ${currentInchesWidth}"`
  const displayBadgeLabel = `${currentInchesHeight}"×${currentInchesWidth}"`

  const isCustomUploaded = Boolean(
    img.uploadedFromSubheader ||
    img.uploaded ||
    (typeof img.id === "string" && img.id.startsWith("ref-image-"))
  )

  const handleResize = (_e: React.SyntheticEvent, data: ResizeCallbackData) => {
    setLiveWidth(data.size.width)
    setLiveHeight(data.size.height)
  }

  const isCornerHandle = (handle: string) =>
    ["nw", "ne", "sw", "se"].includes(handle)

  const handleResizeStart = (_e: React.SyntheticEvent, data: ResizeCallbackData) => {
    setActiveHandle(data.handle)
    isDraggingHandleRef.current = true
  }

  const handleResizeStop = (
    e: React.SyntheticEvent,
    data: ResizeCallbackData
  ) => {
    onResizeStop(img.id, data.size.width, data.size.height)
    setActiveHandle("")
    setLiveWidth(null)
    setLiveHeight(null)
    isDraggingHandleRef.current = false

    // Set cooldown so the click-outside handler ignores mouseup/click events
    // after finishing handle drag
    resizeCooldownRef.current = true
    setTimeout(() => {
      resizeCooldownRef.current = false
    }, 400)
  }

  // Exit resize mode when clicking outside this image
  useEffect(() => {
    if (!isResizing) return

    const handleClickOutside = (e: MouseEvent) => {
      // Ignore clicks while dragging handle or during post-resize cooldown
      if (isDraggingHandleRef.current || resizeCooldownRef.current) return

      const target = e.target as Element

      // Guard against stale DOM targets (removed during React re-render)
      if (target && !document.contains(target)) return

      // Don't exit resize mode if clicking inside the image container, subheader, or on react-resizable handles
      if (
        nodeRef.current &&
        !nodeRef.current.contains(target) &&
        !target.closest(".subheader-wrapper") &&
        !target.closest(".react-resizable-handle")
      ) {
        setIsResizing(false)
        setActiveHandle("")
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        setIsResizing(false)
        setActiveHandle("")
      }
    }

    // Delay attaching click listener so initial button click doesn't immediately exit
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClickOutside)
    }, 150)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      clearTimeout(timer)
      document.removeEventListener("click", handleClickOutside)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isResizing])

  // Whether the dimension label should show during active resize drag
  const isActivelyDraggingResize = liveWidth !== null

  return (
    <Draggable
      nodeRef={nodeRef}
      disabled={isResizing}
      position={{ x: img.x, y: img.y }}
      onStop={(e: DraggableEvent, ui: DraggableData) => onStop(e, ui, img.id)}
      onDrag={(e: DraggableEvent, ui: DraggableData) => onDrag(e, ui, img.id)}
      bounds="parent"
    >
      <div
        ref={nodeRef}
        onDragStart={(e) => e.preventDefault()}
        className={`absolute cursor-grab border-2 ${
          isResizing
            ? "border-dashed border-blue-500"
            : isSelected
              ? "border-blue-300"
              : "border-transparent"
        }`}
        style={{
          width: img.currentWidth,
          height: img.currentHeight,
        }}
      >
        {isResizing ? (
          <ResizableBox
            width={img.currentWidth}
            height={img.currentHeight}
            minConstraints={[30, 30]}
            maxConstraints={[Infinity, Infinity]}
            lockAspectRatio={
              !isCustomUploaded || isCornerHandle(activeHandle)
            }
            resizeHandles={
              !isCustomUploaded
                ? ["nw", "ne", "sw", "se"]
                : ["n", "s", "e", "w", "nw", "ne", "sw", "se"]
            }
            onResizeStart={handleResizeStart}
            onResize={handleResize}
            onResizeStop={handleResizeStop}
            className="relative h-full w-full"
          >
            <>
              <img
                src={img.isProcessing ? img.originalSrc : img.src}
                alt={img.alt}
                draggable={false}
                className={`h-full w-full ${
                  isCustomUploaded ? "object-cover" : "object-contain"
                }`}
              />
              {img.isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Skeleton className="h-full w-full rounded-xl" />
                </div>
              )}
              {/* Live Resize Dimensions Overlay — only while actively dragging a handle */}
              {isActivelyDraggingResize && (
                <div className="pointer-events-none absolute -top-7 left-1/2 z-50 -translate-x-1/2 rounded bg-black/80 px-2 py-0.5 font-mono text-[10px] font-medium whitespace-nowrap text-white shadow-md">
                  {displayLabel}
                </div>
              )}
            </>
          </ResizableBox>
        ) : (
          <div className="h-full w-full" onClick={(e) => onClick(e, img.id)}>
            <ContextMenu>
              <ContextMenuTrigger
                className="block h-full w-full"
                onClick={(e: React.MouseEvent) => onClick(e, img.id)}
              >
                <img
                  src={img.isProcessing ? img.originalSrc : img.src}
                  alt={img.alt}
                  draggable={false}
                  className={`h-full w-full ${
                    isCustomUploaded
                      ? "object-cover"
                      : "object-contain"
                  } `}
                />
                {img.isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Skeleton className="h-full w-full rounded-xl" />
                  </div>
                )}
                {/* Selection Pillow Dimension Badge (shown on click/selection, not hover) */}
                {isSelected && !isResizing && (
                  <div className="pointer-events-none absolute right-1 bottom-1 z-30 rounded-md bg-black/75 px-1.5 py-0.5 font-mono text-[9px] font-medium text-white shadow-xs transition-opacity select-none">
                    {displayBadgeLabel}
                  </div>
                )}
              </ContextMenuTrigger>
              <ContextMenuContent className="w-52">
                {/* ── Arrange ── */}
                <ContextMenuItem onClick={() => onBringToFront(img.id)}>
                  <BringToFront className="mr-2 h-4 w-4" /> Bring to Front
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onSendToBack(img.id)}>
                  <SendToBack className="mr-2 h-4 w-4" /> Send to Back
                </ContextMenuItem>

                <ContextMenuSeparator />

                {/* ── Edit ── */}
                <ContextMenuItem onClick={() => onDuplicate(img.id)}>
                  <Copy className="mr-2 h-4 w-4" /> Duplicate
                  <ContextMenuShortcut>⌘D</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onClick={() => setIsResizing(true)}>
                  <Maximize className="mr-2 h-4 w-4" /> Resize
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onCrop(img.id)}>
                  <Crop className="mr-2 h-4 w-4" /> Crop
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onResetSize(img.id)}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset Size
                </ContextMenuItem>

                {/* ── Product Link ── */}
                {img.pillowUrl && (
                  <>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() =>
                        window.open(img.pillowUrl, "_blank", "noopener")
                      }
                    >
                      <ExternalLink className="mr-2 h-4 w-4" /> View Product
                    </ContextMenuItem>
                  </>
                )}

                <ContextMenuSeparator />

                {/* ── Destructive ── */}
                <ContextMenuItem
                  onClick={() => onDeleteItem(img.id)}
                  className="text-red-500 focus:text-red-500"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                  <ContextMenuShortcut>⌫</ContextMenuShortcut>
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </div>
        )}
      </div>
    </Draggable>
  )
}

const DraggableImage = React.memo(DraggableImageComponent)
export default DraggableImage
