"use client"

import "react-resizable/css/styles.css"

import {
  BringToFront,
  Maximize,
  SendToBack,
  ShoppingCart,
  Trash2,
  Crop,
} from "lucide-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
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
}: DraggableImageProps) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const [internalIsResizing, setInternalIsResizing] = useState(false)
  const [activeHandle, setActiveHandle] = useState<string>("")
  const [isHovered, setIsHovered] = useState(false)
  const [liveWidth, setLiveWidth] = useState<number | null>(null)
  const [liveHeight, setLiveHeight] = useState<number | null>(null)

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

  const handleResize = (_e: React.SyntheticEvent, data: ResizeCallbackData) => {
    setLiveWidth(data.size.width)
    setLiveHeight(data.size.height)
  }

  const isCornerHandle = (handle: string) =>
    ["nw", "ne", "sw", "se"].includes(handle)

  const handleResizeStop = (
    e: React.SyntheticEvent,
    data: ResizeCallbackData
  ) => {
    onResizeStop(img.id, data.size.width, data.size.height)
    setActiveHandle("")
    setLiveWidth(null)
    setLiveHeight(null)
  }

  // Exit resize mode when clicking outside this image
  useEffect(() => {
    if (!isResizing) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element
      // Don't turn off resize mode if clicking inside the image container, subheader, or on react-resizable handles
      if (
        nodeRef.current &&
        !nodeRef.current.contains(target) &&
        !target.closest(".subheader-wrapper") &&
        !target.closest(".react-resizable-handle")
      ) {
        if (setIsResizing) setIsResizing(false)
        setActiveHandle("")
      }
    }

    // Use click event (rather than mousedown) so finishing a drag handle release doesn't count as clicking outside
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener("click", handleClickOutside)
    }
  }, [isResizing])

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
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`absolute cursor-grab border-2 ${
          isSelected ? "border-blue-300" : "border-transparent"
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
              !img.uploadedFromSubheader || isCornerHandle(activeHandle)
            }
            resizeHandles={
              !img.uploadedFromSubheader
                ? ["nw", "ne", "sw", "se"]
                : ["n", "s", "e", "w", "nw", "ne", "sw", "se"]
            }
            onResizeStart={(_e, data) => setActiveHandle(data.handle)}
            onResize={handleResize}
            onResizeStop={handleResizeStop}
            className="relative h-full w-full p-2"
          >
            <>
              <img
                src={img.isProcessing ? img.originalSrc : img.src}
                alt={img.alt}
                draggable={false}
                className={`h-full w-full ${
                  img.uploadedFromSubheader ? "object-cover" : "object-contain"
                }`}
              />
              {img.isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Skeleton className="h-full w-full rounded-xl" />
                </div>
              )}
              {/* Live Resize Dimensions Overlay */}
              <div className="pointer-events-none absolute -top-7 left-1/2 z-50 -translate-x-1/2 rounded bg-black/80 px-2 py-0.5 font-mono text-[10px] font-medium whitespace-nowrap text-white shadow-md">
                {displayLabel}
              </div>
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
                    img.uploadedFromSubheader
                      ? "object-cover"
                      : "object-contain"
                  } `}
                />
                {img.isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Skeleton className="h-full w-full rounded-xl" />
                  </div>
                )}
                {/* Hover / Selection Pillow Dimension Badge */}
                {(isSelected || isHovered) && !isResizing && (
                  <div className="pointer-events-none absolute right-1 bottom-1 z-30 rounded-md bg-black/75 px-1.5 py-0.5 font-mono text-[9px] font-medium text-white shadow-xs transition-opacity select-none">
                    {displayBadgeLabel}
                  </div>
                )}
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => onBringToFront(img.id)}>
                  <BringToFront className="mr-2 h-4 w-4" /> Bring to Front
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onSendToBack(img.id)}>
                  <SendToBack className="mr-2 h-4 w-4" /> Send to Back
                </ContextMenuItem>
                {img.withInsertID && (
                  <ContextMenuItem onClick={() => addToCart(img.withInsertID!)}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add to Cart (with insert)
                  </ContextMenuItem>
                )}
                {img.withoutInsertID && (
                  <ContextMenuItem
                    onClick={() => addToCart(img.withoutInsertID!)}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add to Cart (without insert)
                  </ContextMenuItem>
                )}
                <ContextMenuItem onClick={() => setIsResizing(true)}>
                  <Maximize className="mr-2 h-4 w-4" /> Resize
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onCrop(img.id)}>
                  <Crop className="mr-2 h-4 w-4" /> Crop
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => onDeleteItem(img.id)}
                  className="text-red-500 focus:text-red-500"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
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
