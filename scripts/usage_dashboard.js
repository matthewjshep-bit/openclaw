const Database = require('better-sqlite3');
const path = require('path');
const { PRICING, estimateCost } = require('../lib/cost_estimator');

const DB_PATH = path.join(__dirname, '../usage.db');

// --- Dashboard Logic ---
function generateDashboard(format = 'text') {
    const db = new Database(DB_PATH, { readonly: true });
    
    console.log("📊 Generating Usage Dashboard...");

    // 1. Total Spend by Provider
    const providerSpend = db.prepare(`
        SELECT provider, SUM(cost_usd) as total_cost 
        FROM llm_calls 
        GROUP BY provider 
        ORDER BY total_cost DESC
    `).all();

    // 2. Total Calls by Model
    const modelStats = db.prepare(`
        SELECT model, COUNT(*) as calls, SUM(input_tokens) as in_tokens, SUM(output_tokens) as out_tokens, SUM(cost_usd) as cost
        FROM llm_calls
        GROUP BY model
        ORDER BY calls DESC
    `).all();

    // 3. API Calls (Reliability)
    const apiReliability = db.prepare(`
        SELECT service, 
               COUNT(*) as total, 
               SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) as success,
               AVG(duration_ms) as avg_latency
        FROM api_calls
        GROUP BY service
    `).all();

    if (format === 'json') {
        console.log(JSON.stringify({ providerSpend, modelStats, apiReliability }, null, 2));
        return;
    }

    // Text Report
    console.log("\n💰 Spend by Provider:");
    if (providerSpend.length === 0) console.log("  (No data yet)");
    providerSpend.forEach(p => {
        console.log(`  - ${p.provider}: $${p.total_cost ? p.total_cost.toFixed(4) : '0.0000'}`);
    });

    console.log("\n🤖 Model Usage:");
    if (modelStats.length === 0) console.log("  (No data yet)");
    modelStats.forEach(m => {
        console.log(`  - ${m.model}: ${m.calls} calls | Cost: $${m.cost ? m.cost.toFixed(4) : '0.0000'} | In: ${m.in_tokens} | Out: ${m.out_tokens}`);
    });

    console.log("\n🌐 API Reliability:");
    if (apiReliability.length === 0) console.log("  (No data yet)");
    apiReliability.forEach(s => {
        const rate = (s.success / s.total * 100).toFixed(1);
        console.log(`  - ${s.service}: ${rate}% Success (${s.success}/${s.total}) | Avg Latency: ${s.avg_latency ? s.avg_latency.toFixed(0) : 0}ms`);
    });
}

// --- Sync Logic (Placeholder) ---
function syncFrameworkUsage() {
    console.log("🔄 Syncing framework usage...");
    // Future: Parse /tmp/openclaw logs for "LLM Call" events
    console.log("   (No external logs found to import)");
}

// --- CLI Logic ---
const args = process.argv.slice(2);
const COMMAND = args[0];

if (COMMAND === 'dashboard') {
    const format = args[1] === '--json' ? 'json' : 'text';
    generateDashboard(format);
} else if (COMMAND === 'sync') {
    syncFrameworkUsage();
} else {
    console.log(`
Usage:
  node scripts/usage_dashboard.js dashboard [--json]
  node scripts/usage_dashboard.js sync
    `);
}
