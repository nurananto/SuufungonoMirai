const fs = require('fs');

// Threshold untuk commit chapter views (10 views per chapter)
const CHAPTER_VIEW_THRESHOLD = 10;

console.log('🔍 Checking chapter views counter...');

try {
    // Read pending chapter views
    const pendingData = JSON.parse(fs.readFileSync('pending-chapter-views.json', 'utf8'));
    const manga = JSON.parse(fs.readFileSync('manga.json', 'utf8'));
    
    console.log('📊 Pending chapter views:', pendingData);
    
    let hasChanges = false;
    let updatedChapters = 0;
    
    // Iterate through pending chapters
    Object.keys(pendingData.chapters).forEach(chapterFolder => {
        const pendingChapterData = pendingData.chapters[chapterFolder];
        const pendingViews = pendingChapterData.pendingViews || 0;
        
        // Check if chapter exists in manga.json
        if (!manga.chapters[chapterFolder]) {
            console.log(`⚠️  Chapter ${chapterFolder} not found in manga.json`);
            return;
        }
        
        // Get chapter data
        const chapter = manga.chapters[chapterFolder];
        
        // Check if threshold reached
        if (pendingViews >= CHAPTER_VIEW_THRESHOLD) {
            console.log(`✅ Chapter ${chapterFolder}: Threshold reached! (${pendingViews}/${CHAPTER_VIEW_THRESHOLD})`);
            
            // Update views
            chapter.views = (chapter.views || 0) + pendingViews;
            
            // Reset pending
            pendingChapterData.pendingViews = 0;
            pendingChapterData.lastUpdate = new Date().toISOString();
            
            console.log(`   Total views: ${chapter.views}`);
            
            hasChanges = true;
            updatedChapters++;
        } else {
            console.log(`⏳ Chapter ${chapterFolder}: Waiting... (${pendingViews}/${CHAPTER_VIEW_THRESHOLD})`);
        }
    });
    
    if (hasChanges) {
        // Update lastUpdated in manga.json
        manga.lastUpdated = new Date().toISOString();
        
        // Write updated files
        fs.writeFileSync('manga.json', JSON.stringify(manga, null, 2));
        fs.writeFileSync('pending-chapter-views.json', JSON.stringify(pendingData, null, 2));
        
        console.log(`✅ Updated ${updatedChapters} chapter(s)!`);
        console.log(`🔄 Files written successfully`);
    } else {
        console.log(`⏳ No chapters reached threshold yet`);
    }
    
} catch (error) {
    console.error('❌ Error updating chapter views:', error);
    process.exit(1);
}
