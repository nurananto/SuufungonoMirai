/**
 * MANGA-AUTOMATION.JS
 * All-in-one script untuk automasi manga
 * COMPATIBLE WITH manga-automation.yml v3.0
 * 
 * Usage:
 * node manga-automation.js generate                → Generate manga.json
 * node manga-automation.js generate-chapters-json  → Generate chapters.json for website
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
// COMMAND: GENERATE CHAPTERS.JSON FOR WEBSITE
// ============================================

function commandGenerateChaptersJSON() {
    console.log('📄 Generating chapters.json for website...\n');
    
    const mangaData = loadJSON('manga.json');
    
    if (!mangaData || !mangaData.chapters) {
        console.error('❌ manga.json not found. Please run "generate" command first.');
        process.exit(1);
    }
    
    console.log(`📚 Processing ${Object.keys(mangaData.chapters).length} chapters...`);
    
    // Convert chapters object to array
    const chaptersArray = Object.keys(mangaData.chapters).map(chapterKey => {
        const chapter = mangaData.chapters[chapterKey];
        return {
            title: chapter.title,
            chapter: chapter.chapter || parseFloat(chapterKey),
            uploadDate: chapter.uploadDate || null,
            totalPages: chapter.totalPages || chapter.pages || 0,
            pages: chapter.pages || chapter.totalPages || 0,
            locked: chapter.locked || false,
            views: chapter.views || 0,
            folder: chapter.folder || chapterKey
        };
    });
    
    // IMPORTANT: Sort by uploadDate DESC, then by chapter ASC (for same dates)
    // This matches the YML behavior using stable sort
    chaptersArray.sort((a, b) => a.chapter - b.chapter); // First: chapter ASC
    chaptersArray.sort((a, b) => {
        // Second: uploadDate DESC (stable sort preserves chapter order for same dates)
        const dateA = a.uploadDate || '';
        const dateB = b.uploadDate || '';
        if (dateB > dateA) return 1;
        if (dateB < dateA) return -1;
        return 0;
    });
    
    const chaptersJSON = {
        chapters: chaptersArray
    };
    
    if (saveJSON('chapters.json', chaptersJSON)) {
        console.log('\n✅ chapters.json generated successfully!');
        console.log(`📊 Total chapters: ${chaptersArray.length}`);
        
        const lockedCount = chaptersArray.filter(ch => ch.locked).length;
        console.log(`🔒 Locked chapters: ${lockedCount}`);
        console.log(`🔓 Unlocked chapters: ${chaptersArray.length - lockedCount}`);
        
        console.log('\n📋 First 5 chapters (preview):');
        chaptersArray.slice(0, 5).forEach((ch, idx) => {
            const status = ch.locked ? '🔒' : '✅';
            const date = ch.uploadDate ? ch.uploadDate.split('T')[0] : 'N/A';
            console.log(`  ${status} ${ch.title} (${date})`);
        });
    } else {
        process.exit(1);
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
        // Get FIRST commit date (when folder was created) - matches YML behavior
        const gitCommand = `git log --reverse --format=%aI -- "${folderName}" | head -1`;
        const result = execSync(gitCommand, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
        
        if (result) {
            // Return full ISO format to match YML
            return result;
        }
        
        // Fallback: Use file system modification time
        const stats = fs.statSync(folderPath);
        return stats.mtime.toISOString();
    } catch (error) {
        // Fallback: Use current date
        console.log(`⚠️  Could not get upload date for ${folderName}, using current date`);
        return new Date().toISOString();
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
    
    // Track latest upload date for locked chapters
    let latestUploadDate = null;
    
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
        
        // Preserve uploadDate from old data, only get from Git if not exists
        let uploadDate = null;
        const oldChapter = oldMangaData?.chapters?.[chapterName];
        
        if (oldChapter && oldChapter.uploadDate) {
            uploadDate = oldChapter.uploadDate;
        } else if (folderExists) {
            uploadDate = getUploadDate(chapterName);
        }
        
        // Track latest date for locked chapters
        if (uploadDate && (!latestUploadDate || uploadDate > latestUploadDate)) {
            latestUploadDate = uploadDate;
        }
        
        const chapterNum = parseFloat(chapterName);
        const title = chapterNum % 1 === 0 
            ? `Chapter ${parseInt(chapterName)}` 
            : `Chapter ${chapterName}`;
        
        chapters[chapterName] = {
            title: oldChapter?.title || title,
            chapter: chapterNum,
            folder: chapterName,
            uploadDate: uploadDate,
            totalPages: pageCount,
            pages: pageCount,
            locked: actuallyLocked,
            views: views
        };
    });
    
    // Update locked chapters with null uploadDate to use latest date (matches YML)
    if (latestUploadDate) {
        console.log(`\n📅 Updating locked chapters with null uploadDate to: ${latestUploadDate}`);
        Object.keys(chapters).forEach(chapterKey => {
            const chapter = chapters[chapterKey];
            if (chapter.locked && !chapter.uploadDate) {
                chapter.uploadDate = latestUploadDate;
                console.log(`  ✅ ${chapter.title}: uploadDate updated`);
            }
        });
    }
    
    return chapters;
}

function commandGenerate() {
    console.log('🚀 Generating manga.json...\n');
    
    const config = loadConfig();
    const oldMangaData = loadJSON('manga.json');
    
    const isFirstTime = !oldMangaData || !oldMangaData.manga;
    
    if (isFirstTime) {
        console.log('🆕 First-time setup detected!\n');
    } else {
        console.log('🔄 Updating existing manga.json...\n');
    }
    
    const chapters = generateChaptersData(config, oldMangaData, isFirstTime);
    
    let totalViews = 0;
    if (isFirstTime) {
        totalViews = 0;
        console.log('\n🎉 First-time generation: Setting manga views to 0');
    } else {
        totalViews = oldMangaData?.manga?.views || 0;
        console.log(`\n📊 Preserving manga views: ${totalViews}`);
    }
    
    // Get last chapter update date (latest uploadDate)
    let lastChapterUpdate = null;
    Object.values(chapters).forEach(chapter => {
        if (chapter.uploadDate && (!lastChapterUpdate || chapter.uploadDate > lastChapterUpdate)) {
            lastChapterUpdate = chapter.uploadDate;
        }
    });
    
    // Check for chapter changes
    const hasChapterChanges = !oldMangaData || 
        Object.keys(chapters).length !== Object.keys(oldMangaData.chapters || {}).length;
    
    // Preserve ALL manga metadata
    const oldMangaInfo = oldMangaData?.manga || {};
    const mangaInfo = {
        ...oldMangaInfo,  // Preserve all existing fields
        title: oldMangaInfo.title || config.title,
        alternativeTitle: oldMangaInfo.alternativeTitle || config.alternativeTitle,
        cover: oldMangaInfo.cover || config.cover,
        description: oldMangaInfo.description || config.description,
        author: oldMangaInfo.author || config.author,
        artist: oldMangaInfo.artist || config.artist,
        genre: oldMangaInfo.genre || config.genre,
        status: oldMangaInfo.status || config.status,
        views: totalViews,
        links: oldMangaInfo.links || config.links,
        repoUrl: oldMangaInfo.repoUrl || config.repoUrl,
        imagePrefix: oldMangaInfo.imagePrefix || config.imagePrefix,
        imageFormat: oldMangaInfo.imageFormat || config.imageFormat,
        lockedChapters: config.lockedChapters
    };
    
    const mangaJSON = {
        manga: mangaInfo,
        chapters: chapters,
        lastUpdated: new Date().toISOString(),
        lastChapterUpdate: lastChapterUpdate
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
    console.log('     MANGA AUTOMATION SCRIPT v3.0     ');
    console.log('   Compatible with YML Automation     ');
    console.log('═══════════════════════════════════════\n');
    
    switch (command) {
        case 'generate':
            commandGenerate();
            break;
        case 'generate-chapters-json':
            commandGenerateChaptersJSON();
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
            console.log('  node manga-automation.js generate                → Generate manga.json');
            console.log('  node manga-automation.js generate-chapters-json  → Generate chapters.json for website');
            console.log('  node manga-automation.js sync                    → Sync chapters');
            console.log('  node manga-automation.js update-views            → Update manga views');
            console.log('  node manga-automation.js update-chapters         → Update chapter views');
            process.exit(1);
    }
}

main();
