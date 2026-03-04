# HEARTBEAT.md

# Hourly Github Backup
# Check if current time is near the top of the hour (e.g., :00 - :05) or simply run every check if interval is long enough.
# Since heartbeats are ~30 mins, we can just check if last backup was > 1h ago.
#
# Task:
# 1. Check git status
# 2. If changes exist:
#    - git add .
#    - git commit -m "Auto-backup: YYYY-MM-DD HH:MM"
#    - git push origin main
# 3. Log success to memory/heartbeat-state.json
