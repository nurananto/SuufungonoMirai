/**
 * MANGA-AUTOMATION.JS
 * All-in-one script untuk automasi manga
 * 
 * Usage:
 * node manga-automation.js generate     → Generate manga.json
 * node manga-automation.js sync         → Sync chapters
 * node manga-automation.js update-views → Update manga views
 * node manga-automation.js update-chapters → Update chapter views
 */

const fs = require('fs');
const path = require('path');

// ============================================
// CONSTANTS
// ============================================

const VIEW_THRESHOLD = 20;
const CHAPTER_VIEW_THRESHOLD = 10;

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

function getUploadDate(folderName) {
    const folderPath = path.join('.', folderName);
    
    try {
        const stats = fs.statSync(folderPath);
        return stats.mtime.toISOString().split('T')[0];
    } catch (error) {
        return new Date().toISOString().split('T')[0];
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
    
    sortedChapterNames.forEach(chapterName => {
        const folderExists = checkIfFolderExists(chapterName);
        const isLocked = config.lockedChapters.includes(chapterName);
        const actuallyLocked = isLocked && !folderExists;
        const pageCount = folderExists ? countImagesInFolder(chapterName) : 0;
        
        // Set views to 0 if first time, otherwise preserve from old data
        let views = 0;
        if (!isFirstTime) {
            if (actuallyLocked) {
                views = getOldChapterViews(chapterName, oldMangaData);
            } else if (folderExists) {
                views = getOldChapterViews(chapterName, oldMangaData);
            }
        }
        
        chapters[chapterName] = {
            title: `Chapter ${chapterName}`,
            folder: chapterName,
            pages: pageCount,
            views: views,
            uploadDate: folderExists ? getUploadDate(chapterName) : null,
            locked: actuallyLocked
        };
        
        const status = actuallyLocked ? '🔒 LOCKED' : folderExists ? '✅ UNLOCKED' : '⚠️ NOT FOUND';
        const viewsInfo = views > 0 ? ` (views: ${views})` : '';
        console.log(`  ${status} Chapter ${chapterName} - ${pageCount} pages${viewsInfo}`);
    });
    
    return chapters;
}

function commandGenerate() {
    console.log('🚀 Generating manga.json...\n');
    
    const config = loadConfig();
    const oldMangaData = loadJSON('manga.json');
    
    // Detect if this is first-time generation
    const isFirstTime = !oldMangaData;
    
    console.log(`📚 Manga: ${config.title}`);
    
    if (isFirstTime) {
        console.log('🆕 FIRST-TIME GENERATION - All views will be set to 0');
        console.log('📝 Future updates will preserve view counts\n');
    } else {
        console.log('📖 Found existing manga.json - preserving views\n');
    }
    
    const chapters = generateChaptersData(config, oldMangaData, isFirstTime);
    const repoUrl = `https://raw.githubusercontent.com/${config.repoOwner}/${config.repoName}/main/`;
    
    // Set manga views to 0 if first time, otherwise preserve
    let totalViews = 0;
    if (!isFirstTime && oldMangaData && oldMangaData.manga && oldMangaData.manga.views) {
        totalViews = oldMangaData.manga.views;
    }
    
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
            imagePrefix: config.imagePrefix,
            imageFormat: config.imageFormat,
            lockedChapters: config.lockedChapters
        },
        chapters: chapters,
        lastUpdated: new Date().toISOString()
    };
    
    if (saveJSON('manga.json', mangaJSON)) {
        console.log('\n✅ manga.json generated successfully!');
        
        if (isFirstTime) {
            console.log('🎉 FIRST-TIME SETUP COMPLETE');
        }
        
        console.log(`📚 Total chapters: ${Object.keys(chapters).length}`);
        
        const lockedCount = Object.values(chapters).filter(ch => ch.locked).length;
        const unlockedCount = Object.values(chapters).filter(ch => !ch.locked).length;
        const totalChapterViews = Object.values(chapters).reduce((sum, ch) => sum + (ch.views || 0), 0);
        
        console.log(`🔒 Locked chapters: ${lockedCount}`);
        console.log(`🔓 Unlocked chapters: ${unlockedCount}`);
        console.log(`👁️  Total manga views: ${totalViews}`);
        console.log(`👁️  Total chapter views: ${totalChapterViews}`);
        console.log(`📅 Last updated: ${mangaJSON.lastUpdated}`);
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
        lastUpdated: new Date().toISOString()
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
                lastIncrement: new Date().toISOString(),
                lastUpdate: new Date().toISOString()
            };
            console.log(`  ✓ Added new chapter: ${chapterKey}`);
            addedCount++;
        } else {
            console.log(`  ✓ Chapter ${chapterKey} already exists`);
        }
    });
    
    pendingData.lastUpdated = new Date().toISOString();
    
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
        pendingData.lastUpdate = new Date().toISOString();
        
        if (saveJSON('pending-views.json', pendingData)) {
            console.log(`✅ Views updated! Total: ${manga.manga.views}`);
            console.log(`📄 Pending views reset to 0`);
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
    
    Object.keys(pendingData.chapters).forEach(chapterFolder => {
        const pendingChapterData = pendingData.chapters[chapterFolder];
        const pendingViews = pendingChapterData.pendingViews || 0;
        
        if (!manga.chapters[chapterFolder]) {
            console.log(`⚠️  Chapter ${chapterFolder} not found in manga.json`);
            return;
        }
        
        const chapter = manga.chapters[chapterFolder];
        
        if (pendingViews >= CHAPTER_VIEW_THRESHOLD) {
            console.log(`✅ Chapter ${chapterFolder}: Threshold reached! (${pendingViews}/${CHAPTER_VIEW_THRESHOLD})`);
            
            chapter.views = (chapter.views || 0) + pendingViews;
            
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
        manga.lastUpdated = new Date().toISOString();
        
        if (saveJSON('manga.json', manga) && saveJSON('pending-chapter-views.json', pendingData)) {
            console.log(`\n✅ Updated ${updatedChapters} chapter(s)!`);
            console.log(`📄 Files written successfully`);
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
    
    console.log('═══════════════════════════════════════');
    console.log('     MANGA AUTOMATION SCRIPT v2.0     ');
    console.log('═══════════════════════════════════════\n');
    
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
