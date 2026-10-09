"use client";
import MainContent from "@/components/canvas/maincontent";
import Header from "@/components/header/header";
import SubHeader from "@/components/subheader/subheader";
import { useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CanvasRefActions, mapShopifyProductToPillowItem } from "@/lib/types";
import { fetchAllShopifyProducts } from "@/lib/shopify/client";
import useMoodboardStore from "@/lib/store/moodboardstore";

function HomeContent() {
  const canvasRef = useRef<CanvasRefActions>(null);
  const searchParams = useSearchParams();
  const productId = searchParams.get("product_id");

  const addSelectedItem = useMoodboardStore((state) => state.addSelectedItem);
  const setallPillowData = useMoodboardStore((state) => state.setallPillowData);

  useEffect(() => {
    if (!productId) return;

    // Normalize productId to ensure full GID format
    const formattedGid = productId.startsWith("gid://shopify/Product/")
      ? productId
      : `gid://shopify/Product/${productId.replace(/[^0-9]/g, "")}`;

    console.log("Formatted Product GID from URL:", formattedGid);

    const selectAndFavoriteProduct = (gid: string) => {
      const state = useMoodboardStore.getState();

      // 1. Add to selectedItemIds
      if (!state.selectedItemIds.includes(gid)) {
        state.addSelectedItem(gid);
      }

      // 2. Add to active moodboard selectedGalleryItems
      const activeMb = state.moodboards.find(
        (m) => m.id === state.activeMoodboardId,
      );
      if (activeMb && !activeMb.selectedGalleryItems.includes(gid)) {
        state.setSelectedGalleryItems([...activeMb.selectedGalleryItems, gid]);
      }

      // 3. Add to favoritePillows in Zustand store
      if (!state.favoritePillows.includes(gid)) {
        state.setFavoritePillows([...state.favoritePillows, gid]);
      }
    };

    const existingProduct = useMoodboardStore
      .getState()
      .allPillowData.find((p) => p.id === formattedGid);

    if (existingProduct) {
      selectAndFavoriteProduct(formattedGid);
      return;
    }

    // Fetch from Shopify if not found in local store
    const fetchAndSelect = async () => {
      try {
        // Query Shopify using numeric ID
        const numericId = formattedGid.replace(/[^0-9]/g, "");
        const query = `id:${numericId}`;

        const products = await fetchAllShopifyProducts(query);

        if (products && products.length > 0) {
          const mappedProduct = mapShopifyProductToPillowItem(products[0]);

          // Ensure mapped product uses formatted GID
          mappedProduct.id = formattedGid;

          // Merge fetched product into global data store
          const currentData = useMoodboardStore.getState().allPillowData;
          const mergedMap = new Map();
          currentData.forEach((item) => mergedMap.set(item.id, item));
          mergedMap.set(mappedProduct.id, mappedProduct);

          setallPillowData(Array.from(mergedMap.values()));
          selectAndFavoriteProduct(mappedProduct.id);
        } else {
          console.warn(`Product with ID ${formattedGid} not found in Shopify.`);
        }
      } catch (error) {
        console.error("Failed to fetch product from Shopify:", error);
      }
    };

    fetchAndSelect();
  }, [productId, addSelectedItem, setallPillowData]);

  return (
    <div className="flex h-screen w-screen flex-col">
      {/* Hide Header if product_id exists in URL */}
      {!productId && <Header />}
      <SubHeader />
      <MainContent ref={canvasRef} />
    </div>
  );
}

export default function Page() {
  return (
    // Suspense boundary is required by Next.js when using useSearchParams
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
