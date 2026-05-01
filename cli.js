#!/usr/bin/env node

const readline = require('readline');
const http = require('http');

const API_URL = 'http://localhost:3000';
let authToken = null;
let username = null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ===== HTTP Helper =====
function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (authToken) options.headers['Authorization'] = `Bearer ${authToken}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(json.error || 'Request failed');
          } else {
            resolve(json);
          }
        } catch {
          reject('Server error');
        }
      });
    });
    req.on('error', () => reject('Cannot connect to server. Make sure to run: node server.js'));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ===== Display Helpers =====
function clear() {
  console.clear();
}

function printHeader() {
  console.log('\x1b[33m');
  console.log('  ╔═══════════════════════════════════════╗');
  console.log('  ║       🐹 HAMSTER KOMBAT CLI          ║');
  console.log('  ╚═══════════════════════════════════════╝');
  console.log('\x1b[0m');
}

function printDivider() {
  console.log('\x1b[90m  ─────────────────────────────────────\x1b[0m');
}

function formatNumber(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return n.toLocaleString('en-US');
  return String(n);
}

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function askPassword(question) {
  return new Promise(resolve => {
    process.stdout.write(question);
    const stdin = process.stdin;
    const oldRaw = stdin.isRaw;
    if (stdin.setRawMode) stdin.setRawMode(true);

    let password = '';
    const onData = (ch) => {
      const c = ch.toString();
      if (c === '\n' || c === '\r' || c === '\u0004') {
        if (stdin.setRawMode) stdin.setRawMode(oldRaw);
        stdin.removeListener('data', onData);
        console.log();
        resolve(password);
      } else if (c === '\u007F' || c === '\b') {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else if (c === '\u0003') {
        process.exit();
      } else {
        password += c;
        process.stdout.write('*');
      }
    };
    stdin.resume();
    stdin.on('data', onData);
  });
}

// ===== Auth Screen =====
async function authScreen() {
  clear();
  printHeader();
  console.log('  \x1b[36mWelcome to Hamster Kombat!\x1b[0m\n');
  console.log('  1. 🔑 Login');
  console.log('  2. 📝 Register');
  console.log('  3. 🚪 Exit\n');

  const choice = await ask('  Choose option: ');

  if (choice === '1') {
    await loginFlow();
  } else if (choice === '2') {
    await registerFlow();
  } else if (choice === '3') {
    console.log('\n  \x1b[33mGoodbye! 🐹\x1b[0m\n');
    process.exit(0);
  } else {
    await authScreen();
  }
}

async function loginFlow() {
  console.log('\n  \x1b[36m── Login ──\x1b[0m\n');
  const user = await ask('  Username: ');
  const pass = await askPassword('  Password: ');

  try {
    const res = await apiRequest('POST', '/api/login', { username: user, password: pass });
    authToken = res.token;
    username = res.username;
    console.log(`\n  \x1b[32m✓ Welcome back, ${username}!\x1b[0m`);
    await pause();
    await mainMenu();
  } catch (err) {
    console.log(`\n  \x1b[31m✗ ${err}\x1b[0m`);
    await pause();
    await authScreen();
  }
}

async function registerFlow() {
  console.log('\n  \x1b[36m── Register ──\x1b[0m\n');
  const user = await ask('  Username (min 3 chars): ');
  const pass = await askPassword('  Password (min 4 chars): ');

  try {
    const res = await apiRequest('POST', '/api/register', { username: user, password: pass });
    authToken = res.token;
    username = res.username;
    console.log(`\n  \x1b[32m✓ Account created! Welcome, ${username}!\x1b[0m`);
    await pause();
    await mainMenu();
  } catch (err) {
    console.log(`\n  \x1b[31m✗ ${err}\x1b[0m`);
    await pause();
    await authScreen();
  }
}

// ===== Main Menu =====
async function mainMenu() {
  clear();
  printHeader();

  try {
    const data = await apiRequest('GET', '/api/gamedata');
    const gd = data.gameData;

    console.log(`  \x1b[36mPlayer: \x1b[1m${username}\x1b[0m`);
    console.log(`  \x1b[33mLevel:  ${gd.level || 'Bronze'}\x1b[0m`);
    printDivider();
    console.log(`  💰 Coins:          \x1b[33m${formatNumber(gd.coins)}\x1b[0m`);
    console.log(`  ⚡ Energy:         ${formatNumber(gd.energy)} / ${formatNumber(gd.maxEnergy)}`);
    console.log(`  📈 Profit/hour:    \x1b[32m+${formatNumber(gd.profitPerHour)}\x1b[0m`);
    console.log(`  👆 Earn per tap:   +${gd.earnPerTap}`);
    printDivider();
    console.log();
    console.log('  1. 👆 Tap (earn coins)');
    console.log('  2. 🛒 Shop (buy cards)');
    console.log('  3. 🔄 Refresh balance');
    console.log('  4. 🚪 Logout');
    console.log();

    const choice = await ask('  Choose option: ');

    switch (choice) {
      case '1': await tapScreen(); break;
      case '2': await shopScreen(); break;
      case '3': await mainMenu(); break;
      case '4':
        authToken = null;
        username = null;
        await authScreen();
        break;
      default: await mainMenu();
    }
  } catch (err) {
    console.log(`\n  \x1b[31m✗ Error: ${err}\x1b[0m`);
    await pause();
    await mainMenu();
  }
}

// ===== Tap Screen =====
async function tapScreen() {
  clear();
  printHeader();
  console.log('  \x1b[36m── Tap to Earn ──\x1b[0m\n');

  const tapsInput = await ask('  How many taps? (1-100): ');
  const taps = Math.min(100, Math.max(1, parseInt(tapsInput) || 1));

  try {
    const res = await apiRequest('POST', '/api/tap', { taps });
    console.log(`\n  \x1b[32m🐹 Tapped ${taps} times!\x1b[0m`);
    console.log(`  \x1b[33m💰 Earned: +${formatNumber(res.earned)} coins\x1b[0m`);
    console.log(`  💰 Total coins: ${formatNumber(res.coins)}`);
    console.log(`  ⚡ Energy left: ${formatNumber(res.energy)}`);
  } catch (err) {
    console.log(`\n  \x1b[31m✗ ${err}\x1b[0m`);
  }

  await pause();
  await mainMenu();
}

// ===== Shop Screen =====
async function shopScreen() {
  clear();
  printHeader();
  console.log('  \x1b[36m── Shop ──\x1b[0m\n');

  try {
    const res = await apiRequest('GET', '/api/shop');
    console.log(`  💰 Your coins: \x1b[33m${formatNumber(res.coins)}\x1b[0m\n`);

    const items = res.items.filter(i => !i.maxed);
    if (items.length === 0) {
      console.log('  All items maxed out!');
      await pause();
      await mainMenu();
      return;
    }

    items.forEach((item, i) => {
      const affordable = res.coins >= item.cost;
      const color = affordable ? '\x1b[32m' : '\x1b[90m';
      console.log(`  ${color}${i + 1}. ${item.name}\x1b[0m`);
      console.log(`     ${color}   lvl ${item.level}/${item.maxLevel}  |  Cost: ${formatNumber(item.cost)}  |  +${formatNumber(item.profitPerHour)}/h\x1b[0m`);
    });

    console.log(`\n  0. ← Back to menu\n`);

    const choice = await ask('  Buy item #: ');
    if (choice === '0') {
      await mainMenu();
      return;
    }

    const idx = parseInt(choice) - 1;
    if (idx >= 0 && idx < items.length) {
      const item = items[idx];
      const confirm = await ask(`  Buy "${item.name}" for ${formatNumber(item.cost)} coins? (y/n): `);
      if (confirm.toLowerCase() === 'y') {
        try {
          const buyRes = await apiRequest('POST', '/api/shop/buy', { itemId: item.id });
          console.log(`\n  \x1b[32m✓ ${buyRes.message}\x1b[0m`);
          console.log(`  💰 Coins left: ${formatNumber(buyRes.coins)}`);
          console.log(`  📈 Profit/hour: +${formatNumber(buyRes.profitPerHour)}`);
        } catch (err) {
          console.log(`\n  \x1b[31m✗ ${err}\x1b[0m`);
        }
      }
    }

    await pause();
    await shopScreen();
  } catch (err) {
    console.log(`\n  \x1b[31m✗ ${err}\x1b[0m`);
    await pause();
    await mainMenu();
  }
}

// ===== Utilities =====
function pause() {
  return ask('\n  Press Enter to continue...');
}

// ===== Start =====
authScreen().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
