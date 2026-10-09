export const SHOPIFY_GRAPHQL_PRODUCTS_QUERY = `query GetProducts($first: Int = 250, $after: String, $query: String = "status:active") {
  products(
    first: $first
    after: $after
    query: $query
    sortKey: TITLE
  ) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      id
      title
      tags
      onlineStoreUrl
      pattern: metafield(namespace: "custom", key: "pattern") {
        value
      }
      colour: metafield(namespace: "custom", key: "colour") {
        value
      }
      FabricMaterial: metafield(namespace: "custom", key: "fabric_material") {
        value
      }
      transparentImage: metafield(namespace: "custom", key: "transparent_image") {
        reference {
          ... on MediaImage {
            image {
              url(transform: { maxWidth: 500 })
            }
          }
        }
      }
      featuredImage {
        url
        altText
      }
      variants(first: 10) {
        nodes {
          id
          title
        }
      }
    }
  }
}`;
export const SHOPIFY_RECOMMENDATIONS_QUERY = `
  query GetProductRecommendations($productId: ID!, $intent: ProductRecommendationIntent = RELATED) {
    productRecommendations(productId: $productId, intent: $intent) {
      id
      title
      handle
      availableForSale
      onlineStoreUrl
      transparentImage: metafield(namespace: "custom", key: "transparent_image") {
        reference {
          ... on MediaImage {
            image {
              url
              altText
            }
          }
        }
      }
      featuredImage {
        url
        altText
      }
      variants(first: 5) {
        nodes {
          id
          title
          availableForSale
        }
      }
    }
  }
`;

export async function shopifyFetch<T = any>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || "";
  const token = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN || "";

  if (!domain || !token) {
    console.warn(
      "Shopify domain or storefront token is missing in environment variables.",
    );
  }

  const endpoint = `https://${domain}/api/2026-07/graphql.json`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(
      `Shopify Storefront API error: ${res.status} ${res.statusText}`,
    );
  }

  const json = await res.json();
  if (json.errors) {
    console.log("Shopify GraphQL errors:", json);
    throw new Error(`Shopify GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

/**
 * Fetches ALL products from Shopify by paginating automatically through all pages.
 */
export async function fetchAllShopifyProducts(
  filterQuery?: string,
): Promise<any[]> {
  let allProducts: any[] = [];
  let hasNextPage = true;
  let endCursor: string | null = null;

  while (hasNextPage) {
    const data: any = await shopifyFetch(SHOPIFY_GRAPHQL_PRODUCTS_QUERY, {
      first: 250,
      after: endCursor,
      query: filterQuery,
    });

    const productNodes = data?.products?.nodes || [];
    allProducts = [...allProducts, ...productNodes];

    const pageInfo: any = data?.products?.pageInfo;
    hasNextPage = pageInfo?.hasNextPage || false;
    endCursor = pageInfo?.endCursor || null;
  }

  return allProducts;
}

/**
 * Fetches a single product from Shopify by its ID or GID string using shopifyFetch.
 */
export async function fetchShopifyProductById(id: string): Promise<any | null> {
  if (!id || !id.trim()) return null;

  // 1. Extract purely the numeric ID (e.g., "gid://shopify/Product/8123456789" -> "8123456789")
  const numericId = id.replace(/[^0-9]/g, "");
  if (!numericId) return null;

  try {
    // 2. Query Shopify products filtering specifically by numeric ID
    const data: any = await shopifyFetch(SHOPIFY_GRAPHQL_PRODUCTS_QUERY, {
      first: 1,
      query: `id:${numericId}`,
    });

    const products = data?.products?.nodes || [];
    return products[0] || null;
  } catch (err) {
    console.error(`Error fetching Shopify product by ID (${id}):`, err);
    return null;
  }
}
