const fs = require('fs');
const os = require('os');
const path = require('path');

const configPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Update the token to match Mission Control
config.gateway.auth.token = '0daf0dda94f23a77a42235793faa3992f41c221bd3684a32f96691e9dd202ab5';

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('Updated OpenClaw gateway token successfully.');
