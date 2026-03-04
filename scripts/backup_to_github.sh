#!/bin/bash
# OpenClaw Nightly Backup
cd /Users/matt/.openclaw/workspace || exit
if [[ -n $(git status -s) ]]; then
  git add .
  git commit -m "Nightly backup $(date '+%Y-%m-%d')"
  git push
  echo "Backup complete."
else
  echo "No changes to back up."
fi
