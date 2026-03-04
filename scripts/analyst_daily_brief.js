// scripts/analyst_daily_brief.js
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

// -- LOAD ENV --
const ENV_PATH = path.join(__dirname, '../.env');
if (fs.existsSync(ENV_PATH)) {
    const lines = fs.readFileSync(ENV_PATH, 'utf8').split('\n');
    lines.forEach(line => {
        const match = line.match(/^(?:export\s+)?([A-Z0-9_]+)=(.*)$/);
        if (match) process.env[match[1].trim()] = match[2].trim();
    });
}

function searchBrave(query) {
    if (!process.env.BRAVE_API_KEY) return [];
    try {
        const cmd = `curl -s -H "X-Subscription-Token: ${process.env.BRAVE_API_KEY}" "https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5"`;
        const res = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        const data = JSON.parse(res);
        return (data.web?.results || []).map(r => ({
            source: 'Web',
            title: r.title,
            url: r.url,
            snippet: r.description
        }));
    } catch (e) {
        return [];
    }
}

function searchX(query) {
    if (!process.env.BRAVE_API_KEY) return [];
    try {
        const cmd = `curl -s -H "X-Subscription-Token: ${process.env.BRAVE_API_KEY}" "https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent('site:twitter.com OR site:x.com ' + query)}&count=5"`;
        const res = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        const data = JSON.parse(res);
        return (data.web?.results || []).map(r => ({
            source: 'X',
            title: r.title,
            url: r.url,
            snippet: r.description
        }));
    } catch (e) {
        return [];
    }
}

async function run() {
    console.log("🔍 Analyst: Starting Daily Briefing...");
    
    let webResults = [];
    let xResults = [];

    for (const term of KEYWORDS) {
        console.log(`   Searching: ${term}...`);
        webResults = [...webResults, ...searchBrave(term)];
        xResults = [...xResults, ...searchX(term)];
    }

    // Deduplicate
    const seen = new Set();
    const uniqueWeb = webResults.filter(r => !seen.has(r.url) && seen.add(r.url));
    const uniqueX = xResults.filter(r => !seen.has(r.url) && seen.add(r.url));

    if (uniqueWeb.length === 0 && uniqueX.length === 0) {
        console.log("   No results found.");
        return;
    }

    const contextWeb = uniqueWeb.map(r => `- [Web] ${r.title}: ${r.snippet} (Source: ${r.url})`).join('\n');
    const contextX = uniqueX.map(r => `- [X] ${r.title}: ${r.snippet} (Source: ${r.url})`).join('\n');

    const prompt = `
    You are the Analyst Agent for a CRE/PropTech firm.
    Review the recent developments below and generate a briefing.

    REQUIREMENTS:
    1. Organize the output into "Web Search" and "X Posts" sections.
    2. For every item, include the title and the SOURCE LINK.
    3. CALL OUT FIRMS: In a separate "Firms Referenced" section, list every company mentioned.
    4. REAL ESTATE SPECIFIC: Identify which of these are specifically Real Estate firms (developers, REITs, brokerages).
    
    FORMAT:
    # 📊 Analyst Briefing (${new Date().toISOString().split('T')[0]})
    
    ## 🌐 Web Search
    | **Topic** | **Summary** | **Source** |
    | :--- | :--- | :--- |
    | Topic | Summary... | [Link Title](URL) |

    ## 🐦 X Posts
    | **Topic** | **Summary** | **Source** |
    | :--- | :--- | :--- |
    | Topic | Summary... | [Link Title](URL) |

    ## 🏢 Firms Referenced
    - **[Firm Name]**: [Industry/Type] (e.g. AI Tech, RE Developer)

    ## 🎣 SDR Hooks
    - "Hook text..."
    
    INPUT DATA:
    --- WEB ---
    ${contextWeb}
    
    --- X ---
    ${contextX}
    `;

    try {
        console.log("🧠 Synthesizing report...");
        const report = await llmRouter.callLlm({
            model: 'gpt-4o-mini', 
            prompt: prompt,
            maxTokens: 1500,
            temperature: 0.3,
            context: 'analyst-brief'
        });

        if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
        const filepath = path.join(REPORT_DIR, `brief-${Date.now()}.md`);
        fs.writeFileSync(filepath, report);
        
        console.log(`✅ Report saved to: ${filepath}`);
        console.log("\n" + report + "\n");

    } catch (e) {
        console.error("❌ Failed:", e.message);
    }
}

run();
