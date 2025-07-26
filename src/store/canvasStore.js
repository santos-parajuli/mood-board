import { create } from 'zustand';

const useCanvasStore = create((set) => ({
	canvasRef: null,
	setCanvasRef: (ref) => set({ canvasRef: ref }),
}));

export default useCanvasStore;
