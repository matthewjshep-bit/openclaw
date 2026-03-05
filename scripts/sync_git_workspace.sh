#!/bin/bash
# scripts/sync_git_workspace.sh
# Auto-sync workspace to git.
# Run this hourly via cron.

# Config
REPO_DIR="$(dirname "$0")/.."
PID_FILE="/tmp/openclaw_git_sync.pid"
LOG_FILE="/tmp/openclaw_git_sync.log"

cd "$REPO_DIR" || exit 1

# PID Guard
if [ -f "$PID_FILE" ]; then
    # Check if process is still running
    if kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        echo "Sync already running. PID $(cat "$PID_FILE"). Exiting." >> "$LOG_FILE"
        exit 1
    fi
fi
echo $$ > "$PID_FILE"

# Trap cleanup
trap "rm -f $PID_FILE" EXIT

echo "--- Sync Started: $(date) ---" >> "$LOG_FILE"

# 1. Add & Commit (First) to allow clean rebase
git add . >> "$LOG_FILE" 2>&1
if git diff-index --quiet HEAD --; then
    echo "No local changes to commit." >> "$LOG_FILE"
else
    git commit -m "Auto-sync: $(date)" >> "$LOG_FILE" 2>&1
fi

# 2. Pull Latest
git pull --rebase >> "$LOG_FILE" 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Pull failed. Conflict?" >> "$LOG_FILE"
    # Send alert (if messaging tool available via CLI/curl to gateway, or just log)
    # openclaw message send --to admin --message "Git Sync Failed: Conflict detected."
    exit 1
fi

# 3. Push
git push >> "$LOG_FILE" 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Push failed." >> "$LOG_FILE"
    exit 1
fi
echo "✅ Changes pushed." >> "$LOG_FILE"

echo "--- Sync Complete: $(date) ---" >> "$LOG_FILE"
