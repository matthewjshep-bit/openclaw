const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const configPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log('✅ Config file read successfully.');
} catch (e) {
  console.error('❌ Failed to read config:', e.message);
  process.exit(1);
}

const serverToken = config.gateway?.auth?.token;
const clientToken = config.gateway?.remote?.token; // Where CLI looks
const missionControlToken = '0daf0dda94f23a77a42235793faa3992f41c221bd3684a32f96691e9dd202ab5';

console.log('--- Token Status ---');
console.log('Server Token (gateway.auth.token):', serverToken ? serverToken.substring(0, 10) + '...' : 'MISSING');
console.log('Client Token (gateway.remote.token):', clientToken ? clientToken.substring(0, 10) + '...' : 'MISSING');
console.log('Mission Control Token (expected):   ', missionControlToken.substring(0, 10) + '...');

if (serverToken !== missionControlToken) {
  console.error('❌ MISMATCH: Server token does NOT match Mission Control token!');
} else {
  console.log('✅ MATCH: Server token matches Mission Control token.');
}

if (clientToken !== missionControlToken) {
  console.warn('⚠️ WARNING: Client token (CLI) does NOT match Mission Control token. CLI commands might fail, but Dashboard should work.');
}

console.log('\n--- Connectivity Test ---');
// Try to connect to Gateway HTTP endpoint
const req = http.request({
  hostname: '127.0.0.1',
  port: 18789,
  path: '/',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${missionControlToken}`
  },
  timeout: 2000
}, (res) => {
  console.log(`✅ Gateway responded with status: ${res.statusCode}`);
  if (res.statusCode === 401) {
    console.error('❌ Unauthorized! The Gateway is rejecting the token.');
  } else {
    console.log('✅ Connection successful!');
  }
});

req.on('error', (e) => {
  console.error(`❌ Connection failed: ${e.message}`);
  console.log('   (Is the Gateway running?)');
});

req.on('timeout', () => {
  req.destroy();
  console.error('❌ Connection timed out.');
});

req.end();
