<div align="center">

# 🛋 Tonic Living Pillow Mood Board

**Design, arrange, and export beautiful pillow combinations for your space.**

An interactive canvas-based mood board builder that lets customers of **Tonic Living**
drag and drop real catalog pillows onto a photo of their room, style them, and
export a shareable PDF — complete with a clickable product index.

</div>

---

## ✨ Features

### 🎨 Interactive Canvas Editor
- **Drag, resize & layer** catalog pillows on top of a photo of your own space
- **Drag-and-drop** images straight from the gallery or upload your own
- **Text overlays** — add freeform labels with adjustable font size, weight & colour
- **Group / ungroup** items so they move and scale together
- **Bring to front / send to back** for full layer control
- **Undo / Redo** across the whole history
- **Visual cropping** and **one-click background removal**
- **Duplicate, reset size & delete** per element

### 🛍 Real Product Catalog
- Syncs live inventory from the **Shopify Storefront GraphQL API** (auto-paginated)
- Product categories auto-detected: **pillow, ottoman, throw/blanket, fabric, hardware**
- Rich **metafield** attributes: pattern, colour, fabric material, transparent cut-out image
- **Filters** by pattern, colour and material
- **"Goes well with"** recommendations fetched per product
- Google Sheets CSV fallback feed for custom pillows

### 📝 Personalised Onboarding
- 3-step guided wizard: **Moodboard Basics → Comfort Style → Your Space**
- Upload a photo of your room, pick your favourite pillows, region & colour/fabric/pattern preferences
- Curation preferences seed the workspace catalogue

### 📄 Professional PDF Export
- High-quality multi-page PDF, one page per mood board
- Auto-fitted layout with **adaptive image scaling & compression**
- **Clickable product index** with thumbnails that deep-link back to the store
- Branded footer with **region-aware** store URLs (`.ca` / `.com`), contact details & social icons

### ⚙️ Robustness
- Client-side image optimisation (downscale + transparent-padding auto-crop) before API calls
- Region toggle (Canada / US) that rewires store links and currency context

---

## 🧱 Tech Stack

| Layer        | Technology |
|--------------|------------|
| Framework    | [Next.js 16](https://nextjs.org/) (App Router, React 19) |
| Language     | TypeScript (strict) |
| Styling      | Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com/) (`radix-lyra` style) |
| Motion       | Framer Motion |
| State        | Zustand (mood board & canvas stores) |
| Drag & Resize| react-draggable, react-resizable |
| E-commerce   | Shopify Storefront GraphQL API |
| Image ops    | `sharp` (server-side), Canvas 2D (client-side) |
| PDF export   | jsPDF |
| Icons        | lucide-react, @hugeicons/react |

---

## 📁 Project Structure

```
app/
├── api/
│   ├── custom-pillows/route.ts   # Google Sheets CSV → pillow feed
│   └── removebg/route.ts         # sharp-based white removal → transparent PNG
├── layout.tsx                    # Global layout + SEO/OG metadata
├── page.tsx                      # Home page
├── onboarding/page.tsx           # 3-step onboarding wizard
└── moodboard/page.tsx            # Workspace (Header + SubHeader + Canvas)

components/
├── canvas/                       # Canvas editor core
│   ├── canvas.tsx                # Imperative canvas shell (addImage, removeBG)
│   ├── draggableimage.tsx        # Movable/resizable image element
│   ├── draggabletext.tsx         # Movable text element
│   ├── gallery.tsx               # Product gallery + recommendations
│   ├── visualcropper.tsx         # Crop tool
│   └── maincontent.tsx           # Canvas mounting point
├── header/                       # Toolbar: logo, region badge, settings, download
│   ├── header.tsx
│   ├── settings.tsx
│   ├── downloadbutton.tsx        # jsPDF export
│   └── deletemoodboarddialog.tsx
├── subheader/                    # Editing toolbar (undo/redo, layers, text, removeBG…)
├── onboarding/                   # Slideshow + progress steps
├── pillowselector.tsx            # Favourites picker (command palette)
├── productfilter.tsx             # Pattern / colour / material filters
└── ui/                           # shadcn/ui primitives

lib/
├── shopify/client.ts             # Storefront GraphQL queries & pagination
├── store/
│   ├── moodboardstore.ts         # Mood boards, canvas items, filters, preferences
│   └── canvasStore.ts            # Shared canvas ref
├── utils/
│   ├── imageOptimizer.ts         # Downscale + transparent auto-crop
│   └── utils.ts                  # `cn()` helper
└── types.ts                      # Shared interfaces & Shopify→PillowItem mapper

public/                           # Fonts, logos, social icons, placeholder art

.env.local                        # Shopify creds, Google Sheets URL (never commit)
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18.18+ (Next.js 16 requirement)
- A Shopify store with the **Storefront API** enabled
- A Google Sheet for custom pillows (optional, publish-as-CSV)

### 1. Install
```bash
npm install
```

### 2. Environment variables
Create a `.env.local` file in the project root:

```env
# Shopify Storefront API (store domain + access token)
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_token

# (Optional) Google Sheets CSV feed for custom pillows
NEXT_PUBLIC_GOOGLE_SHEETS_PILLOWS_URL=...published_csv_url...
```

> Generate a Storefront access token from **Shopify Admin → Settings → Apps →
> Custom app development → Storefront API access scopes**.

### 3. Run the dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). From the home page you can
launch the **onboarding wizard** before entering the mood board workspace.

---

## 📜 Available Scripts

| Command               | Description                          |
|-----------------------|--------------------------------------|
| `npm run dev`         | Start the Next.js dev server         |
| `npm run build`       | Production build                     |
| `npm run start`       | Serve the production build           |
| `npm run lint`        | Lint with ESLint                     |
| `npm run format`      | Format all TS/TSX with Prettier      |
| `npm run typecheck`   | Type-check with `tsc --noEmit`       |

---

## 🔌 How the Pieces Connect

1. **Catalog sync** — On load, the client fetches all active products from the
   Shopify Storefront API via [lib/shopify/client.ts](lib/shopify/client.ts)
   (auto-paginated, 250 at a time) and maps each product to a `PillowItem`
   ([lib/types.ts](lib/types.ts)), inferring its category and parsing metafields
   for pattern, colour and material.
2. **Onboarding** — The user completes the wizard, selecting favourite pillows
   (`favoritePillows`), uploading a space photo, picking a region and design
   preferences. These feed the Zustand mood board store.
3. **Workspace** — The gallery shows selected main products plus “goes well with”
   recommendations. Dragging an item onto the canvas calls `addImageToCanvas`
   through the canvas ref ([components/canvas/canvas.tsx](components/canvas/canvas.tsx)).
4. **Background removal** — For uploaded photos, the client downscales the image,
   then calls `/api/removebg`, which uses `sharp` to detect white backgrounds,
   trim transparent padding, and return a cropped transparent PNG.
5. **Custom pillows** — `/api/custom-pillows` parses a published Google Sheets CSV
   (24h cache) into additional `PillowItem`s.
6. **Export** — [downloadbutton.tsx](components/header/downloadbutton.tsx) renders
   the mood boards into a jsPDF document: images auto-scaled to fit, a clickable
   product index with thumbnails, and a branded footer.

---

## 🧮 API Routes

### `POST /api/removebg`
Removes a white background from an image.

**Request**
```json
{ "imageUrl": "https://…", "mode": "auto", "padding": 20 }
```
- `mode`: `auto` (dynamic threshold) or `manual`
- `padding`: transparent border size around the subject (default `20`)

**Response**: an `image/png` with the background removed and the subject centred
on a transparent square canvas.

### `GET /api/custom-pillows`
Fetches and parses the Google Sheets custom-pillow feed (CSV). Returns
`{ "pillows": PillowItem[] }`. Cached for 24 hours via `revalidate`.

---

## 🧪 SEO & Metadata

[app/layout.tsx](app/layout.tsx) ships rich `metadata` including `openGraph`,
a canonical `metadataBase` (`https://moodboard.siwani.com.np`), robots rules and
keywords — plus Facebook, Instagram and Pinterest links baked into the exported
PDF footer for social sharing.

---

## 📌 Roadmap Ideas
- Persist mood boards to a backend / user accounts
- Generate a shareable web URL per mood board
- Additional export formats (PNG, JPG)
- On-canvas text styling panel & more clipart/library assets

---

## 📄 License
Private / proprietary — part of the **Tonic Living** e-commerce experience.
