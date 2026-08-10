"use client"

import React, { useMemo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import useMoodboardStore from "@/lib/store/moodboardstore"
import { ScrollArea } from "../ui/scroll-area"

import {
  PillowItem,
  GalleryProps,
  mapShopifyProductToPillowItem,
} from "@/lib/types"
import {
  shopifyFetch,
  SHOPIFY_RECOMMENDATIONS_QUERY,
} from "@/lib/shopify/client"

export default function Gallery({ canvasRef }: GalleryProps) {
  // Use favoritePillows and allPillowData from your store
  const { favoritePillows, allPillowData, setFavoritePillows } =
    useMoodboardStore()

  const [selectedMainProductId, setSelectedMainProductId] = useState<
    string | null
  >(null)
  const [dynamicGoesWellWith, setDynamicGoesWellWith] = useState<PillowItem[]>(
    []
  )
  const [dynamicYouMayAlsoLike, setDynamicYouMayAlsoLike] = useState<
    PillowItem[]
  >([])
  const [isLoadingRecs, setIsLoadingRecs] = useState(false)

  // 1. Resolve Main Products from favoritePillows IDs array
  const allMainProducts = useMemo<PillowItem[]>(() => {
    if (!Array.isArray(favoritePillows) || !allPillowData) return []
    return allPillowData.filter((pillow: PillowItem) =>
      favoritePillows.includes(pillow.id)
    )
  }, [favoritePillows, allPillowData])

  // Default selection to first main product if current selection is invalid
  useEffect(() => {
    if (allMainProducts.length > 0) {
      if (
        !selectedMainProductId ||
        !allMainProducts.some((p) => p.id === selectedMainProductId)
      ) {
        setSelectedMainProductId(allMainProducts[0].id)
      }
    } else {
      setSelectedMainProductId(null)
    }
  }, [allMainProducts, selectedMainProductId])

  const activeMainProduct = useMemo(() => {
    return (
      allMainProducts.find((p) => p.id === selectedMainProductId) ||
      allMainProducts[0] ||
      null
    )
  }, [allMainProducts, selectedMainProductId])

  // Fetch recommendations from Shopify whenever the active main product changes
  useEffect(() => {
    let isMounted = true

    async function fetchRecommendationsForActiveProduct() {
      if (!activeMainProduct) {
        setDynamicGoesWellWith([])
        setDynamicYouMayAlsoLike([])
        return
      }
      setIsLoadingRecs(true)
      const complementaryMap = new Map<string, PillowItem>()
      const relatedMap = new Map<string, PillowItem>()
      // First include any pre-embedded items on the product
      ;(activeMainProduct.goes_well_with || []).forEach((item) =>
        complementaryMap.set(item.id, item)
      )
      ;(activeMainProduct.you_may_also_like || []).forEach((item) =>
        relatedMap.set(item.id, item)
      )
      try {
        // Fetch COMPLEMENTARY intent for "Goes Well With"
        const compRes = await shopifyFetch(SHOPIFY_RECOMMENDATIONS_QUERY, {
          productId: activeMainProduct.id,
          intent: "COMPLEMENTARY",
        })
        const compNodes = compRes?.productRecommendations || []
        compNodes.forEach((prod: any) => {
          if (!complementaryMap.has(prod.id)) {
            complementaryMap.set(prod.id, mapShopifyProductToPillowItem(prod))
          }
        })

        // Fetch RELATED intent for "You May Also Like"
        const relRes = await shopifyFetch(SHOPIFY_RECOMMENDATIONS_QUERY, {
          productId: activeMainProduct.id,
          intent: "RELATED",
        })
        const relNodes = relRes?.productRecommendations || []
        relNodes.forEach((prod: any) => {
          if (!relatedMap.has(prod.id)) {
            relatedMap.set(prod.id, mapShopifyProductToPillowItem(prod))
          }
        })
      } catch (err) {
        console.warn(
          `Failed to fetch recommendations for ${activeMainProduct.id}:`,
          err
        )
      } finally {
        if (isMounted) {
          setDynamicGoesWellWith(Array.from(complementaryMap.values()))
          setDynamicYouMayAlsoLike(Array.from(relatedMap.values()))
          setIsLoadingRecs(false)
        }
      }
    }
    fetchRecommendationsForActiveProduct()
    return () => {
      isMounted = false
    }
  }, [activeMainProduct])

  // Clear an item out from the global favorite tracking store array
  const handleRemoveFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setFavoritePillows(favoritePillows.filter((favId) => favId !== id))
    if (selectedMainProductId === id) {
      setSelectedMainProductId(null)
    }
  }

  // Maps properties to standard canvas drag payloads seamlessly
  const transformItemForCanvas = (item: PillowItem) => ({
    image: item.image_url,
    transparentImageUrl: item.transparent_image_url,
    title: item.name,
    url: item.pillow_url,
    withInsertID: item.with_insert_id,
    withoutInsertID: item.cover_only_id,
  })

  return (
    <ScrollArea className="w-full min-w-75 border-r bg-white p-5">
      <div className="space-y-6">
        {/* Display all Main Products */}
        {allMainProducts.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold tracking-wider text-gray-500 uppercase">
              Main Products
            </h3>
            <div className="space-y-1.5">
              {allMainProducts.map((item) => {
                const canvasPayload = transformItemForCanvas(item)
                const isSelected = activeMainProduct?.id === item.id

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedMainProductId(item.id)}
                    onDoubleClick={() =>
                      canvasRef.current?.addImageToCanvas(canvasPayload)
                    }
                    draggable
                    onDragStart={(e) =>
                      useMoodboardStore
                        .getState()
                        .handleDragStart(e, canvasPayload)
                    }
                    className={`group relative flex cursor-pointer items-center rounded-lg border p-2 transition-all ${
                      isSelected
                        ? "border-black/30 bg-slate-100/80 shadow-xs ring-1 ring-black/20"
                        : "border-transparent hover:border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="mr-3 h-14 w-14 shrink-0 rounded object-contain"
                    />
                    <div className="min-w-0 flex-1 pr-6">
                      <p className="line-clamp-2 text-sm leading-snug font-medium text-gray-800">
                        {item.name}
                      </p>
                      {isSelected && (
                        <span className="text-[10px] font-semibold text-primary/80 uppercase">
                          Selected
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={(e) => handleRemoveFavorite(e, item.id)}
                      variant="destructive"
                      size="icon"
                      className="absolute top-1/2 right-2 h-6 w-6 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
                      title="Remove from favorites"
                    >
                      ✕
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoadingRecs && (
          <div className="space-y-4 pt-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        )}

        {/* Display Goes Well With items for Active Product */}
        {!isLoadingRecs && dynamicGoesWellWith.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold tracking-wider text-gray-500 uppercase">
              Goes Well With
            </h3>
            <div className="space-y-1.5">
              {dynamicGoesWellWith.map((item, index) => {
                const canvasPayload = transformItemForCanvas(item)
                return (
                  <div
                    onDoubleClick={() =>
                      canvasRef.current?.addImageToCanvas(canvasPayload)
                    }
                    key={item.id || index}
                    draggable
                    onDragStart={(e) =>
                      useMoodboardStore
                        .getState()
                        .handleDragStart(e, canvasPayload)
                    }
                    className="flex cursor-grab items-center rounded-lg border border-transparent p-2 transition-colors hover:border-gray-200 hover:bg-gray-50"
                  >
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="mr-3 h-14 w-14 shrink-0 rounded object-contain"
                    />
                    <p className="line-clamp-2 text-sm leading-snug font-medium text-gray-700">
                      {item.name}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Display You May Also Like items for Active Product */}
        {!isLoadingRecs && dynamicYouMayAlsoLike.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold tracking-wider text-gray-500 uppercase">
              You May Also Like
            </h3>
            <div className="space-y-1.5">
              {dynamicYouMayAlsoLike.map((item, index) => {
                const canvasPayload = transformItemForCanvas(item)
                return (
                  <div
                    onDoubleClick={() =>
                      canvasRef.current?.addImageToCanvas(canvasPayload)
                    }
                    key={item.id || index}
                    draggable
                    onDragStart={(e) =>
                      useMoodboardStore
                        .getState()
                        .handleDragStart(e, canvasPayload)
                    }
                    className="flex cursor-grab items-center rounded-lg border border-transparent p-2 transition-colors hover:border-gray-200 hover:bg-gray-50"
                  >
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="mr-3 h-14 w-14 shrink-0 rounded object-contain"
                    />
                    <p className="line-clamp-2 text-sm leading-snug font-medium text-gray-700">
                      {item.name}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
