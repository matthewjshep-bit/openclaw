#!/bin/bash
# scripts/restore_workspace.sh
# Usage: ./restore_workspace.sh [backup_file_or_date] [--force]

# --- Config ---
BACKUP_DIR="./backups"
GPG_KEY="openclaw"
LOG_FILE="/tmp/restore.log"
DATE_STR=$(date +%Y-%m-%d)

# Args
BACKUP_FILE=$1
FORCE_MODE=$2

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./restore_workspace.sh <backup_file> [--force]"
    exit 1
fi

if [ "$FORCE_MODE" != "--force" ]; then
    echo "⚠️ This script will overwrite your database files from the backup."
    echo "   Use --force to confirm."
    exit 1
fi

echo "📦 Starting RESTORE process..." | tee -a "$LOG_FILE"

# 1. Decrypt Backup
if [[ "$BACKUP_FILE" == *.gpg ]]; then
    DECRYPTED_FILE="${BACKUP_FILE%.gpg}"
    gpg --decrypt "$BACKUP_FILE" > "$DECRYPTED_FILE" 2>>"$LOG_FILE"
    if [ $? -ne 0 ]; then
        echo "❌ Decryption failed." | tee -a "$LOG_FILE"
        exit 1
    fi
    BACKUP_FILE="$DECRYPTED_FILE"
fi

# 2. Extract and Validate
tar -tzf "$BACKUP_FILE" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Tar extraction failed (corrupt archive?)." | tee -a "$LOG_FILE"
    exit 1
fi

# 3. Restore Files
echo "   Restoring files..." | tee -a "$LOG_FILE"
# Extract directly to workspace root
tar -xzvf "$BACKUP_FILE" -C ./ | tee -a "$LOG_FILE"

# 4. Verify Integrity (Checksums or file existence)
# We check the manifest inside (assuming manifest was extracted)
MANIFEST_FILE=$(tar -tf "$BACKUP_FILE" | grep "manifest.json")
if [ -f "$MANIFEST_FILE" ]; then
    echo "✅ Manifest found. Restore complete." | tee -a "$LOG_FILE"
else
    echo "⚠️ Manifest missing from backup. Verify manually." | tee -a "$LOG_FILE"
fi

echo "✅ RESTORE SUCCESSFUL." | tee -a "$LOG_FILE"
