const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../usage.db');

/**
 * OpenClaw Cost Estimator Module
 * Provides pricing and token estimation for popular LLMs.
 */

const PRICING = {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
    'gemini-1.5-pro': { input: 0.0035, output: 0.0105 },
    'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
    // Defaults for unknown
    'default': { input: 0.001, output: 0.003 }
};

/**
 * Estimate token count from text (approximate)
 * @param {string} text 
 * @returns {number} Estimated token count
 */
function estimateTokensFromChars(text) {
    if (!text) return 0;
    // Rough estimate: 1 token ~= 4 chars (for English)
    return Math.ceil(text.length / 4);
}

/**
 * Calculate cost for an LLM call
 * @param {string} model 
 * @param {number} inputTokens 
 * @param {number} outputTokens 
 * @returns {number} Cost in USD
 */
function estimateCost(model, inputTokens, outputTokens) {
    const rate = PRICING[model] || PRICING['default'];
    
    const inputCost = (inputTokens / 1000) * rate.input;
    const outputCost = (outputTokens / 1000) * rate.output;
    
    return parseFloat((inputCost + outputCost).toFixed(6));
}

module.exports = {
    PRICING,
    estimateTokensFromChars,
    estimateCost
};
