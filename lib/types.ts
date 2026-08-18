import { DraggableData } from "react-draggable"
import React from "react"

export type Mode = "auto" | "manual"

export interface RequestBody {
  imageUrl: string
  mode?: Mode
  padding?: number
}

// Unified Canvas Items
export interface CanvasImageItem {
  id: string | number
  src: string
  originalSrc: string
  alt?: string
  x: number
  y: number
  width?: number
  height?: number
  originalWidth?: number
  originalHeight?: number
  baseWidth: number
  baseHeight: number
  currentWidth: number
  currentHeight: number
  pillowUrl?: string
  withInsertID?: string | null
  withoutInsertID?: string | null
  isProcessing?: boolean
  dataUrl?: any
  uploaded?: boolean
  resizable?: boolean
  naturalWidth?: number
  naturalHeight?: number
  groupId?: string
  [key: string]: any
}

export interface CanvasTextItem {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  fontWeight?: string
  color?: string
  groupId?: string
  [key: string]: any
}

export interface Moodboard {
  id: string
  name: string
  canvasImages: CanvasImageItem[]
  canvasTexts: CanvasTextItem[]
  selectedGalleryItems: any[]
  selectedComboboxItem: string
}

export interface MoodboardState {
  // Global Shell Settings
  name: string
  region: string
  activeMoodboardId: string | null
  allPillowData: any[] // Synced database inventory array
  selectedItemIds: (string | number)[]
  moodboards: Moodboard[]
  isTextMode: boolean

  // Global Workspace Onboarding & Design Curation States
  favoritePillows: string[]
  spaceImage: File | null
  imagePreview: string
  color: string[]
  fabricMaterial: string[]
  pattern: string[]

  // Active Catalog Filters
  filterPatterns: string[]
  filterColours: string[]
  filterMaterials: string[]

  // Global Actions
  setRegion: (newRegion: string) => void
  setName: (newName: string) => void
  setallPillowData: (data: any[]) => void
  setIsTextMode: (active: boolean) => void
  setSelectedItemIds: (ids: (string | number)[]) => void
  addSelectedItem: (id: string | number) => void
  removeSelectedItem: (id: string | number) => void
  toggleSelectedItem: (id: string | number) => void
  clearSelectedItems: () => void
  resizingImageId: string | number | null
  setResizingImageId: (id: string | number | null) => void

  // Management Actions
  selectMoodboard: (id: string) => void
  createMoodboard: () => void
  deleteMoodboard: (id: string) => void
  duplicateMoodboard: (id: string) => void
  setLoadedMoodboards: (moodboards: Moodboard[], activeId?: string) => void

  // Active Scoped Getters/Setters
  getMoodboardState: () => Moodboard | undefined
  setMoodboardState: (newProps: Partial<Moodboard>) => void

  // Active Canvas Content Actions
  setCanvasImages: (images: CanvasImageItem[]) => void
  setCanvasTexts: (text: CanvasTextItem) => void
  setSelectedGalleryItems: (items: any[]) => void
  setSelectedComboboxItem: (item: string) => void

  // Root Global Curation Property Setters
  setFavoritePillows: (pillows: string[]) => void
  setSpaceImage: (file: File | null, previewUrl: string) => void
  setColor: (colorVals: string[]) => void
  setFabricMaterial: (materialVals: string[]) => void
  setPattern: (patternVals: string[]) => void

  // Active Catalog Filter Setters
  setFilterPatterns: (patterns: string[]) => void
  setFilterColours: (colours: string[]) => void
  setFilterMaterials: (materials: string[]) => void
  clearCatalogFilters: () => void

  // Element Mutators
  updateCanvasImage: (
    id: string | number,
    newProps: Partial<CanvasImageItem>,
    skipHistory?: boolean
  ) => void
  updateCanvasText: (
    id: string | number,
    newProps: Partial<CanvasTextItem>,
    skipHistory?: boolean
  ) => void
  addCanvasImage: (image: CanvasImageItem, skipHistory?: boolean) => void
  addCanvasText: (text: CanvasTextItem) => void
  deleteCanvasItem: (id: string | number) => void
  groupSelectedItems: () => void
  ungroupSelectedItems: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  bringActiveToFront: () => void
  sendActiveToBack: () => void

  // Drag and Drop Bridge Handler
  handleDragStart: (e: React.DragEvent, item: any) => void
  resetMoodboard: () => void
}

export interface CustomCanvasElement extends HTMLCanvasElement {
  handleRemoveBackground?: (
    id: string | number,
    originalSrc: string | ArrayBuffer
  ) => Promise<any>
}

export interface CanvasState {
  canvasRef: { current: CustomCanvasElement | null } | null
  setCanvasRef: (ref: { current: CustomCanvasElement | null } | null) => void
}

export interface DropPosition {
  x: number
  y: number
}

export interface AddImagePayload {
  image?: string
  src?: string
  transparentImageUrl?: string
  title?: string
  alt?: string
  url?: string
  withInsertID?: string
  withoutInsertID?: string
  customWidth?: number
  customHeight?: number
  uploadedFromSubheader?: boolean
}

export interface CanvasRefActions {
  addImageToCanvas: (item: AddImagePayload, dropPosition?: DropPosition) => void
  handleRemoveBackground: (id: string | number, src: string) => Promise<void>
}

export interface DraggableImageProps {
  img: CanvasImageItem
  onStop: (e: any, ui: DraggableData, id: string | number) => void
  onDrag: (e: any, ui: DraggableData, id: string | number) => void
  onClick: (e: React.MouseEvent, id: string | number) => void
  isSelected: boolean
  isResizing?: boolean
  setIsResizing?: (active: boolean) => void
  onBringToFront: (id: string | number) => void
  onSendToBack: (id: string | number) => void
  onDeleteItem: (id: string | number) => void
  addToCart: (variantId: string) => void
  onResizeStop: (id: string | number, width: number, height: number) => void
  onCrop: (id: string | number) => void
  onDuplicate: (id: string | number) => void
  onResetSize: (id: string | number) => void
}

export interface DraggableTextProps {
  text: CanvasTextItem
  onStop: (e: any, ui: DraggableData, id: string) => void
  onDrag: (e: any, ui: DraggableData, id: string) => void
  onClick: (e: React.MouseEvent, id: string) => void
  isSelected: boolean
  onUpdateText: (id: string, newProps: Partial<CanvasTextItem>) => void
  onDeleteItem: (id: string) => void
}

export function parseMetafieldValue(val: any): string[] {
  if (!val) return []
  if (Array.isArray(val)) {
    return val.flatMap((v) => parseMetafieldValue(v))
  }
  if (typeof val === "string") {
    const trimmed = val.trim()
    if (!trimmed) return []

    // 1. Try parsing JSON array string e.g. '["Stripe", "Plaid"]'
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => String(item).trim())
            .filter((s) => s.length > 0)
        }
      } catch (e) {
        // Fallback if JSON parse fails
      }
    }

    // 2. Try splitting comma-separated string e.g. "Blue, Green"
    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    }

    return [trimmed]
  }
  return [String(val).trim()]
}

export interface PillowItem {
  id: string
  name: string
  image_url: string
  transparent_image_url?: string
  pillow_url: string
  with_insert_id?: string
  cover_only_id?: string
  is_online: boolean
  category?: "pillow" | "ottoman" | "throw" | "fabric" | "hardware" | "other"
  pattern?: string[]
  colour?: string[]
  fabricMaterial?: string[]
  goes_well_with?: PillowItem[]
  you_may_also_like?: PillowItem[]
}

export function mapShopifyProductToPillowItem(product: any): PillowItem {
  const image =
    product.featuredImage?.url ||
    product.images?.nodes?.[0]?.url ||
    "/placeholder.svg"

  const transparentImageUrl =
    product.transparentImage?.reference?.image?.url ||
    (typeof product.transparentImage?.value === "string" &&
    product.transparentImage.value.startsWith("http")
      ? product.transparentImage.value
      : undefined)

  const titleLower = (product.title || "").toLowerCase()
  const tagsStr = Array.isArray(product.tags)
    ? product.tags.join(" ").toLowerCase()
    : typeof product.tags === "string"
      ? product.tags.toLowerCase()
      : ""

  let category:
    | "pillow"
    | "ottoman"
    | "throw"
    | "fabric"
    | "hardware"
    | "other" = "other"

  // Hardware: Check tags ONLY (do NOT check title)
  if (tagsStr.includes("hardware")) {
    category = "hardware"
  }
  // Ottoman: Tag AND Title
  else if (tagsStr.includes("ottoman") && titleLower.includes("ottoman")) {
    category = "ottoman"
  }
  // Throw: Tag AND Title
  else if (
    (tagsStr.includes("throw") || tagsStr.includes("blanket")) &&
    (titleLower.includes("throw") || titleLower.includes("blanket"))
  ) {
    category = "throw"
  }
  // Fabric: Tag AND Title
  else if (
    tagsStr.includes("fabric") &&
    (titleLower.includes("fabric") || titleLower.includes("yardage"))
  ) {
    category = "fabric"
  }
  // Pillow: Tag AND Title
  else if (tagsStr.includes("pillow") && titleLower.includes("pillow")) {
    category = "pillow"
  } else {
    // Default fallback if unassigned
    category = "pillow"
  }

  const variants = product.variants?.nodes || []
  const withInsertVariant =
    variants.find((v: any) => v.title?.toLowerCase().includes("with insert")) ||
    variants[0]
  const coverOnlyVariant =
    variants.find((v: any) => v.title?.toLowerCase().includes("cover")) ||
    variants[1] ||
    variants[0]

  const parsedPatterns = parseMetafieldValue(product.pattern?.value)
  const parsedColours = parseMetafieldValue(product.colour?.value)
  const parsedMaterials = parseMetafieldValue(product.FabricMaterial?.value)

  return {
    id: product.id,
    name: product.title,
    image_url: image,
    transparent_image_url: transparentImageUrl,
    pillow_url: product.onlineStoreUrl || `/products/${product.handle}`,
    with_insert_id: withInsertVariant?.id,
    cover_only_id: coverOnlyVariant?.id,
    is_online: product.availableForSale ?? true,
    category,
    pattern: parsedPatterns.length > 0 ? parsedPatterns : undefined,
    colour: parsedColours.length > 0 ? parsedColours : undefined,
    fabricMaterial: parsedMaterials.length > 0 ? parsedMaterials : undefined,
    goes_well_with: Array.isArray(product.goes_well_with)
      ? product.goes_well_with.map(mapShopifyProductToPillowItem)
      : [],
    you_may_also_like: Array.isArray(product.you_may_also_like)
      ? product.you_may_also_like.map(mapShopifyProductToPillowItem)
      : [],
  }
}

export interface GalleryProps {
  canvasRef: any
}

export interface DeleteMoodboardDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export interface HighQualityImageResult {
  dataUrl: string
  width: number
  height: number
}

export interface SocialMediaPlatform {
  icon: string
  url: string
}

export interface Step {
  id: string
  title: string
}

export interface OnboardingProgressProps {
  steps: Step[]
  currentStep: number
  setCurrentStep: (step: number) => void
}

export interface OnboardingSlideshowProps {
  activeSlide: number
}

export interface PillowSelectorProps {
  selectedPillows: string[]
  onChange: (pillows: string[]) => void
  maxSelections?: number
  showSelectedPillows?: boolean
}

export interface SettingsFormData {
  moodboardName: string
  region: string
  favoritePillows: string[]
  spaceImage: File | null
  imagePreview: string
}
