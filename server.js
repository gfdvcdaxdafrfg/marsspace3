const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'hamster-kombat-secret-key-2024';
const DB_FILE = path.join(__dirname, 'data', 'users.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Initialize DB file
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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ===== Auth Routes =====

// Register
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  if (username.length < 3 || password.length < 4) {
    return res.status(400).json({ error: 'Username min 3 chars, password min 4 chars' });
  }

  const users = loadUsers();
  if (users[username]) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const hash = await bcrypt.hash(password, 10);
  users[username] = {
    password: hash,
    createdAt: new Date().toISOString(),
    gameData: {
      coins: 0,
      totalCoins: 0,
      earnPerTap: 1,
      energy: 6500,
      maxEnergy: 6500,
      profitPerHour: 0,
      cardLevels: {},
      completedTasks: {},
      multitapLevel: 1,
      energyLimitLevel: 1,
      turboBoosts: 3,
      fullEnergyBoosts: 3,
      comboFound: [],
      level: 'Bronze',
    },
  };
  saveUsers(users);

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username, gameData: users[username].gameData });
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const users = loadUsers();
  const user = users[username];
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username, gameData: user.gameData });
});

// ===== Game Data Routes =====

// Get game data
app.get('/api/gamedata', authMiddleware, (req, res) => {
  const users = loadUsers();
  const user = users[req.user.username];
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ username: req.user.username, gameData: user.gameData });
});

// Save game data (from browser)
app.post('/api/gamedata', authMiddleware, (req, res) => {
  const users = loadUsers();
  const user = users[req.user.username];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { coins, totalCoins, cardLevels, completedTasks, multitapLevel,
    energyLimitLevel, turboBoosts, fullEnergyBoosts, energy, comboFound,
    profitPerHour, earnPerTap, maxEnergy } = req.body;

  user.gameData = {
    ...user.gameData,
    coins: coins ?? user.gameData.coins,
    totalCoins: totalCoins ?? user.gameData.totalCoins,
    cardLevels: cardLevels ?? user.gameData.cardLevels,
    completedTasks: completedTasks ?? user.gameData.completedTasks,
    multitapLevel: multitapLevel ?? user.gameData.multitapLevel,
    energyLimitLevel: energyLimitLevel ?? user.gameData.energyLimitLevel,
    turboBoosts: turboBoosts ?? user.gameData.turboBoosts,
    fullEnergyBoosts: fullEnergyBoosts ?? user.gameData.fullEnergyBoosts,
    energy: energy ?? user.gameData.energy,
    comboFound: comboFound ?? user.gameData.comboFound,
    profitPerHour: profitPerHour ?? user.gameData.profitPerHour,
    earnPerTap: earnPerTap ?? user.gameData.earnPerTap,
    maxEnergy: maxEnergy ?? user.gameData.maxEnergy,
  };

  // Update level
  const LEVELS = [
    { name: 'Bronze', coinsNeeded: 0 },
    { name: 'Silver', coinsNeeded: 50000 },
    { name: 'Gold', coinsNeeded: 500000 },
    { name: 'Platinum', coinsNeeded: 2000000 },
    { name: 'Diamond', coinsNeeded: 10000000 },
    { name: 'Epic', coinsNeeded: 50000000 },
    { name: 'Legendary', coinsNeeded: 200000000 },
    { name: 'Master', coinsNeeded: 500000000 },
    { name: 'Grandmaster', coinsNeeded: 1000000000 },
    { name: 'Lord', coinsNeeded: 5000000000 },
    { name: 'Creator', coinsNeeded: 10000000000 },
  ];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if ((user.gameData.totalCoins || 0) >= LEVELS[i].coinsNeeded) {
      user.gameData.level = LEVELS[i].name;
      break;
    }
  }

  saveUsers(users);
  res.json({ success: true, gameData: user.gameData });
});

// ===== Shop Routes (for CLI) =====

// Get shop items
app.get('/api/shop', authMiddleware, (req, res) => {
  const MINE_CARDS = {
    markets: [
      { id: 'top10cmc', name: 'Top 10 cmc pairs', baseCost: 1000, baseProfit: 50, maxLevel: 25 },
      { id: 'memecoins', name: 'Meme coins', baseCost: 2000, baseProfit: 80, maxLevel: 25 },
      { id: 'marginx10', name: 'Margin trading x10', baseCost: 5000, baseProfit: 150, maxLevel: 20 },
      { id: 'marginx20', name: 'Margin trading x20', baseCost: 10000, baseProfit: 250, maxLevel: 20 },
      { id: 'defi', name: 'DeFi protocols', baseCost: 30000, baseProfit: 500, maxLevel: 20 },
      { id: 'nftmarket', name: 'NFT marketplace', baseCost: 15000, baseProfit: 300, maxLevel: 20 },
    ],
    prteam: [
      { id: 'licence_jp', name: 'Licence Japan', baseCost: 8000, baseProfit: 200, maxLevel: 15 },
      { id: 'qateam', name: 'QA team', baseCost: 5000, baseProfit: 120, maxLevel: 20 },
      { id: 'marketing', name: 'Marketing campaign', baseCost: 12000, baseProfit: 280, maxLevel: 15 },
      { id: 'ceo', name: 'CEO advisor', baseCost: 50000, baseProfit: 900, maxLevel: 10 },
    ],
    specials: [
      { id: 'hamsterwheel', name: 'Hamster wheel', baseCost: 100000, baseProfit: 1500, maxLevel: 10 },
      { id: 'tradingbot', name: 'Trading bot', baseCost: 60000, baseProfit: 1000, maxLevel: 12 },
      { id: 'stakingpool', name: 'Staking pool', baseCost: 200000, baseProfit: 3000, maxLevel: 8 },
    ],
  };

  const users = loadUsers();
  const user = users[req.user.username];
  const cardLevels = user?.gameData?.cardLevels || {};

  const items = [];
  for (const [category, cards] of Object.entries(MINE_CARDS)) {
    for (const card of cards) {
      const level = cardLevels[card.id] || 0;
      const cost = level === 0 ? card.baseCost : Math.floor(card.baseCost * Math.pow(1.4, level));
      const profit = level === 0 ? card.baseProfit : Math.floor(card.baseProfit * Math.pow(1.15, level - 1));
      items.push({
        id: card.id,
        name: card.name,
        category,
        level,
        maxLevel: card.maxLevel,
        cost,
        profitPerHour: profit,
        maxed: level >= card.maxLevel,
      });
    }
  }
  res.json({ items, coins: user.gameData.coins });
});

// Buy shop item (for CLI)
app.post('/api/shop/buy', authMiddleware, (req, res) => {
  const { itemId } = req.body;
  if (!itemId) return res.status(400).json({ error: 'itemId required' });

  const MINE_CARDS_FLAT = {
    top10cmc: { baseCost: 1000, baseProfit: 50, maxLevel: 25 },
    memecoins: { baseCost: 2000, baseProfit: 80, maxLevel: 25 },
    marginx10: { baseCost: 5000, baseProfit: 150, maxLevel: 20 },
    marginx20: { baseCost: 10000, baseProfit: 250, maxLevel: 20 },
    defi: { baseCost: 30000, baseProfit: 500, maxLevel: 20 },
    nftmarket: { baseCost: 15000, baseProfit: 300, maxLevel: 20 },
    licence_jp: { baseCost: 8000, baseProfit: 200, maxLevel: 15 },
    qateam: { baseCost: 5000, baseProfit: 120, maxLevel: 20 },
    marketing: { baseCost: 12000, baseProfit: 280, maxLevel: 15 },
    ceo: { baseCost: 50000, baseProfit: 900, maxLevel: 10 },
    hamsterwheel: { baseCost: 100000, baseProfit: 1500, maxLevel: 10 },
    tradingbot: { baseCost: 60000, baseProfit: 1000, maxLevel: 12 },
    stakingpool: { baseCost: 200000, baseProfit: 3000, maxLevel: 8 },
  };

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

  // Recalculate profit per hour
  let totalProfit = 0;
  for (const [id, cardData] of Object.entries(MINE_CARDS_FLAT)) {
    const lvl = user.gameData.cardLevels[id] || 0;
    if (lvl > 0) {
      totalProfit += Math.floor(cardData.baseProfit * Math.pow(1.15, lvl - 1));
    }
  }
  user.gameData.profitPerHour = totalProfit;

  saveUsers(users);
  res.json({
    success: true,
    message: `Upgraded ${itemId} to level ${level + 1}`,
    coins: user.gameData.coins,
    profitPerHour: user.gameData.profitPerHour,
  });
});

// Tap (for CLI)
app.post('/api/tap', authMiddleware, (req, res) => {
  const { taps } = req.body;
  const tapCount = Math.min(taps || 1, 100);

  const users = loadUsers();
  const user = users[req.user.username];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const earnPerTap = user.gameData.earnPerTap || 1;
  const allowed = Math.min(tapCount, user.gameData.energy || 0);
  const earned = allowed * earnPerTap;

  user.gameData.coins += earned;
  user.gameData.totalCoins += earned;
  user.gameData.energy = Math.max(0, (user.gameData.energy || 0) - allowed);

  saveUsers(users);
  res.json({
    earned,
    coins: user.gameData.coins,
    energy: user.gameData.energy,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║       🐹 Hamster Kombat Server       ║
  ╠═══════════════════════════════════════╣
  ║                                       ║
  ║  Browser: http://localhost:${PORT}        ║
  ║  API:     http://localhost:${PORT}/api    ║
  ║                                       ║
  ║  CLI:     node cli.js                 ║
  ║                                       ║
  ╚═══════════════════════════════════════╝
  `);
});
