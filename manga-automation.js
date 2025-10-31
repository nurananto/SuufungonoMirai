/**
 * MANGA-AUTOMATION.JS - FIXED VERSION
 * ✅ Fix: lastChapterUpdate uses LATEST unlocked chapter date (not stuck)
 * ✅ Fix: All timestamps converted to WIB (GMT+7)
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

const VIEW_THRESHOLD = 20;
const CHAPTER_VIEW_THRESHOLD = 10;

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
// COMMAND 1: GENERATE MANGA.JSON
// ============================================

function getChapterFolders() {
    const rootDir = '.';
    
    try {
        const folders = fs.readdirSync(rootDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .filter(dirent => !dirent.name.startsWith('.'))
            .map(dirent => dirent.name)
            .filter(name => /^\d+(\.\d+)?$/.test(name))
            .sort((a, b) => parseFloat(a) - parseFloat(b));
        
        console.log(`📂 Found ${folders.length} chapter folders`);
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
        
        console.log(`  📊 ${folderName}: ${imageFiles.length} images`);
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
        // ============================================
        // FIX: Different logic for locked vs unlocked
        // ============================================
        
        if (!isLocked) {
            // UNLOCKED: Get date from FIRST IMAGE commit (when images were added)
            const imageGitCommand = `git log --reverse --format=%aI -- "${folderName}/*.jpg" "${folderName}/*.jpeg" "${folderName}/*.png" "${folderName}/*.webp" 2>/dev/null | head -1`;
            const imageResult = execSync(imageGitCommand, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
            
            if (imageResult) {
                // Convert to WIB timezone
                console.log(`  🖼️  Using first image commit date for ${folderName}`);
                return convertToWIB(imageResult);
            }
        }
        
        // LOCKED or NO IMAGES: Get folder creation date
        const folderGitCommand = `git log --reverse --format=%aI -- "${folderName}" | head -1`;
        const folderResult = execSync(folderGitCommand, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
        
        if (folderResult) {
            // Convert to WIB timezone
            return convertToWIB(folderResult);
        }
        
        // Fallback: Use file system modification time
        const stats = fs.statSync(folderPath);
        return convertToWIB(stats.mtime.toISOString());
    } catch (error) {
        // Fallback: Use current date in WIB
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
    
    const allChapterNames = new Set([
        ...allFolders,
        ...config.lockedChapters
    ]);
    
    const sortedChapterNames = Array.from(allChapterNames).sort((a, b) => {
        return parseFloat(a) - parseFloat(b);
    });
    
    console.log('\n📖 Processing chapters...');
    
    if (isFirstTime) {
        console.log('🆕 First-time generation detected - setting all views to 0');
    }
    
    // ============================================
    // FIX: Collect ALL unlocked chapters with their dates
    // ============================================
    const unlockedChaptersWithDates = [];
    
    sortedChapterNames.forEach(chapterName => {
        const folderExists = checkIfFolderExists(chapterName);
        const totalPages = folderExists ? countImagesInFolder(chapterName) : 0;
        
        // ============================================
        // FIX: Chapter is locked ONLY if:
        // 1. In lockedChapters list AND
        // 2. Folder doesn't exist OR has no images
        // ============================================
        const isInLockedList = config.lockedChapters.includes(chapterName);
        const isLocked = isInLockedList && totalPages === 0;
        
        const uploadDate = folderExists ? getUploadDate(chapterName, isLocked) : getWIBTimestamp();
        
        // Preserve views from old data
        const views = isFirstTime ? 0 : getOldChapterViews(chapterName, oldMangaData);
        
        chapters[chapterName] = {
            title: `Chapter ${chapterName}`,
            chapter: parseFloat(chapterName),
            folder: chapterName,
            uploadDate: uploadDate,
            totalPages: totalPages,
            pages: totalPages,
            locked: isLocked,
            views: views
        };
        
        // ✅ COLLECT all unlocked chapters with dates
        if (!isLocked && folderExists) {
            unlockedChaptersWithDates.push({
                chapterName: chapterName,
                uploadDate: uploadDate
            });
        }
        
        const lockIcon = isLocked ? '🔒' : '✅';
        const dateStr = uploadDate.split('T')[0];
        console.log(`${lockIcon} ${chapterName} - ${totalPages} pages - ${dateStr} - ${views} views`);
    });
    
    // ============================================
    // AUTO-CLEANUP: Remove uploaded chapters from lockedChapters
    // ============================================
    const updatedLockedChapters = config.lockedChapters.filter(chapterName => {
        const folderExists = checkIfFolderExists(chapterName);
        const totalPages = folderExists ? countImagesInFolder(chapterName) : 0;
        return totalPages === 0;  // Keep only if no images
    });
    
    // Update config file if lockedChapters changed
    if (updatedLockedChapters.length !== config.lockedChapters.length) {
        console.log('\n🔓 Auto-removing uploaded chapters from lockedChapters...');
        const removed = config.lockedChapters.filter(ch => !updatedLockedChapters.includes(ch));
        console.log(`   Removed: ${removed.join(', ')}`);
        
        config.lockedChapters = updatedLockedChapters;
        
        // Save updated config
        if (saveJSON('manga-config.json', config)) {
            console.log('✅ manga-config.json updated');
        }
    }
    
    // ============================================
    // FIX: Find LATEST upload date from unlocked chapters
    // ============================================
    let lastChapterUpdate = null;
    
    if (unlockedChaptersWithDates.length > 0) {
        // Sort by date DESC and get the LATEST one
        unlockedChaptersWithDates.sort((a, b) => {
            return new Date(b.uploadDate) - new Date(a.uploadDate);
        });
        
        lastChapterUpdate = unlockedChaptersWithDates[0].uploadDate;  // ← KEEP FULL TIMESTAMP
        
        console.log(`\n✅ Last chapter update: ${lastChapterUpdate} (from chapter ${unlockedChaptersWithDates[0].chapterName})`);
    } else {
        console.log('\n⚠️  No unlocked chapters found, using current date');
        lastChapterUpdate = getWIBTimestamp();  // ← KEEP FULL TIMESTAMP
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
        const totalChapterViews = Object.values(chapters).reduce((sum, ch) => sum + (ch.views || 0), 0);
        
        console.log(`🔒 Locked chapters: ${lockedCount}`);
        console.log(`🔓 Unlocked chapters: ${unlockedCount}`);
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
            console.log(`  ✔ Added new chapter: ${chapterKey}`);
            addedCount++;
        } else {
            console.log(`  ✔ Chapter ${chapterKey} already exists`);
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
        
        if (pendingViews >= CHAPTER_VIEW_THRESHOLD) {
            if (isLocked) {
                console.log(`🔒 Locked Chapter ${chapterFolder}: Threshold reached! (${pendingViews}/${CHAPTER_VIEW_THRESHOLD})`);
                updatedLockedChapters++;
            } else {
                console.log(`✅ Chapter ${chapterFolder}: Threshold reached! (${pendingViews}/${CHAPTER_VIEW_THRESHOLD})`);
            }
            
            chapter.views = (chapter.views || 0) + pendingViews;
            
            pendingChapterData.pendingViews = 0;
            pendingChapterData.lastUpdate = getWIBTimestamp();
            
            console.log(`   Total views: ${chapter.views}`);
            
            hasChanges = true;
            updatedChapters++;
        } else {
            const icon = isLocked ? '🔒' : '⏳';
            console.log(`${icon} Chapter ${chapterFolder}: Waiting... (${pendingViews}/${CHAPTER_VIEW_THRESHOLD})`);
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
    console.log('║   MANGA AUTOMATION SCRIPT v4.0 WIB  ║');
    console.log('║  ✅ WIB Timezone (GMT+7)             ║');
    console.log('║  ✅ Fixed lastChapterUpdate          ║');
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
