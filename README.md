# 📖 Repo Manga - Template & Panduan

Repo ini adalah template untuk menyimpan chapter manga beserta metadata dan automasi. Setiap manga punya 1 repo sendiri.

---

## 📖 Daftar Isi

1. [Struktur Repo](#-struktur-repo)
2. [Penjelasan File & Fungsinya](#-penjelasan-file--fungsinya)
3. [Setup Repo Manga Baru](#-setup-repo-manga-baru)
4. [Upload Chapter Baru](#-upload-chapter-baru)
5. [Konfigurasi Automasi](#-konfigurasi-automasi)
6. [FAQ](#-faq)

---

## 📁 Struktur Repo

```
10nenburi/                          ← Nama repo (1 manga = 1 repo)
├── .github/
│   └── workflows/
│       ├── manga-automation.yml    ← Workflow automasi utama
│       └── sync-cover.yml          ← Workflow sync cover dari website
│
├── 1/                              ← Folder chapter 1
│   ├── Image001.jpg
│   ├── Image002.jpg
│   └── ...
│
├── 2.1/                            ← Folder chapter 2.1
│   ├── Image001.jpg
│   └── ...
│
├── 12.2/                           ← Folder chapter terbaru
│   └── ...
│
├── manga-automation.js             ← Script automasi
├── manga-config.json               ← Config manga (edit manual)
├── manga.json                      ← Data manga (auto-generate)
├── pending-views.json              ← Pending views manga (auto)
├── pending-chapter-views.json      ← Pending views chapter (auto)
└── README.md                       ← File ini
```

---

## 📄 Penjelasan File & Fungsinya

### **1. manga-config.json** ⭐ **FILE PALING PENTING**

**Fungsi:** Konfigurasi manga - HARUS diedit manual saat setup

**Isi file:**
```json
{
  "title": "10-Nen Buri ni Saikai...",           // Judul manga
  "alternativeTitle": "10年ぶりに再会した...",    // Judul alternatif (Jepang)
  "cover": "https://raw.githubusercontent...",   // URL cover (auto-sync dari website)
  "description": "Setelah keluar dari...",       // Sinopsis manga
  "author": "Kanzai Yuki",                       // Nama author
  "artist": "Rokushou Kokuu",                    // Nama artist
  "genre": ["Comedy", "Romance"],                // List genre
  "status": "Ongoing",                           // Status: Ongoing / Completed
  "views": 0,                                    // Total views (auto-update)
  "links": {
    "mangadex": "https://mangadex.org/...",      // Link MangaDex
    "raw": "https://comic-gardo.com/..."         // Link RAW
  },
  "repoOwner": "nurananto",                      // Username GitHub
  "repoName": "10nenburi",                       // Nama repo ini
  "imagePrefix": "Image",                        // Prefix nama image
  "imageFormat": "jpg",                          // Format image
  "lockedChapters": ["13.1"]                     // Chapter yang di-lock
}
```

**Yang HARUS Diedit:**
- ✅ `title` - Judul manga
- ✅ `alternativeTitle` - Judul alternatif (Jepang/Inggris)
- ✅ `description` - Sinopsis lengkap
- ✅ `author` - Nama pengarang
- ✅ `artist` - Nama artist
- ✅ `genre` - Genre manga (array)
- ✅ `links.mangadex` - URL MangaDex manga
- ✅ `links.raw` - URL RAW manga
- ✅ `repoOwner` - Username GitHub kamu
- ✅ `repoName` - Nama repo ini
- ✅ `imagePrefix` - Prefix nama gambar chapter (biasanya "Image" atau "Page")
- ✅ `imageFormat` - Format gambar (jpg/png/webp)

**Yang TIDAK Perlu Diedit (Auto):**
- ❌ `cover` - Auto-sync dari website
- ❌ `views` - Auto-update oleh workflow
- ❌ `lockedChapters` - Update manual jika ada chapter locked

---

### **2. manga.json** (Auto-Generate)

**Fungsi:** Data manga lengkap dengan list chapters - **JANGAN EDIT MANUAL!**

File ini di-generate otomatis oleh `manga-automation.js` dari:
- `manga-config.json` → Info manga
- Scan folder chapter → List chapter

**Isi file:**
```json
{
  "manga": {
    "title": "...",
    "cover": "...",
    // ... semua data dari manga-config.json
  },
  "chapters": {
    "1": {
      "title": "Chapter 1",
      "folder": "1",
      "uploadDate": "2025-10-11T02:06:34+07:00",
      "totalPages": 45,
      "views": 0,
      "locked": false
    },
    "12.2": {
      "title": "Chapter 12.2",
      "folder": "12.2",
      "uploadDate": "2025-10-25T19:07:06+07:00",
      "totalPages": 10,
      "views": 69,
      "locked": false
    }
  },
  "lastUpdated": "2025-10-31T13:22:08+07:00",
  "lastChapterUpdate": "2025-10-25T19:07:06+07:00"
}
```

**Update otomatis:**
- ✅ Setiap upload chapter baru
- ✅ Setiap hari jam 00:17 WIB (cron)
- ✅ Manual trigger workflow

---

### **3. pending-views.json** (Auto-Update)

**Fungsi:** Menyimpan pending views manga (batch system)

**Cara kerja:**
```
User buka info-manga.html
  ↓
+1 pending view (client-side)
  ↓
Setiap 20 views pending
  ↓
Kirim ke Google Apps Script
  ↓
Update views di manga.json
  ↓
Reset pending to 0
```

**Isi file:**
```json
{
  "pendingViews": 9,                          // Pending views saat ini
  "lastIncrement": "2025-10-31T06:11:54Z",   // Terakhir +1 view
  "lastUpdate": "2025-10-31T07:39:10Z"       // Terakhir update ke Google
}
```

**Tidak perlu diedit manual!**

---

### **4. pending-chapter-views.json** (Auto-Update)

**Fungsi:** Menyimpan pending views per chapter (batch system)

**Isi file:**
```json
{
  "chapters": {
    "1": {
      "pendingViews": 5,                      // Pending views chapter 1
      "lastIncrement": "2025-10-29T14:12:02Z",
      "lastUpdate": "2025-10-23T17:53:18Z"
    },
    "12.2": {
      "pendingViews": 0,
      "lastIncrement": "2025-10-30T23:07:25Z",
      "lastUpdate": "2025-10-31T07:39:10Z"
    }
  },
  "lastUpdated": "2025-10-31T13:22:08+07:00"
}
```

**Tidak perlu diedit manual!**

---

### **5. manga-automation.js** ⭐ **SCRIPT AUTOMASI**

**Fungsi:** Script Node.js untuk automasi manga

**4 Command:**

#### **a) `generate` - Generate manga.json**
```bash
node manga-automation.js generate
```
- Baca `manga-config.json`
- Scan semua folder chapter
- Hitung total pages per chapter
- Generate `manga.json`

#### **b) `sync` - Sync chapters**
```bash
node manga-automation.js sync
```
- Update uploadDate chapter
- Cek chapter baru
- Update lastChapterUpdate

#### **c) `update-views` - Update manga views**
```bash
node manga-automation.js update-views
```
- Cek `pending-views.json`
- Jika ≥20 pending → kirim ke Google Apps Script
- Update views di `manga.json`

#### **d) `update-chapters` - Update chapter views**
```bash
node manga-automation.js update-chapters
```
- Cek `pending-chapter-views.json`
- Per chapter: jika ≥20 pending → update
- Simpan views di `manga.json`

**Yang Perlu Diedit:**
```javascript
// Line 9: Google Apps Script URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/.../exec';
//                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ GANTI!

// Jika tidak pakai view counter, kosongkan:
const GOOGLE_SCRIPT_URL = '';
```

---

### **6. .github/workflows/manga-automation.yml**

**Fungsi:** GitHub Action untuk automasi manga

**Trigger:**
1. **Push** - Saat upload chapter baru (detect .jpg/.png)
2. **Schedule** - Setiap hari jam 00:17 WIB
3. **Manual** - Trigger manual dari GitHub Actions
4. **After sync-cover** - Setelah sync cover selesai

**Workflow:**
```yaml
1. Generate manga.json
   ↓
2. Sync chapters
   ↓
3. Update manga views
   ↓
4. Update chapter views
   ↓
5. Commit & push changes
```

**Yang Perlu Diedit:**
```yaml
# Line 14: Waktu cron (opsional)
- cron: '17 0 * * *'  # 00:17 WIB
```

---

### **7. .github/workflows/sync-cover.yml**

**Fungsi:** Workflow untuk sync cover dari website

**Trigger:**
1. **repository_dispatch** - Dari website (event: `sync-covers`)
2. **Manual** - Trigger manual

**Workflow:**
```yaml
1. Fetch manga-config.js dari website
   ↓
2. Extract cover URL untuk repo ini
   ↓
3. Update manga-config.json
   ↓
4. Commit & push (jika ada perubahan)
   ↓
5. Auto-trigger manga-automation.yml
```

**Yang Perlu Diedit:**
```yaml
# Line 28: URL website repo
WEBSITE_CONFIG_URL="https://raw.githubusercontent.com/nurananto/NuranantoScanlation/main/manga-config.js"
#                                                   ^^^^^^^^ GANTI USERNAME!

# Line 50: URL base cover
const fullUrl = 'https://raw.githubusercontent.com/nurananto/NuranantoScanlation/refs/heads/main/' + manga.cover;
#                                               ^^^^^^^^ GANTI USERNAME!
```

---

## 🚀 Setup Repo Manga Baru

### **Step 1: Clone Template**

```bash
# Buat repo baru di GitHub (contoh: OnePunchMan)
# Clone repo kosong
git clone https://github.com/USERNAME/OnePunchMan.git
cd OnePunchMan
```

### **Step 2: Copy File Template**

Copy file-file ini dari repo manga lain:
```
├── .github/workflows/
│   ├── manga-automation.yml
│   └── sync-cover.yml
├── manga-automation.js
├── manga-config.json (edit!)
├── pending-views.json
└── pending-chapter-views.json
```

### **Step 3: Edit manga-config.json**

```json
{
  "title": "One Punch Man",
  "alternativeTitle": "ワンパンマン",
  "cover": "",  // Kosongkan, nanti auto-sync
  "description": "Saitama adalah seorang superhero...",
  "author": "ONE",
  "artist": "Yusuke Murata",
  "genre": ["Action", "Comedy", "Supernatural"],
  "status": "Ongoing",
  "views": 0,
  "links": {
    "mangadex": "https://mangadex.org/title/...",
    "raw": "https://tonarinoyj.jp/episode/..."
  },
  "repoOwner": "USERNAME",        // ← GANTI!
  "repoName": "OnePunchMan",      // ← GANTI!
  "imagePrefix": "Image",
  "imageFormat": "jpg",
  "lockedChapters": []
}
```

### **Step 4: Edit File Workflow**

#### **sync-cover.yml:**
```yaml
# Line 28
WEBSITE_CONFIG_URL="https://raw.githubusercontent.com/USERNAME/NuranantoScanlation/main/manga-config.js"

# Line 50
const fullUrl = 'https://raw.githubusercontent.com/USERNAME/NuranantoScanlation/refs/heads/main/' + manga.cover;
```

#### **manga-automation.js:**
```javascript
// Line 9
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
// Atau kosongkan jika tidak pakai view counter
```

### **Step 5: Upload Chapter Pertama**

```bash
# Buat folder chapter
mkdir 1

# Copy images chapter 1
cp /path/to/images/*.jpg 1/

# Naming: Image001.jpg, Image002.jpg, ...
```

### **Step 6: Generate manga.json**

```bash
# Install Node.js dulu (jika belum)
# Jalankan script
node manga-automation.js generate

# Cek manga.json ter-generate
cat manga.json
```

### **Step 7: Commit & Push**

```bash
git add .
git commit -m "Initial commit: Setup manga repo"
git push origin main
```

### **Step 8: Tambah di Website**

Edit `manga-config.js` di repo website:
```javascript
MANGA_LIST = [
  {
    id: 'onepunchman',
    title: 'One Punch Man',
    cover: 'covers/onepunchman-xxx.jpg',  // Nanti auto-update
    repo: 'OnePunchMan'
  },
  // ... manga lain
];
```

**✅ Manga baru siap!**

---

## 📤 Upload Chapter Baru

### **Step 1: Siapkan Images**

```bash
# Format nama file:
Image001.jpg
Image002.jpg
Image003.jpg
...
Image045.jpg

# Atau:
Page001.jpg
Page002.jpg
...

# Sesuaikan dengan imagePrefix di manga-config.json
```

### **Step 2: Buat Folder Chapter**

```bash
# Chapter biasa
mkdir 13

# Chapter dengan sub (contoh 13.1)
mkdir 13.1
```

### **Step 3: Upload Images**

```bash
# Copy images ke folder chapter
cp /path/to/chapter-13/*.jpg 13/

# Atau langsung upload via GitHub web
# Repo → Upload files → Pilih folder 13/
```

### **Step 4: Push ke GitHub**

```bash
git add 13/
git commit -m "Add Chapter 13"
git push origin main
```

### **Step 5: Workflow Jalan Otomatis**

```
Push detected
  ↓
Workflow manga-automation.yml triggered
  ↓
Generate manga.json (detect chapter 13)
  ↓
Update lastChapterUpdate
  ↓
Commit & push manga.json
  ↓
Website auto-update (badge "UPDATED!")
```

**✅ Chapter baru online!**

---

## ⚙️ Konfigurasi Automasi

### **1. Lock Chapter (Donasi Only)**

Edit `manga-config.json`:
```json
{
  "lockedChapters": ["13.1", "13.2", "14"]
}
```

**Cara kerja:**
- Chapter locked tidak bisa dibaca
- Redirect ke Trakteer saat diklik
- Tetap muncul di chapter list

### **2. Custom Image Naming**

Jika nama image bukan `Image001.jpg`:

Edit `manga-config.json`:
```json
{
  "imagePrefix": "Page",   // ← Page001.jpg, Page002.jpg
  "imageFormat": "png"     // ← .png instead of .jpg
}
```

**Supported format:**
- `jpg` / `jpeg`
- `png`
- `webp`

### **3. Nonaktifkan View Counter**

Edit `manga-automation.js`:
```javascript
// Set ke empty string
const GOOGLE_SCRIPT_URL = '';
```

**Efek:**
- Views tetap 0
- Tidak ada request ke Google Apps Script
- Workflow tetap jalan normal

### **4. Ganti Waktu Cron**

Edit `.github/workflows/manga-automation.yml`:
```yaml
schedule:
  - cron: '17 0 * * *'  # 00:17 WIB (UTC+7)
```

**Konversi waktu:**
```
WIB → UTC (kurangi 7 jam)

00:00 WIB → 17:00 UTC → cron: '0 17 * * *'
06:00 WIB → 23:00 UTC → cron: '0 23 * * *'
12:00 WIB → 05:00 UTC → cron: '0 5 * * *'
```

**Format cron:**
```
┌─── Menit (0-59)
│ ┌─── Jam (0-23)
│ │ ┌─── Hari (1-31)
│ │ │ ┌─── Bulan (1-12)
│ │ │ │ ┌─── Hari dalam minggu (0-6, 0=Sunday)
│ │ │ │ │
* * * * *
```

---

## ❓ FAQ

### **Q: manga.json tidak ter-generate?**

**A:**
1. Cek `manga-config.json` → Format JSON valid?
2. Run manual:
   ```bash
   node manga-automation.js generate
   ```
3. Cek error di output

### **Q: Chapter baru tidak muncul?**

**A:**
1. Cek folder chapter → Format nama benar?
   - ✅ `13/` atau `13.1/`
   - ❌ `Chapter 13/` atau `13 /` (ada spasi)

2. Cek images → Ada file gambar?
   - ✅ `Image001.jpg`, `Image002.jpg`
   - ❌ Folder kosong

3. Trigger workflow manual:
   - GitHub → Actions → Manga Automation → Run workflow

### **Q: Cover tidak sync dari website?**

**A:**
1. Cek PAT_TOKEN di repo website
2. Cek workflow `sync-cover.yml`:
   - Line 28: URL website benar?
   - Line 50: Username benar?

3. Trigger manual:
   - GitHub → Actions → Sync Cover → Run workflow

### **Q: Workflow failed / error?**

**A:**
1. Buka Actions → Klik workflow yang failed
2. Baca error log
3. Common errors:
   - `manga-config.json not found` → File tidak ada
   - `Invalid JSON` → Format JSON salah
   - `Permission denied` → Permissions workflow salah

### **Q: Views tidak update?**

**A:**
1. Cek `GOOGLE_SCRIPT_URL`:
   - Kosong? → Views tidak akan update (by design)
   - Ada URL? → Cek Google Apps Script jalan

2. Cek `pending-views.json`:
   - `pendingViews` < 20? → Tunggu sampai ≥20

3. Manual trigger:
   ```bash
   node manga-automation.js update-views
   ```

### **Q: Image tidak muncul di reader?**

**A:**
1. Cek path image benar:
   ```
   https://raw.githubusercontent.com/USERNAME/REPO/main/13/Image001.jpg
   ```

2. Cek nama file:
   - ✅ `Image001.jpg` (sesuai imagePrefix)
   - ❌ `image001.jpg` (case-sensitive!)
   - ❌ `Image1.jpg` (harus 3 digit)

3. Cek format:
   - `imageFormat: "jpg"` → File harus `.jpg`
   - `imageFormat: "png"` → File harus `.png`

### **Q: Locked chapter tidak work?**

**A:**
1. Cek `manga-config.json`:
   ```json
   "lockedChapters": ["13.1"]  // Chapter ID exact match
   ```

2. Cek TRAKTEER_LINK di website:
   - `info-manga.js` line 32
   - `reader.js` line 32

### **Q: Cara hapus chapter?**

**A:**
```bash
# Hapus folder chapter
rm -rf 13.1/

# Re-generate manga.json
node manga-automation.js generate

# Commit & push
git add .
git commit -m "Remove chapter 13.1"
git push
```

**⚠️ Warning:** Chapter yang sudah dihapus tidak bisa di-recover!

### **Q: Cara rename repo?**

**A:**
1. GitHub → Settings → Rename repository
2. Update `manga-config.json`:
   ```json
   "repoName": "NewRepoName"
   ```
3. Update di website `manga-config.js`:
   ```javascript
   repo: 'NewRepoName'
   ```
4. Update all workflow URLs

---

## 📝 Checklist Setup Repo Baru

### **File Setup**
- [ ] Copy template files
- [ ] Edit `manga-config.json` (semua field)
- [ ] Edit `manga-automation.js` (GOOGLE_SCRIPT_URL)
- [ ] Edit `sync-cover.yml` (username)
- [ ] Edit `manga-automation.yml` (opsional)

### **Chapter Setup**
- [ ] Upload chapter pertama
- [ ] Generate `manga.json` (run script)
- [ ] Test buka di browser → Image muncul?

### **Automasi Setup**
- [ ] Push ke GitHub
- [ ] Cek workflow jalan → Berhasil?
- [ ] Test upload chapter baru → Auto-update?

### **Website Integration**
- [ ] Tambah entry di `manga-config.js` website
- [ ] Download cover (manual atau auto)
- [ ] Test buka website → Manga muncul?

---

## 🎯 Best Practices

### **1. Naming Convention**

**Folder Chapter:**
```
✅ BENAR:
1/
2.1/
2.2/
13/
13.1/

❌ SALAH:
Chapter 1/
Ch 1/
chapter1/
1 /  (ada spasi)
```

**Image Files:**
```
✅ BENAR:
Image001.jpg
Image002.jpg
Image045.jpg

❌ SALAH:
image001.jpg  (lowercase)
Image1.jpg    (kurang 0)
Image_001.jpg (underscore)
001.jpg       (kurang prefix)
```

### **2. Image Quality**

**Recommended:**
- Format: JPG (lebih kecil) atau PNG (quality)
- Width: 800-1200px (webtoon)
- Quality: 80-90% (balance size vs quality)
- File size: < 500KB per image

**Tools untuk compress:**
- ImageMagick
- TinyPNG
- Squoosh.app

### **3. Commit Messages**

```bash
# Good
git commit -m "Add Chapter 13"
git commit -m "Update cover URL"
git commit -m "Lock chapter 14 (donation only)"

# Bad
git commit -m "update"
git commit -m "asdf"
git commit -m "test"
```

### **4. Branch Strategy**

**Main branch only:**
- Upload langsung ke `main`
- No feature branches needed
- Workflow trigger on push to `main`

### **5. Backup**

**Backup important files:**
```bash
# Manual backup
cp manga-config.json manga-config.json.backup

# Or use git tags
git tag -a v1.0 -m "Chapter 1-10 complete"
git push origin v1.0
```

---

## 🔧 Troubleshooting Commands

```bash
# Test generate manga.json
node manga-automation.js generate

# Test sync chapters
node manga-automation.js sync

# Test update views
node manga-automation.js update-views

# Test update chapter views
node manga-automation.js update-chapters

# Cek manga.json
cat manga.json | jq .

# Cek pending views
cat pending-views.json | jq .

# Count images in chapter
ls -1 13/*.jpg | wc -l

# Find all chapters
find . -maxdepth 1 -type d -name '[0-9]*' | sort -V
```

---

**Created by Nurananto Scanlation**

**Questions?** Open issue di GitHub!
