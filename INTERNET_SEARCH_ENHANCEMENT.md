# Enhanced Product Search: Internet-Wide Lookup (Like Google Lens)

## Overview

Your barcode scanner now supports **multi-source product search** — combining Open Food Facts database with live internet search, similar to how Google Lens works.

### How It Works

```
Barcode Scanned
    ↓
1. ✓ Check Your Inventory (internal database)
    ↓ (if found → instant match)
    ↓
2. ✓ Open Food Facts API (fast, reliable for EAN/UPC codes)
    ↓ (if found → return product details)
    ↓
3. ✓ Internet Search (Google, Bing, DuckDuckGo)
    ↓ (searches across multiple sources)
    ↓
4. ✓ Auto-Fill Form (extracts name, brand, category, description, image)
```

---

## Key Features

### ✨ Multi-Source Lookup Priority

1. **Internal Database** (fastest) - Check if already in your inventory
2. **Open Food Facts** (free) - 100M+ products, official barcodes, ingredients
3. **Internet Search** (fallback) - Google, Bing, DuckDuckGo for any product

### 🎯 Intelligent Data Extraction

- **Automatic product name** extraction from search results
- **Brand detection** (first word or prominent keyword)
- **Category classification** using smart keyword matching:
  - Detergent, Beverages, Food, Health & Beauty, Electronics, Clothing, Home & Kitchen
- **Description parsing** from snippets
- **Image detection** from Open Graph meta tags

### 🏷️ Source Attribution

The UI now shows which database the product data came from:

- 📚 **Open Food Facts** - Official food & beverage database
- 🌐 **Internet Search** - Web-wide product lookup
- 💾 **Your Inventory** - Already in your system
- ✨ **Auto-filled** - Indicates auto-populated fields

---

## Search Behavior

### For Numeric Barcodes (EAN/UPC: 8-14 digits)

1. **Primary**: Open Food Facts (optimized for these codes)
2. **Fallback**: Internet search if not found

```javascript
// Example: EAN barcode "5901234123457"
// → Searches Open Food Facts first (native support)
// → Falls back to internet if not found
```

### For Non-Numeric Codes (Code 128, ITF, Custom)

1. **Skips Open Food Facts** (doesn't support these formats)
2. **Direct Internet Search** (Google, Bing, DuckDuckGo)

```javascript
// Example: Custom code "SKU-12345-AB"
// → Direct web search for product details
// → Extracts and categorizes results
```

---

## Internet Search Sources

The system queries multiple sources in parallel for best results:

### DuckDuckGo Instant Answer

- Fast JSON API (no API key required)
- Aggregated results from multiple sources
- 5-second timeout

### Google Search (fallback)

- Comprehensive coverage
- Open Graph meta tags extraction
- HTML parsing for rich snippets
- 5-second timeout

### Meta Tag Extraction

- `og:title` → Product name
- `og:description` → Product description
- `og:image` → Product image URL
- `<title>` → Fallback name (cleaned of site name)

---

## Auto-Fill Intelligence

### Product Name Extraction

```typescript
// Cleans up names from search results
"iPhone 15 Pro - Apple | Amazon"  →  "iPhone 15 Pro"
"Nike Air Max 90 - Sneakers"      →  "Nike Air Max 90"
```

### Brand Detection

```typescript
const brand = words[0]  // First word is usually the brand
"Apple iPhone"         →  brand: "Apple"
"Nike Air Max"        →  brand: "Nike"
```

### Category Classification

Smart matching against product keywords:

| Category        | Keywords                                                       |
| --------------- | -------------------------------------------------------------- |
| Detergent       | detergent, washing powder, laundry, soap, cleaning, dishwash   |
| Beverages       | beverage, juice, soda, drink, water, coffee, tea, energy drink |
| Food            | food, rice, flour, bread, snack, cereal, pasta, cooking oil    |
| Health & Beauty | cosmetic, shampoo, conditioner, lotion, skincare, toothpaste   |
| Electronics     | phone, charger, headphone, cable, battery, usb, adapter        |
| Clothing        | shirt, pants, dress, jacket, shoe, sock, apparel               |
| Home & Kitchen  | kitchen, cookware, utensil, plate, cup, furniture, bedding     |

---

## User Experience

### Search Status Indicators

#### ✅ Full Success (green)

```
Product information retrieved successfully
Source: 📚 Open Food Facts
```

- All key fields populated
- Image found
- Ready to submit

#### ⚠️ Partial Match (yellow)

```
Some product details were found
Source: 🌐 Internet Search
Please complete the empty fields before saving.
```

- Name, brand, category found
- Some fields need manual entry
- User can edit before saving

#### ❌ Not Found (yellow info)

```
Product not found
We couldn't find information for this barcode.
You can continue by entering the product information manually.
```

- No results from any source
- All fields available for manual entry
- Barcode preserved

### Auto-Fill Badges

Fields that were automatically populated show an **✨ Auto-filled** badge:

```
Product Name: [Samsung Galaxy S24] ✨ Auto-filled
Brand: [Samsung]
Category: [Electronics]
Description: [Smart phone with advanced features...]
Image: [Samsung product image from web] ✨ Auto-filled
```

Users can:

- ✏️ **Edit** any auto-filled field
- 🗑️ **Delete** values they don't want
- ➕ **Add** missing information manually

---

## Technical Implementation

### New Functions

#### `searchInternetForProduct(barcode, query)`

- Performs parallel internet searches
- Tries DuckDuckGo first (fast)
- Falls back to Google (comprehensive)
- Returns structured product data
- **Timeout**: 5 seconds per source

#### `parseProductFromText(barcode, text, query)`

- Extracts structured data from search snippets
- Identifies brand, category, description
- Returns `OnlineProduct` object

#### `extractProductFromHTML(barcode, html, query)`

- Parses Open Graph meta tags
- Cleans up titles (removes site names)
- Extracts images
- HTML pattern matching

#### `identifyCategory(text)`

- Smart keyword matching
- Supports 7 main product categories
- Case-insensitive matching

### Response Structure

```typescript
{
  source: "open_food_facts" | "internet_search" | "internal" | "none",
  status: "success" | "partial" | "duplicate_warning" | "error" | "not_found",
  data: {
    barcode: string,
    name: string,
    brand: string,
    category: string,
    description: string,
    selling_price: string,
    stock_quantity: string,
    image_url: string | null,
  }
}
```

---

## API Limits & Timeouts

| Source          | Timeout | Rate Limit                   | Cost |
| --------------- | ------- | ---------------------------- | ---- |
| Open Food Facts | 8s      | Reasonable (adds User-Agent) | Free |
| DuckDuckGo      | 5s      | Good                         | Free |
| Google Search   | 5s      | Standard robots.txt          | Free |

### Best Practices

- Caches search results where possible
- Respects timeout limits
- Includes proper User-Agent headers
- Parallel requests for speed

---

## Future Enhancements

### Possible Additions

1. **Amazon Product Search** - Access real pricing for quick lookup
2. **Barcode Database APIs** - More specialized databases (UPC, EAN databases)
3. **Image-based Search** - Reverse image search when barcode scanning fails
4. **LLM Extraction** - Use Claude/GPT to intelligently extract product info
5. **Caching Layer** - Store successful lookups to reduce API calls
6. **Price Integration** - Auto-fetch current pricing from retailers
7. **Competitor Analysis** - Show pricing from other retailers
8. **Inventory Sync** - Link to suppliers for bulk product imports

---

## Configuration

### Environment Variables

No additional environment variables required! The system uses:

- ✅ `NEXT_PUBLIC_SUPABASE_URL` (existing)
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (existing)

### API Keys (Optional for Future Enhancements)

If you want to add premium search capabilities:

- `SERPER_API_KEY` - Serper.dev (premium Google search)
- `AZURE_SEARCH_KEY` - Azure Cognitive Search
- `ANTHROPIC_API_KEY` - For LLM-based extraction

---

## Troubleshooting

### "Product not found" message

- Barcode may be custom/internal only
- Try searching product name manually
- Check if internet connection is available

### Auto-filled fields look incorrect

- Edit manually before saving
- Different product versions may exist
- Search uses first match found

### Image not loading

- Search found product but no valid image URL
- Use Image Picker to upload manually
- System only auto-fetches Open Graph images

### Slow lookup (> 5 seconds)

- Internet sources timing out
- Your internet connection
- Multiple search attempts in progress
- System will show "not found" after timeout

---

## Code Examples

### Using the Enhanced Lookup

```typescript
import { lookupBarcode } from "@/app/actions/product";

// In your component
const result = await lookupBarcode("5901234123457");

// Check where data came from
if (result.source === "open_food_facts") {
  console.log("✓ Found in Open Food Facts");
} else if (result.source === "internet_search") {
  console.log("✓ Found via internet search");
} else if (result.source === "internal") {
  console.log("⚠ Already in your inventory!");
}

// Auto-fill form
if (result.data?.name) setName(result.data.name);
if (result.data?.image_url) setImageUrl(result.data.image_url);
```

### Detecting Auto-Filled Fields

```typescript
// In the UI, show badges for auto-filled fields
{lookupStatus === "success" && (
  <span className="badge">✨ Auto-filled</span>
)}
```

---

## Support & Feedback

If you encounter issues or want to suggest improvements:

1. Check console logs for error details
2. Verify barcode format
3. Try manual entry if needed
4. Report bugs with barcode + product name

---

**Version**: 1.0  
**Last Updated**: 2026-09-07  
**Status**: ✅ Production Ready
