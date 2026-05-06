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

// ===== ANSI Colors & Styles =====
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  // Foreground
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  // Bright
  bred: '\x1b[91m',
  bgreen: '\x1b[92m',
  byellow: '\x1b[93m',
  bblue: '\x1b[94m',
  bmagenta: '\x1b[95m',
  bcyan: '\x1b[96m',
  bwhite: '\x1b[97m',
  // Background
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

// ===== Animation Helpers =====
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function typeText(text, color = C.reset, speed = 15) {
  process.stdout.write(color);
  for (const ch of text) {
    process.stdout.write(ch);
    await sleep(speed);
  }
  process.stdout.write(C.reset);
}

async function loadingBar(text = 'Loading', width = 20, duration = 800) {
  process.stdout.write(`  ${C.dim}${text} ${C.reset}`);
  const step = duration / width;
  for (let i = 0; i <= width; i++) {
    const filled = '█'.repeat(i);
    const empty = '░'.repeat(width - i);
    process.stdout.write(`\r  ${C.dim}${text} ${C.byellow}${filled}${C.dim}${empty}${C.reset} ${C.bwhite}${Math.floor(i / width * 100)}%${C.reset}`);
    await sleep(step);
  }
  process.stdout.write('\n');
}

async function spinWhile(promise, text = 'Processing') {
  const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(`\r  ${C.byellow}${frames[i % frames.length]}${C.reset} ${C.dim}${text}...${C.reset}  `);
    i++;
  }, 80);
  try {
    const result = await promise;
    clearInterval(interval);
    process.stdout.write('\r' + ' '.repeat(40) + '\r');
    return result;
  } catch (err) {
    clearInterval(interval);
    process.stdout.write('\r' + ' '.repeat(40) + '\r');
    throw err;
  }
}

async function sparkleEffect() {
  const chars = ['✦','✧','⋆','★','☆','✶','✵'];
  for (let i = 0; i < 8; i++) {
    const ch = chars[Math.floor(Math.random() * chars.length)];
    const x = Math.floor(Math.random() * 40) + 5;
    process.stdout.write(`\x1b[s`);
    process.stdout.write(`\x1b[${x}G${C.byellow}${ch}${C.reset}`);
    await sleep(60);
    process.stdout.write(`\x1b[u`);
  }
}

async function coinRain(count = 5) {
  const coins = ['🪙','💰','₿','¢','¤'];
  for (let i = 0; i < count; i++) {
    process.stdout.write(`${C.byellow}${coins[i % coins.length]}${C.reset} `);
    await sleep(100);
  }
  process.stdout.write('\n');
}

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
    req.on('error', () => reject('Cannot connect to server. Run: node server.js'));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ===== Display Helpers =====
function clear() { console.clear(); }

function printLogo() {
  console.log(`${C.bgBlack}${C.byellow}
  ╔══════════════════════════════════════════════════════════╗
  ║${C.reset}${C.bgBlack}                                                          ${C.byellow}║
  ║${C.reset}${C.byellow}${C.bold}     🐹  H A M S T E R   K O M B A T  ${C.reset}${C.byellow}${C.bgBlack}                    ║
  ║${C.reset}${C.bgBlack}                                                          ${C.byellow}║
  ║${C.reset}${C.bmagenta}     ✦ CLI Terminal v2.0 — Ultimate Edition ✦${C.reset}${C.byellow}${C.bgBlack}             ║
  ║${C.reset}${C.bgBlack}                                                          ${C.byellow}║
  ╚══════════════════════════════════════════════════════════╝${C.reset}`);
  // ASCII Hamster
  console.log(`${C.byellow}
         ${C.bwhite}_____${C.reset}
      ${C.byellow}/${C.dim}(${C.byellow}o${C.dim}.${C.byellow}o${C.dim})${C.byellow}\\${C.reset}
     ${C.byellow}/${C.dim}(${C.bwhite}≡${C.dim})${C.byellow}____)${C.reset}
    ${C.byellow}/${C.bwhite}_______/${C.byellow}  ${C.bmagenta}♔${C.reset}
   ${C.byellow}/${C.bwhite}HMSTR${C.byellow}   /   ${C.bmagenta}♕${C.reset}
  ${C.byellow}________/${C.reset}    ${C.bmagenta}♚${C.reset}
  `);
}

function printBox(title, lines, color = C.bcyan) {
  const maxW = Math.max(title.length, ...lines.map(l => stripAnsi(l).length)) + 4;
  const top = '╔' + '═'.repeat(maxW) + '╗';
  const mid = '╠' + '═'.repeat(maxW) + '╣';
  const bot = '╚' + '═'.repeat(maxW) + '╝';
  const pad = (s) => '║ ' + s + ' '.repeat(Math.max(0, maxW - stripAnsi(s).length - 2)) + ' ║';

  console.log(`  ${color}${top}${C.reset}`);
  console.log(`  ${color}${pad(`${C.bwhite}${C.bold}  ${title}  ${C.reset}${color}`)}${C.reset}`);
  console.log(`  ${color}${mid}${C.reset}`);
  for (const line of lines) {
    console.log(`  ${color}${pad(line)}${C.reset}`);
  }
  console.log(`  ${color}${bot}${C.reset}`);
}

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

function printDivider(char = '─', color = C.dim) {
  console.log(`  ${color}${char.repeat(50)}${C.reset}`);
}

function formatNumber(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
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
        if (password.length > 0) { password = password.slice(0, -1); process.stdout.write('\b \b'); }
      } else if (c === '\u0003') { process.exit(); }
      else { password += c; process.stdout.write(`${C.byellow}*${C.reset}`); }
    };
    stdin.resume();
    stdin.on('data', onData);
  });
}

function pause() {
  return ask(`\n  ${C.dim}Press ${C.bwhite}Enter${C.reset}${C.dim} to continue...${C.reset}`);
}

// ===== Auth Screen =====
async function authScreen() {
  clear();
  printLogo();
  await sparkleEffect();
  console.log();
  printBox('Welcome, Commander!', [
    `${C.bwhite}1.${C.reset} 🔑  Login`,
    `${C.bwhite}2.${C.reset} 📝  Register`,
    `${C.bwhite}3.${C.reset} 🚪  Exit`,
  ]);
  console.log();

  const choice = await ask(`  ${C.byellow}▸${C.reset} Choose option: `);

  if (choice === '1') await loginFlow();
  else if (choice === '2') await registerFlow();
  else if (choice === '3') {
    console.log(`\n  ${C.byellow}Goodbye! 🐹${C.reset}\n`);
    process.exit(0);
  } else await authScreen();
}

async function loginFlow() {
  console.log(`\n  ${C.bcyan}── Login ──${C.reset}\n`);
  const user = await ask(`  ${C.bwhite}Username:${C.reset} `);
  const pass = await askPassword(`  ${C.bwhite}Password:${C.reset} `);

  try {
    const res = await spinWhile(apiRequest('POST', '/api/login', { username: user, password: pass }), 'Authenticating');
    authToken = res.token;
    username = res.username;
    await loadingBar('Syncing', 25, 600);
    console.log(`\n  ${C.bgreen}✓ Welcome back, ${C.bold}${username}${C.reset}${C.bgreen}!${C.reset}`);
    if (res.offlineEarnings > 0) {
      console.log(`  ${C.byellow}💤 Offline earnings: ${C.bold}+${formatNumber(res.offlineEarnings)}${C.reset}${C.byellow} coins${C.reset}`);
    }
    await coinRain(3);
    await pause();
    await mainMenu();
  } catch (err) {
    console.log(`\n  ${C.bred}✗ ${err}${C.reset}`);
    await pause();
    await authScreen();
  }
}

async function registerFlow() {
  console.log(`\n  ${C.bcyan}── Register ──${C.reset}\n`);
  const user = await ask(`  ${C.bwhite}Username (min 3):${C.reset} `);
  const pass = await askPassword(`  ${C.bwhite}Password (min 4):${C.reset} `);
  const refCode = await ask(`  ${C.dim}Referral code (optional):${C.reset} `);

  try {
    const res = await spinWhile(
      apiRequest('POST', '/api/register', { username: user, password: pass, refCode: refCode.trim() || undefined }),
      'Creating account'
    );
    authToken = res.token;
    username = res.username;
    await loadingBar('Initializing', 25, 700);
    console.log(`\n  ${C.bgreen}✓ Account created! Welcome, ${C.bold}${username}${C.reset}${C.bgreen}!${C.reset}`);
    if (res.refCode) {
      console.log(`  ${C.byellow}🔗 Your referral code: ${C.bold}${res.refCode}${C.reset}`);
    }
    await sparkleEffect();
    await pause();
    await mainMenu();
  } catch (err) {
    console.log(`\n  ${C.bred}✗ ${err}${C.reset}`);
    await pause();
    await authScreen();
  }
}

// ===== Main Menu =====
async function mainMenu() {
  clear();
  printLogo();

  try {
    const data = await spinWhile(apiRequest('GET', '/api/gamedata'), 'Loading data');
    const gd = data.gameData;

    // Status display
    const levelColor = {
      Bronze: C.bwhite, Silver: C.bcyan, Gold: C.byellow,
      Platinum: C.bmagenta, Diamond: C.bblue, Epic: C.bmagenta,
      Legendary: C.byellow, Master: C.bgreen, Grandmaster: C.bred,
      Lord: C.byellow, Creator: C.bred,
    }[gd.level] || C.bwhite;

    // Status box
    const statusLines = [
      `${C.bcyan}Player:${C.reset}  ${C.bold}${username}${C.reset}   ${levelColor}⬡ ${gd.level}${C.reset}`,
      `${C.byellow}💰 Coins:${C.reset}      ${C.bold}${formatNumber(gd.coins)}${C.reset}`,
      `${C.bcyan}⚡ Energy:${C.reset}     ${formatNumber(gd.energy)} / ${formatNumber(gd.maxEnergy)}`,
      `${C.bgreen}📈 Profit/hr:${C.reset}  +${formatNumber(gd.profitPerHour)}`,
      `${C.bwhite}👆 Per tap:${C.reset}    +${gd.earnPerTap}`,
    ];
    if (gd.referralEarnings > 0) {
      statusLines.push(`${C.bmagenta}🤝 Ref earn:${C.reset}  ${formatNumber(gd.referralEarnings)}`);
    }
    if (gd.dailyStreak > 0) {
      statusLines.push(`${C.bred}🔥 Streak:${C.reset}     ${gd.dailyStreak} days`);
    }
    printBox(`Status — ${username}`, statusLines, C.byellow);

    // Menu box
    console.log();
    const menuItems = [
      ['1', '👆', 'Tap to Earn',        C.byellow],
      ['2', '🛒', 'Shop / Cards',        C.bgreen],
      ['3', '🏆', 'Battle Pass',         C.bmagenta],
      ['4', '📦', 'Chests & Inventory',  C.bmagenta],
      ['5', '🤝', 'Referral Program',    C.bmagenta],
      ['6', '🎁', 'Daily Reward',        C.bcyan],
      ['7', '🏆', 'Achievements',        C.byellow],
      ['8', '📊', 'Stats & Profile',     C.bblue],
      ['9', '🔄', 'Refresh',             C.dim],
      ['0', '🚪', 'Logout',              C.bred],
    ];
    const menuLines = menuItems.map(([n, ic, lbl, col]) => `  ${col}${n}${C.reset} ${ic}  ${lbl}`);
    printBox('Main Menu', menuLines, C.bcyan);
    console.log();

    const choice = await ask(`  ${C.byellow}▸${C.reset} Choose: `);

    switch (choice) {
      case '1': await tapScreen(); break;
      case '2': await shopScreen(); break;
      case '3': await battlePassScreen(); break;
      case '4': await chestScreen(); break;
      case '5': await referralScreen(); break;
      case '6': await dailyScreen(); break;
      case '7': await achievementsScreen(); break;
      case '8': await statsScreen(); break;
      case '9': await mainMenu(); break;
      case '0': authToken = null; username = null; await authScreen(); break;
      default: await mainMenu();
    }
  } catch (err) {
    console.log(`\n  ${C.bred}✗ Error: ${err}${C.reset}`);
    await pause();
    await mainMenu();
  }
}

// ===== Tap Screen =====
async function tapScreen() {
  clear();
  printLogo();
  console.log(`  ${C.byellow}── 👆 Tap to Earn ──${C.reset}\n`);

  const tapsInput = await ask(`  ${C.bwhite}How many taps? (1-1000):${C.reset} `);
  const taps = Math.min(1000, Math.max(1, parseInt(tapsInput) || 1));

  try {
    const res = await spinWhile(apiRequest('POST', '/api/tap', { taps }), 'Tapping');

    // Animated coin display
    console.log();
    await coinRain(Math.min(taps, 10));
    console.log(`  ${C.bgreen}🐹 Tapped ${C.bold}${taps}${C.reset}${C.bgreen} times!${C.reset}`);
    console.log(`  ${C.byellow}💰 Earned: ${C.bold}+${formatNumber(res.earned)}${C.reset}${C.byellow} coins${C.reset}`);
    console.log(`  💰 Total:   ${C.bold}${formatNumber(res.coins)}${C.reset}`);
    console.log(`  ⚡ Energy:  ${formatNumber(res.energy)} remaining`);
    await sparkleEffect();
  } catch (err) {
    console.log(`\n  ${C.bred}✗ ${err}${C.reset}`);
  }

  await pause();
  await mainMenu();
}

// ===== Shop Screen =====
async function shopScreen() {
  clear();
  printLogo();
  console.log(`  ${C.bgreen}── 🛒 Shop ──${C.reset}\n`);

  try {
    const res = await spinWhile(apiRequest('GET', '/api/shop'), 'Loading shop');
    console.log(`  💰 Your coins: ${C.bold}${C.byellow}${formatNumber(res.coins)}${C.reset}\n`);

    const items = res.items.filter(i => !i.maxed);
    if (items.length === 0) {
      console.log(`  ${C.byellow}All items maxed out! 🎉${C.reset}`);
      await pause();
      await mainMenu();
      return;
    }

    // Group by category
    const categories = { markets: '📊 Markets', prteam: '📢 PR & Team', legal: '⚖️ Legal', specials: '⭐ Specials' };
    let idx = 0;
    const displayItems = [];

    for (const [catKey, catName] of Object.entries(categories)) {
      const catItems = items.filter(i => i.category === catKey);
      if (catItems.length === 0) continue;
      console.log(`  ${C.bmagenta}${catName}${C.reset}`);
      printDivider('·', C.dim);

      for (const item of catItems) {
        const affordable = res.coins >= item.cost;
        const color = affordable ? C.bgreen : C.dim;
        const marker = affordable ? '✓' : '✗';
        idx++;
        displayItems.push(item);
        console.log(`  ${color}${idx}. ${item.name} ${C.reset}`);
        console.log(`     ${color}   ${marker} lvl ${item.level}/${item.maxLevel}  │  Cost: ${formatNumber(item.cost)}  │  +${formatNumber(item.profitPerHour)}/h${C.reset}`);
      }
      console.log();
    }

    console.log(`  ${C.dim}0. ← Back to menu${C.reset}\n`);

    const choice = await ask(`  ${C.byellow}▸${C.reset} Buy item #: `);
    if (choice === '0') { await mainMenu(); return; }

    const iIdx = parseInt(choice) - 1;
    if (iIdx >= 0 && iIdx < displayItems.length) {
      const item = displayItems[iIdx];
      console.log(`\n  ${C.bcyan}${item.name}${C.reset} — Cost: ${C.byellow}${formatNumber(item.cost)}${C.reset}`);
      const confirm = await ask(`  ${C.bwhite}Buy? (y/n):${C.reset} `);
      if (confirm.toLowerCase() === 'y') {
        try {
          const buyRes = await spinWhile(apiRequest('POST', '/api/shop/buy', { itemId: item.id }), 'Purchasing');
          console.log(`\n  ${C.bgreen}✓ ${buyRes.message}${C.reset}`);
          console.log(`  💰 Coins left: ${C.byellow}${formatNumber(buyRes.coins)}${C.reset}`);
          console.log(`  📈 Profit/hour: ${C.bgreen}+${formatNumber(buyRes.profitPerHour)}${C.reset}`);
          await sparkleEffect();
        } catch (err) {
          console.log(`\n  ${C.bred}✗ ${err}${C.reset}`);
        }
      }
    }

    await pause();
    await shopScreen();
  } catch (err) {
    console.log(`\n  ${C.bred}✗ ${err}${C.reset}`);
    await pause();
    await mainMenu();
  }
}

// ===== Battle Pass Screen =====
async function battlePassScreen() {
  clear();
  printLogo();
  console.log(`  ${C.bmagenta}── 🏆 Battle Pass ──${C.reset}\n`);

  try {
    const data = await spinWhile(apiRequest('GET', '/api/gamedata'), 'Loading BP');
    const gd = data.gameData;
    const bpLevel = gd.bpLevel || 1;
    const bpXP = gd.bpXP || 0;
    const bpClaimed = gd.bpClaimed || [];
    const questProgress = gd.questProgress || { taps: 0, cards: 0, tasks: 0, coins: 0, spin: 0, flip: 0 };
    const questClaimed = gd.questClaimed || [];

    console.log(`  ${C.bmagenta}Level:${C.reset} ${C.bold}${bpLevel}${C.reset}   ${C.byellow}XP:${C.reset} ${bpXP}`);
    printDivider('━', C.bmagenta);

    // Quests
    const quests = [
      { id: 'q_tap100', icon: '👆', name: 'First Steps', desc: 'Tap 100 times', target: 100, tracker: 'taps' },
      { id: 'q_tap1000', icon: '👆', name: 'Tap Master', desc: 'Tap 1,000 times', target: 1000, tracker: 'taps' },
      { id: 'q_tap5000', icon: '👆', name: 'Tap Legend', desc: 'Tap 5,000 times', target: 5000, tracker: 'taps' },
      { id: 'q_card3', icon: '🃏', name: 'Card Collector', desc: 'Upgrade 3 cards', target: 3, tracker: 'cards' },
      { id: 'q_card10', icon: '🃏', name: 'Card Shark', desc: 'Upgrade 10 cards', target: 10, tracker: 'cards' },
      { id: 'q_task1', icon: '✅', name: 'Task Starter', desc: 'Complete 1 task', target: 1, tracker: 'tasks' },
      { id: 'q_task5', icon: '✅', name: 'Task Pro', desc: 'Complete 5 tasks', target: 5, tracker: 'tasks' },
      { id: 'q_earn10k', icon: '💰', name: 'Coin Hunter', desc: 'Earn 10K coins', target: 10000, tracker: 'coins' },
      { id: 'q_earn100k', icon: '💰', name: 'Coin Baron', desc: 'Earn 100K coins', target: 100000, tracker: 'coins' },
      { id: 'q_spin1', icon: '🎰', name: 'Lucky Spin', desc: 'Spin the wheel', target: 1, tracker: 'spin' },
      { id: 'q_flip3', icon: '🪙', name: 'Flip Addict', desc: 'Play Coin Flip 3x', target: 3, tracker: 'flip' },
    ];

    console.log(`\n  ${C.byellow}Quests:${C.reset}`);
    for (const q of quests) {
      const progress = questProgress[q.tracker] || 0;
      const done = progress >= q.target;
      const claimed = questClaimed.includes(q.id);
      const status = claimed ? `${C.bgreen}✓${C.reset}` : (done ? `${C.byellow}⚡${C.reset}` : `${C.dim}○${C.reset}`);
      const pct = Math.min(100, Math.floor(progress / q.target * 100));
      const bar = `${C.bmagenta}${'█'.repeat(Math.floor(pct / 10))}${C.dim}${'░'.repeat(10 - Math.floor(pct / 10))}${C.reset}`;
      console.log(`  ${status} ${q.icon} ${q.name} — ${Math.min(progress, q.target)}/${q.target} ${bar} ${claimed ? '(claimed)' : (done ? 'READY!' : '')}`);
    }

    // Rewards
    console.log(`\n  ${C.byellow}Rewards claimed:${C.reset} ${bpClaimed.length} levels`);
    console.log(`  ${C.dim}Claim rewards in the web UI for full experience${C.reset}`);
  } catch (err) {
    console.log(`\n  ${C.bred}✗ ${err}${C.reset}`);
  }

  await pause();
  await mainMenu();
}

// ===== Chest Screen =====
async function chestScreen() {
  clear();
  printLogo();
  console.log(`  ${C.bmagenta}── 📦 Chests & Inventory ──${C.reset}\n`);

  try {
    const data = await spinWhile(apiRequest('GET', '/api/gamedata'), 'Loading inventory');
    const gd = data.gameData;
    const chests = gd.chests || { rare: 0, super_rare: 0, epic: 0, mythic: 0, legendary: 0 };
    const inventory = gd.inventory || [];

    const chestTypes = [
      { key: 'rare', name: 'Rare', icon: '📦', color: C.bcyan },
      { key: 'super_rare', name: 'Super Rare', icon: '💎', color: C.bblue },
      { key: 'epic', name: 'Epic', icon: '🔮', color: C.bmagenta },
      { key: 'mythic', name: 'Mythic', icon: '🌀', color: C.bmagenta },
      { key: 'legendary', name: 'Legendary', icon: '👑', color: C.byellow },
    ];

    console.log(`  ${C.byellow}Chests:${C.reset}`);
    for (const ct of chestTypes) {
      const count = chests[ct.key] || 0;
      const marker = count > 0 ? `${C.bgreen}✓${C.reset}` : `${C.dim}○${C.reset}`;
      console.log(`  ${marker} ${ct.color}${ct.icon} ${ct.name}:${C.reset} x${count}`);
    }

    console.log(`\n  ${C.byellow}Potions in inventory:${C.reset}`);
    if (inventory.length === 0) {
      console.log(`  ${C.dim}No potions yet${C.reset}`);
    } else {
      for (const item of inventory) {
        if (item.type === 'potion') {
          console.log(`  🧪 ${C.bmagenta}${item.name}${C.reset} (potency: ${item.potency}x)`);
        }
      }
    }

    console.log(`\n  ${C.dim}Open chests and use potions in the web UI${C.reset}`);
  } catch (err) {
    console.log(`\n  ${C.bred}✗ ${err}${C.reset}`);
  }

  await pause();
  await mainMenu();
}

// ===== Referral Screen =====
async function referralScreen() {
  clear();
  printLogo();
  console.log(`  ${C.bmagenta}── 🤝 Referral Program ──${C.reset}\n`);

  try {
    const res = await spinWhile(apiRequest('GET', '/api/referral'), 'Loading referrals');

    console.log(`  ${C.bwhite}Your referral code:${C.reset}`);
    console.log(`  ${C.bgBlack}${C.byellow}${C.bold}  ${res.refCode}  ${C.reset}`);
    console.log(`  ${C.dim}Share this code — friends get 50K bonus on signup!${C.reset}\n`);

    console.log(`  ${C.bwhite}How it works:${C.reset}`);
    console.log(`  ${C.byellow}→${C.reset} Friend registers with your code → you get ${C.bgreen}50,000${C.reset} coins`);
    console.log(`  ${C.byellow}→${C.reset} Friend earns coins → you get ${C.bgreen}20%${C.reset} of their earnings (they keep 100%)`);
    console.log(`  ${C.byellow}→${C.reset} Your total referral earnings: ${C.bmagenta}${formatNumber(res.referralEarnings)}${C.reset}\n`);

    if (res.referredBy) {
      console.log(`  ${C.dim}Referred by: ${C.bcyan}${res.referredBy}${C.reset}`);
    }

    if (res.referrals.length > 0) {
      console.log(`\n  ${C.bwhite}Your referrals (${res.referrals.length}):${C.reset}`);
      printDivider('·', C.dim);
      for (const ref of res.referrals) {
        console.log(`  ${C.bcyan}${ref.username}${C.reset}  ${C.dim}│${C.reset}  ${C.byellow}${ref.level}${C.reset}  ${C.dim}│${C.reset}  ${formatNumber(ref.totalCoins)} coins`);
      }
    } else {
      console.log(`  ${C.dim}No referrals yet. Share your code!${C.reset}`);
    }
  } catch (err) {
    console.log(`\n  ${C.bred}✗ ${err}${C.reset}`);
  }

  await pause();
  await mainMenu();
}

// ===== Daily Reward =====
async function dailyScreen() {
  clear();
  printLogo();
  console.log(`  ${C.bcyan}── 🎁 Daily Reward ──${C.reset}\n`);

  try {
    const res = await spinWhile(apiRequest('POST', '/api/daily'), 'Claiming reward');
    console.log(`  ${C.bgreen}✓ Daily reward claimed!${C.reset}`);
    console.log(`  🎁 Reward: ${C.byellow}${C.bold}+${formatNumber(res.reward)}${C.reset} coins`);
    console.log(`  🔥 Streak: ${C.bred}${C.bold}${res.streak}${C.reset} days`);
    console.log(`  ${C.dim}(Streak bonus: streak × 10,000, max 100,000)${C.reset}`);
    await sparkleEffect();
  } catch (err) {
    if (err === 'Already claimed today') {
      console.log(`  ${C.byellow}⚠ Already claimed today! Come back tomorrow.${C.reset}`);
    } else {
      console.log(`\n  ${C.bred}✗ ${err}${C.reset}`);
    }
  }

  await pause();
  await mainMenu();
}

// ===== Achievements =====
async function achievementsScreen() {
  clear();
  printLogo();
  console.log(`  ${C.byellow}── 🏆 Achievements ──${C.reset}\n`);

  try {
    // Check for new achievements first
    await spinWhile(apiRequest('POST', '/api/achievements/check'), 'Checking');
    const res = await apiRequest('GET', '/api/achievements');

    console.log(`  ${C.bwhite}Unlocked: ${C.bold}${res.unlocked}${C.reset}${C.bwhite} / ${res.total}${C.reset}\n`);

    for (const a of res.achievements) {
      const status = a.unlocked ? `${C.bgreen}✓${C.reset}` : `${C.dim}○${C.reset}`;
      const name = a.unlocked ? `${C.bold}${a.name}${C.reset}` : `${C.dim}${a.name}${C.reset}`;
      const desc = a.unlocked ? a.desc : `${C.dim}${a.desc}${C.reset}`;
      console.log(`  ${status} ${a.icon} ${name} — ${desc}`);
    }
  } catch (err) {
    console.log(`\n  ${C.bred}✗ ${err}${C.reset}`);
  }

  await pause();
  await mainMenu();
}

// ===== Stats Screen =====
async function statsScreen() {
  clear();
  printLogo();
  console.log(`  ${C.bblue}── 📊 Stats & Profile ──${C.reset}\n`);

  try {
    const data = await spinWhile(apiRequest('GET', '/api/gamedata'), 'Loading stats');
    const gd = data.gameData;

    const cardsBought = Object.values(gd.cardLevels).filter(l => l > 0).length;
    const totalCards = Object.keys(gd.cardLevels).length;
    const tasksDone = Object.values(gd.completedTasks).filter(v => v).length;

    printBox('Profile', [
      `${C.bwhite}Username:${C.reset}  ${username}`,
      `${C.bwhite}Level:${C.reset}     ${gd.level || 'Bronze'}`,
      `${C.bwhite}Joined:${C.reset}    ${data.refCode ? 'Yes' : 'N/A'}`,
    ]);

    console.log();
    printBox('Economy', [
      `${C.byellow}Coins:${C.reset}          ${formatNumber(gd.coins)}`,
      `${C.byellow}Total earned:${C.reset}   ${formatNumber(gd.totalCoins)}`,
      `${C.bgreen}Profit/hour:${C.reset}     +${formatNumber(gd.profitPerHour)}`,
      `${C.bgreen}Earn/tap:${C.reset}        +${gd.earnPerTap}`,
      `${C.bcyan}Energy:${C.reset}          ${formatNumber(gd.energy)} / ${formatNumber(gd.maxEnergy)}`,
    ]);

    console.log();
    printBox('Progress', [
      `${C.bmagenta}Cards bought:${C.reset}    ${cardsBought}`,
      `${C.bmagenta}Tasks done:${C.reset}      ${tasksDone}`,
      `${C.bmagenta}Referral earnings:${C.reset} ${formatNumber(gd.referralEarnings || 0)}`,
      `${C.bmagenta}Daily streak:${C.reset}    ${gd.dailyStreak || 0} days`,
      `${C.bmagenta}Achievements:${C.reset}    ${(gd.achievements || []).length}`,
    ]);

    console.log();
    printBox('Battle Pass', [
      `${C.bmagenta}BP Level:${C.reset}      ${gd.bpLevel || 1}`,
      `${C.bmagenta}BP XP:${C.reset}         ${gd.bpXP || 0}`,
      `${C.bmagenta}Rewards claimed:${C.reset} ${(gd.bpClaimed || []).length}`,
      `${C.bmagenta}Chests:${C.reset}        ${Object.values(gd.chests || {}).reduce((a,b) => a+b, 0)} total`,
      `${C.bmagenta}Potions:${C.reset}       ${(gd.inventory || []).length}`,
    ]);
  } catch (err) {
    console.log(`\n  ${C.bred}✗ ${err}${C.reset}`);
  }

  await pause();
  await mainMenu();
}

// ===== Start =====
(async () => {
  clear();
  await typeText('  🐹 Hamster Kombat CLI v2.0', C.byellow + C.bold, 25);
  console.log();
  await loadingBar('Connecting', 20, 400);
  await authScreen();
})().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
