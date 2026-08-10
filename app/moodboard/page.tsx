"use client"
import MainContent from "@/components/canvas/maincontent"
import Header from "@/components/header/header"
import SubHeader from "@/components/subheader/subheader"
import { useRef } from "react"
import { CanvasRefActions } from "@/lib/types"

export default function page() {
  const canvasRef = useRef<CanvasRefActions>(null)
  return (
    <div className="flex h-screen w-screen flex-col">
      <Header />
      <SubHeader />
      <MainContent ref={canvasRef} />
    </div>
  )
}
