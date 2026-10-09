import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  CanvasImageItem,
  CanvasTextItem,
  Moodboard,
  MoodboardState,
} from "@/lib/types";

const MAX_HISTORY = 50;

const commitCanvasState = (
  activeId: string,
  moodboards: Moodboard[],
  state: any,
) => {
  const mb = moodboards.find((m) => m.id === activeId);
  if (!mb) return {};

  const currentHistories = state.histories || {};
  const currentIndexes = state.historyIndexes || {};

  const history = currentHistories[activeId] || [];
  const index =
    currentIndexes[activeId] !== undefined ? currentIndexes[activeId] : -1;

  const nextHistory = history.slice(0, index + 1);

  nextHistory.push({
    canvasImages: (mb.canvasImages || []).map((img: any) => ({ ...img })),
    canvasTexts: (mb.canvasTexts || []).map((txt: any) => ({ ...txt })),
  });

  if (nextHistory.length > MAX_HISTORY) {
    nextHistory.shift();
  }

  const nextIndex = nextHistory.length - 1;

  return {
    histories: { ...currentHistories, [activeId]: nextHistory },
    historyIndexes: { ...currentIndexes, [activeId]: nextIndex },
  };
};

const useMoodboardStore = create<MoodboardState>()(
  devtools(
    (set, get) => ({
      name: "TonicLiving Moodboard",
      region: "CA",
      activeMoodboardId: "default-moodboard",
      allPillowData: [],
      selectedItemIds: [],
      isTextMode: false,

      favoritePillows: [],
      spaceImage: null,
      imagePreview: "",
      color: [],
      fabricMaterial: [],
      pattern: [],

      filterPatterns: [],
      filterColours: [],
      filterMaterials: [],

      moodboards: [
        {
          id: "default-moodboard",
          name: "moodboard - 1",
          canvasImages: [],
          canvasTexts: [],
          selectedGalleryItems: [],
          selectedComboboxItem: "",
        },
      ],

      histories: {
        "default-moodboard": [{ canvasImages: [], canvasTexts: [] }],
      },
      historyIndexes: {
        "default-moodboard": 0,
      },

      setRegion: (newRegion) => set({ region: newRegion }),

      setName: (newName) => {
        set((state: MoodboardState) => {
          const updatedMoodboards = state.moodboards.map(
            (moodboard, index) => ({
              ...moodboard,
              name: `${newName}\n${index + 1}`,
            }),
          );
          return {
            name: newName,
            moodboards: updatedMoodboards,
          };
        });
      },

      setallPillowData: (data) => set({ allPillowData: data }),

      setIsTextMode: (active) => set({ isTextMode: active }),

      setSelectedItemIds: (ids) => set({ selectedItemIds: ids }),

      resizingImageId: null,
      setResizingImageId: (id) => set({ resizingImageId: id }),

      addSelectedItem: (id) =>
        set((state: MoodboardState) => ({
          selectedItemIds: [...state.selectedItemIds, id],
        })),

      removeSelectedItem: (id) =>
        set((state: MoodboardState) => ({
          selectedItemIds: state.selectedItemIds.filter(
            (itemId) => itemId !== id,
          ),
        })),

      toggleSelectedItem: (id) =>
        set((state: MoodboardState) => ({
          selectedItemIds: state.selectedItemIds.includes(id)
            ? state.selectedItemIds.filter((itemId) => itemId !== id)
            : [...state.selectedItemIds, id],
        })),

      clearSelectedItems: () =>
        set({ selectedItemIds: [], resizingImageId: null }),

      selectMoodboard: (id) => set({ activeMoodboardId: id }),

      createMoodboard: () => {
        set((state: MoodboardState) => {
          const newMoodboard: Moodboard = {
            id: `moodboard-${Date.now()}`,
            name: `${state.name}\n${state.moodboards.length + 1}`,
            canvasImages: [],
            canvasTexts: [],
            selectedGalleryItems: [],
            selectedComboboxItem: "",
          };

          const nextMoodboards = [...state.moodboards, newMoodboard];
          const currentHistories = (state as any).histories || {};
          const currentIndexes = (state as any).historyIndexes || {};

          return {
            moodboards: nextMoodboards,
            activeMoodboardId: newMoodboard.id,
            histories: {
              ...currentHistories,
              [newMoodboard.id]: [{ canvasImages: [], canvasTexts: [] }],
            },
            historyIndexes: {
              ...currentIndexes,
              [newMoodboard.id]: 0,
            },
          };
        });
      },

      deleteMoodboard: (id) => {
        set((state: MoodboardState) => {
          const remainingMoodboards = state.moodboards.filter(
            (m) => m.id !== id,
          );
          const newActiveMoodboardId =
            remainingMoodboards.length > 0 ? remainingMoodboards[0].id : null;
          const renumberedMoodboards = remainingMoodboards.map(
            (moodboard, index) => ({
              ...moodboard,
              name: `${state.name}\n${index + 1}`,
            }),
          );
          return {
            moodboards: renumberedMoodboards,
            activeMoodboardId: newActiveMoodboardId,
          };
        });
      },

      duplicateMoodboard: (id) => {
        set((state: MoodboardState) => {
          const moodboardToDuplicate = state.moodboards.find(
            (m) => m.id === id,
          );
          if (!moodboardToDuplicate) return {};

          const newMoodboard: Moodboard = {
            ...JSON.parse(JSON.stringify(moodboardToDuplicate)),
            id: `moodboard-${Date.now()}`,
          };

          const originalIndex = state.moodboards.findIndex((m) => m.id === id);
          const newMoodboards = [
            ...state.moodboards.slice(0, originalIndex + 1),
            newMoodboard,
            ...state.moodboards.slice(originalIndex + 1),
          ];

          const renumberedMoodboards = newMoodboards.map(
            (moodboard, index) => ({
              ...moodboard,
              name: `${state.name}\n${index + 1}`,
            }),
          );

          const currentHistories = (state as any).histories || {};
          const currentIndexes = (state as any).historyIndexes || {};

          return {
            moodboards: renumberedMoodboards,
            activeMoodboardId: newMoodboard.id,
            histories: {
              ...currentHistories,
              [newMoodboard.id]: [
                {
                  canvasImages: JSON.parse(
                    JSON.stringify(newMoodboard.canvasImages || []),
                  ),
                  canvasTexts: JSON.parse(
                    JSON.stringify(newMoodboard.canvasTexts || []),
                  ),
                },
              ],
            },
            historyIndexes: {
              ...currentIndexes,
              [newMoodboard.id]: 0,
            },
          };
        });
      },

      setLoadedMoodboards: (loadedMoodboards, activeId) => {
        set((state: MoodboardState) => {
          const activeMoodboardId =
            activeId ||
            (loadedMoodboards.length > 0 ? loadedMoodboards[0].id : null);
          const histories: Record<string, any> = {};
          const historyIndexes: Record<string, number> = {};

          loadedMoodboards.forEach((mb) => {
            histories[mb.id] = [
              {
                canvasImages: JSON.parse(JSON.stringify(mb.canvasImages || [])),
                canvasTexts: JSON.parse(JSON.stringify(mb.canvasTexts || [])),
              },
            ];
            historyIndexes[mb.id] = 0;
          });

          return {
            moodboards: loadedMoodboards,
            activeMoodboardId,
            histories,
            historyIndexes,
            selectedItemIds: [],
            resizingImageId: null,
          };
        });
      },

      getMoodboardState: () => {
        const state = get();
        return state.moodboards.find((mb) => mb.id === state.activeMoodboardId);
      },

      setMoodboardState: (newProps) =>
        set((state: MoodboardState) => {
          const updatedMoodboards = state.moodboards.map((mb) =>
            mb.id === state.activeMoodboardId ? { ...mb, ...newProps } : mb,
          );

          const historyUpdate =
            newProps.canvasImages !== undefined ||
            newProps.canvasTexts !== undefined
              ? commitCanvasState(
                  state.activeMoodboardId!,
                  updatedMoodboards,
                  state,
                )
              : {};

          return {
            moodboards: updatedMoodboards,
            ...historyUpdate,
          };
        }),

      setCanvasImages: (images) =>
        get().setMoodboardState({ canvasImages: images }),

      setCanvasTexts: (text) =>
        set((state: MoodboardState) => {
          const updatedMoodboards = state.moodboards.map((mb) =>
            mb.id === state.activeMoodboardId
              ? {
                  ...mb,
                  canvasTexts: Array.isArray(mb.canvasTexts)
                    ? [...mb.canvasTexts, text]
                    : [text],
                }
              : mb,
          );
          return {
            moodboards: updatedMoodboards,
            ...commitCanvasState(
              state.activeMoodboardId!,
              updatedMoodboards,
              state,
            ),
          };
        }),

      setSelectedGalleryItems: (items) =>
        get().setMoodboardState({ selectedGalleryItems: items }),

      setSelectedComboboxItem: (item) =>
        get().setMoodboardState({ selectedComboboxItem: item }),

      setFavoritePillows: (pillows) => set({ favoritePillows: pillows }),

      setSpaceImage: (file, previewUrl) =>
        set({ spaceImage: file, imagePreview: previewUrl }),

      setColor: (colorVals) => set({ color: colorVals }),

      setFabricMaterial: (materialVals) =>
        set({ fabricMaterial: materialVals }),

      setPattern: (patternVals) => set({ pattern: patternVals }),

      setFilterPatterns: (patterns) => set({ filterPatterns: patterns }),

      setFilterColours: (colours) => set({ filterColours: colours }),

      setFilterMaterials: (materials) => set({ filterMaterials: materials }),

      clearCatalogFilters: () =>
        set({
          filterPatterns: [],
          filterColours: [],
          filterMaterials: [],
        }),

      updateCanvasImage: (id, newProps, skipHistory) =>
        set((state: MoodboardState) => {
          const updatedMoodboards = state.moodboards.map((mb) =>
            mb.id === state.activeMoodboardId
              ? {
                  ...mb,
                  canvasImages: Array.isArray(mb.canvasImages)
                    ? mb.canvasImages.map((img) =>
                        img.id === id ? { ...img, ...newProps } : img,
                      )
                    : [],
                }
              : mb,
          );
          return {
            moodboards: updatedMoodboards,
            ...(skipHistory
              ? {}
              : commitCanvasState(
                  state.activeMoodboardId!,
                  updatedMoodboards,
                  state,
                )),
          };
        }),

      updateCanvasText: (id, newProps, skipHistory) =>
        set((state: MoodboardState) => {
          const updatedMoodboards = state.moodboards.map((mb) =>
            mb.id === state.activeMoodboardId
              ? {
                  ...mb,
                  canvasTexts: Array.isArray(mb.canvasTexts)
                    ? mb.canvasTexts.map((text) =>
                        text.id === id ? { ...text, ...newProps } : text,
                      )
                    : [],
                }
              : mb,
          );
          return {
            moodboards: updatedMoodboards,
            ...(skipHistory
              ? {}
              : commitCanvasState(
                  state.activeMoodboardId!,
                  updatedMoodboards,
                  state,
                )),
          };
        }),

      addCanvasImage: (image, skipHistory) =>
        set((state: MoodboardState) => {
          const updatedMoodboards = state.moodboards.map((mb) =>
            mb.id === state.activeMoodboardId
              ? {
                  ...mb,
                  canvasImages: Array.isArray(mb.canvasImages)
                    ? [...mb.canvasImages, image]
                    : [image],
                }
              : mb,
          );
          return {
            moodboards: updatedMoodboards,
            ...(skipHistory
              ? {}
              : commitCanvasState(
                  state.activeMoodboardId!,
                  updatedMoodboards,
                  state,
                )),
          };
        }),

      addCanvasText: (text) =>
        set((state: MoodboardState) => {
          const updatedMoodboards = state.moodboards.map((mb) =>
            mb.id === state.activeMoodboardId
              ? {
                  ...mb,
                  canvasTexts: Array.isArray(mb.canvasTexts)
                    ? [...mb.canvasTexts, text]
                    : [text],
                }
              : mb,
          );
          return {
            moodboards: updatedMoodboards,
            ...commitCanvasState(
              state.activeMoodboardId!,
              updatedMoodboards,
              state,
            ),
          };
        }),

      deleteCanvasItem: (id) =>
        set((state: MoodboardState) => {
          const updatedMoodboards = state.moodboards.map((mb) =>
            mb.id === state.activeMoodboardId
              ? {
                  ...mb,
                  canvasImages: Array.isArray(mb.canvasImages)
                    ? mb.canvasImages.filter((img) => img.id !== id)
                    : [],
                  canvasTexts: Array.isArray(mb.canvasTexts)
                    ? mb.canvasTexts.filter((text) => text.id !== id)
                    : [],
                }
              : mb,
          );
          return {
            moodboards: updatedMoodboards,
            ...commitCanvasState(
              state.activeMoodboardId!,
              updatedMoodboards,
              state,
            ),
          };
        }),

      groupSelectedItems: () =>
        set((state: MoodboardState) => {
          const activeMB = state.moodboards.find(
            (mb) => mb.id === state.activeMoodboardId,
          );
          if (!activeMB) return {};

          const newGroupId = `group-${Date.now()}`;
          const selectedIds = state.selectedItemIds;
          if (selectedIds.length < 2) return {};

          const updatedMoodboards = state.moodboards.map((mb) =>
            mb.id === state.activeMoodboardId
              ? {
                  ...mb,
                  canvasImages: mb.canvasImages.map((img) =>
                    selectedIds.includes(img.id)
                      ? { ...img, groupId: newGroupId }
                      : img,
                  ),
                  canvasTexts: mb.canvasTexts.map((txt) =>
                    selectedIds.includes(txt.id)
                      ? { ...txt, groupId: newGroupId }
                      : txt,
                  ),
                }
              : mb,
          );

          return {
            moodboards: updatedMoodboards,
            ...commitCanvasState(
              state.activeMoodboardId!,
              updatedMoodboards,
              state,
            ),
          };
        }),

      ungroupSelectedItems: () =>
        set((state: MoodboardState) => {
          const activeMB = state.moodboards.find(
            (mb) => mb.id === state.activeMoodboardId,
          );
          if (!activeMB) return {};

          const selectedIds = state.selectedItemIds;
          if (selectedIds.length === 0) return {};

          const groupsToDissolve = new Set<string>();
          activeMB.canvasImages.forEach((img) => {
            if (selectedIds.includes(img.id) && img.groupId)
              groupsToDissolve.add(img.groupId);
          });
          activeMB.canvasTexts.forEach((txt) => {
            if (selectedIds.includes(txt.id) && txt.groupId)
              groupsToDissolve.add(txt.groupId);
          });

          if (groupsToDissolve.size === 0) return {};

          const updatedMoodboards = state.moodboards.map((mb) =>
            mb.id === state.activeMoodboardId
              ? {
                  ...mb,
                  canvasImages: mb.canvasImages.map((img) =>
                    img.groupId && groupsToDissolve.has(img.groupId)
                      ? { ...img, groupId: undefined }
                      : img,
                  ),
                  canvasTexts: mb.canvasTexts.map((txt) =>
                    txt.groupId && groupsToDissolve.has(txt.groupId)
                      ? { ...txt, groupId: undefined }
                      : txt,
                  ),
                }
              : mb,
          );

          return {
            moodboards: updatedMoodboards,
            ...commitCanvasState(
              state.activeMoodboardId!,
              updatedMoodboards,
              state,
            ),
          };
        }),

      canUndo: () => {
        const state = get();
        const activeId = state.activeMoodboardId;
        if (!activeId) return false;
        const indexes = (state as any).historyIndexes || {};
        const index = indexes[activeId];
        return index > 0;
      },

      canRedo: () => {
        const state = get();
        const activeId = state.activeMoodboardId;
        if (!activeId) return false;
        const histories = (state as any).histories || {};
        const indexes = (state as any).historyIndexes || {};
        const history = histories[activeId] || [];
        const index = indexes[activeId] !== undefined ? indexes[activeId] : -1;
        return index < history.length - 1;
      },

      undo: () => {
        const state = get();
        const activeId = state.activeMoodboardId;
        if (!activeId || !state.canUndo()) return;

        const histories = (state as any).histories || {};
        const indexes = (state as any).historyIndexes || {};
        const history = histories[activeId] || [];
        const index = indexes[activeId];
        const newIndex = index - 1;
        const targetState = history[newIndex];

        set((s: any) => ({
          moodboards: s.moodboards.map((mb: any) =>
            mb.id === activeId
              ? {
                  ...mb,
                  canvasImages: targetState.canvasImages.map((img: any) => ({
                    ...img,
                  })),
                  canvasTexts: targetState.canvasTexts.map((txt: any) => ({
                    ...txt,
                  })),
                }
              : mb,
          ),
          historyIndexes: { ...indexes, [activeId]: newIndex },
        }));
      },

      redo: () => {
        const state = get();
        const activeId = state.activeMoodboardId;
        if (!activeId || !state.canRedo()) return;

        const histories = (state as any).histories || {};
        const indexes = (state as any).historyIndexes || {};
        const history = histories[activeId] || [];
        const index = indexes[activeId];
        const newIndex = index + 1;
        const targetState = history[newIndex];

        set((s: any) => ({
          moodboards: s.moodboards.map((mb: any) =>
            mb.id === activeId
              ? {
                  ...mb,
                  canvasImages: targetState.canvasImages.map((img: any) => ({
                    ...img,
                  })),
                  canvasTexts: targetState.canvasTexts.map((txt: any) => ({
                    ...txt,
                  })),
                }
              : mb,
          ),
          historyIndexes: { ...indexes, [activeId]: newIndex },
        }));
      },

      bringActiveToFront: () => {
        const state = get();
        const activeId = state.activeMoodboardId;
        if (!activeId) return;
        const selected = state.selectedItemIds;
        if (selected.length === 0) return;

        set((s: any) => {
          const updatedMoodboards = s.moodboards.map((mb: any) => {
            if (mb.id === activeId) {
              const selectedImages = mb.canvasImages.filter((img: any) =>
                selected.includes(img.id),
              );
              const remainingImages = mb.canvasImages.filter(
                (img: any) => !selected.includes(img.id),
              );
              return {
                ...mb,
                canvasImages: [...remainingImages, ...selectedImages],
              };
            }
            return mb;
          });
          return {
            moodboards: updatedMoodboards,
            ...commitCanvasState(activeId, updatedMoodboards, s),
          };
        });
      },

      sendActiveToBack: () => {
        const state = get();
        const activeId = state.activeMoodboardId;
        if (!activeId) return;
        const selected = state.selectedItemIds;
        if (selected.length === 0) return;

        set((s: any) => {
          const updatedMoodboards = s.moodboards.map((mb: any) => {
            if (mb.id === activeId) {
              const selectedImages = mb.canvasImages.filter((img: any) =>
                selected.includes(img.id),
              );
              const remainingImages = mb.canvasImages.filter(
                (img: any) => !selected.includes(img.id),
              );
              return {
                ...mb,
                canvasImages: [...selectedImages, ...remainingImages],
              };
            }
            return mb;
          });
          return {
            moodboards: updatedMoodboards,
            ...commitCanvasState(activeId, updatedMoodboards, s),
          };
        });
      },

      handleDragStart: (e, item) => {
        e.dataTransfer.setData("image/src", item.image);
        if (
          item.transparentImageUrl ||
          item.transparent_image_url ||
          item.transparent_url
        ) {
          e.dataTransfer.setData(
            "transparentImageUrl",
            item.transparentImageUrl ||
              item.transparent_image_url ||
              item.transparent_url,
          );
        }
        e.dataTransfer.setData("image/alt", item.title);
        e.dataTransfer.setData("withInsertID", item.withInsertID);
        e.dataTransfer.setData("withoutInsertID", item.withoutInsertID);
        e.dataTransfer.setData("pillowURL", item.url);
        e.dataTransfer.setData("source/type", "gallery");
      },

      resetMoodboard: () =>
        set((state: MoodboardState) => {
          const updatedMoodboards = state.moodboards.map((mb) =>
            mb.id === state.activeMoodboardId
              ? {
                  id: mb.id,
                  name: mb.name,
                  canvasImages: [],
                  canvasTexts: [],
                  selectedGalleryItems: [],
                  selectedComboboxItem: "",
                }
              : mb,
          );
          return {
            moodboards: updatedMoodboards,
            ...commitCanvasState(
              state.activeMoodboardId!,
              updatedMoodboards,
              state,
            ),
            selectedItemIds: [],
            favoritePillows: [],
            spaceImage: null,
            imagePreview: "",
            color: [],
            fabricMaterial: [],
            pattern: [],
            filterPatterns: [],
            filterColours: [],
            filterMaterials: [],
          };
        }), // Properly closes set((state: MoodboardState) => { ... })
    }),
    {
      name: "MoodboardStore",
      enabled: process.env.NODE_ENV !== "production",
    },
  ),
);

export default useMoodboardStore;
