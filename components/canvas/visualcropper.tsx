"use client"

import React, { useRef, useState, useEffect } from "react"

interface VisualCropperProps {
  src: string
  crop: { top: number; bottom: number; left: number; right: number }
  onChange: (newCrop: { top: number; bottom: number; left: number; right: number }) => void
}

export function VisualCropper({ src, crop, onChange }: VisualCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [dragState, setDragState] = useState<{
    action: string
    startX: number
    startY: number
    startTop: number
    startBottom: number
    startLeft: number
    startRight: number
  } | null>(null)

  const handleMouseDown = (e: React.MouseEvent, action: string) => {
    e.preventDefault()
    e.stopPropagation()

    setDragState({
      action,
      startX: e.clientX,
      startY: e.clientY,
      startTop: crop.top,
      startBottom: crop.bottom,
      startLeft: crop.left,
      startRight: crop.right,
    })
  }

  useEffect(() => {
    if (!dragState) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!imgRef.current) return
      const rect = imgRef.current.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const dx = e.clientX - dragState.startX
      const dy = e.clientY - dragState.startY

      const dPercentX = (dx / rect.width) * 100
      const dPercentY = (dy / rect.height) * 100

      let top = dragState.startTop
      let bottom = dragState.startBottom
      let left = dragState.startLeft
      let right = dragState.startRight

      const minSize = 10 // minimum size percentage

      if (dragState.action === "move") {
        const widthPercent = 100 - dragState.startLeft - dragState.startRight
        const heightPercent = 100 - dragState.startTop - dragState.startBottom

        left = Math.max(0, Math.min(100 - widthPercent, dragState.startLeft + dPercentX))
        right = 100 - left - widthPercent
        top = Math.max(0, Math.min(100 - heightPercent, dragState.startTop + dPercentY))
        bottom = 100 - top - heightPercent
      } else {
        if (dragState.action.includes("n")) {
          top = Math.max(0, Math.min(100 - bottom - minSize, dragState.startTop + dPercentY))
        }
        if (dragState.action.includes("s")) {
          bottom = Math.max(0, Math.min(100 - top - minSize, dragState.startBottom - dPercentY))
        }
        if (dragState.action.includes("w")) {
          left = Math.max(0, Math.min(100 - right - minSize, dragState.startLeft + dPercentX))
        }
        if (dragState.action.includes("e")) {
          right = Math.max(0, Math.min(100 - left - minSize, dragState.startRight - dPercentX))
        }
      }

      onChange({
        top: Math.round(top * 10) / 10,
        bottom: Math.round(bottom * 10) / 10,
        left: Math.round(left * 10) / 10,
        right: Math.round(right * 10) / 10,
      })
    }

    const handleMouseUp = () => {
      setDragState(null)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [dragState, onChange])

  return (
    <div
      ref={containerRef}
      className="relative w-full max-h-[300px] bg-slate-950 flex items-center justify-center rounded-lg border border-gray-200 overflow-hidden select-none"
    >
      <div className="relative max-w-full max-h-[260px] flex items-center justify-center p-4">
        <img
          ref={imgRef}
          src={src}
          alt="Visual Crop target"
          className="max-h-[220px] object-contain pointer-events-none select-none"
        />

        {/* Semi-transparent masks representing the cropped areas */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top Mask */}
          <div
            className="absolute bg-black/60 inset-x-0 top-0 transition-all"
            style={{ height: `${crop.top}%` }}
          />
          {/* Bottom Mask */}
          <div
            className="absolute bg-black/60 inset-x-0 bottom-0 transition-all"
            style={{ height: `${crop.bottom}%` }}
          />
          {/* Left Mask */}
          <div
            className="absolute bg-black/60 inset-y-0 left-0 transition-all"
            style={{
              left: 0,
              top: `${crop.top}%`,
              bottom: `${crop.bottom}%`,
              width: `${crop.left}%`,
            }}
          />
          {/* Right Mask */}
          <div
            className="absolute bg-black/60 inset-y-0 right-0 transition-all"
            style={{
              right: 0,
              top: `${crop.top}%`,
              bottom: `${crop.bottom}%`,
              width: `${crop.right}%`,
            }}
          />
        </div>

        {/* Highlighted Bounding Box and Handles */}
        <div
          className="absolute border-2 border-blue-500 cursor-move shadow-[0_0_0_9999px_rgba(0,0,0,0)] animate-pulse"
          style={{
            top: `${crop.top}%`,
            bottom: `${crop.bottom}%`,
            left: `${crop.left}%`,
            right: `${crop.right}%`,
          }}
          onMouseDown={(e) => handleMouseDown(e, "move")}
        >
          {/* Edge handles */}
          <div
            className="absolute top-[-2px] left-1/2 -translate-x-1/2 w-4 h-1 bg-white border border-blue-500 rounded-sm cursor-n-resize"
            onMouseDown={(e) => handleMouseDown(e, "n")}
          />
          <div
            className="absolute bottom-[-2px] left-1/2 -translate-x-1/2 w-4 h-1 bg-white border border-blue-500 rounded-sm cursor-s-resize"
            onMouseDown={(e) => handleMouseDown(e, "s")}
          />
          <div
            className="absolute right-[-2px] top-1/2 -translate-y-1/2 w-1 h-4 bg-white border border-blue-500 rounded-sm cursor-e-resize"
            onMouseDown={(e) => handleMouseDown(e, "e")}
          />
          <div
            className="absolute left-[-2px] top-1/2 -translate-y-1/2 w-1 h-4 bg-white border border-blue-500 rounded-sm cursor-w-resize"
            onMouseDown={(e) => handleMouseDown(e, "w")}
          />

          {/* Corner handles */}
          <div
            className="absolute top-[-3px] left-[-3px] w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-full cursor-nw-resize"
            onMouseDown={(e) => handleMouseDown(e, "nw")}
          />
          <div
            className="absolute top-[-3px] right-[-3px] w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-full cursor-ne-resize"
            onMouseDown={(e) => handleMouseDown(e, "ne")}
          />
          <div
            className="absolute bottom-[-3px] left-[-3px] w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-full cursor-sw-resize"
            onMouseDown={(e) => handleMouseDown(e, "sw")}
          />
          <div
            className="absolute bottom-[-3px] right-[-3px] w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-full cursor-se-resize"
            onMouseDown={(e) => handleMouseDown(e, "se")}
          />
        </div>
      </div>
    </div>
  )
}
