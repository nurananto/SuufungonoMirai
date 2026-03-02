/**
 * ========================================
 * MERGE DATA FOLDER TO ROOT
 * ========================================
 * 
 * Purpose: Accumulate data from data/ folder to root files
 * - Merge data/manga.json → manga.json (accumulate views)
 * - Merge data/daily-views.json → daily-views.json (merge dates)
 * - Delete data/ folder after successful merge
 * 
 * Usage: node merge-data-folder.js
 */

const fs = require('fs');
const path = require('path');

// ========================================
// CONFIGURATION
// ========================================

const ROOT_MANGA_JSON = 'manga.json';
const ROOT_DAILY_VIEWS_JSON = 'daily-views.json';
const DATA_FOLDER = 'data';
const DATA_MANGA_JSON = path.join(DATA_FOLDER, 'manga.json');
const DATA_DAILY_VIEWS_JSON = path.join(DATA_FOLDER, 'daily-views.json');

// ========================================
// HELPER FUNCTIONS
// ========================================

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function readJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error.message);
    return null;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`❌ Error writing ${filePath}:`, error.message);
    return false;
  }
}

function deleteFolder(folderPath) {
  try {
    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error deleting ${folderPath}:`, error.message);
    return false;
  }
}

// ========================================
// MERGE MANGA.JSON
// ========================================

function mergeMangaJSON(rootData, dataFolderData) {
  console.log('\n📊 Merging manga.json...');
  
  if (!dataFolderData || !dataFolderData.totalViews) {
    console.log('⚠️ No valid data to merge in data/manga.json');
    return rootData;
  }

  // Accumulate total views
  const oldTotalViews = rootData.manga?.views || 0;
  const newViews = dataFolderData.totalViews || 0;
  
  if (rootData.manga) {
    rootData.manga.views = oldTotalViews + newViews;
  }

  console.log(`  Total Views: ${oldTotalViews} + ${newViews} = ${rootData.manga.views}`);

  // Accumulate chapter views
  if (dataFolderData.chapters && rootData.chapters) {
    let updatedChapters = 0;
    
    for (const [chapter, views] of Object.entries(dataFolderData.chapters)) {
      if (rootData.chapters[chapter]) {
        const oldViews = rootData.chapters[chapter].views || 0;
        rootData.chapters[chapter].views = oldViews + views;
        console.log(`  Chapter ${chapter}: ${oldViews} + ${views} = ${rootData.chapters[chapter].views}`);
        updatedChapters++;
      } else {
        console.log(`  ⚠️ Chapter ${chapter} not found in root manga.json (${views} views ignored)`);
      }
    }
    
    console.log(`  ✅ Updated ${updatedChapters} chapters`);
  }

  return rootData;
}

// ========================================
// MERGE DAILY-VIEWS.JSON
// ========================================

function mergeDailyViewsJSON(rootData, dataFolderData) {
  console.log('\n📅 Merging daily-views.json...');
  
  if (!dataFolderData || typeof dataFolderData !== 'object') {
    console.log('⚠️ No valid data to merge in data/daily-views.json');
    return rootData;
  }

  // Initialize if needed
  if (!rootData.dailyRecords) {
    rootData.dailyRecords = {};
  }

  let mergedDates = 0;
  
  // Merge each date from data folder
  for (const [date, dateData] of Object.entries(dataFolderData)) {
    // Convert format: mangaViews → manga
    const normalizedData = {
      manga: dateData.mangaViews || dateData.manga || 0,
      chapters: dateData.chapters || {}
    };

    if (rootData.dailyRecords[date]) {
      // Date exists, accumulate
      const oldMangaViews = rootData.dailyRecords[date].manga || 0;
      rootData.dailyRecords[date].manga = oldMangaViews + normalizedData.manga;

      // Accumulate chapter views
      if (!rootData.dailyRecords[date].chapters) {
        rootData.dailyRecords[date].chapters = {};
      }
      
      for (const [chapter, views] of Object.entries(normalizedData.chapters)) {
        const oldChapterViews = rootData.dailyRecords[date].chapters[chapter] || 0;
        rootData.dailyRecords[date].chapters[chapter] = oldChapterViews + views;
      }

      console.log(`  ${date}: Merged (manga: +${normalizedData.manga}, chapters: ${Object.keys(normalizedData.chapters).length})`);
    } else {
      // New date, add directly
      rootData.dailyRecords[date] = normalizedData;
      console.log(`  ${date}: Added (manga: ${normalizedData.manga}, chapters: ${Object.keys(normalizedData.chapters).length})`);
    }
    
    mergedDates++;
  }

  // Update lastCleanup
  rootData.lastCleanup = new Date().toISOString();

  console.log(`  ✅ Merged ${mergedDates} dates`);
  return rootData;
}

// ========================================
// MAIN FUNCTION
// ========================================

function main() {
  console.log('========================================');
  console.log('MERGE DATA FOLDER → ROOT FILES');
  console.log('========================================\n');

  // Check if data folder exists
  if (!fileExists(DATA_FOLDER)) {
    console.log('✅ No data/ folder found - nothing to merge');
    process.exit(0);
  }

  console.log('📁 Found data/ folder');

  let hasChanges = false;

  // ========================================
  // MERGE manga.json
  // ========================================
  
  if (fileExists(DATA_MANGA_JSON)) {
    console.log(`\n📄 Processing ${DATA_MANGA_JSON}...`);
    
    const rootManga = readJSON(ROOT_MANGA_JSON);
    const dataManga = readJSON(DATA_MANGA_JSON);

    if (rootManga && dataManga) {
      const mergedManga = mergeMangaJSON(rootManga, dataManga);
      
      if (writeJSON(ROOT_MANGA_JSON, mergedManga)) {
        console.log(`✅ Successfully merged ${DATA_MANGA_JSON} → ${ROOT_MANGA_JSON}`);
        hasChanges = true;
      }
    }
  } else {
    console.log(`\n⚠️ ${DATA_MANGA_JSON} not found - skipping`);
  }

  // ========================================
  // MERGE daily-views.json
  // ========================================
  
  if (fileExists(DATA_DAILY_VIEWS_JSON)) {
    console.log(`\n📄 Processing ${DATA_DAILY_VIEWS_JSON}...`);
    
    const rootDaily = readJSON(ROOT_DAILY_VIEWS_JSON);
    const dataDaily = readJSON(DATA_DAILY_VIEWS_JSON);

    if (rootDaily && dataDaily) {
      const mergedDaily = mergeDailyViewsJSON(rootDaily, dataDaily);
      
      if (writeJSON(ROOT_DAILY_VIEWS_JSON, mergedDaily)) {
        console.log(`✅ Successfully merged ${DATA_DAILY_VIEWS_JSON} → ${ROOT_DAILY_VIEWS_JSON}`);
        hasChanges = true;
      }
    }
  } else {
    console.log(`\n⚠️ ${DATA_DAILY_VIEWS_JSON} not found - skipping`);
  }

  // ========================================
  // DELETE data/ folder
  // ========================================
  
  if (hasChanges) {
    console.log('\n🗑️ Deleting data/ folder...');
    
    if (deleteFolder(DATA_FOLDER)) {
      console.log('✅ data/ folder deleted successfully');
    } else {
      console.log('❌ Failed to delete data/ folder');
      process.exit(1);
    }

    console.log('\n========================================');
    console.log('✅ MERGE COMPLETED SUCCESSFULLY');
    console.log('========================================');
    console.log('\n📝 Summary:');
    console.log(`  - Merged manga views and chapter views`);
    console.log(`  - Merged daily view records`);
    console.log(`  - Deleted data/ folder`);
    console.log('\n💡 Next step: Commit and push changes to GitHub');
  } else {
    console.log('\n⚠️ No changes were made');
    
    // Still try to delete data folder if it only contains empty/invalid files
    if (fileExists(DATA_FOLDER)) {
      console.log('🗑️ Cleaning up empty data/ folder...');
      deleteFolder(DATA_FOLDER);
    }
  }
}

// ========================================
// RUN
// ========================================

if (require.main === module) {
  main();
}

module.exports = { mergeMangaJSON, mergeDailyViewsJSON };
