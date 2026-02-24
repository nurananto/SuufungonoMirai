const fs = require('fs');
const path = require('path');

/**
 * Script untuk menggabungkan pending views ke dalam manga.json
 * dan menghapus file pending setelah selesai
 */

const MANGA_JSON = 'manga.json';
const PENDING_VIEWS_JSON = 'pending-views.json';
const PENDING_CHAPTER_VIEWS_JSON = 'pending-chapter-views.json';

function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`⚠️  File ${filePath} tidak ditemukan, skip...`);
      return null;
    }
    throw error;
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Berhasil menghapus ${filePath}`);
      return true;
    } else {
      console.log(`⚠️  File ${filePath} tidak ditemukan, skip delete...`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Gagal menghapus ${filePath}:`, error.message);
    return false;
  }
}

function mergePendingViews() {
  console.log('🚀 Memulai proses merge pending views...\n');

  // Baca manga.json
  const mangaData = readJsonFile(MANGA_JSON);
  if (!mangaData) {
    console.error('❌ manga.json tidak ditemukan! Proses dihentikan.');
    process.exit(1);
  }

  let hasChanges = false;
  let totalMangaViewsAdded = 0;
  let totalChapterViewsAdded = 0;

  // Proses pending-views.json (untuk total manga views)
  const pendingViews = readJsonFile(PENDING_VIEWS_JSON);
  if (pendingViews && pendingViews.pendingViews > 0) {
    const viewsToAdd = pendingViews.pendingViews;
    mangaData.manga.views = (mangaData.manga.views || 0) + viewsToAdd;
    totalMangaViewsAdded = viewsToAdd;
    hasChanges = true;
    console.log(`📊 Menambahkan ${viewsToAdd} views ke total manga views`);
    console.log(`   Total views sekarang: ${mangaData.manga.views}\n`);
  }

  // Proses pending-chapter-views.json (untuk views per chapter)
  const pendingChapterViews = readJsonFile(PENDING_CHAPTER_VIEWS_JSON);
  if (pendingChapterViews && pendingChapterViews.chapters) {
    console.log('📖 Memproses pending chapter views...');
    
    for (const [chapterId, chapterData] of Object.entries(pendingChapterViews.chapters)) {
      if (chapterData.pendingViews > 0) {
        if (mangaData.chapters[chapterId]) {
          const viewsToAdd = chapterData.pendingViews;
          mangaData.chapters[chapterId].views = (mangaData.chapters[chapterId].views || 0) + viewsToAdd;
          totalChapterViewsAdded += viewsToAdd;
          hasChanges = true;
          console.log(`   Chapter ${chapterId}: +${viewsToAdd} views → ${mangaData.chapters[chapterId].views} total`);
        } else {
          console.warn(`   ⚠️  Chapter ${chapterId} tidak ditemukan di manga.json`);
        }
      }
    }
    console.log();
  }

  // Simpan perubahan jika ada
  if (hasChanges) {
    writeJsonFile(MANGA_JSON, mangaData);
    console.log('✅ Berhasil menyimpan perubahan ke manga.json');
    console.log(`📈 Summary:`);
    console.log(`   - Total manga views ditambahkan: ${totalMangaViewsAdded}`);
    console.log(`   - Total chapter views ditambahkan: ${totalChapterViewsAdded}`);
    console.log();

    // Hapus file pending setelah berhasil merge
    console.log('🗑️  Menghapus file pending...');
    deleteFile(PENDING_VIEWS_JSON);
    deleteFile(PENDING_CHAPTER_VIEWS_JSON);
    
    console.log('\n✨ Proses selesai! Semua pending views telah digabungkan.');
  } else {
    console.log('ℹ️  Tidak ada pending views yang perlu ditambahkan.');
  }

  return hasChanges;
}

// Jalankan script
try {
  const hasChanges = mergePendingViews();
  process.exit(hasChanges ? 0 : 0); // Exit code 0 untuk success
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
