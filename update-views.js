const fs = require('fs');

// Threshold untuk commit (20 views)
const VIEW_THRESHOLD = 20;

console.log('🔍 Checking view counter...');

try {
    // Read pending views
    const pendingData = JSON.parse(fs.readFileSync('pending-views.json', 'utf8'));
    const pendingViews = pendingData.pendingViews || 0;
    
    console.log(`📊 Pending views: ${pendingViews}`);
    
    // Check if we need to commit
    if (pendingViews < VIEW_THRESHOLD) {
        console.log(`⏳ Not enough views yet (${pendingViews}/${VIEW_THRESHOLD}). Waiting...`);
        process.exit(0);
    }
    
    console.log(`✅ Threshold reached! Updating manga.json...`);
    
    // Read manga.json
    const mangaData = JSON.parse(fs.readFileSync('manga.json', 'utf8'));
    
    // Update total views
    mangaData.manga.views = (mangaData.manga.views || 0) + pendingViews;
    
    // Write updated manga.json
    fs.writeFileSync('manga.json', JSON.stringify(mangaData, null, 2));
    
    // Reset pending views
    pendingData.pendingViews = 0;
    pendingData.lastUpdate = new Date().toISOString();
    fs.writeFileSync('pending-views.json', JSON.stringify(pendingData, null, 2));
    
    console.log(`✅ Views updated! Total: ${mangaData.manga.views}`);
    console.log(`🔄 Pending views reset to 0`);
    
} catch (error) {
    console.error('❌ Error updating views:', error);
    process.exit(1);
}