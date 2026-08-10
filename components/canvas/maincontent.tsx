"use client"
import useMoodboardStore from "@/lib/store/moodboardstore"
import Gallery from "./gallery"
import React from "react"
import Canvas from "./canvas"

const MainContent = React.forwardRef<any, any>((props, ref) => {
  const { favoritePillows } = useMoodboardStore()
  return (
    <div className="flex h-full w-full flex-row overflow-hidden">
      <div className="flex min-w-70 overflow-hidden">
        {favoritePillows.length > 0 && <Gallery canvasRef={ref} />}
      </div>
      <div className="flex h-full w-full items-center justify-center bg-gray-100">
        <Canvas ref={ref} />
      </div>
    </div>
  )
})

export default MainContent
