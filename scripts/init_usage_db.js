const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../usage.db');

function initDB() {
    console.log(`Initializing Usage Database at ${DB_PATH}...`);
    const db = new Database(DB_PATH);

    // 1. LLM Calls Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS llm_calls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            provider TEXT NOT NULL,
            model TEXT NOT NULL,
            prompt_hash TEXT,
            input_tokens INTEGER,
            output_tokens INTEGER,
            duration_ms INTEGER,
            cost_usd REAL,
            status TEXT,
            context TEXT -- Optional: store task type or description
        )
    `);

    // 2. API Calls Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS api_calls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            service TEXT NOT NULL,
            endpoint TEXT,
            method TEXT,
            status_code INTEGER,
            duration_ms INTEGER
        )
    `);

    // 3. Cost Rates Table (for easier updates)
    db.exec(`
        CREATE TABLE IF NOT EXISTS cost_rates (
            model TEXT PRIMARY KEY,
            input_price_per_1k REAL,
            output_price_per_1k REAL
        )
    `);

    // Seed some default rates
    const stmt = db.prepare(`
        INSERT OR IGNORE INTO cost_rates (model, input_price_per_1k, output_price_per_1k)
        VALUES (@model, @input, @output)
    `);

    const rates = [
        { model: 'gpt-4o', input: 0.005, output: 0.015 },
        { model: 'gpt-4o-mini', input: 0.00015, output: 0.0006 },
        { model: 'claude-3-5-sonnet', input: 0.003, output: 0.015 },
        { model: 'gemini-1.5-pro', input: 0.0035, output: 0.0105 },
        { model: 'gemini-1.5-flash', input: 0.000075, output: 0.0003 }
    ];

    for (const rate of rates) {
        stmt.run(rate);
    }

    console.log("✅ Database initialized successfully.");
    db.close();
}

initDB();
