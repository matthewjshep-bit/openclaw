// scripts/analyst_daily_brief.js
// ... (imports) ...
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// -- CONFIG --
const REPORT_DIR = path.join(__dirname, '../memory/analyst_reports');
const KEYWORDS = [
    "Commercial Real Estate AI",
    "PropTech automation",
    "Real Estate Machine Learning"
];

// -- IMPORT ROUTER --
let llmRouter;
try {
    llmRouter = require('../lib/llm_router');
} catch (e) {
    console.error("❌ LLM Router missing.");
    process.exit(1);
}

// ... (searchBrave logic) ...
function searchBrave(query) {
    if (!process.env.BRAVE_API_KEY) {
        // Try loading from .env manually
        try {
            const envPath = path.join(__dirname, '../.env');
            if (fs.existsSync(envPath)) {
                const lines = fs.readFileSync(envPath, 'utf8').split('\n');
                lines.forEach(l => {
                    if (l.startsWith('export BRAVE_API_KEY=')) process.env.BRAVE_API_KEY = l.split('=')[1].trim();
                    if (l.startsWith('BRAVE_API_KEY=')) process.env.BRAVE_API_KEY = l.split('=')[1].trim();
                });
            }
        } catch(e) {}
    }

    if (!process.env.BRAVE_API_KEY) {
        return [];
    }
    try {
        const cmd = `curl -s -H "X-Subscription-Token: ${process.env.BRAVE_API_KEY}" "https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=3"`;
        const res = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        const data = JSON.parse(res);
        return (data.web?.results || []).map(r => ({
            source: 'Brave',
            title: r.title,
            url: r.url,
            snippet: r.description,
            date: r.age || 'recent'
        }));
    } catch (e) {
        return [];
    }
}

async function run() {
    console.log("🔍 Analyst: Starting Daily Briefing...");
    
    // 1. Gather Data
    let allResults = [];
    for (const term of KEYWORDS) {
        console.log(`   Searching: ${term}...`);
        allResults = [...allResults, ...searchBrave(term)];
    }

    if (allResults.length === 0) {
        console.log("   No results found.");
        return;
    }

    // 2. Synthesize
    const context = allResults.slice(0, 15).map(r => 
        `- [${r.source}] ${r.title}: ${r.snippet}`
    ).join('\n');

    const prompt = `
    Summarize these CRE/PropTech news items into a briefing.
    Format:
    # 📊 Analyst Briefing (${new Date().toISOString().split('T')[0]})
    ## Top Stories
    ## SDR Hooks

    INPUT:
    ${context}
    `;

    let report = "";
    try {
        console.log("🧠 Synthesizing with GPT-4o Mini...");
        report = await llmRouter.callLlm({
            model: 'gpt-4o-mini', 
            prompt: prompt,
            maxTokens: 1000,
            temperature: 0.3,
            context: 'analyst-brief'
        });

        // 3. Save
        if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
        const filepath = path.join(REPORT_DIR, `brief-${Date.now()}.md`);
        fs.writeFileSync(filepath, report);
        
        console.log(`✅ Report saved to: ${filepath}`);

    } catch (e) {
        console.error("❌ Failed:", e.message);
        return;
    }

    // 4. Output to Chat (via OpenClaw message CLI if available, or just console)
    // The user asked to see the output in chat. Since this runs as a cron/script,
    // we can use the 'openclaw message send' tool if configured, or rely on the agent reading the log.
    // BUT the prompt says "put the full output here in the chat". 
    // If running autonomously, 'console.log' is captured.
    
    console.log("\n" + report + "\n");
}

run();
