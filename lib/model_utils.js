// lib/model_utils.js

/**
 * OpenClaw Model Utilities
 * 
 * Provides model detection, capability mapping, and provider resolution.
 */

const PROVIDER_MAP = {
    'gpt-': 'openai',
    'o1': 'openai',
    'claude-': 'anthropic',
    'gemini-': 'google',
    'llama-': 'meta', // usually via groq/together/etc, default to 'openai-compatible' or specific
    'mistral-': 'mistral'
};

const CAPABILITY_MAP = {
    'gpt-4o': { tier: 'flagship', context: 128000, vision: true },
    'gpt-4o-mini': { tier: 'efficient', context: 128000, vision: true },
    'claude-3-5-sonnet': { tier: 'flagship', context: 200000, vision: true },
    'claude-3-haiku': { tier: 'efficient', context: 200000, vision: false },
    'gemini-1.5-pro': { tier: 'flagship', context: 2000000, vision: true },
    'gemini-1.5-flash': { tier: 'efficient', context: 1000000, vision: true }
};

/**
 * Detect provider from model name
 * @param {string} model 
 * @returns {string} provider name (openai, anthropic, google, unknown)
 */
function detectProvider(model) {
    if (!model) return 'unknown';
    const lower = model.toLowerCase();
    for (const [prefix, provider] of Object.entries(PROVIDER_MAP)) {
        if (lower.includes(prefix)) return provider;
    }
    return 'unknown';
}

/**
 * Get model capabilities
 * @param {string} model 
 * @returns {object} { tier, context, vision }
 */
function getModelCapabilities(model) {
    // Exact match first
    if (CAPABILITY_MAP[model]) return CAPABILITY_MAP[model];
    
    // Heuristic fallback
    const provider = detectProvider(model);
    return {
        tier: model.includes('mini') || model.includes('flash') || model.includes('haiku') ? 'efficient' : 'flagship',
        context: 8192, // Safe default
        vision: false,
        provider
    };
}

module.exports = {
    detectProvider,
    getModelCapabilities
};
