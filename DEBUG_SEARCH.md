# Debugging Barcode Search - Step by Step

## 🔍 How to Test and Debug

### Step 1: Open Browser Console

1. Press **`F12`** to open Developer Tools
2. Go to **Console** tab
3. Keep it open while testing

### Step 2: Scan Barcode 6161115174063

Watch the console output. You should see logs like:

```
[Search] Starting internet search for barcode: "6161115174063"
[Search Strategy] Trying barcode-specific sources...
[Barcode DB] Searching for 6161115174063...
[Barcode DB] Trying: https://www.barcode-list.com/...
[Barcode DB] Found: "VASELINE DRY SKIN REPAIR 200ML"
[Parse] Cleaned name: "VASELINE DRY SKIN REPAIR 200ML"
[Parse] Extracted: name="VASELINE DRY SKIN REPAIR 200ML"...
[Success] Found via barcode database
```

---

## 📊 Understanding the Console Output

### Success Path

```log
[Search] Starting internet search...
[Barcode DB] Trying...
[Barcode DB] Found: "VASELINE DRY SKIN REPAIR 200ML"
✅ Product appears on form!
```

### Debugging Path

If you see these messages instead:

```
[Barcode DB] URL failed: https://www.barcode-list.com/...
[Barcode DB] No results from any database URL
[Search Strategy] Trying product search...
[Search Batch] Trying queries: "6161115174063 product name"
[Google] Searching for: "6161115174063 product name"
[Google] HTTP 403
```

This means:

- ❌ barcode-list.com is blocking us (403 error)
- ❌ Google search is also blocking us
- ❌ All sources failed

---

## 🛠️ What Each Log Message Means

### [Search] Messages

```
[Search] Starting internet search for barcode: "6161115174063"
```

→ Barcode lookup started

### [Barcode DB] Messages

```
[Barcode DB] Searching for 6161115174063...
[Barcode DB] Trying: https://www.barcode-list.com/...
[Barcode DB] Found: "VASELINE DRY SKIN REPAIR 200ML"
[Barcode DB] Successfully extracted product
```

→ Trying barcode-specific databases

### [Parse] Messages

```
[Parse] Cleaned name: "VASELINE DRY SKIN REPAIR 200ML"
[Parse] Extracted: name="VASELINE...", brand="VASELINE", category="Health & Beauty"
```

→ Extracting data from found text

### [Google] Messages

```
[Google] Searching for: "6161115174063 product name"
[Google] HTTP 403
[Google] Error: Forbidden
```

→ Google search blocked by rate limit

### [Success] Messages

```
[Success] Found via barcode database
[Success] Found via search
```

→ Product successfully found!

---

## 🐛 Common Issues & Solutions

### Issue 1: "HTTP 403 Forbidden"

```
[Google] HTTP 403
[Bing] HTTP 403
```

**Cause**: Google/Bing detecting automated requests  
**Solution**: We try multiple sources, but if all are blocked:

Try manual entry for now, or wait a bit before retrying.

### Issue 2: "Timeout (6000ms)"

```
[Google] Error: timed out
```

**Cause**: Network is slow or server is slow  
**Solution**: Already handled with retry logic

### Issue 3: "URL failed: DNS error"

```
[Barcode DB] URL failed: https://www.barcode-list.com/... Error: DNS error
```

**Cause**: Network connection issue or DNS problem  
**Solution**: Check your internet connection

### Issue 4: "No extraction succeeded"

```
[Google] OpenGraph extraction failed...
[Google] Snippet extraction failed...
[Google] Structured data extraction failed...
[Google] No extraction succeeded
```

**Cause**: Got HTML response but couldn't parse it  
**Solution**: Google's HTML structure changed, might need regex update

---

## ✅ Expected Success Scenario

### Complete Console Log (Success)

```
[Search] Starting internet search for barcode: "6161115174063"
[Search Strategy] Trying barcode-specific sources for "6161115174063"...
[Barcode DB] Searching for 6161115174063...
[Barcode DB] Trying: https://www.barcode-list.com/barcode/EN/barcode-6161115174063/Search.htm...
[Barcode DB] Found: "VASELINE DRY SKIN REPAIR 200ML"
[Parse] Cleaned name: "VASELINE DRY SKIN REPAIR 200ML"
[Parse] Extracted: name="VASELINE DRY SKIN REPAIR 200ML", brand="VASELINE", category="Health & Beauty"
[Barcode DB] Successfully extracted product
[Success] Found via barcode database: VASELINE DRY SKIN REPAIR 200ML
```

### Result on Form

```
✅ Product information retrieved successfully
Source: 🌐 Internet Search

Product Name: VASELINE DRY SKIN REPAIR 200ML ✨ Auto-filled
Brand: VASELINE
Category: Health & Beauty
Description: [auto-filled]
Image: [loading...]
```

---

## 📋 Testing Checklist

- [ ] Open F12 Console
- [ ] Clear console (type `console.clear()`)
- [ ] Scan barcode `6161115174063`
- [ ] Copy the console output
- [ ] Check for errors (red text)
- [ ] Check which source was tried
- [ ] Did product appear on form?

---

## 🚨 If Nothing Works

Share with me:

1. **Console output** — Screenshot or copy-paste from Console tab
2. **Network errors** — Go to Network tab, scan barcode, see failed requests
3. **Your internet** — Try Google.com directly (should work)
4. **Barcode** — Try another barcode (e.g., `5901234123457`)

---

## 💡 Advanced Debugging

### Check Network Requests

1. Open DevTools → **Network** tab
2. Scan barcode
3. Look for failed requests (red)
4. Click on them to see why they failed

### Check Server Logs

The server (backend) also logs searches. If you have access to server terminal, look for:

```
[Search] Starting internet search...
[Barcode DB] Searching...
Open Food Facts miss for barcode "6161115174063"
```

### Test in Browser Console

Manually trigger a search:

```javascript
// In browser console:
const result = await fetch("/api/lookup", {
  method: "POST",
  body: JSON.stringify({ barcode: "6161115174063" }),
}).then(r => r.json());
console.log(result);
```

---

## 📞 Getting Help

When reporting issues, include:

1. ✓ Console output (full log)
2. ✓ Network tab errors (if any)
3. ✓ Which barcode you tested
4. ✓ What you expected vs. what happened
5. ✓ Your internet speed/status

---

**Version**: 2.0 (Improved Search Logic)  
**Last Updated**: 2026-09-07  
**Status**: Ready to test
