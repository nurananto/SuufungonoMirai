/**
 * SYNC-PENDING-CHAPTERS.JS
 * Auto-sync pending-chapter-views.json dengan manga.json
 * Jalankan otomatis di GitHub Actions setiap kali ada perubahan
 */

const fs = require('fs');

console.log('🔄 Starting chapter sync...\n');

try {
  // Baca manga.json
  if (!fs.existsSync('manga.json')) {
    throw new Error('manga.json not found');
  }
  
  const mangaData = JSON.parse(fs.readFileSync('manga.json', 'utf8'));
  
  if (!mangaData || !mangaData.chapters) {
    throw new Error('No chapters found in manga.json');
  }
  
  console.log(`📚 manga.json found with ${Object.keys(mangaData.chapters).length} chapters`);
  
  // Baca atau buat pending-chapter-views.json
  let pendingData = {
    chapters: {},
    lastUpdated: new Date().toISOString()
  };
  
  if (fs.existsSync('pending-chapter-views.json')) {
    console.log('📖 Found existing pending-chapter-views.json');
    const existingData = JSON.parse(fs.readFileSync('pending-chapter-views.json', 'utf8'));
    pendingData.chapters = existingData.chapters || {};
  } else {
    console.log('📖 Creating new pending-chapter-views.json');
  }
  
  // Sync chapter dari manga.json
  let addedCount = 0;
  let totalChapters = Object.keys(mangaData.chapters).length;
  
  console.log('\n📋 Syncing chapters:');
  
  Object.keys(mangaData.chapters).forEach(chapterKey => {
    if (!pendingData.chapters[chapterKey]) {
      pendingData.chapters[chapterKey] = {
        pendingViews: 0,
        lastIncrement: new Date().toISOString(),
        lastUpdate: new Date().toISOString()
      };
      console.log(`  ✓ Added new chapter: ${chapterKey}`);
      addedCount++;
    } else {
      console.log(`  ✓ Chapter ${chapterKey} already exists`);
    }
  });
  
  // Update timestamp
  pendingData.lastUpdated = new Date().toISOString();
  
  // Simpan file
  fs.writeFileSync('pending-chapter-views.json', JSON.stringify(pendingData, null, 2));
  
  console.log(`\n✅ Sync completed!`);
  console.log(`📊 Total chapters: ${totalChapters}`);
  console.log(`📈 New chapters added: ${addedCount}`);
  console.log(`🕐 Last updated: ${pendingData.lastUpdated}`);
  
  // Kalau ada chapter baru, exit dengan kode khusus
  if (addedCount > 0) {
    console.log('\n⚠️  New chapters detected - consider committing changes');
    process.exit(0);
  } else {
    console.log('\n✓ No changes needed');
    process.exit(0);
  }
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
