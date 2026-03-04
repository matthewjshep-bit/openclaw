const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Load cost estimator properly
let estimateCost;
try {
    const estimator = require('../lib/cost_estimator');
    estimateCost = estimator.estimateCost;
} catch (e) {
    console.warn("⚠️ Could not load cost estimator, using fallback.");
    estimateCost = () => 0;
}

const DB_PATH = path.join(__dirname, '../usage.db');
const STATE_FILE = path.join(__dirname, '../memory/usage-sync-state.json'); // Corrected path to be inside memory/

function getOpenClawStatus() {
    try {
        // Run openclaw status --json to get live session data
        const output = execSync('openclaw status --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); 
        return JSON.parse(output);
    } catch (e) {
        console.error("❌ Failed to run 'openclaw status --json':", e.message);
        return null;
    }
}

function syncUsage() {
    console.log("🔄 Syncing OpenClaw session usage...");

    // 1. Ensure Memory Dir Exists
    const memDir = path.dirname(STATE_FILE);
    if (!fs.existsSync(memDir)) fs.mkdirSync(memDir, { recursive: true });

    // 2. Load Previous State
    let state = {};
    if (fs.existsSync(STATE_FILE)) {
        try {
            state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        } catch (e) {
            console.warn("⚠️ Corrupt state file, starting fresh.");
        }
    }

    // 3. Get Current Status
    const statusData = getOpenClawStatus();
    if (!statusData || !statusData.sessions || !statusData.sessions.recent) {
        console.log("   (No active session data found in status output)");
        return;
    }

    const db = new Database(DB_PATH);

    let totalNewCost = 0;

    // 4. Process Each Session
    // statusData.sessions.recent is an array of active sessions
    statusData.sessions.recent.forEach(session => {
        const sessionId = session.sessionId || session.key; // Fallback key if id missing
        const model = session.model || 'unknown';
        
        // Infer provider
        let provider = 'unknown';
        if (model.includes('gpt')) provider = 'openai';
        else if (model.includes('claude')) provider = 'anthropic';
        else if (model.includes('gemini')) provider = 'google';

        // Current totals from OpenClaw
        const currentInput = session.inputTokens || 0;
        const currentOutput = session.outputTokens || 0;

        // Last known totals from our state
        const lastState = state[sessionId] || { input: 0, output: 0 };

        // Calculate delta (what happened since last sync)
        const deltaInput = currentInput - lastState.input;
        const deltaOutput = currentOutput - lastState.output;

        if (deltaInput > 0 || deltaOutput > 0) {
            const cost = estimateCost(model, deltaInput, deltaOutput);
            totalNewCost += cost;

            console.log(`   📝 Session ${sessionId.slice(0,8)}... used ${deltaInput} in / ${deltaOutput} out. Cost: $${cost}`);

            const stmt = db.prepare(`
                INSERT INTO llm_calls (provider, model, input_tokens, output_tokens, cost_usd, status, context)
                VALUES (@provider, @model, @input, @output, @cost, 'success', 'Auto-Sync')
            `);
            
            stmt.run({
                provider: provider,
                model: model,
                input: deltaInput,
                output: deltaOutput,
                cost: cost
            });

            // Update state with new totals
            state[sessionId] = {
                input: currentInput,
                output: currentOutput,
                lastSync: Date.now()
            };
        } else {
            // No new usage
            // console.log(`   (No new usage for session ${sessionId.slice(0,8)}...)`);
        }
    });

    db.close();

    // 5. Save State
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    
    if (totalNewCost > 0) {
        console.log(`✅ Sync complete. Logged $${totalNewCost.toFixed(4)} of new usage.`);
    } else {
        console.log("✅ Sync complete. No new usage detected.");
    }
}

// Run immediately
syncUsage();
