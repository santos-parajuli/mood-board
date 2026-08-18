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

      const minSize = 5 // minimum size percentage (5%)

      if (dragState.action === "move") {
        const widthPercent = 100 - dragState.startLeft - dragState.startRight
        const heightPercent = 100 - dragState.startTop - dragState.startBottom

        left = Math.max(
          0,
          Math.min(100 - widthPercent, dragState.startLeft + dPercentX)
        )
        right = 100 - left - widthPercent
        top = Math.max(
          0,
          Math.min(100 - heightPercent, dragState.startTop + dPercentY)
        )
        bottom = 100 - top - heightPercent
      } else {
        if (dragState.action.includes("n")) {
          top = Math.max(
            0,
            Math.min(100 - bottom - minSize, dragState.startTop + dPercentY)
          )
        }
        if (dragState.action.includes("s")) {
          bottom = Math.max(
            0,
            Math.min(100 - top - minSize, dragState.startBottom - dPercentY)
          )
        }
        if (dragState.action.includes("w")) {
          left = Math.max(
            0,
            Math.min(100 - right - minSize, dragState.startLeft + dPercentX)
          )
        }
        if (dragState.action.includes("e")) {
          right = Math.max(
            0,
            Math.min(100 - left - minSize, dragState.startRight - dPercentX)
          )
        }
      }

      onChange({
        top: Math.round(top * 100) / 100,
        bottom: Math.round(bottom * 100) / 100,
        left: Math.round(left * 100) / 100,
        right: Math.round(right * 100) / 100,
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
      className="relative w-full max-h-[340px] bg-slate-950 flex items-center justify-center rounded-xl border border-gray-800 p-4 overflow-hidden select-none"
    >
      {/* Wrapper tightly bound around the rendered image element */}
      <div className="relative inline-block rounded-sm overflow-hidden shadow-2xl">
        <img
          ref={imgRef}
          src={src}
          alt="Visual Crop target"
          className="max-h-[260px] max-w-full object-contain block pointer-events-none select-none"
        />

        {/* Dark masks covering cropped-out areas */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top Mask */}
          <div
            className="absolute bg-black/70 inset-x-0 top-0"
            style={{ height: `${crop.top}%` }}
          />
          {/* Bottom Mask */}
          <div
            className="absolute bg-black/70 inset-x-0 bottom-0"
            style={{ height: `${crop.bottom}%` }}
          />
          {/* Left Mask */}
          <div
            className="absolute bg-black/70 inset-y-0 left-0"
            style={{
              left: 0,
              top: `${crop.top}%`,
              bottom: `${crop.bottom}%`,
              width: `${crop.left}%`,
            }}
          />
          {/* Right Mask */}
          <div
            className="absolute bg-black/70 inset-y-0 right-0"
            style={{
              right: 0,
              top: `${crop.top}%`,
              bottom: `${crop.bottom}%`,
              width: `${crop.right}%`,
            }}
          />
        </div>

        {/* Active Crop Box Overlay */}
        <div
          className="absolute border-2 border-blue-500 cursor-move"
          style={{
            top: `${crop.top}%`,
            bottom: `${crop.bottom}%`,
            left: `${crop.left}%`,
            right: `${crop.right}%`,
          }}
          onMouseDown={(e) => handleMouseDown(e, "move")}
        >
          {/* Rule-of-Thirds Grid Lines */}
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30">
            <div className="border-r border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-b border-white" />
            <div className="border-r border-white" />
            <div className="border-r border-white" />
            <div />
          </div>

          {/* Edge handles */}
          <div
            className="absolute top-[-3px] left-1/2 -translate-x-1/2 w-6 h-1.5 bg-white border border-blue-600 rounded-xs cursor-n-resize shadow-xs"
            onMouseDown={(e) => handleMouseDown(e, "n")}
          />
          <div
            className="absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-6 h-1.5 bg-white border border-blue-600 rounded-xs cursor-s-resize shadow-xs"
            onMouseDown={(e) => handleMouseDown(e, "s")}
          />
          <div
            className="absolute right-[-3px] top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white border border-blue-600 rounded-xs cursor-e-resize shadow-xs"
            onMouseDown={(e) => handleMouseDown(e, "e")}
          />
          <div
            className="absolute left-[-3px] top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white border border-blue-600 rounded-xs cursor-w-resize shadow-xs"
            onMouseDown={(e) => handleMouseDown(e, "w")}
          />

          {/* Corner handles */}
          <div
            className="absolute top-[-4px] left-[-4px] w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nw-resize shadow-sm"
            onMouseDown={(e) => handleMouseDown(e, "nw")}
          />
          <div
            className="absolute top-[-4px] right-[-4px] w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-ne-resize shadow-sm"
            onMouseDown={(e) => handleMouseDown(e, "ne")}
          />
          <div
            className="absolute bottom-[-4px] left-[-4px] w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-sw-resize shadow-sm"
            onMouseDown={(e) => handleMouseDown(e, "sw")}
          />
          <div
            className="absolute bottom-[-4px] right-[-4px] w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-se-resize shadow-sm"
            onMouseDown={(e) => handleMouseDown(e, "se")}
          />
        </div>
      </div>
    </div>
  )
}
