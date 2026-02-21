/**
 * MANGA-AUTOMATION.JS v7.0 - SIMPLIFIED
 * ✅ Cloudflare Worker Integration (View tracking handled by Worker)
 * ✅ Manifest-based detection
 * ✅ Oneshot support  
 * ✅ Locked chapters
 * ✅ WIB Timezone (GMT+7)
 * 
 * Usage:
 * node manga-automation.js generate → Generate manga.json from chapter folders
 * node manga-automation.js cleanup  → Remove old pending files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================
// WIB TIMEZONE HELPER (GMT+7)
// ============================================

function getWIBTimestamp() {
    const date = new Date();
    const wibStr = date.toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).replace(' ', 'T');
    return wibStr + '+07:00';
}

function convertToWIB(isoString) {
    if (!isoString) return null;
    const date = new Date(isoString);
    const wibStr = date.toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).replace(' ', 'T');
    return wibStr + '+07:00';
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function loadConfig() {
    try {
        const configFile = fs.readFileSync('manga-config.json', 'utf8');
        return JSON.parse(configFile);
    } catch (error) {
        console.error('❌ Error reading manga-config.json:', error.message);
        process.exit(1);
    }
}

function loadJSON(filename) {
    try {
        if (fs.existsSync(filename)) {
            const data = fs.readFileSync(filename, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.warn(`⚠️ Could not read ${filename}:`, error.message);
    }
    return null;
}

function saveJSON(filename, data) {
    try {
        const jsonString = JSON.stringify(data, null, 2);
        fs.writeFileSync(filename, jsonString, 'utf8');
        return true;
    } catch (error) {
        console.error(`❌ Error saving ${filename}:`, error.message);
        return false;
    }
}

// ============================================
// ONESHOT HELPER FUNCTIONS
// ============================================

function isOneshotFolder(folderName) {
    return folderName.toLowerCase() === 'oneshot';
}

function isNumericChapter(folderName) {
    return /^\d+(\.\d+)?$/.test(folderName);
}

function getChapterSortValue(folderName) {
    if (isOneshotFolder(folderName)) {
        return -1;
    }
    return parseFloat(folderName);
}

function getChapterTitle(folderName) {
    if (isOneshotFolder(folderName)) {
        return 'Oneshot';
    }
    return `Chapter ${folderName}`;
}

function getChapterNumber(folderName) {
    if (isOneshotFolder(folderName)) {
        return 0;
    }
    return parseFloat(folderName);
}

// ============================================
// MANIFEST HELPER FUNCTIONS
// ============================================

function loadManifest(folderName) {
    const manifestPath = path.join('.', folderName, 'manifest.json');
    
    try {
        if (fs.existsSync(manifestPath)) {
            const data = fs.readFileSync(manifestPath, 'utf8');
            const manifest = JSON.parse(data);
            return manifest;
        }
    } catch (error) {
        console.warn(`⚠️ Could not read manifest in ${folderName}:`, error.message);
    }
    return null;
}

function getTotalPagesFromManifest(folderName) {
    const manifest = loadManifest(folderName);
    
    if (manifest) {
        const totalPages = manifest.total_pages || manifest.totalPages || 
                          (manifest.pages ? manifest.pages.length : 0);
        
        const icon = isOneshotFolder(folderName) ? '🎯' : '📊';
        console.log(`  ${icon} ${folderName}: ${totalPages} pages (from manifest)`);
        return totalPages;
    }
    
    console.log(`  ⚠️  ${folderName}: No manifest.json found`);
    return 0;
}

// ============================================
// CHAPTER FOLDER FUNCTIONS
// ============================================

function getChapterFolders() {
    const rootDir = '.';
    
    try {
        const folders = fs.readdirSync(rootDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .filter(dirent => !dirent.name.startsWith('.'))
            .map(dirent => dirent.name)
            .filter(name => isNumericChapter(name) || isOneshotFolder(name))
            .sort((a, b) => getChapterSortValue(a) - getChapterSortValue(b));
        
        console.log(`📂 Found ${folders.length} chapter folders`);
        if (folders.some(f => isOneshotFolder(f))) {
            console.log('   🎯 Oneshot detected!');
        }
        return folders;
        
    } catch (error) {
        console.error('❌ Error reading directories:', error.message);
        return [];
    }
}

function checkIfFolderExists(folderName) {
    return fs.existsSync(path.join('.', folderName));
}

function getUploadDate(folderName, isLocked) {
    const folderPath = path.join('.', folderName);
    
    try {
        if (!isLocked) {
            const manifestGitCommand = `git log --reverse --format=%aI -- "${folderName}/manifest.json" 2>/dev/null | head -1`;
            const manifestResult = execSync(manifestGitCommand, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
            
            if (manifestResult) {
                const icon = isOneshotFolder(folderName) ? '🎯' : '📄';
                console.log(`  ${icon} Using manifest.json commit date for ${folderName}`);
                return convertToWIB(manifestResult);
            }
        }
        
        const folderGitCommand = `git log --reverse --format=%aI -- "${folderName}" | head -1`;
        const folderResult = execSync(folderGitCommand, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
        
        if (folderResult) {
            return convertToWIB(folderResult);
        }
        
        const stats = fs.statSync(folderPath);
        return convertToWIB(stats.mtime.toISOString());
    } catch (error) {
        console.log(`⚠️  Could not get upload date for ${folderName}, using current date`);
        return getWIBTimestamp();
    }
}

function getOldChapterViews(chapterName, oldMangaData) {
    if (!oldMangaData || !oldMangaData.chapters) {
        return 0;
    }
    
    const oldChapter = oldMangaData.chapters[chapterName];
    if (oldChapter && oldChapter.views !== undefined) {
        return oldChapter.views;
    }
    
    return 0;
}

// ============================================
// GENERATECHAPTERS DATA
// ============================================

function generateChaptersData(config, oldMangaData) {
    const allFolders = getChapterFolders();
    const chapters = {};
    
    // Auto-remove deleted locked chapters
    let removedLockedChapters = [];
    if (oldMangaData && oldMangaData.chapters) {
        Object.keys(oldMangaData.chapters).forEach(chapterName => {
            const oldChapter = oldMangaData.chapters[chapterName];
            const folderExists = checkIfFolderExists(chapterName);
            const inCurrentConfig = config.lockedChapters.includes(chapterName);
            
            if (oldChapter.locked && !folderExists && !inCurrentConfig) {
                removedLockedChapters.push(chapterName);
            }
        });
        
        if (removedLockedChapters.length > 0) {
            console.log('\n🗑️  Auto-removing deleted locked chapters...');
            console.log(`   Removed: ${removedLockedChapters.join(', ')}`);
        }
    }
    
    // Combine all chapter names
    const allChapterNames = new Set([
        ...allFolders,
        ...config.lockedChapters
    ]);
    
    const sortedChapterNames = Array.from(allChapterNames).sort((a, b) => {
        return getChapterSortValue(a) - getChapterSortValue(b);
    });
    
    console.log('\n📖 Processing chapters...');
    
    sortedChapterNames.forEach(chapterName => {
        const folderExists = checkIfFolderExists(chapterName);
        const totalPages = folderExists ? getTotalPagesFromManifest(chapterName) : 0;
        
        const isInLockedList = config.lockedChapters.includes(chapterName);
        const isLocked = isInLockedList;
        
        let uploadDate;
        if (isLocked && !folderExists) {
            const oldChapter = oldMangaData && oldMangaData.chapters && oldMangaData.chapters[chapterName];
            if (oldChapter && oldChapter.uploadDate) {
                uploadDate = oldChapter.uploadDate;
                console.log(`🔒 Keeping old date for locked ${chapterName}: ${uploadDate}`);
            } else {
                uploadDate = getWIBTimestamp();
                console.log(`🔒 NEW locked chapter ${chapterName}: ${uploadDate}`);
            }
        } else {
            uploadDate = folderExists ? getUploadDate(chapterName, isLocked) : getWIBTimestamp();
        }
        
        // ✅ PRESERVE OLD VIEWS (Worker will increment these)
        const views = getOldChapterViews(chapterName, oldMangaData);
        
        chapters[chapterName] = {
            title: getChapterTitle(chapterName),
            chapter: getChapterNumber(chapterName),
            folder: chapterName,
            uploadDate: uploadDate,
            totalPages: totalPages,
            pages: totalPages,
            locked: isLocked,
            views: views
        };
        
        const lockIcon = isLocked ? '🔒' : '✅';
        const typeIcon = isOneshotFolder(chapterName) ? '🎯' : '📄';
        const dateStr = uploadDate.split('T')[0];
        console.log(`${lockIcon}${typeIcon} ${chapterName} - ${totalPages} pages - ${dateStr} - ${views} views`);
    });
    
    // Calculate last chapter update
    let lastChapterUpdate = null;
    
    const allChapterDates = Object.values(chapters).map(ch => ({
        chapterName: ch.folder,
        uploadDate: ch.uploadDate,
        locked: ch.locked
    }));
    
    if (allChapterDates.length > 0) {
        allChapterDates.sort((a, b) => {
            return new Date(b.uploadDate) - new Date(a.uploadDate);
        });
        
        lastChapterUpdate = allChapterDates[0].uploadDate;
        
        const lockIcon = allChapterDates[0].locked ? '🔒' : '✅';
        console.log(`\n${lockIcon} Last chapter update: ${lastChapterUpdate} (from ${allChapterDates[0].locked ? 'LOCKED' : 'unlocked'} chapter ${allChapterDates[0].chapterName})`);
    } else {
        console.log('\n⚠️  No chapters found, using current date');
        lastChapterUpdate = getWIBTimestamp();
    }
    
    return { chapters, lastChapterUpdate };
}

// ============================================
// COMMAND 1: GENERATE MANGA.JSON
// ============================================

function commandGenerate() {
    console.log('📚 Generating manga.json...\n');
    
    const config = loadConfig();
    const oldMangaData = loadJSON('manga.json');
    
    if (!oldMangaData || !oldMangaData.manga) {
        console.log('🆕 First-time generation - creating new manga.json');
    } else {
        console.log('🔄 Updating existing manga.json (preserving views)');
    }
    
    const { chapters, lastChapterUpdate } = generateChaptersData(config, oldMangaData);
    
    // ✅ PRESERVE OLD TOTAL VIEWS (Worker will increment these)
    let totalViews = 0;
    if (oldMangaData && oldMangaData.manga && oldMangaData.manga.views !== undefined) {
        totalViews = oldMangaData.manga.views;
        console.log(`\n💡 Preserved total views: ${totalViews}`);
    } else {
        totalViews = config.views || 0;
        console.log(`\n🆕 Initial views from config: ${totalViews}`);
    }
    
    const repoUrl = `https://raw.githubusercontent.com/${config.repoOwner}/${config.repoName}/main/`;
    
    const mangaJSON = {
        manga: {
            title: config.title,
            alternativeTitle: config.alternativeTitle,
            cover: config.cover,
            description: config.description,
            author: config.author,
            artist: config.artist,
            genre: config.genre,
            status: config.status,
            views: totalViews,
            links: config.links,
            repoUrl: repoUrl,
            imagePrefix: config.imagePrefix || 'Image',
            imageFormat: config.imageFormat || 'jpg',
            lockedChapters: config.lockedChapters || [],
            type: config.type || 'manga'
        },
        chapters: chapters,
        lastUpdated: getWIBTimestamp(),
        lastChapterUpdate: lastChapterUpdate
    };
    
    if (config.status === 'END' && config.endChapter) {
        mangaJSON.manga.endChapter = config.endChapter;
        console.log(`🏁 Status: END - endChapter: ${config.endChapter}`);
    } else if (config.status === 'END' && !config.endChapter) {
        console.warn('⚠️ Status is END but endChapter not set in manga-config.json!');
    }
    
    if (saveJSON('manga.json', mangaJSON)) {
        console.log('\n✅ manga.json generated successfully!');
        console.log(`📊 Stats:`);
        console.log(`   Total chapters: ${Object.keys(chapters).length}`);
        
        const lockedCount = Object.values(chapters).filter(ch => ch.locked).length;
        const unlockedCount = Object.values(chapters).filter(ch => !ch.locked).length;
        const oneshotCount = Object.keys(chapters).filter(ch => isOneshotFolder(ch)).length;
        const totalChapterViews = Object.values(chapters).reduce((sum, ch) => sum + (ch.views || 0), 0);
        
        console.log(`   🔒 Locked chapters: ${lockedCount}`);
        console.log(`   🔓 Unlocked chapters: ${unlockedCount}`);
        if (oneshotCount > 0) {
            console.log(`   🎯 Oneshot chapters: ${oneshotCount}`);
        }
        console.log(`   👁️  Total manga views: ${totalViews}`);
        console.log(`   👁️  Total chapter views: ${totalChapterViews}`);
        console.log(`   📅 Last updated: ${mangaJSON.lastUpdated}`);
        console.log(`   📅 Last chapter update: ${mangaJSON.lastChapterUpdate}`);
        console.log(`   📱 Type: ${mangaJSON.manga.type}`);
        console.log('\n💡 Views are managed by Cloudflare Worker (updated daily at 00:00 WIB)');
    } else {
        process.exit(1);
    }
}

// ============================================
// COMMAND 2: CLEANUP OLD FILES
// ============================================

function commandCleanup() {
    console.log('🗑️  Cleaning up old pending files...\n');
    
    const filesToRemove = [
        'pending-views.json',
        'pending-chapter-views.json'
        // ⚠️ TIDAK HAPUS daily-views.json!
        // File ini dibutuhkan untuk trending (updated by Cloudflare Worker)
    ];
    
    let removed = 0;
    
    filesToRemove.forEach(filename => {
        if (fs.existsSync(filename)) {
            try {
                fs.unlinkSync(filename);
                console.log(`✅ Removed ${filename}`);
                removed++;
            } catch (error) {
                console.warn(`⚠️ Could not remove ${filename}:`, error.message);
            }
        } else {
            console.log(`ℹ️  ${filename} not found (already clean)`);
        }
    });
    
    // Check if daily-views.json exists
    if (fs.existsSync('daily-views.json')) {
        console.log(`ℹ️  daily-views.json kept (managed by Cloudflare Worker)`);
    }
    
    if (removed > 0) {
        console.log(`\n✅ Cleanup complete! Removed ${removed} file(s)`);
        console.log('💡 View tracking is now handled by Cloudflare Worker');
    } else {
        console.log('\n✅ No old files to remove');
    }
}

// ============================================
// MAIN
// ============================================

function main() {
    const command = process.argv[2];
    
    console.log('╔════════════════════════════════════════╗');
    console.log('║ MANGA AUTOMATION v7.0 - SIMPLIFIED    ║');
    console.log('║ ✅ Cloudflare Worker Integration      ║');
    console.log('║ ✅ WIB Timezone (GMT+7)               ║');
    console.log('║ ✅ Manifest-based Detection           ║');
    console.log('║ 🎯 Oneshot Support                    ║');
    console.log('║ 🔒 Locked Chapters                     ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    switch (command) {
        case 'generate':
            commandGenerate();
            break;
        case 'cleanup':
            commandCleanup();
            break;
        default:
            console.log('Usage:');
            console.log('  node manga-automation.js generate → Generate manga.json from chapter folders');
            console.log('  node manga-automation.js cleanup  → Remove old pending files');
            console.log('');
            console.log('💡 View tracking is now handled by Cloudflare Worker');
            console.log('   Worker updates manga.json daily at 00:00 WIB');
            process.exit(1);
    }
}

main();
