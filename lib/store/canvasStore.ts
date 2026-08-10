import { create } from "zustand"

import { CustomCanvasElement, CanvasState } from "@/lib/types"

const useCanvasStore = create<CanvasState>((set) => ({
  canvasRef: null,
  setCanvasRef: (ref) => set({ canvasRef: ref }),
}))

export default useCanvasStore
