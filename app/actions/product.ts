"use server";

import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
  return value.trim();
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
    return { error: "Brand, category, and description must be 500 characters or fewer." };
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
  values.find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  )?.trim() || "";

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

      if (error) throw error;
    }

    // Open Food Facts only supports numeric EAN/UPC-style codes. Other scanner
    // formats can still be added manually after the internal duplicate check.
    if (!/^\d{8,14}$/.test(normalizedBarcode)) {
      return { source: "none", status: "not_found", data: { barcode: normalizedBarcode } };
    }

    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(normalizedBarcode)}.json`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) throw new Error("Product lookup service is unavailable.");
    const externalData = await response.json();

    let openFoodFactsProduct: OnlineProduct | null = null;

    if (externalData.status === 1 && externalData.product) {
      const p = externalData.product;
      const firstTag = (tags: unknown) =>
        Array.isArray(tags)
          ? firstText(tags[0])?.replace(/^[a-z]{2}:/i, "")
          : "";

      const name = firstText(p.product_name, p.product_name_en, p.generic_name);
      const brand = firstText(p.brands, firstTag(p.brands_tags));
      const category = firstText(
        p.categories?.split(",")[0],
        firstTag(p.categories_tags),
      );

      if (name) {
        openFoodFactsProduct = {
          barcode: normalizedBarcode,
          name,
          brand,
          category,
          description: firstText(p.ingredients_text, p.generic_name),
          image_url: p.image_url || null,
        };
      }
    }

    const product = openFoodFactsProduct;

    if (product) {
      return {
        source: "open_food_facts",
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

    return {
      source: "none",
      status: "not_found",
      data: { barcode: normalizedBarcode },
    };
  } catch (error) {
    console.error("Lookup Error:", error);
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

export async function listProducts(options: { search?: string; category?: string } = {}) {
  if (!hasValidSupabaseConfig) {
    return { products: [] as ProductListItem[], categories: [] as string[], error: "Supabase is not configured." };
  }

  try {
    let query = supabase!
      .from("products")
      .select("id, barcode, sku, name, brand, category, selling_price, stock_quantity, image_url, updated_at")
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
      return { success: false, error: "You must be signed in to add a product." };
    }

    const validation = validateProductInput(product);
    if ("error" in validation) return { success: false, error: validation.error };

    const { error } = await sessionClient
      .from("products")
      .insert({
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
      return { success: false, error: "A product with this barcode already exists." };
    }
    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Save Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save product data.",
    };
  }
}
