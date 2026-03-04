const fs = require('fs');
const os = require('os');
const path = require('path');

const configPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const CORRECT_TOKEN = '0daf0dda94f23a77a42235793faa3992f41c221bd3684a32f96691e9dd202ab5';

// 1. Set the Server Token
if (!config.gateway.auth) config.gateway.auth = {};
config.gateway.auth.token = CORRECT_TOKEN;

// 2. Set the Client Token (so the CLI/Probe works)
if (!config.gateway.remote) config.gateway.remote = {};
config.gateway.remote.token = CORRECT_TOKEN;

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('✅ FIXED: Server and Client tokens are now identical.');
