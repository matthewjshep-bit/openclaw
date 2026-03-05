# Security Audit (Nightly)
- Run `node scripts/security_scanner.js --audit-system` once per day.

# Memory Maintenance (Weekly)
- Run `node scripts/memory_synthesis.js` once per week (Sundays).
- Check `memory/heartbeat-state.json` to verify last run.

# Usage Tracking (Daily)
- Run `node scripts/usage_dashboard.js dashboard` to see daily spend.
- Run `node scripts/usage_dashboard.js sync` to import framework logs.

# Backup & Recovery (Hourly)
- Run `node scripts/backup_workspace.js` hourly.
- Run `scripts/sync_git_workspace.sh` hourly (offset by 5 mins).
- Run `node scripts/integrity_drill.js` daily.

# Analyst Briefings (2x Daily)
- Run `node scripts/analyst_daily_brief.js` at 9:00 AM and 5:00 PM.

# Morning Brief (Daily)
- At 8:00 AM, send the following report via Telegram:
  1. News stories relevant to Matt's interests (AI, startups, tech)
2. Today's Todoist tasks
3. Current weather forecast for the day
  2. Today's tasks from Matt's to-do list
  3. Recommendations for tasks I can complete today