#!/usr/local/bin/node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const tar = require('tar');

// --- CONFIG ---
const WORKSPACE_DIR = path.join(__dirname, '../'); // Workspace root
const BACKUP_DIR = path.join(WORKSPACE_DIR, 'backups');
const MAX_BACKUPS = 7;
const GPG_RECIPIENT = 'openclaw'; // Using the key name/email from key.txt context if available

// Ensure backup dir exists
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

function runBackup() {
    console.log("📦 Starting Workspace Backup...");
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${timestamp}`;
    const manifestPath = path.join(BACKUP_DIR, `${backupName}-manifest.json`);
    const tarPath = path.join(BACKUP_DIR, `${backupName}.tar.gz`);
    const encryptedPath = `${tarPath}.gpg`;

    // 1. Discovery: Find DBs and JSONL logs
    // We scan recursively for .db, .sqlite, .jsonl
    const filesToBackup = [];
    
    function scan(dir) {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            if (fullPath.includes('node_modules') || fullPath.includes('.git')) continue;
            
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                scan(fullPath);
            } else if (fullPath.endsWith('.db') || fullPath.endsWith('.sqlite') || fullPath.endsWith('.jsonl')) {
                filesToBackup.push(fullPath);
            }
        }
    }
    scan(WORKSPACE_DIR);

    if (filesToBackup.length === 0) {
        console.log("No database or log files found to backup.");
        return;
    }

    // 2. Create Manifest
    const manifest = {
        timestamp,
        files: filesToBackup.map(f => ({
            originalPath: f,
            relPath: path.relative(WORKSPACE_DIR, f)
        }))
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`Found ${filesToBackup.length} files to backup.`);

    // 3. Create Tarball (files + manifest)
    // We add the manifest to the tarball list
    const tarList = filesToBackup.map(f => path.relative(WORKSPACE_DIR, f));
    tarList.push(path.relative(WORKSPACE_DIR, manifestPath));

    try {
        tar.create(
            {
                gzip: true,
                file: tarPath,
                cwd: WORKSPACE_DIR,
                sync: true
            },
            tarList
        );
        console.log("✅ Tarball created.");
    } catch (e) {
        console.error("❌ Tar creation failed:", e.message);
        process.exit(1);
    }

    // 4. Encrypt (GPG)
    // Check if GPG key exists, otherwise skip encryption (warn)
    try {
        execSync(`gpg --list-keys ${GPG_RECIPIENT}`, { stdio: 'ignore' });
        execSync(`gpg --yes --batch --output "${encryptedPath}" --encrypt --recipient "${GPG_RECIPIENT}" "${tarPath}"`);
        console.log("🔒 Encrypted backup created.");
        fs.unlinkSync(tarPath); // Remove unencrypted tar
    } catch (e) {
        console.warn("⚠️ GPG encryption skipped (key not found or failed). Keeping raw tarball.");
        // If encryption fails, we keep the .tar.gz
    }

    // 5. Upload to Cloud (Google Drive via gog)
    const finalFile = fs.existsSync(encryptedPath) ? encryptedPath : tarPath;
    const finalFileName = path.basename(finalFile);
    
    try {
        // Create 'OpenClaw Backups' folder if needed? (gog doesn't auto-create folders easily by name, skipping for now)
        // Just upload to root or search first.
        console.log(`☁️ Uploading ${finalFileName} to Drive...`);
        // execSync(`gog drive upload "${finalFile}"`); // Hypothetical command
        // Since gog CLI structure varies, we assume:
        // 'gog drive upload <path>' or similar. 
        // Checking help earlier: "gog drive search", no explicit upload in the skill description provided?
        // Wait, the skill description doesn't list 'upload'. It lists 'search'.
        // Let's assume for now we just store locally or use a placeholder upload.
        // If gog drive upload is missing, we can't upload.
        
        console.log("⚠️ 'gog drive upload' command not confirmed in skill. Skipping cloud upload.");
    } catch (e) {
        console.error("❌ Cloud upload failed:", e.message);
    }

    // 6. Cleanup Old Backups
    const backups = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.gpg') || f.endsWith('.tar.gz'))
        .sort()
        .reverse(); // Newest first

    if (backups.length > MAX_BACKUPS) {
        const toDelete = backups.slice(MAX_BACKUPS);
        toDelete.forEach(f => {
            fs.unlinkSync(path.join(BACKUP_DIR, f));
            console.log(`🗑️ Deleted old backup: ${f}`);
        });
    }

    // Cleanup manifest file (it's inside the tar now)
    if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);

    console.log("✅ Backup process complete.");
}

runBackup();
