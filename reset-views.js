/**
 * RESET-VIEWS.JS
 * Script untuk reset semua views ke 0 (fresh start)
 * 
 * PERINGATAN: Script ini akan menghapus SEMUA data views!
 * 
 * Usage:
 * node reset-views.js
 */

const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('═══════════════════════════════════════');
console.log('         RESET VIEWS - WARNING!        ');
console.log('═══════════════════════════════════════\n');

console.log('⚠️  Script ini akan:');
console.log('   1. Reset manga views ke 0');
console.log('   2. Reset semua chapter views ke 0');
console.log('   3. Reset pending views ke 0');
console.log('   4. Reset pending chapter views ke 0');
console.log('\n🚨 SEMUA DATA VIEWS AKAN HILANG!\n');

rl.question('Apakah Anda yakin? Ketik "RESET" untuk konfirmasi: ', (answer) => {
    if (answer !== 'RESET') {
        console.log('\n❌ Reset dibatalkan. Tidak ada perubahan.');
        rl.close();
        return;
    }
    
    console.log('\n🔄 Starting reset process...\n');
    
    try {
        // 1. Reset manga.json
        if (fs.existsSync('manga.json')) {
            const mangaData = JSON.parse(fs.readFileSync('manga.json', 'utf8'));
            
            // Reset manga views
            mangaData.manga.views = 0;
            
            // Reset all chapter views
            Object.keys(mangaData.chapters).forEach(chapterKey => {
                mangaData.chapters[chapterKey].views = 0;
            });
            
            mangaData.lastUpdated = new Date().toISOString();
            
            fs.writeFileSync('manga.json', JSON.stringify(mangaData, null, 2));
            console.log('✅ manga.json views reset');
        } else {
            console.log('⚠️  manga.json not found - skipping');
        }
        
        // 2. Reset pending-views.json
        const pendingViews = {
            pendingViews: 0,
            lastIncrement: new Date().toISOString(),
            lastUpdate: new Date().toISOString()
        };
        
        fs.writeFileSync('pending-views.json', JSON.stringify(pendingViews, null, 2));
        console.log('✅ pending-views.json reset');
        
        // 3. Reset pending-chapter-views.json
        if (fs.existsSync('pending-chapter-views.json')) {
            const pendingChapters = JSON.parse(fs.readFileSync('pending-chapter-views.json', 'utf8'));
            
            Object.keys(pendingChapters.chapters).forEach(chapterKey => {
                pendingChapters.chapters[chapterKey].pendingViews = 0;
                pendingChapters.chapters[chapterKey].lastUpdate = new Date().toISOString();
            });
            
            pendingChapters.lastUpdated = new Date().toISOString();
            
            fs.writeFileSync('pending-chapter-views.json', JSON.stringify(pendingChapters, null, 2));
            console.log('✅ pending-chapter-views.json reset');
        } else {
            console.log('⚠️  pending-chapter-views.json not found - skipping');
        }
        
        console.log('\n═══════════════════════════════════════');
        console.log('         RESET COMPLETE!               ');
        console.log('═══════════════════════════════════════');
        console.log('\n📊 All views have been reset to 0');
        console.log('🔄 Run "node manga-automation.js generate" to update manga.json');
        console.log('💾 Don\'t forget to commit and push changes!\n');
        
    } catch (error) {
        console.error('\n❌ Error during reset:', error.message);
        process.exit(1);
    }
    
    rl.close();
});
