import { NextResponse } from "next/server"
import { mapShopifyProductToPillowItem, parseMetafieldValue, PillowItem } from "@/lib/types"

function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) return []

  const parseLine = (line: string): string[] => {
    const cells: string[] = []
    let current = ""
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === "," && !inQuotes) {
        cells.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }
    cells.push(current.trim())
    return cells
  }

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().trim())
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i])
    if (values.length < headers.length) continue
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ""
    })
    rows.push(row)
  }

  return rows
}

export async function GET() {
  const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_PILLOWS_URL

  if (!sheetUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_GOOGLE_SHEETS_PILLOWS_URL is not configured." },
      { status: 400 }
    )
  }

  try {
    const response = await fetch(sheetUrl, {
      next: { revalidate: 86400 }, // Cache for 24 hours
    })

    if (!response.ok) {
      throw new Error(`Google Sheets fetch error: ${response.statusText}`)
    }

    const csvText = await response.text()
    const rows = parseCSV(csvText)

    const pillows: PillowItem[] = rows.map((row, idx) => {
      const imageUrl =
        row.image_url && row.image_url.startsWith("http")
          ? row.image_url
          : row.transparent_image_url && row.transparent_image_url.startsWith("http")
            ? row.transparent_image_url
            : "/placeholder.svg"

      const transparentUrl =
        row.transparent_image_url && row.transparent_image_url.startsWith("http")
          ? row.transparent_image_url
          : undefined

      const title = row.name || "Custom Pillow"

      return {
        id: row.id ? String(row.id) : `google-sheet-${idx}`,
        name: title,
        image_url: imageUrl,
        transparent_image_url: transparentUrl,
        pillow_url: row.pillow_url || "#",
        with_insert_id: row.with_insert_id || undefined,
        cover_only_id: row.cover_only_id || undefined,
        is_online: true,
        category: "pillow",
        isGoogleSheet: true,
        pattern: undefined,
        colour: undefined,
        fabricMaterial: undefined,
      } as PillowItem & { isGoogleSheet: boolean }
    })

    return NextResponse.json({ pillows })
  } catch (error: any) {
    console.error("Error fetching Google Sheets pillows:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to fetch Google Sheets pillows" },
      { status: 500 }
    )
  }
}
