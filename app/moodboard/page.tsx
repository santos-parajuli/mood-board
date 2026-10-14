"use client";

import MainContent from "@/components/canvas/maincontent";
import Header from "@/components/header/header";
import SubHeader from "@/components/subheader/subheader";
import { useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  CanvasRefActions,
  mapShopifyProductToPillowItem,
  PillowItem,
} from "@/lib/types";
import { fetchAllShopifyProducts } from "@/lib/shopify/client";
import useMoodboardStore from "@/lib/store/moodboardstore";

function HomeContent() {
  const canvasRef = useRef<CanvasRefActions>(null);
  const searchParams = useSearchParams();

  // Support both the original single-product parameter
  // and the new comma-separated multiple-product parameter.
  const productId = searchParams.get("product_id");
  const productIdsParam = searchParams.get("product_ids");

  // Normalize IDs to Shopify Product GIDs and remove duplicates.
  const productIds = Array.from(
    new Set(
      [
        ...(productIdsParam ? productIdsParam.split(",") : []),
        ...(productId ? [productId] : []),
      ]
        .map((id) => id.trim())
        .filter(Boolean)
        .map((id) => {
          const numericId = id.replace(/[^0-9]/g, "");

          return numericId ? `gid://shopify/Product/${numericId}` : "";
        })
        .filter(Boolean),
    ),
  );

  // Avoid processing the same URL twice in React Strict Mode.
  const hasProcessed = useRef(false);

  const setallPillowData = useMoodboardStore((state) => state.setallPillowData);

  useEffect(() => {
    if (productIds.length === 0 || hasProcessed.current) {
      return;
    }

    hasProcessed.current = true;

    const fetchAndSelectProducts = async () => {
      try {
        // Start with products already loaded in the store.
        const existingProducts = useMoodboardStore.getState().allPillowData;

        const productMap = new Map<string, PillowItem>(
          existingProducts.map((product) => [product.id, product]),
        );

        // Fetch any requested products that are not loaded yet.
        await Promise.all(
          productIds.map(async (gid) => {
            if (productMap.has(gid)) {
              return;
            }

            try {
              const numericId = gid.replace(/[^0-9]/g, "");
              const products = await fetchAllShopifyProducts(`id:${numericId}`);

              if (products && products.length > 0) {
                const mappedProduct = mapShopifyProductToPillowItem(
                  products[0],
                );

                // Keep the ID consistent with the requested Shopify GID.
                mappedProduct.id = gid;

                productMap.set(gid, mappedProduct);
              } else {
                console.warn(
                  `Product with ID ${gid} was not found in Shopify.`,
                );
              }
            } catch (error) {
              console.error(`Failed to fetch product ${gid}:`, error);
            }
          }),
        );

        // Merge all loaded products into the global product store.
        const allProducts = Array.from(productMap.values());
        setallPillowData(allProducts);

        // Preserve the order of IDs from the URL.
        const resolvedProducts = productIds
          .map((gid) => productMap.get(gid))
          .filter((product): product is PillowItem => product !== undefined);

        // Add products to favorites and the active moodboard.
        for (const product of resolvedProducts) {
          const state = useMoodboardStore.getState();

          if (!state.favoritePillows.includes(product.id)) {
            state.setFavoritePillows([...state.favoritePillows, product.id]);
          }

          const activeMoodboard = state.moodboards.find(
            (moodboard) => moodboard.id === state.activeMoodboardId,
          );

          if (
            activeMoodboard &&
            !activeMoodboard.selectedGalleryItems.includes(product.id)
          ) {
            state.setSelectedGalleryItems([
              ...activeMoodboard.selectedGalleryItems,
              product.id,
            ]);
          }
        }

        // Add each product to the canvas, with staggered positions.
        resolvedProducts.forEach((product, index) => {
          const canvasElement = document.getElementById("canvasDiv");

          let dropPosition: { x: number; y: number } | undefined;

          if (canvasElement) {
            const rect = canvasElement.getBoundingClientRect();

            dropPosition = {
              x: rect.left + rect.width / 10 + index * 25,
              y: rect.top + rect.height / 6 + index * 25,
            };
          }

          canvasRef.current?.addImageToCanvas(
            {
              image: product.image_url,
              transparentImageUrl: product.transparent_image_url,
              title: product.name,
              url: product.pillow_url,
              withInsertID: product.with_insert_id,
              withoutInsertID: product.cover_only_id,
            },
            dropPosition,
          );
        });
      } catch (error) {
        console.error("Failed to process moodboard products:", error);
      }
    };

    void fetchAndSelectProducts();
  }, [productIds.join(","), setallPillowData]);

  const hasProductParameters = productIds.length > 0;

  return (
    <div className="flex h-screen w-screen flex-col">
      {/* Hide the header when products are passed through the URL. */}
      {!hasProductParameters && <Header />}

      <SubHeader />

      <MainContent ref={canvasRef} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
