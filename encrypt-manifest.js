/**
 * ENCRYPT-MANIFEST.JS - IMPROVED VERSION
 * 🔐 Encrypts manifest.json files with AES-256
 * 📌 Supports both normal mode (git diff) and force mode (scan all)
 * ✅ Better detection of new manifests
 * ✅ Does NOT re-encrypt already encrypted manifests
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// ============================================
// ENCRYPTION SETTINGS
// ============================================

const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const SECRET_TOKEN = process.env.SECRET_TOKEN;
const FORCE_SCAN_ALL = process.env.FORCE_SCAN_ALL === 'true';

// ✅ SECURITY: Token must be provided via environment variable
if (!SECRET_TOKEN) {
    console.error('╔═══════════════════════════════════════╗');
    console.error('║  ❌ SECURITY ERROR                    ║');
    console.error('╚═══════════════════════════════════════╝\n');
    console.error('SECRET_TOKEN environment variable is required!');
    console.error('\nPlease set MANIFEST_SECRET_TOKEN in GitHub Secrets:');
    console.error('  Repository → Settings → Secrets → Actions');
    console.error('\nTo generate a secure token:');
    console.error('  node -e "console.log(require(\'crypto\').randomBytes(16).toString(\'hex\'))"');
    process.exit(1);
}

// Derive key from token (32 bytes for AES-256)
function deriveKey(token) {
    return crypto.createHash('sha256').update(token).digest();
}

// ============================================
// ENCRYPTION FUNCTIONS
// ============================================

function encryptText(text, secretKey) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, secretKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return IV + encrypted data (IV needed for decryption)
    return iv.toString('hex') + ':' + encrypted;
}

function isEncrypted(text) {
    // Check if text matches encrypted pattern (hex:hex)
    return /^[0-9a-f]{32}:[0-9a-f]+$/i.test(text);
}

// ============================================
// IMPROVED: GIT DETECTION
// ============================================

function getAllManifestsInRepo() {
    try {
        const output = execSync('find . -name "manifest.json" -not -path "./.git/*"', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
        
        if (output) {
            const allManifests = output.split('\n')
                .map(path => path.replace('./', ''))
                .filter(path => fs.existsSync(path));
            
            return allManifests;
        }
    } catch (error) {
        console.error('❌ Error finding manifests:', error.message);
    }
    return [];
}

function getModifiedManifests() {
    try {
        // 🔥 FORCE MODE: Skip git diff, scan ALL manifests
        if (FORCE_SCAN_ALL) {
            console.log('🔥 Force mode enabled - will scan ALL manifests\n');
            const allManifests = getAllManifestsInRepo();
            console.log(`📋 Found ${allManifests.length} total manifest(s) in repo`);
            console.log('📝 Manifests found:');
            allManifests.forEach(file => console.log(`   - ${file}`));
            return allManifests;
        }
        
        // ============================================
        // IMPROVED: Better git diff detection
        // ============================================
        
        let manifestFiles = [];
        
        // Strategy 1: Check last commit for manifest changes
        try {
            const lastCommitFiles = execSync('git diff --name-only HEAD~1 HEAD', { 
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'pipe']
            }).trim();
            
            if (lastCommitFiles) {
                const changedFiles = lastCommitFiles.split('\n');
                console.log(`📋 Changed files in last commit: ${changedFiles.length}`);
                console.log('📝 Files changed:');
                changedFiles.forEach(file => console.log(`   - ${file}`));
                
                manifestFiles = changedFiles.filter(file => {
                    return file.endsWith('manifest.json') && 
                           !file.startsWith('.') && 
                           fs.existsSync(file);
                });
                
                console.log(`📄 Manifest files in last commit: ${manifestFiles.length}`);
            }
        } catch (diffError) {
            console.log('ℹ️  Could not diff last commit (might be first commit)');
        }
        
        // Strategy 2: If no manifests found, check unstaged changes
        if (manifestFiles.length === 0) {
            try {
                const unstagedFiles = execSync('git diff --name-only', {
                    encoding: 'utf-8',
                    stdio: ['pipe', 'pipe', 'pipe']
                }).trim();
                
                if (unstagedFiles) {
                    const files = unstagedFiles.split('\n');
                    const unstagedManifests = files.filter(file => {
                        return file.endsWith('manifest.json') && 
                               !file.startsWith('.') && 
                               fs.existsSync(file);
                    });
                    
                    if (unstagedManifests.length > 0) {
                        console.log(`📝 Found ${unstagedManifests.length} unstaged manifest(s)`);
                        manifestFiles = [...manifestFiles, ...unstagedManifests];
                    }
                }
            } catch (error) {
                // Silent fail
            }
        }
        
        // Strategy 3: Check for newly added (untracked) manifests
        try {
            const untrackedFiles = execSync('git ls-files --others --exclude-standard', {
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'pipe']
            }).trim();
            
            if (untrackedFiles) {
                const files = untrackedFiles.split('\n');
                const untrackedManifests = files.filter(file => {
                    return file.endsWith('manifest.json') && 
                           !file.startsWith('.') && 
                           fs.existsSync(file);
                });
                
                if (untrackedManifests.length > 0) {
                    console.log(`📝 Found ${untrackedManifests.length} untracked manifest(s)`);
                    manifestFiles = [...manifestFiles, ...untrackedManifests];
                }
            }
        } catch (error) {
            // Silent fail
        }
        
        // Remove duplicates
        manifestFiles = [...new Set(manifestFiles)];
        
        // Strategy 4: If still no manifests, check all manifests for unencrypted ones
        if (manifestFiles.length === 0) {
            console.log('ℹ️  No manifest changes detected via git');
            console.log('🔍 Checking all manifests for unencrypted ones...');
            
            const allManifests = getAllManifestsInRepo();
            const unencryptedManifests = [];
            
            for (const manifestPath of allManifests) {
                try {
                    const content = fs.readFileSync(manifestPath, 'utf8');
                    const manifest = JSON.parse(content);
                    
                    if (manifest.pages && manifest.pages.length > 0) {
                        const firstPage = manifest.pages[0];
                        if (!isEncrypted(firstPage)) {
                            unencryptedManifests.push(manifestPath);
                            console.log(`   ⚠️  Found unencrypted: ${manifestPath}`);
                        }
                    }
                } catch (error) {
                    // Skip invalid manifests
                }
            }
            
            if (unencryptedManifests.length > 0) {
                console.log(`\n🔍 Found ${unencryptedManifests.length} unencrypted manifest(s)!`);
                return unencryptedManifests;
            }
        }
        
        console.log(`\n📄 Total manifest files to process: ${manifestFiles.length}`);
        return manifestFiles;
        
    } catch (error) {
        console.warn('⚠️  Error detecting changes:', error.message);
        console.log('ℹ️  Falling back to scan all manifests...');
        
        // Fallback: scan all manifest.json files
        return getAllManifestsInRepo();
    }
}

// ============================================
// MANIFEST PROCESSING
// ============================================

function encryptManifest(filePath, secretKey) {
    try {
        console.log(`\n🔍 Processing: ${filePath}`);
        
        // Read manifest
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const manifest = JSON.parse(fileContent);
        
        if (!manifest.pages || !Array.isArray(manifest.pages)) {
            console.log(`  ⚠️  No pages array found - skipping`);
            return false;
        }
        
        // Check if already encrypted
        const firstPage = manifest.pages[0] || '';
        if (isEncrypted(firstPage)) {
            console.log(`  ✅ Already encrypted - skipping`);
            return false;
        }
        
        console.log(`  📊 Total pages: ${manifest.pages.length}`);
        console.log(`  🔐 Encrypting...`);
        
        // Encrypt each page URL
        manifest.pages = manifest.pages.map(pageUrl => {
            return encryptText(pageUrl, secretKey);
        });
        
        // Add encryption marker
        manifest.encrypted = true;
        manifest.encryption_version = '1.0';
        
        // Save encrypted manifest
        const jsonString = JSON.stringify(manifest, null, 2);
        fs.writeFileSync(filePath, jsonString, 'utf8');
        
        console.log(`  ✅ Encrypted successfully!`);
        return true;
        
    } catch (error) {
        console.error(`  ❌ Error processing ${filePath}:`, error.message);
        return false;
    }
}

// ============================================
// MAIN
// ============================================

function main() {
    const modeText = FORCE_SCAN_ALL ? '🔥 FORCE MODE: Scan ALL manifests' : '🔍 Smart detection mode';
    
    console.log('╔═══════════════════════════════════════╗');
    console.log('║     MANIFEST ENCRYPTION SCRIPT v2.0   ║');
    console.log(`║   ${modeText.padEnd(37)} ║`);
    console.log('╚═══════════════════════════════════════╝\n');
    
    // Derive encryption key
    const secretKey = deriveKey(SECRET_TOKEN);
    console.log(`🔑 Secret token loaded (${SECRET_TOKEN.length} chars)`);
    
    // Detect modified manifests
    const modifiedManifests = getModifiedManifests();
    
    if (modifiedManifests.length === 0) {
        console.log('\n✅ No new manifests to encrypt');
        process.exit(0);
    }
    
    console.log(`\n📋 Found ${modifiedManifests.length} manifest(s) to check:\n`);
    modifiedManifests.forEach(file => console.log(`   - ${file}`));
    
    // Encrypt each manifest
    let encryptedCount = 0;
    
    modifiedManifests.forEach(filePath => {
        if (encryptManifest(filePath, secretKey)) {
            encryptedCount++;
        }
    });
    
    console.log(`\n╔═══════════════════════════════════════╗`);
    console.log(`║  ✅ Encryption completed!             ║`);
    console.log(`║  📊 Encrypted: ${encryptedCount}/${modifiedManifests.length} manifest(s)           ║`);
    console.log(`╚═══════════════════════════════════════╝`);
}

main();
