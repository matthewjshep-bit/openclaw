const Database = require('better-sqlite3');
const path = require('path');
const { estimateCost } = require('../lib/cost_estimator');

const DB_PATH = path.join(__dirname, '../usage.db');

// --- Main Logging Script ---

function logLLM(data) {
    let { provider, model, promptHash, inputTokens, outputTokens, durationMs, costUsd, status, context } = data;
    
    // Auto-calculate cost if missing
    if (costUsd === undefined && model && inputTokens !== undefined) {
        costUsd = estimateCost(model, inputTokens, outputTokens || 0);
    }

    const db = new Database(DB_PATH);
    const stmt = db.prepare(`
        INSERT INTO llm_calls (provider, model, prompt_hash, input_tokens, output_tokens, duration_ms, cost_usd, status, context)
        VALUES (@provider, @model, @promptHash, @inputTokens, @outputTokens, @durationMs, @costUsd, @status, @context)
    `);
    
    try {
        stmt.run({
            provider: provider || 'unknown',
            model: model || 'unknown',
            promptHash: promptHash || null,
            inputTokens: inputTokens || 0,
            outputTokens: outputTokens || 0,
            durationMs: durationMs || 0,
            costUsd: costUsd || 0,
            status: status || 'success',
            context: context || ''
        });
    } catch (err) {
        console.error("DB Error:", err.message);
    } finally {
        db.close();
    }
}

function logAPI(data) {
    const { service, endpoint, method, statusCode, durationMs } = data;
    const db = new Database(DB_PATH);
    const stmt = db.prepare(`
        INSERT INTO api_calls (service, endpoint, method, status_code, duration_ms)
        VALUES (@service, @endpoint, @method, @statusCode, @durationMs)
    `);
    
    try {
        stmt.run({
            service: service || 'unknown',
            endpoint: endpoint || '',
            method: method || 'GET',
            statusCode: statusCode || 200,
            durationMs: durationMs || 0
        });
    } catch (err) {
        console.error("DB Error:", err.message);
    } finally {
        db.close();
    }
}

// --- CLI Interface for Fire-and-Forget ---
const args = process.argv.slice(2);
const COMMAND = args[0];

if (COMMAND === 'llm') {
    // Expects JSON string as second arg
    try {
        const payload = JSON.parse(args[1]);
        logLLM(payload);
    } catch (e) {
        console.error("Failed to parse/log LLM data:", e);
    }
} else if (COMMAND === 'api') {
    try {
        const payload = JSON.parse(args[1]);
        logAPI(payload);
    } catch (e) {
        console.error("Failed to parse/log API data:", e);
    }
} else {
    // Only print usage if run directly without args, to be silent otherwise
    if (args.length === 0) {
        console.log(`
Usage (internal):
  node scripts/log_usage.js llm '{"provider":"openai",...}'
  node scripts/log_usage.js api '{"service":"github",...}'
        `);
    }
}
