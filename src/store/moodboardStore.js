import { create } from 'zustand';

const useMoodboardStore = create((set, get) => ({
	moodboards: [
		{
			id: 'default-moodboard',
			name: 'Tonic Moodboard - 1',
			canvasImages: [],
			canvasTexts: [],
			selectedGalleryItems: [],
			selectedComboboxItem: '',
		},
	],
	region: 'CA',
	activeMoodboardId: 'default-moodboard',
	allXlsxData: [],
	selectedItemId: null,
	name: 'Tonic Moodboard',

	setRegion: (newRegion) => set({ region: newRegion }),

	setName: (newName) => {
		set((state) => {
			const updatedMoodboards = state.moodboards.map((moodboard, index) => ({
				...moodboard,
				name: `${newName} - ${index + 1}`,
			}));
			return { name: newName, moodboards: updatedMoodboards };
		});
	},

	// General data setters
	setAllXlsxData: (data) => set({ allXlsxData: data }),
	setSelectedItemId: (id) => set({ selectedItemId: id }),

	// Moodboard management actions
	selectMoodboard: (id) => set({ activeMoodboardId: id }),

	createMoodboard: () => {
		set((state) => {
			const newMoodboard = {
				id: `moodboard-${Date.now()}`,
				name: `${state.name} - ${state.moodboards.length + 1}`,
				canvasImages: [],
				canvasTexts: [],
				selectedGalleryItems: [],
				selectedComboboxItem: '',
				region: 'CA',
			};
			return {
				moodboards: [...state.moodboards, newMoodboard],
				activeMoodboardId: newMoodboard.id,
			};
		});
	},

	deleteMoodboard: (id) => {
		set((state) => {
			const remainingMoodboards = state.moodboards.filter((m) => m.id !== id);
			const newActiveMoodboardId = remainingMoodboards.length > 0 ? remainingMoodboards[0].id : null;
			// Re-number moodboards after deletion
			const renumberedMoodboards = remainingMoodboards.map((moodboard, index) => ({
				...moodboard,
				name: `${state.name} - ${index + 1}`,
			}));
			return {
				moodboards: renumberedMoodboards,
				activeMoodboardId: newActiveMoodboardId,
			};
		});
	},

	// Get active moodboard state
	getMoodboardState: () => {
		const state = get();
		return state.moodboards.find((mb) => mb.id === state.activeMoodboardId);
	},

	// Set active moodboard state (general update)
	setMoodboardState: (newProps) =>
		set((state) => {
			const activeMoodboard = state.moodboards.find((mb) => mb.id === state.activeMoodboardId);
			if (activeMoodboard) {
				const updatedMoodboard = { ...activeMoodboard, ...newProps };
				const updatedMoodboards = state.moodboards.map((mb) => (mb.id === state.activeMoodboardId ? updatedMoodboard : mb));
				return { moodboards: updatedMoodboards };
			} else {
				return {};
			}
		}),

	// Refactored actions to operate on the active moodboard
	setCanvasImages: (images) => get().setMoodboardState({ canvasImages: images }),
	setCanvasTexts: (text) =>
		set((state) => ({
			moodboards: state.moodboards.map((mb) =>
				mb.id === state.activeMoodboardId
					? {
							...mb,
							canvasTexts: Array.isArray(mb.canvasTexts) ? [...mb.canvasTexts, text] : [text],
					  }
					: mb
			),
		})),
	setSelectedGalleryItems: (items) => get().setMoodboardState({ selectedGalleryItems: items }),
	setSelectedComboboxItem: (item) => get().setMoodboardState({ selectedComboboxItem: item }),

	// Canvas item manipulation
	updateCanvasImage: (id, newProps) =>
		set((state) => ({
			moodboards: state.moodboards.map((mb) =>
				mb.id === state.activeMoodboardId
					? {
							...mb,
							canvasImages: Array.isArray(mb.canvasImages) ? mb.canvasImages.map((img) => (img.id === id ? { ...img, ...newProps } : img)) : [],
					  }
					: mb
			),
		})),

	updateCanvasText: (id, newProps) =>
		set((state) => ({
			moodboards: state.moodboards.map((mb) =>
				mb.id === state.activeMoodboardId
					? {
							...mb,
							canvasTexts: Array.isArray(mb.canvasTexts) ? mb.canvasTexts.map((text) => (text.id === id ? { ...text, ...newProps } : text)) : [],
					  }
					: mb
			),
		})),

	addCanvasImage: (image) =>
		set((state) => ({
			moodboards: state.moodboards.map((mb) =>
				mb.id === state.activeMoodboardId
					? {
							...mb,
							canvasImages: Array.isArray(mb.canvasImages) ? [...mb.canvasImages, image] : [image],
					  }
					: mb
			),
		})),

	addCanvasText: (text) =>
		set((state) => ({
			moodboards: state.moodboards.map((mb) =>
				mb.id === state.activeMoodboardId
					? {
							...mb,
							canvasTexts: Array.isArray(mb.canvasTexts) ? [...mb.canvasTexts, text] : [text],
					  }
					: mb
			),
		})),

	deleteCanvasItem: (id) =>
		set((state) => ({
			moodboards: state.moodboards.map((mb) =>
				mb.id === state.activeMoodboardId
					? {
							...mb,
							canvasImages: Array.isArray(mb.canvasImages) ? mb.canvasImages.filter((img) => img.id !== id) : [],
							canvasTexts: Array.isArray(mb.canvasTexts) ? mb.canvasTexts.filter((text) => text.id !== id) : [],
					  }
					: mb
			),
		})),

	handleDragStart: (e, item) => {
		console.log(item);
		e.dataTransfer.setData('image/src', item.image);
		e.dataTransfer.setData('image/alt', item.title);
		e.dataTransfer.setData('withInsertID', item.withInsertID);
		e.dataTransfer.setData('withoutInsertID', item.withoutInsertID);
		e.dataTransfer.setData('pillowURL', item.url);
		e.dataTransfer.setData('source/type', 'gallery');
	},

	resetMoodboard: () =>
		set((state) => ({
			moodboards: state.moodboards.map((mb) =>
				mb.id === state.activeMoodboardId
					? {
							...mb,
							canvasImages: [],
							canvasTexts: [],
							selectedGalleryItems: [],
							selectedComboboxItem: '',
							name: `${state.name} - 1`, // Reset to default numbered name
					  }
					: mb
			),
			selectedItemId: null,
		})),
}));

export default useMoodboardStore;
