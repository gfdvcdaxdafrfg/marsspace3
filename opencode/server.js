const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-change-me';
const DB_FILE = path.join(__dirname, 'data', 'users.json');
const REFERRAL_BONUS_PCT = 0.20; // 20% referral bonus

// ===== Rate Limiting for tap endpoint =====
const tapLimiter = new Map(); // username -> { count, resetAt }
const TAP_RATE_LIMIT = 30; // 30 requests per minute
const TAP_RATE_WINDOW = 60000; // 1 minute

function checkTapRateLimit(username) {
  const now = Date.now();
  const entry = tapLimiter.get(username);
  if (!entry || now > entry.resetAt) {
    tapLimiter.set(username, { count: 1, resetAt: now + TAP_RATE_WINDOW });
    return true;
  }
  entry.count++;
  if (entry.count > TAP_RATE_LIMIT) return false;
  return true;
}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of tapLimiter) {
    if (now > val.resetAt) tapLimiter.delete(key);
  }
}, 300000);

// ===== Expanded Card Data (server-side source of truth) =====
const MINE_CARDS_FLAT = {
  // Markets
  top10cmc:       { name: 'Top 10 cmc pairs',      baseCost: 1000,   baseProfit: 50,   maxLevel: 25, category: 'markets' },
  memecoins:      { name: 'Meme coins',             baseCost: 2000,   baseProfit: 80,   maxLevel: 25, category: 'markets' },
  futures:        { name: 'Futures trading',         baseCost: 3000,   baseProfit: 100,  maxLevel: 20, category: 'markets' },
  marginx10:      { name: 'Margin trading x10',      baseCost: 5000,   baseProfit: 150,  maxLevel: 20, category: 'markets' },
  marginx20:      { name: 'Margin trading x20',      baseCost: 10000,  baseProfit: 250,  maxLevel: 20, category: 'markets' },
  nftmarket:      { name: 'NFT marketplace',         baseCost: 15000,  baseProfit: 300,  maxLevel: 20, category: 'markets' },
  defi:           { name: 'DeFi protocols',          baseCost: 30000,  baseProfit: 500,  maxLevel: 20, category: 'markets' },
  marginx30:      { name: 'Margin trading x30',      baseCost: 20000,  baseProfit: 400,  maxLevel: 15, category: 'markets' },
  p2pexchange:    { name: 'P2P Exchange',            baseCost: 8000,   baseProfit: 180,  maxLevel: 20, category: 'markets' },
  otcdesk:        { name: 'OTC Desk',               baseCost: 25000,  baseProfit: 450,  maxLevel: 15, category: 'markets' },
  iopools:        { name: 'IDO Launchpools',         baseCost: 40000,  baseProfit: 650,  maxLevel: 15, category: 'markets' },
  marginx50:      { name: 'Margin trading x50',      baseCost: 50000,  baseProfit: 800,  maxLevel: 15, category: 'markets' },
  // PR & Team
  licence_jp:     { name: 'Licence Japan',           baseCost: 8000,   baseProfit: 200,  maxLevel: 15, category: 'prteam' },
  qateam:         { name: 'QA team',                 baseCost: 5000,   baseProfit: 120,  maxLevel: 20, category: 'prteam' },
  support:        { name: 'Support team',             baseCost: 6000,   baseProfit: 140,  maxLevel: 20, category: 'prteam' },
  marketing:      { name: 'Marketing campaign',       baseCost: 12000,  baseProfit: 280,  maxLevel: 15, category: 'prteam' },
  partnership:    { name: 'Partnership program',       baseCost: 20000,  baseProfit: 450,  maxLevel: 15, category: 'prteam' },
  influencer:     { name: 'Influencer collab',         baseCost: 25000,  baseProfit: 500,  maxLevel: 15, category: 'prteam' },
  ceo:            { name: 'CEO advisor',              baseCost: 50000,  baseProfit: 900,  maxLevel: 10, category: 'prteam' },
  community:      { name: 'Community managers',       baseCost: 15000,  baseProfit: 320,  maxLevel: 15, category: 'prteam' },
  ambassador:     { name: 'Ambassador program',       baseCost: 35000,  baseProfit: 600,  maxLevel: 12, category: 'prteam' },
  // Legal
  kyc:            { name: 'KYC system',               baseCost: 10000,  baseProfit: 250,  maxLevel: 15, category: 'legal' },
  amlsystem:      { name: 'AML compliance',           baseCost: 15000,  baseProfit: 350,  maxLevel: 15, category: 'legal' },
  regapproval:    { name: 'Regulatory approval',       baseCost: 30000,  baseProfit: 600,  maxLevel: 12, category: 'legal' },
  insurance:      { name: 'Insurance fund',             baseCost: 40000,  baseProfit: 700,  maxLevel: 10, category: 'legal' },
  audit:          { name: 'Security audit',            baseCost: 20000,  baseProfit: 400,  maxLevel: 15, category: 'legal' },
  compliance:     { name: 'Compliance team',           baseCost: 25000,  baseProfit: 480,  maxLevel: 12, category: 'legal' },
  // Specials
  hamsterwheel:   { name: 'Hamster wheel',             baseCost: 100000, baseProfit: 1500, maxLevel: 10, category: 'specials' },
  cryptovault:    { name: 'Crypto vault',              baseCost: 80000,  baseProfit: 1200, maxLevel: 10, category: 'specials' },
  tradingbot:     { name: 'Trading bot',               baseCost: 60000,  baseProfit: 1000, maxLevel: 12, category: 'specials' },
  launchpad:      { name: 'Token launchpad',           baseCost: 120000, baseProfit: 2000, maxLevel: 8,  category: 'specials' },
  stakingpool:    { name: 'Staking pool',              baseCost: 200000, baseProfit: 3000, maxLevel: 8,  category: 'specials' },
  aifund:         { name: 'AI Trading Fund',           baseCost: 300000, baseProfit: 4500, maxLevel: 6,  category: 'specials' },
  quantumminer:   { name: 'Quantum Miner',             baseCost: 500000, baseProfit: 7000, maxLevel: 5,  category: 'specials' },
  darkpool:       { name: 'Dark Pool Access',          baseCost: 400000, baseProfit: 5500, maxLevel: 6,  category: 'specials' },
  metaverse:      { name: 'Metaverse Exchange',        baseCost: 750000, baseProfit: 9000, maxLevel: 5,  category: 'specials' },
  satoshilab:     { name: 'Satoshi Lab',               baseCost: 1000000,baseProfit: 12000,maxLevel: 3,  category: 'specials' },
};

const LEVELS = [
  { name: 'Bronze',       coinsNeeded: 0 },
  { name: 'Silver',       coinsNeeded: 50000 },
  { name: 'Gold',         coinsNeeded: 500000 },
  { name: 'Platinum',     coinsNeeded: 2000000 },
  { name: 'Diamond',      coinsNeeded: 10000000 },
  { name: 'Epic',         coinsNeeded: 50000000 },
  { name: 'Legendary',    coinsNeeded: 200000000 },
  { name: 'Master',       coinsNeeded: 500000000 },
  { name: 'Grandmaster',  coinsNeeded: 1000000000 },
  { name: 'Lord',         coinsNeeded: 5000000000 },
  { name: 'Creator',      coinsNeeded: 10000000000 },
];

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

function loadUsers() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}));
    return {};
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function saveUsers(users) {
  fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

function calcLevel(totalCoins) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalCoins >= LEVELS[i].coinsNeeded) return LEVELS[i].name;
  }
  return 'Bronze';
}

function getXpForLevel(lvl) { return 50 + lvl * 30; }

function addBPXP(gd, amount) {
  gd.bpXP = (gd.bpXP || 0) + amount;
  while ((gd.bpLevel || 1) < 30) {
    const needed = getXpForLevel(gd.bpLevel || 1);
    if (gd.bpXP >= needed) {
      gd.bpXP -= needed;
      gd.bpLevel = (gd.bpLevel || 1) + 1;
    } else break;
  }
}

function calcProfitPerHour(cardLevels) {
  let total = 0;
  for (const [id, cardData] of Object.entries(MINE_CARDS_FLAT)) {
    const lvl = cardLevels[id] || 0;
    if (lvl > 0) total += Math.floor(cardData.baseProfit * Math.pow(1.15, lvl - 1));
  }
  return total;
}

function calcOfflineEarnings(gameData) {
  const lastActive = gameData.lastActiveTime || 0;
  const now = Date.now();
  if (!lastActive || !gameData.profitPerHour) return 0;
  const offlineMs = now - lastActive;
  if (offlineMs < 60000) return 0; // min 1 min away
  const offlineHours = offlineMs / 3600000;
  // Cap at 8 hours, 80% efficiency
  const cappedHours = Math.min(offlineHours, 8);
  return Math.floor(gameData.profitPerHour * cappedHours * 0.8);
}

// ===== WebSocket for real-time sync =====
const wss = new WebSocketServer({ server, path: '/ws' });
const wsClients = new Map(); // username -> Set<ws>

wss.on('connection', (ws) => {
  let wsUser = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'auth' && msg.token) {
        const decoded = jwt.verify(msg.token, JWT_SECRET);
        wsUser = decoded.username;
        if (!wsClients.has(wsUser)) wsClients.set(wsUser, new Set());
        wsClients.get(wsUser).add(ws);
      }
    } catch (_) {}
  });

  ws.on('close', () => {
    if (wsUser && wsClients.has(wsUser)) {
      wsClients.get(wsUser).delete(ws);
      if (wsClients.get(wsUser).size === 0) wsClients.delete(wsUser);
    }
  });
});

function broadcastToUser(username, data) {
  const clients = wsClients.get(username);
  if (!clients) return;
  const msg = JSON.stringify(data);
  for (const ws of clients) {
    try { ws.send(msg); } catch (_) {}
  }
}

// ===== Middleware =====
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ===== Auth Routes =====

app.post('/api/register', async (req, res) => {
  const { username, password, refCode } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (username.length < 3 || password.length < 4) return res.status(400).json({ error: 'Username min 3, password min 4' });

  const users = loadUsers();
  if (users[username]) return res.status(409).json({ error: 'Username already exists' });

  const hash = await bcrypt.hash(password, 10);
  const myRefCode = username + '_' + Math.random().toString(36).slice(2, 8);
  let referredBy = null;

  // Handle referral
  if (refCode) {
    for (const [u, d] of Object.entries(users)) {
      if (d.refCode === refCode) {
        referredBy = u;
        break;
      }
    }
  }

  users[username] = {
    password: hash,
    createdAt: new Date().toISOString(),
    refCode: myRefCode,
    referredBy,
    referrals: [],
    gameData: {
      coins: 0, totalCoins: 0, earnPerTap: 1,
      energy: 6500, maxEnergy: 6500, profitPerHour: 0,
      cardLevels: {}, completedTasks: {},
      multitapLevel: 1, energyLimitLevel: 1,
      turboBoosts: 3, fullEnergyBoosts: 3,
      comboFound: [], level: 'Bronze',
      referralEarnings: 0,
      achievements: [],
      dailyStreak: 0, lastDailyClaim: null,
      lastActiveTime: Date.now(),
      bpXP: 0, bpLevel: 1, bpClaimed: [],
      inventory: [], chests: { rare: 0, super_rare: 0, epic: 0, mythic: 0, legendary: 0 },
      questProgress: { taps: 0, cards: 0, tasks: 0, coins: 0, spin: 0, flip: 0 },
      questClaimed: [],
    },
  };

  // Give referrer a bonus
  if (referredBy && users[referredBy]) {
    users[referredBy].referrals.push(username);
    users[referredBy].gameData.coins += 50000;
    users[referredBy].gameData.totalCoins += 50000;
    users[referredBy].gameData.referralEarnings = (users[referredBy].gameData.referralEarnings || 0) + 50000;
    users[referredBy].gameData.level = calcLevel(users[referredBy].gameData.totalCoins);
    broadcastToUser(referredBy, { type: 'referral_bonus', from: username, amount: 50000 });
  }

  saveUsers(users);
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username, gameData: users[username].gameData, refCode: myRefCode });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const users = loadUsers();
  const user = users[username];
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid username or password' });

  // Calculate offline earnings
  const offlineEarnings = calcOfflineEarnings(user.gameData);
  if (offlineEarnings > 0) {
    user.gameData.coins += offlineEarnings;
    user.gameData.totalCoins += offlineEarnings;
    user.gameData.level = calcLevel(user.gameData.totalCoins);
  }
  // Regen energy for offline time
  const prevActive = user.gameData.lastActiveTime || Date.now();
  const offlineSec = Math.max(0, (Date.now() - prevActive) / 1000);
  const energyRegen = Math.floor(offlineSec * 3); // 3/sec
  user.gameData.energy = Math.min(user.gameData.maxEnergy, (user.gameData.energy || 0) + energyRegen);
  user.gameData.lastActiveTime = Date.now();
  saveUsers(users);

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
  const offlineMs = Date.now() - (user.gameData.lastActiveTime || Date.now());
  res.json({ token, username, gameData: user.gameData, refCode: user.refCode, offlineEarnings, offlineMs });
});

// ===== Game Data Routes =====

app.get('/api/gamedata', authMiddleware, (req, res) => {
  const users = loadUsers();
  const user = users[req.user.username];
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Calculate offline earnings
  const offlineEarnings = calcOfflineEarnings(user.gameData);
  if (offlineEarnings > 0) {
    user.gameData.coins += offlineEarnings;
    user.gameData.totalCoins += offlineEarnings;
    user.gameData.level = calcLevel(user.gameData.totalCoins);
  }
  user.gameData.lastActiveTime = Date.now();
  saveUsers(users);

  res.json({ username: req.user.username, gameData: user.gameData, refCode: user.refCode, referrals: user.referrals, offlineEarnings, offlineMs: Date.now() - (user.gameData.lastActiveTime || Date.now()) });
});

app.post('/api/gamedata', authMiddleware, (req, res) => {
  const users = loadUsers();
  const user = users[req.user.username];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const g = req.body;
  user.gameData = {
    ...user.gameData,
    coins: g.coins ?? user.gameData.coins,
    totalCoins: g.totalCoins ?? user.gameData.totalCoins,
    cardLevels: g.cardLevels ?? user.gameData.cardLevels,
    completedTasks: g.completedTasks ?? user.gameData.completedTasks,
    multitapLevel: g.multitapLevel ?? user.gameData.multitapLevel,
    energyLimitLevel: g.energyLimitLevel ?? user.gameData.energyLimitLevel,
    turboBoosts: g.turboBoosts ?? user.gameData.turboBoosts,
    fullEnergyBoosts: g.fullEnergyBoosts ?? user.gameData.fullEnergyBoosts,
    energy: g.energy ?? user.gameData.energy,
    comboFound: g.comboFound ?? user.gameData.comboFound,
    profitPerHour: g.profitPerHour ?? user.gameData.profitPerHour,
    earnPerTap: g.earnPerTap ?? user.gameData.earnPerTap,
    maxEnergy: g.maxEnergy ?? user.gameData.maxEnergy,
    referralEarnings: g.referralEarnings ?? user.gameData.referralEarnings ?? 0,
    achievements: g.achievements ?? user.gameData.achievements ?? [],
    dailyStreak: g.dailyStreak ?? user.gameData.dailyStreak ?? 0,
    lastDailyClaim: g.lastDailyClaim ?? user.gameData.lastDailyClaim ?? null,
    bpXP: g.bpXP ?? user.gameData.bpXP ?? 0,
    bpLevel: g.bpLevel ?? user.gameData.bpLevel ?? 1,
    bpClaimed: g.bpClaimed ?? user.gameData.bpClaimed ?? [],
    inventory: g.inventory ?? user.gameData.inventory ?? [],
    chests: g.chests ?? user.gameData.chests ?? { rare: 0, super_rare: 0, epic: 0, mythic: 0, legendary: 0 },
    questProgress: g.questProgress ?? user.gameData.questProgress ?? { taps: 0, cards: 0, tasks: 0, coins: 0, spin: 0, flip: 0 },
    questClaimed: g.questClaimed ?? user.gameData.questClaimed ?? [],
  };
  user.gameData.level = calcLevel(user.gameData.totalCoins);
  user.gameData.lastActiveTime = Date.now();

  saveUsers(users);
  broadcastToUser(req.user.username, { type: 'sync', gameData: user.gameData });
  res.json({ success: true, gameData: user.gameData });
});

// ===== Shop Routes =====

app.get('/api/shop', authMiddleware, (req, res) => {
  const users = loadUsers();
  const user = users[req.user.username];
  const cardLevels = user?.gameData?.cardLevels || {};

  const items = [];
  for (const [id, card] of Object.entries(MINE_CARDS_FLAT)) {
    const level = cardLevels[id] || 0;
    const cost = level === 0 ? card.baseCost : Math.floor(card.baseCost * Math.pow(1.4, level));
    const profit = level === 0 ? card.baseProfit : Math.floor(card.baseProfit * Math.pow(1.15, level - 1));
    items.push({ id, name: card.name, category: card.category, level, maxLevel: card.maxLevel, cost, profitPerHour: profit, maxed: level >= card.maxLevel });
  }
  res.json({ items, coins: user.gameData.coins });
});

app.post('/api/shop/buy', authMiddleware, (req, res) => {
  const { itemId } = req.body;
  if (!itemId) return res.status(400).json({ error: 'itemId required' });

  const card = MINE_CARDS_FLAT[itemId];
  if (!card) return res.status(404).json({ error: 'Item not found' });

  const users = loadUsers();
  const user = users[req.user.username];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const level = user.gameData.cardLevels[itemId] || 0;
  if (level >= card.maxLevel) return res.status(400).json({ error: 'Item already at max level' });

  const cost = level === 0 ? card.baseCost : Math.floor(card.baseCost * Math.pow(1.4, level));
  if (user.gameData.coins < cost) return res.status(400).json({ error: 'Not enough coins' });

  user.gameData.coins -= cost;
  user.gameData.cardLevels[itemId] = level + 1;
  user.gameData.profitPerHour = calcProfitPerHour(user.gameData.cardLevels);
  user.gameData.level = calcLevel(user.gameData.totalCoins);

  saveUsers(users);
  broadcastToUser(req.user.username, { type: 'purchase', itemId, level: level + 1, gameData: user.gameData });
  res.json({ success: true, message: `Upgraded ${card.name} to level ${level + 1}`, coins: user.gameData.coins, profitPerHour: user.gameData.profitPerHour, gameData: user.gameData });
});

// ===== Tap (for CLI) =====
app.post('/api/tap', authMiddleware, (req, res) => {
  // Rate limit check
  if (!checkTapRateLimit(req.user.username)) {
    return res.status(429).json({ error: 'Too many tap requests. Max 30/min.' });
  }

  const { taps } = req.body;
  const tapCount = Math.min(taps || 1, 1000);

  const users = loadUsers();
  const user = users[req.user.username];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const earnPerTap = user.gameData.earnPerTap || 1;
  const allowed = Math.min(tapCount, user.gameData.energy || 0);
  const earned = allowed * earnPerTap;

  user.gameData.coins += earned;
  user.gameData.totalCoins += earned;
  user.gameData.energy = Math.max(0, (user.gameData.energy || 0) - allowed);
  user.gameData.level = calcLevel(user.gameData.totalCoins);

  // Update quest progress & BP XP
  user.gameData.questProgress = user.gameData.questProgress || { taps: 0, cards: 0, tasks: 0, coins: 0, spin: 0, flip: 0 };
  user.gameData.questProgress.taps += allowed;
  user.gameData.questProgress.coins += earned;
  addBPXP(user.gameData, allowed);

  // Referral bonus: 20% of earned goes to referrer (doesn't deduct from user)
  if (user.referredBy && users[user.referredBy]) {
    const bonus = Math.floor(earned * REFERRAL_BONUS_PCT);
    if (bonus > 0) {
      users[user.referredBy].gameData.coins += bonus;
      users[user.referredBy].gameData.totalCoins += bonus;
      users[user.referredBy].gameData.referralEarnings = (users[user.referredBy].gameData.referralEarnings || 0) + bonus;
      users[user.referredBy].gameData.level = calcLevel(users[user.referredBy].gameData.totalCoins);
      broadcastToUser(user.referredBy, { type: 'referral_earning', from: req.user.username, amount: bonus });
    }
  }

  saveUsers(users);
  broadcastToUser(req.user.username, { type: 'tap', earned, gameData: user.gameData });
  res.json({ earned, coins: user.gameData.coins, energy: user.gameData.energy, gameData: user.gameData });
});

// ===== Referral Routes =====

app.get('/api/referral', authMiddleware, (req, res) => {
  const users = loadUsers();
  const user = users[req.user.username];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const referralList = (user.referrals || []).map(r => {
    const refUser = users[r];
    return { username: r, totalCoins: refUser?.gameData?.totalCoins || 0, level: refUser?.gameData?.level || 'Bronze' };
  });

  res.json({
    refCode: user.refCode,
    referredBy: user.referredBy,
    referrals: referralList,
    referralEarnings: user.gameData.referralEarnings || 0,
  });
});

// ===== Daily Reward =====
app.post('/api/daily', authMiddleware, (req, res) => {
  const users = loadUsers();
  const user = users[req.user.username];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const today = new Date().toISOString().split('T')[0];
  if (user.gameData.lastDailyClaim === today) {
    return res.status(400).json({ error: 'Already claimed today' });
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const streak = (user.gameData.lastDailyClaim === yesterday) ? (user.gameData.dailyStreak || 0) + 1 : 1;
  const reward = Math.min(streak * 10000, 100000);

  user.gameData.dailyStreak = streak;
  user.gameData.lastDailyClaim = today;
  user.gameData.coins += reward;
  user.gameData.totalCoins += reward;
  user.gameData.level = calcLevel(user.gameData.totalCoins);

  saveUsers(users);
  broadcastToUser(req.user.username, { type: 'daily_reward', reward, streak, gameData: user.gameData });
  res.json({ reward, streak, coins: user.gameData.coins, gameData: user.gameData });
});

// ===== Achievements =====
const ACHIEVEMENTS = [
  { id: 'first_tap',    name: 'First Tap',       desc: 'Tap for the first time',         icon: '👆', check: (gd) => gd.totalCoins > 0 },
  { id: 'coins_10k',    name: '10K Club',         desc: 'Earn 10,000 total coins',        icon: '💰', check: (gd) => gd.totalCoins >= 10000 },
  { id: 'coins_100k',   name: '100K Club',        desc: 'Earn 100,000 total coins',       icon: '💎', check: (gd) => gd.totalCoins >= 100000 },
  { id: 'coins_1m',     name: 'Millionaire',      desc: 'Earn 1,000,000 total coins',     icon: '🤑', check: (gd) => gd.totalCoins >= 1000000 },
  { id: 'coins_100m',   name: 'Tycoon',           desc: 'Earn 100,000,000 total coins',   icon: '👑', check: (gd) => gd.totalCoins >= 100000000 },
  { id: 'cards_5',      name: 'Card Shark',       desc: 'Buy 5 cards',                    icon: '🃏', check: (gd) => Object.values(gd.cardLevels).filter(l => l > 0).length >= 5 },
  { id: 'cards_15',     name: 'Card Master',      desc: 'Buy 15 cards',                   icon: '🎰', check: (gd) => Object.values(gd.cardLevels).filter(l => l > 0).length >= 15 },
  { id: 'profit_1k',    name: 'Earner',           desc: 'Reach 1,000 profit/hour',        icon: '📈', check: (gd) => gd.profitPerHour >= 1000 },
  { id: 'profit_10k',   name: 'Big Earner',       desc: 'Reach 10,000 profit/hour',       icon: '🚀', check: (gd) => gd.profitPerHour >= 10000 },
  { id: 'ref_1',        name: 'Networker',        desc: 'Invite 1 friend',                icon: '🤝', check: (_, refs) => refs.length >= 1 },
  { id: 'ref_5',        name: 'Influencer',       desc: 'Invite 5 friends',              icon: '🌟', check: (_, refs) => refs.length >= 5 },
  { id: 'streak_7',     name: 'Consistent',       desc: '7-day daily streak',              icon: '🔥', check: (gd) => gd.dailyStreak >= 7 },
  { id: 'streak_30',    name: 'Unstoppable',      desc: '30-day daily streak',            icon: '⚡', check: (gd) => gd.dailyStreak >= 30 },
];

app.get('/api/achievements', authMiddleware, (req, res) => {
  const users = loadUsers();
  const user = users[req.user.username];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const unlocked = user.gameData.achievements || [];
  const all = ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: unlocked.includes(a.id),
  }));

  res.json({ achievements: all, total: ACHIEVEMENTS.length, unlocked: unlocked.length });
});

app.post('/api/achievements/check', authMiddleware, (req, res) => {
  const users = loadUsers();
  const user = users[req.user.username];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const unlocked = user.gameData.achievements || [];
  const newAchievements = [];

  for (const a of ACHIEVEMENTS) {
    if (!unlocked.includes(a.id) && a.check(user.gameData, user.referrals || [])) {
      unlocked.push(a.id);
      newAchievements.push(a);
      // Bonus for achievement
      const bonus = 50000;
      user.gameData.coins += bonus;
      user.gameData.totalCoins += bonus;
    }
  }

  if (newAchievements.length > 0) {
    user.gameData.achievements = unlocked;
    user.gameData.level = calcLevel(user.gameData.totalCoins);
    saveUsers(users);
    broadcastToUser(req.user.username, { type: 'achievements', new: newAchievements, gameData: user.gameData });
  }

  res.json({ newAchievements, totalUnlocked: unlocked.length, gameData: user.gameData });
});

// ===== Start Server =====
server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║       🐹 Hamster Kombat Server v2.0       ║
  ╠═══════════════════════════════════════════╣
  ║                                            ║
  ║  Browser:  http://localhost:${PORT}            ║
  ║  WebSocket: ws://localhost:${PORT}/ws          ║
  ║  API:      http://localhost:${PORT}/api        ║
  ║                                            ║
  ║  CLI:      node cli.js                     ║
  ║                                            ║
  ║  Cards: ${Object.keys(MINE_CARDS_FLAT).length} items in shop              ║
  ║  Referral: 20% bonus active               ║
  ║                                            ║
  ╚═══════════════════════════════════════════╝
  `);
});
