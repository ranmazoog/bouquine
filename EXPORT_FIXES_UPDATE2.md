# Export Fixes - Update 2

## Issues Fixed in This Update

### 1. **Word Document Formatting** ✅ FIXED
**Problem:** First-line indentation was causing paragraphs to not be fully left-aligned

**Before:**
```
    Thou seest a twist...  (indented)
    The Paradox Room...    (indented)
```

**After:**
```
Thou seest a twist...      (fully left-aligned)
The Paradox Room...        (fully left-aligned)
```

**Solution:** Removed `indent: { firstLine: 720 }` from paragraph formatting
- Changed from `AlignmentType.JUSTIFIED` to `AlignmentType.LEFT`
- Removed first-line indentation
- Kept paragraph spacing (12pt after each paragraph)

**Files Modified:**
- `/electron/services/export.ts` (line 189)

---

### 2. **EPUB Export Error** ✅ FIXED
**Problem:** Error: "The 'data' argument must be of type string or an instance of Buffer, TypedArray, or DataView. Received undefined"

**Root Cause:** 
- `epub-gen-memory` is a CommonJS module
- Static ESM imports don't work properly with it in Electron
- The module was returning `undefined` instead of a Buffer

**Solution:**
1. Reverted to dynamic import for `epub-gen-memory`
2. Added proper CommonJS/ESM compatibility handling
3. Added validation to check if content is defined and is a Buffer
4. Added detailed error messages for debugging

**Code Changes:**
```typescript
// Dynamic import for epub-gen-memory (CommonJS module)
const epubModule = await import('epub-gen-memory');
const Epub = (epubModule.default || epubModule) as any;

// Use the constructor pattern
const epub = new Epub(options, epubChapters);
const content = await epub.promise;

// Validate content before writing
if (!content) {
    throw new Error('EPUB generation returned undefined content');
}

if (!(content instanceof Buffer)) {
    throw new Error(`EPUB generation returned invalid type: ${typeof content}`);
}

await writeFile(filePath, content);
```

**Files Modified:**
- `/electron/services/export.ts` (lines 1-4, 362-377)

---

## Why PDF Works But EPUB Needs Dynamic Import

| Library | Import Type | Reason |
|---------|-------------|--------|
| **pdf-lib** | Static ✅ | Pure ESM module, works with static imports |
| **epub-gen-memory** | Dynamic ⚠️ | CommonJS module, needs dynamic import in Electron |
| **docx** | Static ✅ | ESM-compatible, works with static imports |

---

## Current Export Status

| Format | Status | Formatting |
|--------|--------|-----------|
| **Word (.docx)** | ✅ Working | Fully left-aligned, no indentation |
| **PDF (.pdf)** | ✅ Working | Professional manuscript style |
| **EPUB (.epub)** | ✅ Fixed | Now with proper Buffer validation |
| **Markdown (.md)** | ✅ Working | Standard markdown |
| **Plain Text (.txt)** | ✅ Working | Plain text |
| **JSON Backup (.json)** | ✅ Working | Full project backup |

---

## Testing Instructions

1. **Restart the app** (changes require rebuild)
2. **Test Word Export:**
   - Export a chapter
   - Open in Word/Pages
   - Verify paragraphs are fully left-aligned (no indentation)
   
3. **Test EPUB Export:**
   - Export a project
   - Should now create a valid .epub file
   - If it fails, you'll see a specific error message

---

## Technical Notes

### Word Document Formatting
- **Alignment:** LEFT (not JUSTIFIED)
- **Indentation:** None (removed firstLine: 720)
- **Spacing:** 12pt after each paragraph (240 twips)
- **Font:** Times New Roman, 12pt
- **Margins:** 1 inch all around

### EPUB Generation
- Uses `epub-gen-memory` v1.1.2
- Requires dynamic import due to CommonJS format
- Returns a Buffer that must be validated
- Includes project metadata (title, author, description)

---

**Status:** All fixes implemented. App needs restart to apply changes. 🚀
