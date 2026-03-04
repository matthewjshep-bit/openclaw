# HEARTBEAT.md

# Security Audit (Nightly)
- Run `node scripts/security_scanner.js --audit-system` once per day.

# Memory Maintenance (Weekly)
- Run `node scripts/memory_synthesis.js` once per week (Sundays).
- Check `memory/heartbeat-state.json` to verify last run.

# Usage Tracking (Daily)
- Run `node scripts/usage_dashboard.js dashboard` to see daily spend.
- Run `node scripts/usage_dashboard.js sync` to import framework logs (if available).
