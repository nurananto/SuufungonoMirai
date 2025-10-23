# 📅 FITUR BARU: DAILY AUTO-UPDATE & RESET VIEWS

## 🎯 Perubahan Utama

### ✅ Yang Berubah:

1. **Schedule Update**: Setiap 2 hari → **Setiap 1 hari**
2. **Auto-detect Files**: Workflow jalan otomatis saat ada file baru (jpg, png, webp, dll)
3. **First-time Setup**: Views otomatis 0 saat pertama kali generate
4. **Reset Views**: Ada script untuk reset manual jika diperlukan

---

## 📅 Schedule Baru

### Workflow akan OTOMATIS jalan pada:

```yaml
✅ Setiap hari jam 00:00 UTC (07:00 WIB)
✅ Saat ada file gambar baru di-upload (*.jpg, *.png, *.webp, *.jpeg)
✅ Saat manga-config.json berubah
✅ Manual trigger (untuk testing)
```

### Apa yang dilakukan setiap hari:

1. 📚 Generate/update `manga.json`
2. 🔄 Sync chapters baru (jika ada)
3. 📊 Cek pending manga views (threshold 20)
4. 📖 Cek pending chapter views (threshold 10)
5. 💾 Commit changes (jika ada)

---

## 🆕 First-Time Setup (Views = 0)

### Cara Kerja:

Ketika Anda **pertama kali** menjalankan script di repo baru:

```bash
node manga-automation.js generate
```

Output:
```
🚀 Generating manga.json...

📚 Manga: Judul Manga
🆕 FIRST-TIME GENERATION - All views will be set to 0
📝 Future updates will preserve view counts

📖 Processing chapters...
  ✅ UNLOCKED Chapter 1 - 45 pages
  ✅ UNLOCKED Chapter 2 - 30 pages
  🔒 LOCKED Chapter 3 - 0 pages

✅ manga.json generated successfully!
🎉 FIRST-TIME SETUP COMPLETE
📚 Total chapters: 3
👁️  Total manga views: 0
👁️  Total chapter views: 0
```

### Deteksi Otomatis:

Script akan **otomatis detect** apakah ini first-time:
- ✅ Jika `manga.json` **TIDAK ADA** → Set views = 0
- ✅ Jika `manga.json` **SUDAH ADA** → Preserve views lama

**Tidak perlu setting apa-apa!** Script pintar sendiri 🧠

---

## 🔄 Reset Views Manual

### Kapan Perlu Reset Manual?

- 🔄 Ingin mulai hitung views dari awal
- 🧪 Testing view counter
- 🗑️ Data views corrupt
- 🆕 Re-launch manga dengan view counter baru

### Cara Reset:

```bash
# 1. Jalankan script reset
node reset-views.js

# 2. Konfirmasi dengan ketik "RESET"
Apakah Anda yakin? Ketik "RESET" untuk konfirmasi: RESET

# 3. Script akan reset:
✅ manga.json views reset
✅ pending-views.json reset
✅ pending-chapter-views.json reset

# 4. Generate ulang manga.json
node manga-automation.js generate

# 5. Commit changes
git add .
git commit -m "Reset views to 0"
git push
```

### ⚠️ PERINGATAN:

Script reset akan **MENGHAPUS SEMUA DATA VIEWS**!
- Manga views → 0
- Semua chapter views → 0
- Pending views → 0
- Pending chapter views → 0

**Tidak bisa di-undo!** Pastikan backup dulu jika perlu.

---

## 🚀 Setup untuk Repo Baru

### Langkah-langkah:

#### 1. **Copy Files ke Repo Baru**

```bash
# Di repo chapter baru (contoh: MangaBaru/)
├── .github/workflows/
│   └── manga-automation.yml       ← Copy file ini
├── manga-automation.js            ← Copy file ini
├── reset-views.js                 ← (Optional) Copy file ini
└── manga-config.json              ← Buat/edit config
```

#### 2. **Edit manga-config.json**

```json
{
  "title": "Judul Manga Baru",
  "alternativeTitle": "Alternative Title",
  "cover": "https://raw.githubusercontent.com/...",
  "description": "Sinopsis manga...",
  "author": "Author Name",
  "artist": "Artist Name",
  "genre": ["Romance", "Comedy"],
  "status": "Ongoing",
  "views": 0,  ← HARUS 0 untuk manga baru
  "links": {
    "mangadex": "https://...",
    "raw": "https://..."
  },
  "repoOwner": "nurananto",
  "repoName": "MangaBaru",  ← Nama repo
  "imagePrefix": "Image",
  "imageFormat": "jpg",
  "lockedChapters": []
}
```

#### 3. **Upload Chapter Folders**

```bash
MangaBaru/
├── 1/
│   ├── Image1.jpg
│   ├── Image2.jpg
│   └── ...
├── 2/
│   ├── Image1.jpg
│   └── ...
```

#### 4. **Generate Pertama Kali (Lokal atau di GitHub)**

**Opsi A: Test Lokal Dulu**
```bash
# Test di komputer
node manga-automation.js generate
node manga-automation.js sync

# Cek hasil
cat manga.json | grep views
# Output: "views": 0  ✅

# Push ke GitHub
git add .
git commit -m "Initial setup"
git push
```

**Opsi B: Langsung di GitHub**
```bash
# Push semua file
git add .
git commit -m "Initial setup with automation"
git push

# GitHub Actions akan otomatis jalan dan generate manga.json
# Cek di: Actions tab → Manga Automation
```

#### 5. **Inisialisasi Pending Files**

Setelah manga.json ter-generate, buat file pending:

**pending-views.json:**
```json
{
  "pendingViews": 0,
  "lastIncrement": "2025-10-24T00:00:00.000Z",
  "lastUpdate": "2025-10-24T00:00:00.000Z"
}
```

**pending-chapter-views.json:**
```json
{
  "chapters": {},
  "lastUpdated": "2025-10-24T00:00:00.000Z"
}
```

Atau jalankan:
```bash
node manga-automation.js sync
```

#### 6. **Tambahkan ke Index Website**

Edit `script.js` di repo utama:

```javascript
const mangaList = [
  {
    title: 'Judul Manga Baru',
    cover: 'covers/manga-baru-cover.jpg',
    repo: 'MangaBaru'  ← Nama repo
  },
  // manga lain...
];
```

Edit `info-manga.js` di repo utama:

```javascript
const MANGA_REPOS = {
    'MangaBaru': 'https://raw.githubusercontent.com/nurananto/MangaBaru/main/manga.json',
    // mapping lain...
};
```

---

## 🔍 Monitoring

### Cek Status Workflow:

1. Buka repo di GitHub
2. Klik tab **Actions**
3. Lihat workflow "Manga Automation"
4. Cek log setiap job

### Verifikasi Views Reset:

```bash
# Cek manga views
cat manga.json | grep '"views"'

# Output untuk manga baru:
"views": 0,  ← Manga views
"views": 0,  ← Chapter 1 views
"views": 0,  ← Chapter 2 views
```

### Cek Schedule:

```bash
# Workflow terakhir jalan
cat .github/workflows/manga-automation.yml | grep cron

# Output:
- cron: '0 0 * * *'  ← Setiap hari jam 00:00 UTC
```

---

## 📊 Contoh Timeline

### Hari 1 (Setup):
```
00:00 - Setup repo baru
00:05 - Upload chapters
00:10 - Push ke GitHub
00:11 - Workflow jalan (auto-detect files)
00:12 - manga.json generated (views: 0)
```

### Hari 2:
```
00:00 - Workflow jalan otomatis (daily schedule)
       - Generate manga.json
       - Cek pending views: 5 (threshold: 20) → Belum commit
15:30 - User upload chapter baru
15:31 - Workflow jalan (auto-detect files)
       - Generate manga.json
       - Sync chapters
```

### Hari 3:
```
00:00 - Workflow jalan otomatis
       - Pending views: 22 → Commit ke manga.json!
       - manga.json updated (views: 22)
       - pending-views.json reset to 0
```

---

## 🎯 Checklist Setup Manga Baru

- [ ] Copy `manga-automation.yml` ke `.github/workflows/`
- [ ] Copy `manga-automation.js` ke root repo
- [ ] (Optional) Copy `reset-views.js`
- [ ] Buat/edit `manga-config.json` dengan **views: 0**
- [ ] Upload chapter folders
- [ ] Push ke GitHub / Test lokal
- [ ] Verifikasi manga.json ter-generate dengan views: 0
- [ ] Buat pending-views.json dan pending-chapter-views.json
- [ ] Tambahkan manga ke index website (script.js dan info-manga.js)
- [ ] Test buka website → Info manga → Reader
- [ ] Monitor GitHub Actions

---

## 💡 Tips

1. **Selalu set `views: 0`** di manga-config.json untuk manga baru
2. **Jangan edit manga.json manual** - biarkan workflow yang handle
3. **Cek Actions tab** setiap hari untuk pastikan workflow jalan
4. **Backup manga.json** sebelum reset views
5. **Test di 1 repo dulu** sebelum apply ke semua repo

---

## 🐛 Troubleshooting

### Q: Views tidak reset ke 0 padahal manga baru?
A: Cek manga-config.json - pastikan `"views": 0` dan hapus manga.json lalu generate ulang

### Q: Workflow tidak jalan otomatis?
A: Cek schedule di workflow file - pastikan syntax cron benar: `'0 0 * * *'`

### Q: File baru di-upload tapi workflow tidak jalan?
A: Cek path di workflow - pastikan format file sesuai (jpg, png, webp, jpeg)

### Q: Ingin reset views tapi takut salah?
A: Backup dulu: `cp manga.json manga.json.backup`

---

## 📞 Support

Jika ada masalah:
1. Cek GitHub Actions logs
2. Test manual: `node manga-automation.js generate`
3. Cek syntax JSON di manga-config.json
4. Pastikan Node.js terinstall (v18+)
