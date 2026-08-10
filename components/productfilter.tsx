"use client"

import React, { useMemo } from "react"
import { Filter, X, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import useMoodboardStore from "@/lib/store/moodboardstore"
import { PillowItem } from "@/lib/types"

export function ProductFilter() {
  const {
    allPillowData,
    filterPatterns,
    filterColours,
    filterMaterials,
    setFilterPatterns,
    setFilterColours,
    setFilterMaterials,
    clearCatalogFilters,
  } = useMoodboardStore()

  // Calculate unique Patterns, Colours, and Fabric Materials from fetched Shopify inventory
  const { availablePatterns, availableColours, availableMaterials } =
    useMemo(() => {
      const patternsSet = new Set<string>()
      const coloursSet = new Set<string>()
      const materialsSet = new Set<string>()

        ; (allPillowData || []).forEach((item: PillowItem) => {
          if (Array.isArray(item.pattern)) {
            item.pattern.forEach((p) => {
              if (p && typeof p === "string" && p.trim()) {
                patternsSet.add(p.trim())
              }
            })
          }
          if (Array.isArray(item.colour)) {
            item.colour.forEach((c) => {
              if (c && typeof c === "string" && c.trim()) {
                coloursSet.add(c.trim())
              }
            })
          }
          if (Array.isArray(item.fabricMaterial)) {
            item.fabricMaterial.forEach((m) => {
              if (m && typeof m === "string" && m.trim()) {
                materialsSet.add(m.trim())
              }
            })
          }
        })

      return {
        availablePatterns: Array.from(patternsSet).sort(),
        availableColours: Array.from(coloursSet).sort(),
        availableMaterials: Array.from(materialsSet).sort(),
      }
    }, [allPillowData])

  // Total count of active filter choices
  const totalActiveFilters =
    filterPatterns.length + filterColours.length + filterMaterials.length

  // Toggle helper for multi-select arrays
  const toggleSelection = (
    currentList: string[],
    value: string,
    updater: (next: string[]) => void
  ) => {
    if (currentList.includes(value)) {
      updater(currentList.filter((item) => item !== value))
    } else {
      updater([...currentList, value])
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="xs"
          className={cn(
            "p-4 rounded-xl border-muted-foreground/20  text-xs font-medium gap-2 transition-all shrink-0",
            totalActiveFilters > 0
              ? "border-primary bg-primary/5 text-primary hover:bg-primary/10"
              : "text-muted-foreground hover:bg-background hover:text-foreground"
          )}
        >
          <Filter className="h-4 w-4" />
          <span>Filter</span>
          {totalActiveFilters > 0 && (
            <Badge
              variant="default"
              className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px] font-bold"
            >
              {totalActiveFilters}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 rounded-2xl p-4 shadow-xl border"
        align="start"
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-2.5">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-foreground" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Pillows Filters
              </h4>
            </div>
            {totalActiveFilters > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCatalogFilters}
                className="h-auto p-0 text-[11px] text-muted-foreground hover:text-foreground gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Clear all
              </Button>
            )}
          </div>

          {/* Section: Patterns */}
          {availablePatterns.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Pattern ({availablePatterns.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {availablePatterns.map((pat) => {
                  const isSelected = filterPatterns.includes(pat)
                  return (
                    <Badge
                      key={pat}
                      onClick={() =>
                        toggleSelection(filterPatterns, pat, setFilterPatterns)
                      }
                      className={cn(
                        "cursor-pointer select-none rounded-lg px-2.5 py-1 text-xs font-normal transition-all",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-secondary/60 text-secondary-foreground hover:bg-secondary border border-border/50"
                      )}
                    >
                      {pat}
                      {isSelected && <X className="ml-1 h-3 w-3 inline" />}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}

          {/* Section: Colours */}
          {availableColours.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Colour ({availableColours.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {availableColours.map((col) => {
                  const isSelected = filterColours.includes(col)
                  return (
                    <Badge
                      key={col}
                      onClick={() =>
                        toggleSelection(filterColours, col, setFilterColours)
                      }
                      className={cn(
                        "cursor-pointer select-none rounded-lg px-2.5 py-1 text-xs font-normal transition-all",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-secondary/60 text-secondary-foreground hover:bg-secondary border border-border/50"
                      )}
                    >
                      {col}
                      {isSelected && <X className="ml-1 h-3 w-3 inline" />}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}

          {/* Section: Fabric Materials */}
          {availableMaterials.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Fabric Material ({availableMaterials.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {availableMaterials.map((mat) => {
                  const isSelected = filterMaterials.includes(mat)
                  return (
                    <Badge
                      key={mat}
                      onClick={() =>
                        toggleSelection(
                          filterMaterials,
                          mat,
                          setFilterMaterials
                        )
                      }
                      className={cn(
                        "cursor-pointer select-none rounded-lg px-2.5 py-1 text-xs font-normal transition-all",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-secondary/60 text-secondary-foreground hover:bg-secondary border border-border/50"
                      )}
                    >
                      {mat}
                      {isSelected && <X className="ml-1 h-3 w-3 inline" />}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}

          {/* Fallback if no metafields loaded yet */}
          {availablePatterns.length === 0 &&
            availableColours.length === 0 &&
            availableMaterials.length === 0 && (
              <p className="py-2 text-center text-xs text-muted-foreground">
                No filter attributes found for current items. Open selector to load inventory.
              </p>
            )}

          {/* Footer status */}
          <div className="border-t pt-2 text-[10px] text-muted-foreground flex justify-between items-center">
            <span>
              {totalActiveFilters === 0
                ? "No active filters"
                : `${totalActiveFilters} filter${totalActiveFilters > 1 ? "s" : ""
                } active`}
            </span>
            {totalActiveFilters > 0 && (
              <span className="font-mono text-primary">Filtering list...</span>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
