# 🤖 AUTO-GENERATE MANGA.JSON dengan GitHub Actions

Sistem otomatis untuk generate `manga.json` setiap kali ada perubahan di repository chapter.

---

## 📁 Struktur File di Repo Chapter

```
manga-repo/
├── .github/
│   └── workflows/
│       └── generate-manga-json.yml    ← Workflow file
├── 1/
│   ├── Image01.jpg
│   ├── Image02.jpg
│   └── ...
├── 2.1/
│   ├── Image01.jpg
│   └── ...
├── 2.2/
│   └── ...
├── manga-config.json                   ← Edit ini untuk lock/unlock
├── generate-manga-json.js              ← Script generator
└── manga.json                          ← Auto-generated (jangan edit manual!)
```

---

## 🚀 Setup Awal

### 1. Buat Folder `.github/workflows/`

Di root repo chapter, buat struktur folder:
```
.github/
└── workflows/
    └── generate-manga-json.yml
```

### 2. Upload 3 File Penting

**File 1:** `.github/workflows/generate-manga-json.yml`
- Copy dari artifact yang sudah dibuat
- Workflow ini akan auto-run setiap ada push

**File 2:** `manga-config.json`
- Edit sesuai info manga
- **Edit bagian `lockedChapters`** untuk lock/unlock chapter

**File 3:** `generate-manga-json.js`
- Script untuk generate manga.json
- Tidak perlu diedit

---

## ✏️ Cara Menggunakan

### **Lock Chapter:**

Edit `manga-config.json`, tambahkan chapter ke array `lockedChapters`:

```json
{
  "lockedChapters": [
    "10.1",
    "10.2",
    "11.1"
  ]
}
```

**Commit & Push** → GitHub Actions akan auto-generate `manga.json` dengan chapter terkunci.

### **Unlock Chapter:**

Ada 2 cara:

**Cara 1 (Otomatis):**
1. Upload folder chapter (contoh: folder `10.1`)
2. Push ke GitHub
3. Workflow auto-detect folder baru
4. Chapter otomatis unlock meskipun masih ada di `lockedChapters`

**Cara 2 (Manual):**
1. Edit `manga-config.json`
2. Hapus chapter dari array `lockedChapters`
3. Push ke GitHub
4. Workflow auto-generate dengan chapter unlocked

---

## 🔄 Workflow Trigger

Workflow akan auto-run saat:
1. ✅ Upload gambar baru (`.jpg`, `.jpeg`, `.png`, `.webp`)
2. ✅ Edit `manga-config.json`
3. ✅ Manual trigger (tab Actions → Run workflow)

---

## 📊 Contoh Workflow

### Skenario 1: Tambah Chapter Baru

```
1. Upload folder 12.1 dengan gambar
2. Push ke GitHub
3. Workflow running...
4. manga.json auto-update:
   - Chapter 12.1 ditambahkan
   - Status: unlocked
   - Pages: auto-detected
```

### Skenario 2: Lock Chapter untuk Donasi

```
1. Edit manga-config.json:
   "lockedChapters": ["13.1", "13.2"]
2. Push ke GitHub
3. Workflow running...
4. manga.json auto-update:
   - Chapter 13.1, 13.2 status: locked
   - Views: 0
   - uploadDate: null
```

### Skenario 3: Upload Chapter yang Sudah di-Lock

```
1. Chapter 13.1 ada di lockedChapters
2. Upload folder 13.1 dengan gambar
3. Push ke GitHub
4. Workflow running...
5. manga.json auto-update:
   - Chapter 13.1 otomatis unlock!
   - Pages: auto-detected
   - uploadDate: auto-set
```

---

## 🎯 Field di manga-config.json

```json
{
  "title": "Judul Manga",                    // Judul asli
  "alternativeTitle": "Alternative Title",   // Judul alternatif
  "cover": "https://...",                    // URL cover
  "description": "Deskripsi...",             // Sinopsis
  "author": "Author Name",                   // Author
  "artist": "Artist Name",                   // Artist
  "genre": ["Romance", "Comedy"],            // Array genre
  "status": "Ongoing",                       // Status
  "views": 0,                                // Total views
  "links": {
    "mangadex": "https://...",               // Link Mangadex
    "raw": "https://..."                     // Link Raw
  },
  "repoOwner": "nurananto",                  // GitHub username
  "repoName": "nama-repo",                   // Nama repo
  "imagePrefix": "Image",                    // Prefix file gambar
  "imageFormat": "jpg",                      // Format gambar
  "lockedChapters": ["10.1", "10.2"]        // ← EDIT INI untuk lock/unlock
}
```

---

## 🔍 Monitoring Workflow

1. Buka repo di GitHub
2. Tab **Actions**
3. Lihat workflow "Auto Generate manga.json"
4. Klik untuk lihat log detail

Log akan menampilkan:
```
📁 Found 11 chapter folders
  📊 1: 7 images
  📊 2.1: 7 images
  ✅ UNLOCKED Chapter 1 - 7 pages
  ✅ UNLOCKED Chapter 2.1 - 7 pages
  🔒 LOCKED Chapter 10.1 - 0 pages
  
✅ manga.json berhasil di-generate!
📊 Total chapters: 11
🔒 Locked chapters: 2
🔓 Unlocked chapters: 9
```

---

## 🐛 Troubleshooting

### Workflow Tidak Jalan

**Cek:**
1. File `.github/workflows/generate-manga-json.yml` ada?
2. Branch `main` atau `master`?
3. Cek tab Actions → Enable workflows

### manga.json Tidak Update

**Solusi:**
1. Manual trigger: Actions → Run workflow
2. Cek error di log
3. Pastikan `manga-config.json` valid JSON

### Chapter Tidak Auto-Unlock

**Cek:**
1. Nama folder sama persis dengan `lockedChapters`?
2. Folder berisi gambar?
3. Format gambar `.jpg`, `.jpeg`, `.png`, atau `.webp`?

---

## 💡 Tips

1. **Jangan edit manga.json manual** - Akan di-overwrite oleh workflow
2. **Edit hanya manga-config.json** untuk konfigurasi
3. **Nama folder harus number** (1, 2.1, 10.2, etc)
4. **Format gambar konsisten** (semua .jpg atau semua .png)

---

## ✅ Checklist Setup

- [ ] Buat folder `.github/workflows/`
- [ ] Upload `generate-manga-json.yml`
- [ ] Upload `generate-manga-json.js`
- [ ] Upload `manga-config.json` (edit dulu!)
- [ ] Enable GitHub Actions di repo
- [ ] Test: Upload 1 gambar → Cek workflow running
- [ ] Cek manga.json ter-generate otomatis

---

**🎉 Selesai! Sekarang sistem auto-update sudah jalan!**

Setiap kali upload chapter atau edit `manga-config.json`, `manga.json` akan auto-update tanpa manual effort!