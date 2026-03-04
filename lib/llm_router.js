// lib/llm_router.js
const { detectProvider } = require('./model_utils');
const { execSync } = require('child_process');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// --- LOAD ENV ---
const ENV_PATH = path.join(__dirname, '../.env');
if (fs.existsSync(ENV_PATH)) {
    const lines = fs.readFileSync(ENV_PATH, 'utf8').split('\n');
    lines.forEach(line => {
        const match = line.match(/^(?:export\s+)?([A-Z0-9_]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const val = match[2].trim();
            if (!process.env[key]) process.env[key] = val;
        }
    });
}

const LOG_SCRIPT = path.join(__dirname, '../scripts/log_usage.js');

function logCall(data) {
    try {
        const payload = JSON.stringify(data);
        execSync(`node "${LOG_SCRIPT}" llm '${payload}'`, { stdio: 'ignore', timeout: 500 });
    } catch (e) {}
}

// --- Provider Clients ---

async function callOpenAI(model, prompt, options) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("Missing OPENAI_API_KEY");

    const start = Date.now();
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: options.maxTokens || 1000,
            temperature: options.temperature || 0.7
        }, {
            headers: { 'Authorization': `Bearer ${key}` }
        });

        const usage = response.data.usage || {};
        const content = response.data.choices[0].message.content;
        const duration = Date.now() - start;

        logCall({
            provider: 'openai',
            model,
            inputTokens: usage.prompt_tokens,
            outputTokens: usage.completion_tokens,
            durationMs: duration,
            status: 'success',
            context: options.context
        });

        return content;
    } catch (error) {
        if (error.response) console.error("OpenAI Error:", JSON.stringify(error.response.data));
        logCall({ provider: 'openai', model, status: 'error', durationMs: Date.now() - start });
        throw error;
    }
}

async function callGoogle(model, prompt, options) { /* ... (keeping logic for future) ... */ }
async function callAnthropic(model, prompt, options) { /* ... (keeping logic for future) ... */ }

// --- Unified Router ---
async function callLlm(params) {
    const { model, prompt } = params;
    const provider = detectProvider(model);
    
    switch (provider) {
        case 'openai': return await callOpenAI(model, prompt, params);
        case 'anthropic': return await callAnthropic(model, prompt, params); // Currently out of credits
        case 'google': return await callGoogle(model, prompt, params); // Currently 404s
        default: throw new Error(`Provider not supported for model: ${model}`);
    }
}

module.exports = {
    callLlm,
    direct: { google: callGoogle, anthropic: callAnthropic, openai: callOpenAI }
};
