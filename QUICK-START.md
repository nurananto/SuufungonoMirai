# 🚀 QUICK START GUIDE

## Pilih File Mana?

### Untuk REPO BARU (Manga Baru):
```
✅ manga-automation-daily.yml    → Workflow (update setiap hari)
✅ manga-automation.js            → Script all-in-one
✅ reset-views.js                 → (Optional) Untuk reset manual
```

### Untuk REPO LAMA (Update dari sistem lama):
```
✅ MIGRATION-GUIDE.md             → Baca ini dulu!
```

---

## 📦 Setup Manga Baru (5 Menit)

### 1. Download File
- [manga-automation-daily.yml](manga-automation-daily.yml)
- [manga-automation.js](manga-automation.js)
- [reset-views.js](reset-views.js) ← Optional

### 2. Struktur Repo
```
MangaBaru/
├── .github/
│   └── workflows/
│       └── manga-automation.yml   ← Rename dari manga-automation-daily.yml
├── 1/                             ← Chapter folders
│   ├── Image1.jpg
│   ├── Image2.jpg
│   └── ...
├── 2/
├── manga-automation.js            ← Script
├── reset-views.js                 ← Optional
└── manga-config.json              ← Buat file ini
```

### 3. Buat manga-config.json
```json
{
  "title": "Judul Manga",
  "alternativeTitle": "Alternative Title",
  "cover": "https://url-cover.jpg",
  "description": "Sinopsis manga...",
  "author": "Author Name",
  "artist": "Artist Name",
  "genre": ["Romance", "Comedy"],
  "status": "Ongoing",
  "views": 0,
  "links": {
    "mangadex": "https://...",
    "raw": "https://..."
  },
  "repoOwner": "username-github",
  "repoName": "MangaBaru",
  "imagePrefix": "Image",
  "imageFormat": "jpg",
  "lockedChapters": []
}
```

### 4. Push ke GitHub
```bash
git add .
git commit -m "Initial setup"
git push
```

### 5. Cek GitHub Actions
- Buka repo → Tab **Actions**
- Workflow "Manga Automation" akan jalan otomatis
- Tunggu sampai selesai (✅ hijau)
- File `manga.json` akan ter-generate otomatis

### 6. Buat Pending Files
Buat 2 file ini di repo:

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

Atau jalankan lokal:
```bash
node manga-automation.js sync
git add .
git commit -m "Add pending files"
git push
```

### 7. Tambahkan ke Website
Edit file di **repo utama** (NuranantoScanlation):

**script.js:**
```javascript
const mangaList = [
  {
    title: 'Judul Manga',
    cover: 'covers/manga-cover.jpg',
    repo: 'MangaBaru'  // Nama repo
  },
  // ...
];
```

**info-manga.js:**
```javascript
const MANGA_REPOS = {
    'MangaBaru': 'https://raw.githubusercontent.com/username/MangaBaru/main/manga.json',
    // ...
};
```

### 8. DONE! 🎉
Website otomatis update setiap:
- ✅ Ada file baru di-upload
- ✅ Setiap hari jam 00:00 UTC (07:00 WIB)
- ✅ Manual trigger

---

## ⚙️ Fitur Automation

### Workflow Otomatis Jalan Ketika:
1. **Upload file baru** (*.jpg, *.png, *.webp, *.jpeg)
2. **Edit manga-config.json**
3. **Setiap hari jam 00:00 UTC** (07:00 WIB)
4. **Manual trigger** (di GitHub Actions)

### Yang Dilakukan Workflow:
1. 📚 Generate/update manga.json
2. 🔄 Sync chapters baru
3. 📊 Cek pending manga views (threshold: 20)
4. 📖 Cek pending chapter views (threshold: 10)
5. 💾 Auto-commit changes

### Views Counter:
- **First-time**: Semua views = 0 otomatis
- **Update selanjutnya**: Preserve views lama
- **Pending views ≥ 20**: Auto-commit ke manga.json
- **Pending chapter views ≥ 10**: Auto-commit per chapter

---

## 🔄 Reset Views (Jika Diperlukan)

### Kapan Perlu Reset?
- Mulai hitung views dari 0 lagi
- Testing view counter
- Data corrupt

### Cara Reset:
```bash
# 1. Jalankan script
node reset-views.js

# 2. Konfirmasi
Ketik "RESET" untuk konfirmasi: RESET

# 3. Generate ulang
node manga-automation.js generate

# 4. Push
git add .
git commit -m "Reset views to 0"
git push
```

---

## 📝 Command Manual (Optional)

Jika ingin jalankan manual (di lokal):

```bash
# Generate manga.json
node manga-automation.js generate

# Sync chapters
node manga-automation.js sync

# Update manga views (cek threshold)
node manga-automation.js update-views

# Update chapter views (cek threshold)
node manga-automation.js update-chapters

# Reset semua views
node reset-views.js
```

---

## 🎯 Checklist

Setup manga baru:
- [ ] Download 3 file (workflow, script, reset)
- [ ] Buat manga-config.json
- [ ] Upload chapter folders
- [ ] Push ke GitHub
- [ ] Cek Actions → manga.json ter-generate
- [ ] Buat pending-views.json dan pending-chapter-views.json
- [ ] Tambah ke website (script.js dan info-manga.js)
- [ ] Test buka website

---

## 💡 Tips

- **Views = 0**: Otomatis untuk manga baru, tidak perlu setting
- **Schedule**: Update setiap hari jam 07:00 WIB otomatis
- **Auto-detect**: Upload file baru → workflow jalan otomatis
- **Testing**: Gunakan "Run workflow" di Actions tab
- **Monitoring**: Cek Actions tab untuk lihat log workflow

---

## ❓ FAQ

**Q: Apakah harus hapus manga.json lama?**
A: Tidak perlu. Script otomatis detect:
   - Jika manga.json tidak ada → Views = 0
   - Jika manga.json ada → Preserve views lama

**Q: Bagaimana cara tahu workflow jalan?**
A: Cek tab Actions di GitHub. Akan ada notifikasi ✅ atau ❌

**Q: Workflow tidak jalan otomatis?**
A: Pastikan file workflow ada di `.github/workflows/` dan syntax YAML benar

**Q: Bisa ubah schedule?**
A: Edit workflow file, ubah cron:
   ```yaml
   cron: '0 0 * * *'  # Setiap hari
   cron: '0 */12 * * *'  # Setiap 12 jam
   cron: '0 0 */2 * *'  # Setiap 2 hari
   ```

**Q: Pending views tidak update?**
A: Cek Google Apps Script URL di website (info-manga.js dan reader.js)

**Q: Ingin test tanpa nunggu schedule?**
A: GitHub → Actions → Manga Automation → Run workflow

---

## 📚 Dokumentasi Lengkap

- [DAILY-UPDATE-GUIDE.md](DAILY-UPDATE-GUIDE.md) → Penjelasan detail fitur daily update
- [MIGRATION-GUIDE.md](MIGRATION-GUIDE.md) → Migrasi dari sistem lama

---

## 🎉 Selesai!

Sistem otomasi sudah aktif! Anda tinggal:
1. Upload chapter baru → Otomatis ter-detect
2. Tunggu views terkumpul → Otomatis commit
3. Santai ☕

Website dan data views ter-update otomatis setiap hari! 🚀
