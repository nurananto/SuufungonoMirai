/**
 * GENERATE MANGA.JSON (untuk GitHub Actions)
 * UPDATED: Preserve views dari manga.json lama
 * 
 * Script ini akan:
 * 1. Baca manga-config.json
 * 2. Baca manga.json lama (jika ada) untuk preserve views
 * 3. Auto-detect semua folder chapter
 * 4. Hitung jumlah gambar per folder
 * 5. Check apakah chapter terkunci
 * 6. Generate manga.json lengkap dengan views terakumulasi
 */

const fs = require('fs');
const path = require('path');

// ============================================
// LOAD CONFIGURATION
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

// ============================================
// LOAD OLD MANGA.JSON (NEW)
// ============================================

function loadOldMangaJSON() {
    try {
        if (fs.existsSync('manga.json')) {
            const oldData = fs.readFileSync('manga.json', 'utf8');
            console.log('📖 Found existing manga.json - reading old data...');
            return JSON.parse(oldData);
        }
    } catch (error) {
        console.warn('⚠️ Could not read old manga.json:', error.message);
    }
    return null;
}

// ============================================
// AUTO-DETECT FUNCTIONS
// ============================================

function getChapterFolders() {
    const rootDir = '.';
    
    try {
        const folders = fs.readdirSync(rootDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .filter(dirent => !dirent.name.startsWith('.')) // Ignore hidden folders
            .map(dirent => dirent.name)
            .filter(name => {
                // Pattern: angka atau angka.angka (1, 2.1, 10.2, etc)
                return /^\d+(\.\d+)?$/.test(name);
            })
            .sort((a, b) => {
                const numA = parseFloat(a);
                const numB = parseFloat(b);
                return numA - numB;
            });
        
        console.log(`📁 Found ${folders.length} chapter folders`);
        return folders;
        
    } catch (error) {
        console.error('❌ Error reading directories:', error.message);
        return [];
    }
}

function countImagesInFolder(folderName, imageFormat) {
    const folderPath = path.join('.', folderName);
    
    try {
        const files = fs.readdirSync(folderPath);
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            // Support multiple formats
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
    const folderPath = path.join('.', folderName);
    return fs.existsSync(folderPath);
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

// ============================================
// GET VIEWS FROM OLD DATA (NEW)
// ============================================

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

// ============================================
// GENERATE CHAPTERS DATA (UPDATED)
// ============================================

function generateChaptersData(config, oldMangaData) {
    const allFolders = getChapterFolders();
    const chapters = {};
    
    // Combine detected folders with locked chapters
    const allChapterNames = new Set([
        ...allFolders,
        ...config.lockedChapters
    ]);
    
    // Sort by number
    const sortedChapterNames = Array.from(allChapterNames).sort((a, b) => {
        return parseFloat(a) - parseFloat(b);
    });
    
    console.log('\n📖 Processing chapters...');
    
    sortedChapterNames.forEach(chapterName => {
        const folderExists = checkIfFolderExists(chapterName);
        const isLocked = config.lockedChapters.includes(chapterName);
        
        // Auto-unlock if folder exists
        const actuallyLocked = isLocked && !folderExists;
        
        const pageCount = folderExists ? countImagesInFolder(chapterName, config.imageFormat) : 0;
        
        // UPDATED: Get views dari data lama, atau 0 jika chapter baru
        let views = 0;
        if (actuallyLocked) {
            // Chapter terkunci: ambil dari data lama (biar pending views terus terhitung)
            views = getOldChapterViews(chapterName, oldMangaData);
        } else if (folderExists) {
            // Chapter unlocked dengan folder: ambil dari data lama
            views = getOldChapterViews(chapterName, oldMangaData);
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

// ============================================
// GENERATE MANGA.JSON (UPDATED)
// ============================================

function generateMangaJSON(oldMangaData) {
    const config = loadConfig();
    
    console.log('🚀 Starting manga.json generation...');
    console.log(`📚 Manga: ${config.title}\n`);
    
    const chapters = generateChaptersData(config, oldMangaData);
    
    // Build repo URL
    const repoUrl = `https://raw.githubusercontent.com/${config.repoOwner}/${config.repoName}/main/`;
    
    // UPDATED: Preserve total views dari data lama
    let totalViews = config.views || 0;
    if (oldMangaData && oldMangaData.manga && oldMangaData.manga.views) {
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
    
    return mangaJSON;
}

// ============================================
// SAVE FILE
// ============================================

function saveMangaJSON() {
    try {
        // UPDATED: Load old data first
        const oldMangaData = loadOldMangaJSON();
        
        const data = generateMangaJSON(oldMangaData);
        const jsonString = JSON.stringify(data, null, 2);
        
        fs.writeFileSync('manga.json', jsonString, 'utf8');
        
        console.log('\n✅ manga.json berhasil di-generate!');
        console.log(`📚 Total chapters: ${Object.keys(data.chapters).length}`);
        
        const lockedCount = Object.values(data.chapters).filter(ch => ch.locked).length;
        const unlockedCount = Object.values(data.chapters).filter(ch => !ch.locked).length;
        const totalChapterViews = Object.values(data.chapters).reduce((sum, ch) => sum + (ch.views || 0), 0);
        
        console.log(`🔒 Locked chapters: ${lockedCount}`);
        console.log(`🔓 Unlocked chapters: ${unlockedCount}`);
        console.log(`👁️  Total manga views: ${data.manga.views}`);
        console.log(`👁️  Total chapter views: ${totalChapterViews}`);
        console.log(`📅 Last updated: ${data.lastUpdated}`);
        
    } catch (error) {
        console.error('❌ Error saving manga.json:', error.message);
        process.exit(1);
    }
}

// ============================================
// RUN
// ============================================

saveMangaJSON();
