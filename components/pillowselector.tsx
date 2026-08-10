"use client"

import { useState, useEffect, useRef } from "react"
import { Check, Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { fetchAllShopifyProducts } from "@/lib/shopify/client"
import useMoodboardStore from "@/lib/store/moodboardstore"

import { PillowSelectorProps, mapShopifyProductToPillowItem } from "@/lib/types"

export function PillowSelector({
  selectedPillows,
  onChange,
  maxSelections,
  showSelectedPillows = true,
}: PillowSelectorProps) {
  const [openPopover, setOpenPopover] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<
    "pillow" | "ottoman" | "throw" | "fabric" | "hardware"
  >("pillow")
  const listRef = useRef<HTMLDivElement>(null)

  const {
    allPillowData,
    setallPillowData,
    filterPatterns,
    filterColours,
    filterMaterials,
  } = useMoodboardStore()

  // Always reset to 'pillow' category whenever popover opens or closes
  const handleOpenChange = (open: boolean) => {
    setOpenPopover(open)
    if (open) {
      setActiveCategory("pillow")
    }
  }

  // Helper handler for category tab clicks
  const handleCategoryChange = (
    cat: "pillow" | "ottoman" | "throw" | "fabric" | "hardware"
  ) => {
    setActiveCategory(cat)
    listRef.current?.scrollTo({ top: 0 })
  }
  // Add this ref at the top with your other hooks
  const attemptedFetches = useRef<Set<string>>(new Set())
  // FETCH ON CATEGORY CLICK
  useEffect(() => {
    // 1. CACHING: Check if we already have data for this category in Zustand
    const hasData = useMoodboardStore
      .getState()
      .allPillowData.some((item) => item.category === activeCategory)

    // 2. If we have data, OR we already attempted to fetch it, don't fetch again
    if (hasData || attemptedFetches.current.has(activeCategory)) {
      setIsLoading(false)
      return
    }

    // Mark as fetched immediately so rapid clicks don't trigger double fetches
    attemptedFetches.current.add(activeCategory)

    async function fetchCategory() {
      setIsLoading(true)
      try {
        // 3. Define specific query for the active category
        let query = "status:active"
        if (activeCategory === "pillow") {
          query = "status:active AND (tag:pillow AND title:*Pillow*)"
        } else if (activeCategory === "ottoman") {
          query = "status:active AND (tag:ottoman AND title:*Ottoman*)"
        } else if (activeCategory === "throw") {
          query = "status:active AND (tag:throw AND title:*Throw*)"
        } else if (activeCategory === "fabric") {
          query = "status:active AND (tag:fabric AND title:*Fabric*)"
        } else if (activeCategory === "hardware") {
          query = "status:active AND tag:hardware"
        }

        const products = await fetchAllShopifyProducts(query)

        // 4. Filter out products that do not have a valid image URL
        const productsWithImages = products.filter((product) => {
          return (
            Boolean(product.featuredImage?.url) ||
            Boolean(product.images?.nodes?.[0]?.url)
          )
        })
        console.log(
          `Fetching products for category: ${activeCategory}, total products found: ${productsWithImages.length}`
        )

        // 5. Map to frontend model
        let mappedPillows = productsWithImages.map(
          mapShopifyProductToPillowItem
        )
        // 5. Force the category to match the active tab.
        mappedPillows = mappedPillows.map((p) => ({
          ...p,
          category: activeCategory,
        }))

        // Fetch Custom Google Sheet Pillows if active category is 'pillow'
        if (activeCategory === "pillow") {
          try {
            const res = await fetch("/api/custom-pillows")
            if (res.ok) {
              const data = await res.json()
              if (Array.isArray(data?.pillows)) {
                console.log(
                  `[PillowSelector] Fetched ${data.pillows.length} custom pillows from Google Sheets`
                )
                mappedPillows = [...mappedPillows, ...data.pillows]
              }
            }
          } catch (gsErr) {
            console.error("Failed fetching custom Google Sheet pillows:", gsErr)
          }
        }

        console.log(
          `[PillowSelector] Fetched ${mappedPillows.length} items for category: ${activeCategory}`
        )
        // 6. Safely get latest state and merge with deduplication.
        const currentData = useMoodboardStore.getState().allPillowData
        const mergedMap = new Map()
        currentData.forEach((item) => mergedMap.set(item.id, item))
        mappedPillows.forEach((item) => mergedMap.set(item.id, item))
        const finalData = Array.from(mergedMap.values())
        setallPillowData(finalData)
      } catch (err) {
        console.error("Error pulling database inventory from Shopify:", err)
        toast.error("Failed loading product inventory from Shopify.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategory()
  }, [activeCategory, setallPillowData])

  // Apply category tab filter AND active pattern/colour/material filters
  const filteredProducts = allPillowData.filter((item) => {
    if (item.category !== activeCategory) return false

    // Pattern check: Item's pattern array must contain at least one of the selected filterPatterns
    if (filterPatterns.length > 0) {
      if (!Array.isArray(item.pattern) || item.pattern.length === 0) {
        return false
      }
      const hasPatternMatch = item.pattern.some((p: string) =>
        filterPatterns.includes(p.trim())
      )
      if (!hasPatternMatch) return false
    }

    // Colour check: Item's colour array must contain at least one of the selected filterColours
    if (filterColours.length > 0) {
      if (!Array.isArray(item.colour) || item.colour.length === 0) {
        return false
      }
      const hasColourMatch = item.colour.some((c: string) =>
        filterColours.includes(c.trim())
      )
      if (!hasColourMatch) return false
    }

    // Material check: Item's fabricMaterial array must contain at least one of the selected filterMaterials
    if (filterMaterials.length > 0) {
      if (
        !Array.isArray(item.fabricMaterial) ||
        item.fabricMaterial.length === 0
      ) {
        return false
      }
      const hasMaterialMatch = item.fabricMaterial.some((m: string) =>
        filterMaterials.includes(m.trim())
      )
      if (!hasMaterialMatch) return false
    }

    return true
  })

  const isMaxReached =
    maxSelections !== undefined && selectedPillows.length >= maxSelections

  const handlePillowSelect = (pillowId: string) => {
    const isAlreadySelected = selectedPillows.includes(pillowId)
    if (isAlreadySelected) {
      onChange(selectedPillows.filter((id) => id !== pillowId))
    } else {
      if (isMaxReached) {
        toast.error(
          `Maximum ${maxSelections} items can be selected for this moodboard`
        )
        return
      }
      onChange([...selectedPillows, pillowId])
    }
  }

  return (
    <Popover open={openPopover} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {/* No longer disabled while loading — opens instantly, content streams in after */}
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={openPopover}
          className="flex h-auto min-h-12 w-full flex-col items-start justify-center gap-2 rounded-xl border-muted-foreground/20 px-3 py-2 text-left font-normal hover:bg-background"
        >
          {showSelectedPillows && selectedPillows.length > 0 && (
            <div className="flex w-full flex-wrap gap-1.5">
              {selectedPillows.map((id) => {
                const matchedPillow = allPillowData.find((p) => p.id === id)
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="gap-1 rounded-md border bg-secondary py-0.5 pr-1 pl-1.5 text-[11px] font-medium text-secondary-foreground"
                  >
                    {matchedPillow?.name || "Item"}
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePillowSelect(id)
                      }}
                      className="cursor-pointer rounded-sm p-0.5 hover:bg-muted-foreground/20"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </Badge>
                )
              })}
            </div>
          )}
          <div className="flex w-full items-center justify-between border-t border-dashed border-transparent pt-0.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 text-gray-800">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">
                {isMaxReached
                  ? "Maximum selection reached"
                  : "Click here to search / add items..."}
              </span>
            </div>
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {selectedPillows.length}
              {maxSelections ? `/${maxSelections}` : ""} Chosen
            </span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) overflow-hidden rounded-2xl border p-0 shadow-xl"
        align="start"
      >
        <Command className="rounded-none">
          <CommandInput
            placeholder={`Type name to filter ${activeCategory === "pillow"
              ? "pillows"
              : activeCategory === "ottoman"
                ? "ottomans"
                : activeCategory === "throw"
                  ? "throws"
                  : activeCategory === "fabric"
                    ? "fabrics"
                    : "hardware"
              } instantly...`}
            className="h-11 text-xs"
            onValueChange={() => {
              // Scroll results back to top on every keystroke
              listRef.current?.scrollTo({ top: 0 })
            }}
          />
          <div className="flex items-center gap-1.5 overflow-hidden border-b px-3 py-2 text-xs">
            <Badge
              onClick={() => handleCategoryChange("pillow")}
              className={cn(
                "cursor-pointer transition-colors select-none",
                activeCategory === "pillow"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              Pillows
            </Badge>
            <Badge
              onClick={() => handleCategoryChange("ottoman")}
              className={cn(
                "cursor-pointer transition-colors select-none",
                activeCategory === "ottoman"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              Ottomans
            </Badge>
            <Badge
              onClick={() => handleCategoryChange("throw")}
              className={cn(
                "cursor-pointer transition-colors select-none",
                activeCategory === "throw"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              Throws
            </Badge>
            <Badge
              onClick={() => handleCategoryChange("fabric")}
              className={cn(
                "cursor-pointer transition-colors select-none",
                activeCategory === "fabric"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              Fabrics
            </Badge>
            <Badge
              onClick={() => handleCategoryChange("hardware")}
              className={cn(
                "cursor-pointer transition-colors select-none",
                activeCategory === "hardware"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              Hardware
            </Badge>
          </div>
          <CommandList ref={listRef} className="max-h-56">
            {isLoading ? (
              // Skeleton rows shown instantly while data streams in
              <div className="space-y-1 p-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-md px-3 py-2"
                  >
                    <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-2 w-14" />
                    </div>
                    <Skeleton className="h-4 w-4 shrink-0 rounded-md" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <CommandEmpty className="p-4 text-center text-xs text-muted-foreground">
                  No dynamic matches found for this category.
                </CommandEmpty>
                <CommandGroup>
                  {filteredProducts.map((pillow) => {
                    const isSelected = selectedPillows.includes(pillow.id)
                    return (
                      <CommandItem
                        key={pillow.id}
                        value={pillow.name}
                        onSelect={() => handlePillowSelect(pillow.id)}
                        className="flex cursor-pointer items-center justify-between px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          {pillow.image_url && (
                            <img
                              src={pillow.image_url}
                              alt={pillow.name}
                              className="h-8 w-8 shrink-0 rounded-md border bg-muted object-cover"
                            />
                          )}
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-medium text-foreground">
                              {pillow.name}
                            </span>

                          </div>
                        </div>
                        <div
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-colors",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/30"
                          )}
                        >
                          {isSelected && (
                            <Check className="h-2.5 w-2.5 stroke-3" />
                          )}
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
