// scripts/analyst_daily_brief.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// -- CONFIG --
const REPORT_DIR = path.join(__dirname, '../memory/analyst_reports');
const KEYWORDS = [
    "Commercial Real Estate AI",
    "PropTech automation",
    "Real Estate Machine Learning",
    "CRE generative AI",
    "Private Equity Real Estate technology"
];

// Ensure report dir
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

// -- IMPORT ROUTER --
let llmRouter;
try {
    llmRouter = require('../lib/llm_router');
} catch (e) {
    console.error("❌ LLM Router missing. Run 'npm install' or check lib/llm_router.js");
    process.exit(1);
}

// -- SEARCH HELPERS --

// 1. Brave Search (News/Web)
function searchBrave(query) {
    const key = process.env.BRAVE_API_KEY;
    if (!key) {
        console.warn("⚠️ BRAVE_API_KEY missing. Skipping web search.");
        return [];
    }
    
    try {
        // Simple curl wrapper since we don't have a brave SDK installed yet
        // Using 'execSync' for simplicity in this script context
        const cmd = `curl -s -H "X-Subscription-Token: ${key}" "https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5"`;
        const res = execSync(cmd, { encoding: 'utf8' });
        const data = JSON.parse(res);
        
        return (data.web?.results || []).map(r => ({
            source: 'Brave',
            title: r.title,
            url: r.url,
            snippet: r.description,
            date: r.age || 'recent'
        }));
    } catch (e) {
        console.error(`❌ Brave search failed for "${query}":`, e.message);
        return [];
    }
}

// 2. X Search (via Grok API if available, or just mock if Grok doesn't support search yet)
// Note: Grok API (xAI) is currently LLM-only, it doesn't search X posts directly via API key yet unless you use the 'grok-beta' model with tools.
// For now, we'll use Brave to search "site:twitter.com query" as a fallback, or use the xAI LLM to *generate* insights if it has recent knowledge.
// Actually, let's use the 'web_search' tool logic if we were an agent, but as a script, we'll stick to Brave for now.
function searchX(query) {
    // Fallback: Search X via Brave
    return searchBrave(`site:twitter.com ${query}`);
}


// -- MAIN LOGIC --
async function run() {
    console.log("🔍 Analyst: Starting Daily Briefing...");
    
    let allResults = [];

    // 1. Gather Data
    for (const term of KEYWORDS) {
        console.log(`   Searching: ${term}...`);
        const webResults = searchBrave(term);
        // const xResults = searchX(term); // Skip X specific for now to save tokens/complexity, Brave covers it
        
        allResults = [...allResults, ...webResults];
    }

    // Deduplicate by URL
    const seen = new Set();
    const uniqueResults = allResults.filter(r => {
        if (seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
    });

    console.log(`   Found ${uniqueResults.length} unique items.`);

    if (uniqueResults.length === 0) {
        console.log("   No new information found.");
        return;
    }

    // 2. Synthesize with LLM
    const context = uniqueResults.map(r => 
        `- [${r.source}] ${r.title} (${r.date}): ${r.snippet} (${r.url})`
    ).join('\n');

    const prompt = `
    You are the Analyst Agent for a CRE/PropTech firm.
    Review these recent search results and summarize the Top 3-5 most important developments.
    
    Focus on:
    - Concrete news (launches, funding, regulations).
    - Market shifts in CRE AI.
    - "Hooks" that a sales rep (SDR) could use to start a conversation.
    
    FORMAT:
    # 📊 Analyst Briefing (${new Date().toISOString().split('T')[0]})
    
    ## 🚨 Top Stories
    1. **Title** - Summary. *Why it matters.*
    
    ## 🎣 SDR Hooks (Conversation Starters)
    - "Did you see [X]?" - Link to specific trend.
    
    ## 🔗 Sources
    - [Title](URL)
    
    INPUT DATA:
    ${context}
    `;

    try {
        console.log("🧠 Synthesizing report with Gemini Flash...");
        const report = await llmRouter.callLlm({
            model: 'google/gemini-1.5-flash', // Fast/Cheap per policy
            prompt: prompt,
            maxTokens: 2000,
            temperature: 0.3,
            context: 'analyst-brief'
        });

        // 3. Save Report
        const filename = `brief-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.md`;
        const filepath = path.join(REPORT_DIR, filename);
        fs.writeFileSync(filepath, report);
        
        console.log(`✅ Report saved to: ${filepath}`);
        console.log("\n--- PREVIEW ---\n");
        console.log(report.substring(0, 500) + "...\n");

    } catch (e) {
        console.error("❌ Report generation failed:", e.message);
    }
}

run();
