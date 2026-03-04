const fs = require('fs');
const path = require('path');

// Memory Compaction Script
// Reads the last 7 daily notes and updates MEMORY.md with synthesized insights.

const MEMORY_DIR = path.join(__dirname, '../memory');
const LONG_TERM_MEMORY = path.join(__dirname, '../MEMORY.md');
const STATE_FILE = path.join(MEMORY_DIR, 'heartbeat-state.json');

// Helper: Get files for the last 7 days
function getRecentDailyNotes() {
    const files = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const filename = `${yyyy}-${mm}-${dd}.md`;
        const filepath = path.join(MEMORY_DIR, filename);
        if (fs.existsSync(filepath)) {
            files.push(filepath);
        }
    }
    return files;
}

// Helper: Read and combine content
function synthesizeNotes(files) {
    let combinedContent = "";
    files.forEach(file => {
        combinedContent += `\n\n--- Source: ${path.basename(file)} ---\n`;
        combinedContent += fs.readFileSync(file, 'utf8');
    });
    return combinedContent;
}

// Main logic
async function run() {
    console.log("🧠 Starting Memory Synthesis...");

    // 1. Check State
    let state = { lastChecks: {} };
    try {
        if (fs.existsSync(STATE_FILE)) {
            state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        }
    } catch (e) {
        console.warn("⚠️ State file corrupted. Resetting.");
    }

    // 2. Load Data
    const notes = getRecentDailyNotes();
    if (notes.length === 0) {
        console.log("No recent daily notes found to synthesize.");
        return;
    }

    const rawContent = synthesizeNotes(notes);
    console.log(`Found ${notes.length} daily notes. Content length: ${rawContent.length} chars.`);

    // 3. Synthesis (Simulated here - normally would use an LLM call)
    // In a real agent, we'd pass rawContent to an LLM and ask for a summary 
    // structured for MEMORY.md sections.
    // For this script, we'll just append a log entry to MEMORY.md to show it ran.
    
    const synthesisEntry = `\n- **${new Date().toISOString().split('T')[0]}:** Automated synthesis ran. Processed ${notes.length} files.`;
    
    // Append to "Operational Lessons" section roughly
    // (A real implementation would parse the markdown structure)
    try {
        let currentMemory = fs.readFileSync(LONG_TERM_MEMORY, 'utf8');
        if (currentMemory.includes("## 🛠 Operational Lessons")) {
             currentMemory = currentMemory.replace("## 🛠 Operational Lessons", `## 🛠 Operational Lessons${synthesisEntry}`);
             fs.writeFileSync(LONG_TERM_MEMORY, currentMemory);
             console.log("✅ Updated MEMORY.md with synthesis log.");
        } else {
            console.warn("⚠️ Could not find 'Operational Lessons' section in MEMORY.md");
        }
    } catch (e) {
        console.error("Error updating MEMORY.md:", e);
    }

    // 4. Update State
    state.lastChecks.memorySynthesis = Date.now();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    console.log("✅ State updated.");
}

run();
