// lib/llm_router.js
const { detectProvider, getModelCapabilities } = require('./model_utils');
const { estimateCost } = require('./cost_estimator');
const { execSync } = require('child_process');
const axios = require('axios');
const path = require('path');

// Fix: Correct path to log script
const LOG_SCRIPT = path.join(__dirname, '../scripts/log_usage.js');

// --- Helper: Log Wrapper ---
function logCall(data) {
    // Fire-and-forget logging via child process
    try {
        const payload = JSON.stringify(data);
        execSync(`node "${LOG_SCRIPT}" llm '${payload}'`, { stdio: 'ignore', timeout: 500 });
    } catch (e) {
        // Silently fail logging to avoid blocking main thread
    }
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

        // Auto-calculate input/output tokens if provider doesn't send them reliably
        const inputTokens = usage.prompt_tokens || (prompt.length / 4);
        const outputTokens = usage.completion_tokens || (content.length / 4);

        logCall({
            provider: 'openai',
            model,
            inputTokens,
            outputTokens,
            durationMs: duration,
            status: 'success',
            context: options.context
        });

        return content;
    } catch (error) {
        logCall({ provider: 'openai', model, status: 'error', durationMs: Date.now() - start });
        throw error;
    }
}

async function callAnthropic(model, prompt, options) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("Missing ANTHROPIC_API_KEY");

    const start = Date.now();
    try {
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: options.maxTokens || 1024,
            temperature: options.temperature || 0.7
        }, {
            headers: { 
                'x-api-key': key, 
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            }
        });

        const usage = response.data.usage || {};
        const content = response.data.content[0].text;
        const duration = Date.now() - start;

        logCall({
            provider: 'anthropic',
            model,
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            durationMs: duration,
            status: 'success',
            context: options.context
        });

        return content;
    } catch (error) {
        logCall({ provider: 'anthropic', model, status: 'error', durationMs: Date.now() - start });
        throw error;
    }
}

async function callGoogle(model, prompt, options) {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) throw new Error("Missing GOOGLE_API_KEY");

    const start = Date.now();
    try {
        const cleanModel = model.replace('google/', '');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${key}`;
        
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: options.temperature || 0.7,
                maxOutputTokens: options.maxTokens || 1000
            }
        });

        const usage = response.data.usageMetadata || {};
        const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const duration = Date.now() - start;

        logCall({
            provider: 'google',
            model,
            inputTokens: usage.promptTokenCount || 0,
            outputTokens: usage.candidatesTokenCount || 0,
            durationMs: duration,
            status: 'success',
            context: options.context
        });

        return content;
    } catch (error) {
        logCall({ provider: 'google', model, status: 'error', durationMs: Date.now() - start });
        throw error;
    }
}

// --- Unified Router ---

/**
 * Main entry point for LLM calls.
 * @param {object} params { model, prompt, maxTokens, temperature, context }
 */
async function callLlm(params) {
    const { model, prompt } = params;
    const provider = detectProvider(model);
    
    // console.log(`Routing to ${provider}...`);

    switch (provider) {
        case 'openai': return await callOpenAI(model, prompt, params);
        case 'anthropic': return await callAnthropic(model, prompt, params);
        case 'google': return await callGoogle(model, prompt, params);
        default: throw new Error(`Provider not supported for model: ${model}`);
    }
}

module.exports = {
    callLlm,
    direct: {
        openai: callOpenAI,
        anthropic: callAnthropic,
        google: callGoogle
    }
};
