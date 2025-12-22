/**
 * MANGA-AUTOMATION.JS - COMPLETE MERGED VERSION
 * ✅ Manifest-based detection (Script 1)
 * ✅ Oneshot support (Script 1)
 * ✅ Auto-cleanup locked chapters (Script 1)
 * ✅ Type detection manga/webtoon (Script 2)
 * ✅ Sync codes from Cloudflare (Script 2)
 * ✅ EndChapter logic (Script 2)
 * ✅ WIB Timezone (GMT+7)
 * ✅ Fixed: Daily views recording for new manga
 * 
 * Usage:
 * node manga-automation.js generate        → Generate manga.json
 * node manga-automation.js sync            → Sync chapters
 * node manga-automation.js update-views    → Update manga views
 * node manga-automation.js update-chapters → Update chapter views
 * node manga-automation.js sync-codes      → Sync codes from Cloudflare (webtoon only)
 * node manga-automation.js record-daily    → Record daily views
 * node manga-automation.js cleanup-daily   → Cleanup old daily records
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================
// CONSTANTS
// ============================================

const VIEW_THRESHOLD = 1;
const CHAPTER_VIEW_THRESHOLD = 1;

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
// PENDING FILES HELPER
// ============================================

function ensurePendingFilesExist() {
    console.log('🔍 Checking pending files...\n');
    
    let created = false;
    
    if (!fs.existsSync('pending-views.json')) {
        console.log('📄 Creating pending-views.json...');
        const initialPendingViews = {
            pendingViews: 0,
            lastIncrement: getWIBTimestamp(),
            lastUpdate: getWIBTimestamp()
        };
        saveJSON('pending-views.json', initialPendingViews);
        created = true;
    }
    
    if (!fs.existsSync('pending-chapter-views.json')) {
        console.log('📄 Creating pending-chapter-views.json...');
        const initialPendingChapters = {
            chapters: {},
            lastUpdated: getWIBTimestamp()
        };
        saveJSON('pending-chapter-views.json', initialPendingChapters);
        created = true;
    }
    
    if (created) {
        console.log('✅ Initial pending files created!\n');
    } else {
        console.log('✅ All pending files exist\n');
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
    if (oldChapter && oldChapter.views) {
        return oldChapter.views;
    }
    
    return 0;
}

function generateChaptersData(config, oldMangaData, isFirstTime) {
    const allFolders = getChapterFolders();
    const chapters = {};
    
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
        const totalPages = folderExists ? getTotalPagesFromManifest(chapterName) : 0;
        
        const isInLockedList = config.lockedChapters.includes(chapterName);

        let isLocked;
        if (config.type === 'webtoon') {
            isLocked = isInLockedList;
        } else {
            isLocked = isInLockedList && totalPages === 0;
        }
        
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
    
    const updatedLockedChapters = config.lockedChapters.filter(chapterName => {
        const folderExists = checkIfFolderExists(chapterName);
        const totalPages = folderExists ? getTotalPagesFromManifest(chapterName) : 0;
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

function commandGenerate() {
    console.log('📚 Generating manga.json...\n');
    
    ensurePendingFilesExist();
    
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
        
        console.log(`🔒 Locked chapters: ${lockedCount}`);
        console.log(`🔓 Unlocked chapters: ${unlockedCount}`);
        if (oneshotCount > 0) {
            console.log(`🎯 Oneshot chapters: ${oneshotCount}`);
        }
        console.log(`👁️  Total manga views: ${totalViews}`);
        console.log(`👁️  Total chapter views: ${totalChapterViews}`);
        console.log(`📅 Last updated: ${mangaJSON.lastUpdated}`);
        console.log(`📅 Last chapter update: ${mangaJSON.lastChapterUpdate}`);
        console.log(`📱 Type: ${mangaJSON.manga.type}`);
        
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
            const icon = isOneshotFolder(chapterKey) ? '🎯' : '✔';
            console.log(`  ${icon} Added new chapter: ${chapterKey}`);
            addedCount++;
        } else {
            const icon = isOneshotFolder(chapterKey) ? '🎯' : '✔';
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
    
    ensurePendingFilesExist();
    
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
    
    ensurePendingFilesExist();
    
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
// COMMAND 5: SYNC CODES FROM CLOUDFLARE (WEBTOON ONLY)
// ============================================

async function syncCodesFromCloudflare() {
    try {
        console.log('🔄 Syncing codes from Cloudflare KV...');
        
        if (!fs.existsSync('manga-config.json')) {
            console.log('⚠️ manga-config.json not found!');
            return;
        }
        
        const mangaConfig = JSON.parse(fs.readFileSync('manga-config.json', 'utf8'));
        
        if (mangaConfig.type !== 'webtoon') {
            console.log(`ℹ️ Type is ${mangaConfig.type}, skipping code sync`);
            return;
        }
        
        if (fs.existsSync('chapter-codes-local.json')) {
            const localCodes = JSON.parse(fs.readFileSync('chapter-codes-local.json', 'utf8'));
            if (Object.keys(localCodes).length > 0) {
                console.log('✅ chapter-codes-local.json already has data, skipping sync');
                return;
            }
        }
        
        const workerUrl = process.env.CLOUDFLARE_WORKER_URL;
        if (!workerUrl) {
            console.log('⚠️ CLOUDFLARE_WORKER_URL not set, skipping code sync');
            return;
        }
        
        console.log(`📡 Fetching codes from: ${workerUrl}`);
        
        const url = new URL(workerUrl);
        url.searchParams.append('action', 'getAllCodes');
        url.searchParams.append('repoName', mangaConfig.repoName);

        const response = await new Promise((resolve, reject) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({
                    ok: res.statusCode === 200,
                    json: async () => JSON.parse(data)
                }));
            }).on('error', reject);
        }); 
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.codes) {
            fs.writeFileSync('chapter-codes-local.json', JSON.stringify(data.codes, null, 2));
            console.log(`✅ Synced ${Object.keys(data.codes).length} codes from Cloudflare KV`);
        } else {
            console.log('ℹ️ No codes found in Cloudflare KV');
        }
        
    } catch (error) {
        console.error('❌ Error syncing codes:', error.message);
    }
}

// ============================================
// DAILY VIEWS TRACKING
// ============================================

function getWIBDateString() {
    const date = new Date();
    return date.toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0];
}

function ensureDailyViewsFile() {
    if (!fs.existsSync('daily-views.json')) {
        console.log('📄 Creating daily-views.json...');
        const initialData = {
            lastCleanup: getWIBTimestamp(),
            dailyRecords: {}
        };
        saveJSON('daily-views.json', initialData);
    }
}

function commandRecordDaily() {
    console.log('📊 Recording daily views...\n');
    
    // ✅ FIX: Ensure ALL required files exist
    ensureDailyViewsFile();
    ensurePendingFilesExist(); // ✅ Added this!
    
    const dailyViews = loadJSON('daily-views.json');
    const pendingViews = loadJSON('pending-views.json');
    const pendingChapterViews = loadJSON('pending-chapter-views.json');
    
    if (!dailyViews || !pendingViews || !pendingChapterViews) {
        console.error('❌ Required files not found');
        process.exit(1);
    }
    
    const today = getWIBDateString();
    
    if (!dailyViews.dailyRecords[today]) {
        dailyViews.dailyRecords[today] = { manga: 0, chapters: {} };
    }
    
    const mangaViews = pendingViews.pendingViews || 0;
    if (mangaViews > 0) {
        dailyViews.dailyRecords[today].manga += mangaViews;
        console.log(`📈 Manga: +${mangaViews}`);
    }
    
    Object.keys(pendingChapterViews.chapters || {}).forEach(chapterFolder => {
        const views = pendingChapterViews.chapters[chapterFolder].pendingViews || 0;
        if (views > 0) {
            if (!dailyViews.dailyRecords[today].chapters[chapterFolder]) {
                dailyViews.dailyRecords[today].chapters[chapterFolder] = 0;
            }
            dailyViews.dailyRecords[today].chapters[chapterFolder] += views;
        }
    });
    
    if (saveJSON('daily-views.json', dailyViews)) {
        console.log(`✅ Daily views recorded for ${today}`);
    }
}

function commandCleanupDaily() {
    console.log('🗑️  Cleaning old records...\n');
    
    ensureDailyViewsFile();
    
    const dailyViews = loadJSON('daily-views.json');
    const today = new Date();
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - 7);
    
    const cutoffStr = cutoff.toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).split(' ')[0];
    
    let removed = 0;
    Object.keys(dailyViews.dailyRecords).forEach(dateKey => {
        if (dateKey < cutoffStr) {
            delete dailyViews.dailyRecords[dateKey];
            removed++;
        }
    });
    
    if (removed > 0) {
        dailyViews.lastCleanup = getWIBTimestamp();
        saveJSON('daily-views.json', dailyViews);
        console.log(`✅ Removed ${removed} old records`);
    } else {
        console.log(`ℹ️  No old records to remove`);
    }
}

// ============================================
// MAIN
// ============================================

function main() {
    const command = process.argv[2];
    
    console.log('╔═══════════════════════════════════════╗');
    console.log('║ MANGA AUTOMATION v6.1 FIXED          ║');
    console.log('║ ✅ WIB Timezone (GMT+7)              ║');
    console.log('║ ✅ Manifest-based Detection          ║');
    console.log('║ 🎯 Oneshot Support                   ║');
    console.log('║ 🔒 Locked Chapters (manga/webtoon)   ║');
    console.log('║ 📱 Type Detection (manga/webtoon)    ║');
    console.log('║ 🔄 Auto-cleanup & Sync Codes         ║');
    console.log('║ 🐛 Fixed: Daily views for new manga  ║');
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
        case 'sync-codes':
            (async () => {
                await syncCodesFromCloudflare();
                console.log('✅ Done!');
            })();
            break;
        case 'record-daily':
            commandRecordDaily();
            break;
        case 'cleanup-daily':
            commandCleanupDaily();
            break;
        default:
            console.log('Usage:');
            console.log('  node manga-automation.js generate        → Generate manga.json');
            console.log('  node manga-automation.js sync            → Sync chapters');
            console.log('  node manga-automation.js update-views    → Update manga views');
            console.log('  node manga-automation.js update-chapters → Update chapter views');
            console.log('  node manga-automation.js sync-codes      → Sync codes from Cloudflare (webtoon only)');
            console.log('  node manga-automation.js record-daily    → Record daily views');
            console.log('  node manga-automation.js cleanup-daily   → Cleanup old daily records');
            process.exit(1);
    }
}

main();