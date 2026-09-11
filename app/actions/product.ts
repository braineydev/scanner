"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hasValidSupabaseConfig =
  typeof supabaseUrl === "string" &&
  /^https?:\/\//.test(supabaseUrl) &&
  typeof supabaseKey === "string" &&
  supabaseKey.length > 0;

const supabase = hasValidSupabaseConfig
  ? createClient(supabaseUrl, supabaseKey)
  : null;

type ProductInput = {
  barcode: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  price: string;
  stock: string;
  imageUrl?: string;
};

const MAX_BARCODE_LENGTH = 128;
const MAX_TEXT_LENGTH = 500;

function normalizeBarcode(value: string) {
  // Scanners and labels sometimes include spaces or hyphens in EAN/UPC values.
  // Store and look up one canonical value so a scan and a typed value match.
  return value.trim().replace(/[\s-]+/g, "");
}

function validateProductInput(product: ProductInput) {
  const barcode = normalizeBarcode(product.barcode);
  const name = product.name.trim();
  const price = Number(product.price);
  const stock = Number(product.stock);
  const imageUrl = (product.imageUrl || "").trim();

  if (!barcode || barcode.length > MAX_BARCODE_LENGTH) {
    return { error: "Enter a barcode of no more than 128 characters." };
  }

  if (!name || name.length > 255) {
    return { error: "Enter a product name of no more than 255 characters." };
  }

  if (!Number.isFinite(price) || price < 0 || price > 1_000_000_000) {
    return { error: "Enter a valid non-negative selling price." };
  }

  if (!Number.isSafeInteger(stock) || stock < 0) {
    return { error: "Stock quantity must be a non-negative whole number." };
  }

  const textFields = [product.brand, product.category, product.description];
  if (textFields.some(value => value.trim().length > MAX_TEXT_LENGTH)) {
    return {
      error:
        "Brand, category, and description must be 500 characters or fewer.",
    };
  }

  if (imageUrl && (imageUrl.length > 2048 || !/^https?:\/\//.test(imageUrl))) {
    return { error: "The product image URL must be a valid http(s) link." };
  }

  return {
    data: {
      barcode,
      name,
      brand: product.brand.trim(),
      category: product.category.trim(),
      description: product.description.trim(),
      price,
      stock,
      imageUrl: imageUrl || null,
    },
  };
}

type OnlineProduct = {
  barcode: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  image_url: string | null;
};

const firstText = (...values: unknown[]) =>
  values
    .find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    )
    ?.trim() || "";

const productFromTitle = (barcode: string, title: string): OnlineProduct => {
  const name = title.replace(/\s+/g, " ").trim();
  const brand = name.split(" ")[0]
    ? `${name.split(" ")[0][0]}${name.split(" ")[0].slice(1).toLowerCase()}`
    : "";
  const category = /detergent|washing powder|laundry|soap/i.test(name)
    ? "Detergent"
    : /beverage|juice|soda|drink/i.test(name)
      ? "Beverages"
      : /food|rice|flour|bread|snack/i.test(name)
        ? "Food"
        : "";

  return {
    barcode,
    name,
    brand,
    category,
    description: category
      ? `${name}. ${category} product identified from its barcode.`
      : `${name}. Product identified from its barcode.`,
    image_url: null,
  };
};

// Enhanced internet search for products (like Google Lens)
async function searchInternetForProduct(
  barcode: string,
  query: string,
): Promise<OnlineProduct | null> {
  try {
    const cleanBarcode = barcode.trim().replace(/\s+/g, "");
    console.log(
      `[Search] Starting internet search for barcode: "${cleanBarcode}"`,
    );

    // Strategy 1: Try barcode-specific databases first (most reliable)
    console.log(
      `[Search Strategy] Trying barcode-specific sources for "${cleanBarcode}"...`,
    );

    const barcodeResult = await searchBarcodeDatabase(cleanBarcode);
    if (barcodeResult?.name) {
      console.log(`[Success] Found via barcode database:`, barcodeResult.name);
      return barcodeResult;
    }

    // Strategy 2: Try direct product name searches (multiple variations)
    console.log(`[Search Strategy] Trying product search...`);
    
    // Fallback: Just return null since Google/Bing HTML scraping won't work
    // (Google results are JavaScript-rendered, not available via plain fetch)
    console.log(`[Search] Skipping Google/Bing search (JavaScript-rendered, not available)`);
    
    console.log(`[Search Complete] No results found from any source`);
    return null;
  } catch (error) {
    console.error("[Search Error] Internet search failed:", error);
    return null;
  }
}

// Search barcode-specific databases
async function searchBarcodeDatabase(
  barcode: string,
): Promise<OnlineProduct | null> {
  try {
    console.log(`[Barcode DB] Searching for barcode: ${barcode}`);

    // UPCitemdb is a structured API, so prefer it to scraping an HTML page.
    // Its trial endpoint is rate-limited, hence it is one source, not the only
    // source on which a lookup depends.
    try {
      const response = await fetch(
        `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`,
        {
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
          headers: { Accept: "application/json" },
        },
      );
      if (response.ok) {
        const payload = await response.json();
        const item = Array.isArray(payload.items) ? payload.items[0] : null;
        const name = firstText(item?.title);
        if (name) {
          return {
            barcode,
            name,
            brand: firstText(item.brand),
            category: firstText(item.category),
            description: firstText(item.description, name),
            image_url: firstText(item?.images?.[0]) || null,
          };
        }
      }
    } catch (error) {
      console.warn("[UPCitemdb] Lookup unavailable:", error);
    }

    // Try barcode-list.com first (most reliable for this use case)
    try {
      const url = `https://www.barcode-list.com/barcode/EN/barcode-${barcode}/Search.htm`;
      console.log(`[Barcode DB] Fetching from barcode-list.com...`);

      const response = await fetch(url, {
        // HTML catalogues can be slower than JSON APIs; allow enough time for
        // the fallback that supplies Kenyan retail barcodes such as this one.
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html",
          "Accept-Encoding": "gzip, deflate",
        },
      });

      console.log(`[Barcode DB] Response status: ${response.status}`);

      if (response.ok) {
        const html = await response.text();
        console.log(`[Barcode DB] Received ${html.length} bytes`);

        // Look for the pattern: "This code meet the following products: *PRODUCT NAME*"
        const patterns = [
          // Direct pattern with asterisks
          /This code meet the following products:\s*\*([^*]+)\*/,
          // Pattern without asterisks  
          /This code meet the following products:\s*([^<\n]+)/,
          // Any text containing product-like keywords
          /(?:Vaseline|VASELINE)[^\n<]*/i,
          // Text between specific tags
          /<strong[^>]*>([^<]+Vaseline[^<]*)<\/strong>/i,
          // Generic fallback for pages which expose the item in an HTML title.
          /<title[^>]*>\s*([^<|–-]{4,}?)\s*(?:\||–|-)\s*Barcode/i,
        ];

        for (const pattern of patterns) {
          const match = html.match(pattern);
          if (match && match[1]) {
            const productText = match[1].trim()
              .replace(/^[\*\s]+/, "")
              .replace(/[\*\s]+$/, "")
              .replace(/;.*/,  "")
              .trim();

            if (productText && productText.length > 3) {
              console.log(`[Barcode DB] Found: "${productText}"`);

              const extracted = parseProductFromText(
                barcode,
                productText,
                productText,
              );
              if (extracted?.name && extracted.name.length > 3) {
                console.log(`[Barcode DB] Extracted: "${extracted.name}"`);
                return extracted;
              }
            }
          }
        }

        console.log(`[Barcode DB] No patterns matched`);
      } else {
        console.log(`[Barcode DB] HTTP ${response.status}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`[Barcode DB] Fetch error: ${msg}`);
    }

    console.log(`[Barcode DB] No results`);
  } catch (error) {
    console.error(`[Barcode DB] Error:`, error);
  }

  return null;
}

// Improved search with retry and better error handling
async function searchWithRetry(
  query: string,
  searchEngine: "google" | "bing",
  retries: number = 2,
): Promise<OnlineProduct | null> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (attempt > 0) {
        // Add exponential backoff for retries
        await new Promise(resolve =>
          setTimeout(resolve, 500 * Math.pow(2, attempt - 1)),
        );
        console.debug(
          `[Retry ${attempt}/${retries - 1}] Retrying ${searchEngine} search...`,
        );
      }

      let result: OnlineProduct | null = null;

      if (searchEngine === "google") {
        result = await searchGoogle(query);
      } else {
        result = await searchBing(query);
      }

      if (result?.name) {
        return result;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.debug(
        `[${searchEngine}] Attempt ${attempt + 1}/${retries} failed:`,
        lastError.message,
      );
    }
  }

  return null;
}

// Search using Google with better HTML parsing
async function searchGoogle(query: string): Promise<OnlineProduct | null> {
  try {
    console.debug(`[Google] Searching for: "${query}"`);

    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    const response = await fetch(searchUrl, {
      signal: AbortSignal.timeout(6000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    if (!response.ok) {
      console.debug(`[Google] HTTP ${response.status}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.debug(`[Google] Got response (${html.length} bytes)`);

    // Try multiple extraction strategies
    let product = extractProductFromHTML(null, html, query); // Try OpenGraph
    if (!product?.name) {
      console.debug(`[Google] OpenGraph extraction failed, trying snippets...`);
      product = extractFromGoogleSnippets(html, query); // Try search snippets
    }
    if (!product?.name) {
      console.debug(
        `[Google] Snippet extraction failed, trying structured data...`,
      );
      product = extractFromSchemaOrg(html, query); // Try structured data
    }

    if (product?.name) {
      console.debug(`[Google] Extracted: "${product.name}"`);
      return product;
    }

    console.debug(`[Google] No extraction succeeded`);
    return null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.debug(`[Google] Error:`, msg);
    throw error;
  }
}

// Search using Bing (often less restrictive than Google)
async function searchBing(query: string): Promise<OnlineProduct | null> {
  try {
    console.debug(`[Bing] Searching for: "${query}"`);

    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

    const response = await fetch(searchUrl, {
      signal: AbortSignal.timeout(6000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const product = extractFromBingSnippets(html, query);

    if (product?.name) {
      console.debug(`[Bing] Extracted:`, product.name);
      return product;
    }

    return null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.debug(`[Bing] Search error:`, msg);
    throw error;
  }
}

// Extract from Google search result snippets
function extractFromGoogleSnippets(
  html: string,
  query: string,
): OnlineProduct | null {
  try {
    // Google typically has snippets in divs with class="VwiC3b" or similar
    // Look for the first real result (not ads)
    const snippetMatch = html.match(
      /<h3[^>]*>(?:<a[^>]*>)?([^<]+)(?:<\/a>)?<\/h3>[\s\S]{0,500}?<span[^>]*>([^<]+)<\/span>/i,
    );

    if (snippetMatch) {
      const title = snippetMatch[1].trim();
      const snippet = snippetMatch[2].trim();

      if (title && title.length > 5) {
        return parseProductFromText(query, snippet || title, title);
      }
    }

    // Fallback: look for any title-like content
    const titleMatch = html.match(/<h3[^>]*><a[^>]*>([^<]+)<\/a><\/h3>/);
    if (titleMatch) {
      const title = titleMatch[1].trim();
      return parseProductFromText(query, title, title);
    }
  } catch (error) {
    console.debug("[Google Snippets] Extraction failed:", error);
  }

  return null;
}

// Extract from Bing search result snippets
function extractFromBingSnippets(
  html: string,
  query: string,
): OnlineProduct | null {
  try {
    // Bing results typically have title in <h2> or <a> tags
    const resultMatch = html.match(
      /<h2><a[^>]*href="[^"]*"[^>]*>([^<]+)<\/a><\/h2>[\s\S]{0,300}?<p>([^<]+)<\/p>/i,
    );

    if (resultMatch) {
      const title = resultMatch[1].trim();
      const snippet = resultMatch[2].trim();

      if (title && title.length > 5) {
        return parseProductFromText(query, snippet || title, title);
      }
    }

    // Fallback: simpler pattern
    const titleMatch = html.match(/<h2><a[^>]*>([^<]+)<\/a><\/h2>/);
    if (titleMatch) {
      const title = titleMatch[1].trim();
      return parseProductFromText(query, title, title);
    }
  } catch (error) {
    console.debug("[Bing Snippets] Extraction failed:", error);
  }

  return null;
}

// Extract from Schema.org structured data
function extractFromSchemaOrg(
  html: string,
  query: string,
): OnlineProduct | null {
  try {
    // Look for JSON-LD structured data
    const jsonLdMatch = html.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i,
    );

    if (jsonLdMatch) {
      const jsonData = JSON.parse(jsonLdMatch[1]);

      if (jsonData.name && jsonData.name.length > 0) {
        return {
          barcode: query,
          name: jsonData.name.substring(0, 255),
          brand: jsonData.brand?.name || jsonData.manufacturer?.name || "",
          category: jsonData.category || "",
          description: jsonData.description || "",
          image_url: jsonData.image?.[0] || jsonData.image || null,
        };
      }
    }
  } catch (error) {
    console.debug("[Schema.org] Extraction failed:", error);
  }

  return null;
}

// Parse product details from search result text
function parseProductFromText(
  barcode: string,
  text: string,
  originalQuery: string,
): OnlineProduct | null {
  try {
    // Extract structured information from abstract/snippet
    let name = text?.trim() || originalQuery?.trim() || "";

    if (!name || name.length < 3) {
      console.debug(`[Parse] Name too short or empty: "${name}"`);
      return null;
    }

    // Clean up the name (remove extra whitespace, special chars)
    name = name
      .replace(/\s+/g, " ")
      .replace(/^[\*\-\s]+/, "")
      .replace(/[\*\-\s]+$/, "")
      .trim()
      .substring(0, 255);

    console.debug(`[Parse] Cleaned name: "${name}"`);

    // Try to identify brand (first word often is, or look for brand keywords)
    const words = name.split(/\s+/);
    let brand = "";

    if (words[0]?.length > 2) {
      brand = words[0];
    } else if (words[1]?.length > 2) {
      brand = words[1];
    }

    // Common brand patterns
    const brandPatterns =
      /^(Vaseline|Johnson|Dove|Cetaphil|Nivea|CeraVe|Neutrogena)/i;
    const brandMatch = name.match(brandPatterns);
    if (brandMatch) {
      brand = brandMatch[1];
    }

    // Categorize based on keywords in text
    const category = identifyCategory(text + " " + name);

    console.debug(
      `[Parse] Extracted: name="${name}", brand="${brand}", category="${category}"`,
    );

    return {
      barcode,
      name,
      brand: brand.substring(0, 100),
      category,
      description: text.substring(0, MAX_TEXT_LENGTH),
      image_url: null,
    };
  } catch (error) {
    console.error("[Parse Error]:", error);
    return null;
  }
}

// Extract product info from HTML using regex patterns
function extractProductFromHTML(
  barcode: string | null,
  html: string,
  query: string,
): OnlineProduct | null {
  try {
    // Look for Open Graph meta tags (most sites have these)
    const titleMatch = html.match(
      /<meta\s+property="og:title"\s+content="([^"]+)"/i,
    );
    const descMatch = html.match(
      /<meta\s+property="og:description"\s+content="([^"]+)"/i,
    );
    const imageMatch = html.match(
      /<meta\s+property="og:image"\s+content="([^"]+)"/i,
    );

    // Fallback to title tag
    const title =
      titleMatch?.[1] || html.match(/<title>([^<]+)<\/title>/i)?.[1] || query;
    const description = descMatch?.[1] || "";
    const image_url = imageMatch?.[1] || null;

    if (!title) return null;

    // Clean up title (remove website name if present)
    const cleanTitle = title
      .replace(/\s*[\|\-]\s*(Amazon|eBay|Alibaba|Google|Wikipedia).*$/i, "")
      .replace(/\s*-\s*$/, "")
      .trim();

    const words = cleanTitle.split(/\s+/);
    const brand = words[0]?.length > 2 ? words[0] : words[1] || "";
    const category = identifyCategory(cleanTitle + " " + description);

    return {
      barcode: barcode || query,
      name: cleanTitle.substring(0, 255),
      brand: brand.substring(0, 100),
      category,
      description: description.substring(0, MAX_TEXT_LENGTH),
      image_url: image_url?.startsWith("http") ? image_url : null,
    };
  } catch (error) {
    console.error("HTML extraction error:", error);
    return null;
  }
}

// Intelligent category detection
function identifyCategory(text: string): string {
  const lowText = text.toLowerCase();

  const categories: [string, string[]][] = [
    [
      "Detergent",
      [
        "detergent",
        "washing powder",
        "laundry",
        "soap",
        "cleaning",
        "dishwash",
      ],
    ],
    [
      "Beverages",
      [
        "beverage",
        "juice",
        "soda",
        "drink",
        "water",
        "coffee",
        "tea",
        "energy drink",
      ],
    ],
    [
      "Food",
      [
        "food",
        "rice",
        "flour",
        "bread",
        "snack",
        "cereal",
        "pasta",
        "cooking oil",
      ],
    ],
    [
      "Health & Beauty",
      [
        "cosmetic",
        "shampoo",
        "conditioner",
        "lotion",
        "skincare",
        "toothpaste",
        "deodorant",
        "vaseline",
        "body lotion",
        "moisturizer",
        "cream",
        "perfume",
        "fragrance",
        "makeup",
      ],
    ],
    [
      "Electronics",
      ["phone", "charger", "headphone", "cable", "battery", "usb", "adapter"],
    ],
    [
      "Clothing",
      ["shirt", "pants", "dress", "jacket", "shoe", "sock", "apparel"],
    ],
    [
      "Home & Kitchen",
      [
        "kitchen",
        "cookware",
        "utensil",
        "plate",
        "cup",
        "furniture",
        "bedding",
      ],
    ],
  ];

  for (const [cat, keywords] of categories) {
    if (keywords.some(kw => lowText.includes(kw))) {
      return cat;
    }
  }

  return "";
}

/**
 * Open Food Facts returns 404 for an unknown code on some mirrors. That is a
 * normal "not found" result, not a reason to abandon the remaining sources.
 * Open Beauty Facts covers cosmetic and personal-care products that are often
 * absent from the food catalogue.
 */
async function lookupOpenFacts(
  barcode: string,
  host: "world.openfoodfacts.org" | "world.openbeautyfacts.org",
): Promise<OnlineProduct | null> {
  try {
    const response = await fetch(
      `https://${host}/api/v2/product/${encodeURIComponent(barcode)}.json`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent": "ScannerInventoryApp/1.0 (barcode product lookup)",
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      console.info(`[${host}] Barcode ${barcode} was not available (${response.status}).`);
      return null;
    }

    const externalData = await response.json();
    if (externalData.status !== 1 || !externalData.product) return null;

    const p = externalData.product;
    const firstTag = (tags: unknown) =>
      Array.isArray(tags)
        ? firstText(tags[0])?.replace(/^[a-z]{2}:/i, "")
        : "";
    const name = firstText(p.product_name, p.product_name_en, p.generic_name);
    if (!name) return null;

    return {
      barcode,
      name,
      brand: firstText(p.brands, firstTag(p.brands_tags)),
      category: firstText(
        typeof p.categories === "string" ? p.categories.split(",")[0] : "",
        firstTag(p.categories_tags),
      ),
      description: firstText(p.ingredients_text, p.generic_name),
      image_url: firstText(p.image_url) || null,
    };
  } catch (error) {
    // A provider outage must not prevent the next provider from being tried.
    console.warn(`[${host}] Lookup unavailable:`, error);
    return null;
  }
}

export async function lookupBarcode(barcode: string) {
  try {
    const normalizedBarcode = normalizeBarcode(barcode);
    if (!normalizedBarcode || normalizedBarcode.length > MAX_BARCODE_LENGTH) {
      return { status: "error", message: "The barcode is invalid." };
    }

    if (hasValidSupabaseConfig) {
      const { data: internalProduct, error } = await supabase!
        .from("products")
        .select("*")
        .eq("barcode", normalizedBarcode)
        .maybeSingle();

      if (internalProduct) {
        return {
          source: "internal",
          status: "duplicate_warning",
          data: internalProduct,
        };
      }

      // The inventory check is useful for duplicate detection, but product
      // discovery must still work when Supabase is offline, misconfigured, or
      // temporarily rejects this read.
      if (error) {
        console.warn(
          `Skipping internal barcode check for "${normalizedBarcode}": ${error.message}`,
        );
      }
    }

    // Open Food Facts only supports numeric EAN/UPC-style codes. Other scanner
    // formats can still be added manually after the internal duplicate check.
    if (!/^\d{8,14}$/.test(normalizedBarcode)) {
      return {
        source: "none",
        status: "not_found",
        data: { barcode: normalizedBarcode },
      };
    }

    let product = await lookupOpenFacts(
      normalizedBarcode,
      "world.openfoodfacts.org",
    );

    if (!product) {
      product = await lookupOpenFacts(
        normalizedBarcode,
        "world.openbeautyfacts.org",
      );
    }

    if (product) {
      return {
        source: "open_facts",
        // Do not show a full-success message when the public database only
        // has a name and leaves the remaining product details blank.
        status: product.brand && product.category ? "success" : "partial",
        data: {
          ...product,
          selling_price: "",
          stock_quantity: "",
        },
      };
    }

    // Fallback: Search the internet when Open Food Facts doesn't have the product
    console.log(
      `Open Food Facts miss for barcode "${normalizedBarcode}". Searching internet...`,
    );
    const internetProduct = await searchInternetForProduct(
      normalizedBarcode,
      normalizedBarcode,
    );

    if (internetProduct) {
      console.log(`[Success] Internet search found:`, internetProduct.name);
      return {
        source: "internet_search",
        status:
          internetProduct.brand && internetProduct.category
            ? "success"
            : "partial",
        data: {
          ...internetProduct,
          selling_price: "",
          stock_quantity: "",
        },
      };
    }

    console.log(
      `[No Results] All search sources exhausted for barcode "${normalizedBarcode}"`,
    );
    return {
      source: "none",
      status: "not_found",
      data: { barcode: normalizedBarcode },
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`Lookup Error for barcode "${barcode}":`, detail);
    return {
      status: "error",
      message: "Failed to retrieve product data",
    };
  }
}

export type ProductListItem = {
  id: string;
  barcode: string;
  sku: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  selling_price: number;
  stock_quantity: number;
  image_url: string | null;
  updated_at: string;
};

const MAX_LIST_LIMIT = 50;

export async function listProducts(
  options: { search?: string; category?: string } = {},
) {
  if (!hasValidSupabaseConfig) {
    return {
      products: [] as ProductListItem[],
      categories: [] as string[],
      error: "Supabase is not configured.",
    };
  }

  try {
    let query = supabase!
      .from("products")
      .select(
        "id, barcode, sku, name, brand, category, selling_price, stock_quantity, image_url, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(MAX_LIST_LIMIT);

    const search = options.search?.trim();
    if (search) {
      const escaped = search.replace(/[%_]/g, char => `\\${char}`);
      query = query.or(
        `name.ilike.%${escaped}%,barcode.ilike.%${escaped}%,sku.ilike.%${escaped}%`,
      );
    }

    const category = options.category?.trim();
    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;
    if (error) throw error;

    const { data: categoryRows, error: categoryError } = await supabase!
      .from("products")
      .select("category")
      .not("category", "is", null)
      .not("category", "eq", "");
    if (categoryError) throw categoryError;

    const categories = Array.from(
      new Set((categoryRows ?? []).map(row => row.category).filter(Boolean)),
    ).sort() as string[];

    return { products: (data ?? []) as ProductListItem[], categories };
  } catch (error) {
    console.error("List Error:", error);
    return {
      products: [] as ProductListItem[],
      categories: [] as string[],
      error: "Failed to load products.",
    };
  }
}

export async function saveProduct(product: ProductInput) {
  try {
    if (!hasValidSupabaseConfig) {
      return { success: false, error: "Supabase is not configured." };
    }

    // Creating a product is the one write in this app, so it's the one
    // action gated on an actual session rather than just the anon key.
    // Belt-and-braces with the middleware redirect: this still checks even
    // if this action were ever called directly.
    const sessionClient = await createServerSupabaseClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "You must be signed in to add a product.",
      };
    }

    const validation = validateProductInput(product);
    if ("error" in validation)
      return { success: false, error: validation.error };

    const { error } = await sessionClient.from("products").insert({
      barcode: validation.data.barcode,
      name: validation.data.name,
      brand: validation.data.brand,
      category: validation.data.category,
      description: validation.data.description,
      selling_price: validation.data.price,
      stock_quantity: validation.data.stock,
      image_url: validation.data.imageUrl,
      created_by: user.id,
      data_source: "admin",
    });

    if (error?.code === "23505") {
      return {
        success: false,
        error: "A product with this barcode already exists.",
      };
    }
    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Save Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to save product data.",
    };
  }
}
