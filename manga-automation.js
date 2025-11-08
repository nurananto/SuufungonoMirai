/**
 * MANGA-AUTOMATION.JS - ONESHOT SUPPORT VERSION
 * ✅ Fix: lastChapterUpdate uses LATEST unlocked chapter date (not stuck)
 * ✅ Fix: All timestamps converted to WIB (GMT+7)
 * ✅ NEW: Support for "oneshot" folder
 * 
 * Usage:
 * node manga-automation.js generate                → Generate manga.json
 * node manga-automation.js sync                    → Sync chapters
 * node manga-automation.js update-views            → Update manga views
 * node manga-automation.js update-chapters         → Update chapter views
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================
// CONSTANTS
// ============================================

const VIEW_THRESHOLD = 1;  // Update every 1 manga view (was 20)
const CHAPTER_VIEW_THRESHOLD = 1;  // Update every 1 chapter view (was 10)

// ============================================
// WIB TIMEZONE HELPER (GMT+7)
// ============================================

function getWIBTimestamp() {
    // Use toLocaleString with Asia/Jakarta timezone
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
// NEW: ONESHOT HELPER FUNCTIONS
// ============================================

function isOneshotFolder(folderName) {
    return folderName.toLowerCase() === 'oneshot';
}

function isNumericChapter(folderName) {
    return /^\d+(\.\d+)?$/.test(folderName);
}

function getChapterSortValue(folderName) {
    // Oneshot comes first (value -1)
    if (isOneshotFolder(folderName)) {
        return -1;
    }
    // Numeric chapters use their numeric value
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
        return 0; // Use 0 for oneshot
    }
    return parseFloat(folderName);
}

// ============================================
// COMMAND 1: GENERATE MANGA.JSON
// ============================================

function getChapterFolders() {
    const rootDir = '.';
    
    try {
        const folders = fs.readdirSync(rootDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .filter(dirent => !dirent.name.startsWith('.'))
            .map(dirent => dirent.name)
            .filter(name => {
                // Accept numeric chapters OR "oneshot" folder
                return isNumericChapter(name) || isOneshotFolder(name);
            })
            .sort((a, b) => {
                // Sort by chapter value (oneshot = -1, comes first)
                return getChapterSortValue(a) - getChapterSortValue(b);
            });
        
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

function countImagesInFolder(folderName) {
    const folderPath = path.join('.', folderName);
    
    try {
        const files = fs.readdirSync(folderPath);
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
        });
        
        const icon = isOneshotFolder(folderName) ? '🎯' : '📊';
        console.log(`  ${icon} ${folderName}: ${imageFiles.length} images`);
        return imageFiles.length;
        
    } catch (error) {
        console.error(`  ⚠️  Error reading folder ${folderName}:`, error.message);
        return 0;
    }
}

function checkIfFolderExists(folderName) {
    return fs.existsSync(path.join('.', folderName));
}

function getUploadDate(folderName, isLocked) {
    const folderPath = path.join('.', folderName);
    
    try {
        if (!isLocked) {
            // UNLOCKED: Get date from FIRST IMAGE commit (when images were added)
            const imageGitCommand = `git log --reverse --format=%aI -- "${folderName}/*.jpg" "${folderName}/*.jpeg" "${folderName}/*.png" "${folderName}/*.webp" 2>/dev/null | head -1`;
            const imageResult = execSync(imageGitCommand, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
            
            if (imageResult) {
                const icon = isOneshotFolder(folderName) ? '🎯' : '🖼️';
                console.log(`  ${icon} Using first image commit date for ${folderName}`);
                return convertToWIB(imageResult);
            }
        }
        
        // LOCKED or NO IMAGES: Get folder creation date
        const folderGitCommand = `git log --reverse --format=%aI -- "${folderName}" | head -1`;
        const folderResult = execSync(folderGitCommand, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
        
        if (folderResult) {
            return convertToWIB(folderResult);
        }
        
        // Fallback: Use file system modification time
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
    if (oldChapter && oldChapter.views) {
        return oldChapter.views;
    }
    
    return 0;
}

function generateChaptersData(config, oldMangaData, isFirstTime) {
    const allFolders = getChapterFolders();
    const chapters = {};
    
    // 🔥 AUTO-CLEANUP: Remove old locked chapters that are no longer in config
    let removedLockedChapters = [];
    if (oldMangaData && oldMangaData.chapters) {
        Object.keys(oldMangaData.chapters).forEach(chapterName => {
            const oldChapter = oldMangaData.chapters[chapterName];
            const folderExists = checkIfFolderExists(chapterName);
            const inCurrentConfig = config.lockedChapters.includes(chapterName);
            
            // If chapter was locked, has no folder, and removed from config → delete it
            if (oldChapter.locked && !folderExists && !inCurrentConfig) {
                removedLockedChapters.push(chapterName);
            }
        });
        
        if (removedLockedChapters.length > 0) {
            console.log('\n🗑️  Auto-removing deleted locked chapters...');
            console.log(`   Removed: ${removedLockedChapters.join(', ')}`);
        }
    }
    
    const allChapterNames = new Set([
        ...allFolders,
        ...config.lockedChapters
    ]);
    
    const sortedChapterNames = Array.from(allChapterNames).sort((a, b) => {
        return getChapterSortValue(a) - getChapterSortValue(b);
    });
    
    console.log('\n📖 Processing chapters...');
    
    if (isFirstTime) {
        console.log('🆕 First-time generation detected - setting all views to 0');
    }
    
    const unlockedChaptersWithDates = [];
    
    sortedChapterNames.forEach(chapterName => {
        const folderExists = checkIfFolderExists(chapterName);
        const totalPages = folderExists ? countImagesInFolder(chapterName) : 0;
        
        const isInLockedList = config.lockedChapters.includes(chapterName);
        const isLocked = isInLockedList && totalPages === 0;
        
        // For locked chapters: preserve old date or use NOW if new
        let uploadDate;
        if (isLocked && !folderExists) {
            // Check if chapter existed before
            const oldChapter = oldMangaData && oldMangaData.chapters && oldMangaData.chapters[chapterName];
            if (oldChapter && oldChapter.uploadDate) {
                // Keep old date (locked chapter already existed)
                uploadDate = oldChapter.uploadDate;
                console.log(`🔒 Keeping old date for locked ${chapterName}: ${uploadDate}`);
            } else {
                // New locked chapter - use NOW
                uploadDate = getWIBTimestamp();
                console.log(`🔒 NEW locked chapter ${chapterName}: ${uploadDate}`);
            }
        } else {
            // Unlocked chapter - use folder date
            uploadDate = folderExists ? getUploadDate(chapterName, isLocked) : getWIBTimestamp();
        }
        
        const views = isFirstTime ? 0 : getOldChapterViews(chapterName, oldMangaData);
        
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
        
        if (!isLocked && folderExists) {
            unlockedChaptersWithDates.push({
                chapterName: chapterName,
                uploadDate: uploadDate
            });
        }
        
        const lockIcon = isLocked ? '🔒' : '✅';
        const typeIcon = isOneshotFolder(chapterName) ? '🎯' : '📄';
        const dateStr = uploadDate.split('T')[0];
        console.log(`${lockIcon}${typeIcon} ${chapterName} - ${totalPages} pages - ${dateStr} - ${views} views`);
    });
    
    // AUTO-CLEANUP: Remove uploaded chapters from lockedChapters
    const updatedLockedChapters = config.lockedChapters.filter(chapterName => {
        const folderExists = checkIfFolderExists(chapterName);
        const totalPages = folderExists ? countImagesInFolder(chapterName) : 0;
        return totalPages === 0;
    });
    
    if (updatedLockedChapters.length !== config.lockedChapters.length) {
        console.log('\n🔓 Auto-removing uploaded chapters from lockedChapters...');
        const removed = config.lockedChapters.filter(ch => !updatedLockedChapters.includes(ch));
        console.log(`   Removed: ${removed.join(', ')}`);
        
        config.lockedChapters = updatedLockedChapters;
        
        if (saveJSON('manga-config.json', config)) {
            console.log('✅ manga-config.json updated');
        }
    }
    
    // 🔥 CALCULATE lastChapterUpdate FROM ALL CHAPTERS (unlocked + locked)
    let lastChapterUpdate = null;
    
    // Get ALL chapter dates (including locked)
    const allChapterDates = Object.values(chapters).map(ch => ({
        chapterName: ch.folder,
        uploadDate: ch.uploadDate,
        locked: ch.locked
    }));
    
    if (allChapterDates.length > 0) {
        // Sort by date (newest first)
        allChapterDates.sort((a, b) => {
            return new Date(b.uploadDate) - new Date(a.uploadDate);
        });
        
        // Use the NEWEST chapter (locked or unlocked)
        lastChapterUpdate = allChapterDates[0].uploadDate;
        
        const lockIcon = allChapterDates[0].locked ? '🔒' : '✅';
        console.log(`\n${lockIcon} Last chapter update: ${lastChapterUpdate} (from ${allChapterDates[0].locked ? 'LOCKED' : 'unlocked'} chapter ${allChapterDates[0].chapterName})`);
    } else {
        console.log('\n⚠️  No chapters found, using current date');
        lastChapterUpdate = getWIBTimestamp();
    }
    
    return { chapters, lastChapterUpdate };
}

function commandGenerate() {
    console.log('📚 Generating manga.json...\n');
    
    const config = loadConfig();
    const oldMangaData = loadJSON('manga.json');
    
    const isFirstTime = !oldMangaData || !oldMangaData.manga;
    
    if (isFirstTime) {
        console.log('🆕 First-time generation - creating new manga.json');
    } else {
        console.log('🔄 Updating existing manga.json');
    }
    
    const { chapters, lastChapterUpdate } = generateChaptersData(config, oldMangaData, isFirstTime);
    
    let totalViews = 0;
    let hasChapterChanges = false;
    
    if (oldMangaData && oldMangaData.manga) {
        totalViews = oldMangaData.manga.views || 0;
        
        const oldChapterCount = Object.keys(oldMangaData.chapters || {}).length;
        const newChapterCount = Object.keys(chapters).length;
        
        hasChapterChanges = oldChapterCount !== newChapterCount;
    } else {
        totalViews = config.views || 0;
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
            lockedChapters: config.lockedChapters || []
        },
        chapters: chapters,
        lastUpdated: getWIBTimestamp(),
        lastChapterUpdate: lastChapterUpdate
    };
    
    if (saveJSON('manga.json', mangaJSON)) {
        console.log('\n✅ manga.json generated successfully!');
        console.log(`📊 Stats:`);
        console.log(`   Total chapters: ${Object.keys(chapters).length}`);
        
        const lockedCount = Object.values(chapters).filter(ch => ch.locked).length;
        const unlockedCount = Object.values(chapters).filter(ch => !ch.locked).length;
        const oneshotCount = Object.keys(chapters).filter(ch => isOneshotFolder(ch)).length;
        const totalChapterViews = Object.values(chapters).reduce((sum, ch) => sum + (ch.views || 0), 0);
        
        console.log(`🔒 Locked chapters: ${lockedCount}`);
        console.log(`🔓 Unlocked chapters: ${unlockedCount}`);
        if (oneshotCount > 0) {
            console.log(`🎯 Oneshot chapters: ${oneshotCount}`);
        }
        console.log(`👁️  Total manga views: ${totalViews}`);
        console.log(`👁️  Total chapter views: ${totalChapterViews}`);
        console.log(`📅 Last updated: ${mangaJSON.lastUpdated}`);
        console.log(`📅 Last chapter update: ${mangaJSON.lastChapterUpdate}`);
        
        if (hasChapterChanges) {
            console.log('🆕 Chapter changes detected!');
        }
    } else {
        process.exit(1);
    }
}

// ============================================
// COMMAND 2: SYNC CHAPTERS
// ============================================

function commandSync() {
    console.log('🔄 Starting chapter sync...\n');
    
    const mangaData = loadJSON('manga.json');
    
    if (!mangaData || !mangaData.chapters) {
        console.error('❌ No chapters found in manga.json');
        process.exit(1);
    }
    
    console.log(`📚 manga.json found with ${Object.keys(mangaData.chapters).length} chapters`);
    
    let pendingData = {
        chapters: {},
        lastUpdated: getWIBTimestamp()
    };
    
    const existingPending = loadJSON('pending-chapter-views.json');
    if (existingPending) {
        console.log('📖 Found existing pending-chapter-views.json');
        pendingData.chapters = existingPending.chapters || {};
    } else {
        console.log('📖 Creating new pending-chapter-views.json');
    }
    
    let addedCount = 0;
    const totalChapters = Object.keys(mangaData.chapters).length;
    
    console.log('\n📋 Syncing chapters:');
    
    Object.keys(mangaData.chapters).forEach(chapterKey => {
        if (!pendingData.chapters[chapterKey]) {
            pendingData.chapters[chapterKey] = {
                pendingViews: 0,
                lastIncrement: getWIBTimestamp(),
                lastUpdate: getWIBTimestamp()
            };
            const icon = isOneshotFolder(chapterKey) ? '🎯' : '✓';
            console.log(`  ${icon} Added new chapter: ${chapterKey}`);
            addedCount++;
        } else {
            const icon = isOneshotFolder(chapterKey) ? '🎯' : '✓';
            console.log(`  ${icon} Chapter ${chapterKey} already exists`);
        }
    });
    
    pendingData.lastUpdated = getWIBTimestamp();
    
    if (saveJSON('pending-chapter-views.json', pendingData)) {
        console.log(`\n✅ Sync completed!`);
        console.log(`📊 Total chapters: ${totalChapters}`);
        console.log(`📈 New chapters added: ${addedCount}`);
        console.log(`🕐 Last updated: ${pendingData.lastUpdated}`);
    } else {
        process.exit(1);
    }
}

// ============================================
// COMMAND 3: UPDATE MANGA VIEWS
// ============================================

function commandUpdateViews() {
    console.log('📊 Checking view counter...\n');
    
    const pendingData = loadJSON('pending-views.json');
    const manga = loadJSON('manga.json');
    
    if (!pendingData || !manga) {
        console.error('❌ Required files not found');
        process.exit(1);
    }
    
    const pendingViews = pendingData.pendingViews || 0;
    
    console.log(`📊 Pending views: ${pendingViews}`);
    
    if (pendingViews < VIEW_THRESHOLD) {
        console.log(`⏳ Not enough views yet (${pendingViews}/${VIEW_THRESHOLD}). Waiting...`);
        process.exit(0);
    }
    
    console.log(`✅ Threshold reached! Updating manga.json...`);
    
    manga.manga.views = (manga.manga.views || 0) + pendingViews;
    
    if (saveJSON('manga.json', manga)) {
        pendingData.pendingViews = 0;
        pendingData.lastUpdate = getWIBTimestamp();
        
        if (saveJSON('pending-views.json', pendingData)) {
            console.log(`✅ Views updated! Total: ${manga.manga.views}`);
            console.log(`🔄 Pending views reset to 0`);
        }
    } else {
        process.exit(1);
    }
}

// ============================================
// COMMAND 4: UPDATE CHAPTER VIEWS
// ============================================

function commandUpdateChapterViews() {
    console.log('📖 Checking chapter views counter...\n');
    
    const pendingData = loadJSON('pending-chapter-views.json');
    const manga = loadJSON('manga.json');
    
    if (!pendingData || !manga) {
        console.error('❌ Required files not found');
        process.exit(1);
    }
    
    console.log('📊 Checking pending chapter views...');
    
    let hasChanges = false;
    let updatedChapters = 0;
    let updatedLockedChapters = 0;
    
    Object.keys(pendingData.chapters).forEach(chapterFolder => {
        const pendingChapterData = pendingData.chapters[chapterFolder];
        const pendingViews = pendingChapterData.pendingViews || 0;
        
        if (!manga.chapters[chapterFolder]) {
            console.log(`⚠️  Chapter ${chapterFolder} not found in manga.json`);
            return;
        }
        
        const chapter = manga.chapters[chapterFolder];
        const isLocked = chapter.locked || false;
        const isOneshot = isOneshotFolder(chapterFolder);
        
        if (pendingViews >= CHAPTER_VIEW_THRESHOLD) {
            const lockIcon = isLocked ? '🔒' : '✅';
            const typeIcon = isOneshot ? '🎯' : '';
            
            if (isLocked) {
                console.log(`${lockIcon}${typeIcon} Locked ${chapterFolder}: Threshold reached! (${pendingViews}/${CHAPTER_VIEW_THRESHOLD})`);
                updatedLockedChapters++;
            } else {
                console.log(`${lockIcon}${typeIcon} ${chapterFolder}: Threshold reached! (${pendingViews}/${CHAPTER_VIEW_THRESHOLD})`);
            }
            
            chapter.views = (chapter.views || 0) + pendingViews;
            
            pendingChapterData.pendingViews = 0;
            pendingChapterData.lastUpdate = getWIBTimestamp();
            
            console.log(`   Total views: ${chapter.views}`);
            
            hasChanges = true;
            updatedChapters++;
        } else {
            const icon = isLocked ? '🔒' : '⏳';
            const typeIcon = isOneshot ? '🎯' : '';
            console.log(`${icon}${typeIcon} ${chapterFolder}: Waiting... (${pendingViews}/${CHAPTER_VIEW_THRESHOLD})`);
        }
    });
    
    if (hasChanges) {
        manga.lastUpdated = getWIBTimestamp();
        
        if (saveJSON('manga.json', manga) && saveJSON('pending-chapter-views.json', pendingData)) {
            console.log(`\n✅ Updated ${updatedChapters} chapter(s)!`);
            if (updatedLockedChapters > 0) {
                console.log(`🔒 Including ${updatedLockedChapters} locked chapter(s)`);
            }
            console.log(`🔄 Files written successfully`);
        } else {
            process.exit(1);
        }
    } else {
        console.log(`\n⏳ No chapters reached threshold yet`);
    }
}

// ============================================
// MAIN
// ============================================

function main() {
    const command = process.argv[2];
    
    console.log('╔═══════════════════════════════════════╗');
    console.log('║   MANGA AUTOMATION SCRIPT v4.1 WIB   ║');
    console.log('║  ✅ WIB Timezone (GMT+7)             ║');
    console.log('║  ✅ Fixed lastChapterUpdate          ║');
    console.log('║  🎯 Oneshot Support                  ║');
    console.log('╚═══════════════════════════════════════╝\n');
    
    switch (command) {
        case 'generate':
            commandGenerate();
            break;
        case 'sync':
            commandSync();
            break;
        case 'update-views':
            commandUpdateViews();
            break;
        case 'update-chapters':
            commandUpdateChapterViews();
            break;
        default:
            console.log('Usage:');
            console.log('  node manga-automation.js generate         → Generate manga.json');
            console.log('  node manga-automation.js sync             → Sync chapters');
            console.log('  node manga-automation.js update-views     → Update manga views');
            console.log('  node manga-automation.js update-chapters  → Update chapter views');
            process.exit(1);
    }
}

main();