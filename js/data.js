// ===== Game Data =====

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

const MINE_CARDS = {
  markets: [
    { id: 'top10cmc',      name: 'Top 10 cmc pairs',      icon: '&#x24C2;',  desc: 'Most traded cryptocurrency pairs market capitalization', baseCost: 1000,   baseProfit: 50,   maxLevel: 25 },
    { id: 'memecoins',     name: 'Meme coins',             icon: '&#x1F436;', desc: 'Popular meme coins trading volume',                      baseCost: 2000,   baseProfit: 80,   maxLevel: 25 },
    { id: 'marginx10',     name: 'Margin trading x10',     icon: '&#x1F4C8;', desc: 'Margin trading with 10x leverage',                       baseCost: 5000,   baseProfit: 150,  maxLevel: 20 },
    { id: 'marginx20',     name: 'Margin trading x20',     icon: '&#x1F4C8;', desc: 'Margin trading with 20x leverage',                       baseCost: 10000,  baseProfit: 250,  maxLevel: 20 },
    { id: 'marginx30',     name: 'Margin trading x30',     icon: '&#x1F680;', desc: 'Margin trading with 30x leverage',                       baseCost: 20000,  baseProfit: 400,  maxLevel: 15 },
    { id: 'marginx50',     name: 'Margin trading x50',     icon: '&#x1F680;', desc: 'Margin trading with 50x leverage',                       baseCost: 50000,  baseProfit: 800,  maxLevel: 15 },
    { id: 'defi',          name: 'DeFi protocols',          icon: '&#x1F4B0;', desc: 'Decentralized finance protocol revenue',                 baseCost: 30000,  baseProfit: 500,  maxLevel: 20 },
    { id: 'nftmarket',     name: 'NFT marketplace',         icon: '&#x1F3A8;', desc: 'Non-fungible token marketplace commission',               baseCost: 15000,  baseProfit: 300,  maxLevel: 20 },
  ],
  prteam: [
    { id: 'licence_jp',    name: 'Licence Japan',           icon: '&#x1F1EF;&#x1F1F5;', desc: 'Japanese market trading licence',        baseCost: 8000,   baseProfit: 200,  maxLevel: 15 },
    { id: 'qateam',        name: 'QA team',                 icon: '&#x1F41B;', desc: 'Quality assurance team for platform stability', baseCost: 5000,   baseProfit: 120,  maxLevel: 20 },
    { id: 'marketing',     name: 'Marketing campaign',      icon: '&#x1F4E2;', desc: 'Global marketing and brand awareness',         baseCost: 12000,  baseProfit: 280,  maxLevel: 15 },
    { id: 'partnership',   name: 'Partnership program',     icon: '&#x1F91D;', desc: 'Strategic partnerships with exchanges',        baseCost: 20000,  baseProfit: 450,  maxLevel: 15 },
    { id: 'ceo',           name: 'CEO advisor',             icon: '&#x1F454;', desc: 'Top-tier executive advisory services',          baseCost: 50000,  baseProfit: 900,  maxLevel: 10 },
    { id: 'influencer',    name: 'Influencer collab',       icon: '&#x1F4F1;', desc: 'Influencer collaboration for user growth',      baseCost: 25000,  baseProfit: 500,  maxLevel: 15 },
  ],
  legal: [
    { id: 'kyc',           name: 'KYC system',              icon: '&#x1F512;', desc: 'Know Your Customer verification system',        baseCost: 10000,  baseProfit: 250,  maxLevel: 15 },
    { id: 'amlsystem',     name: 'AML compliance',          icon: '&#x1F6E1;', desc: 'Anti-money laundering compliance system',       baseCost: 15000,  baseProfit: 350,  maxLevel: 15 },
    { id: 'regapproval',   name: 'Regulatory approval',     icon: '&#x2696;',  desc: 'Global regulatory framework approval',         baseCost: 30000,  baseProfit: 600,  maxLevel: 12 },
    { id: 'insurance',     name: 'Insurance fund',           icon: '&#x1F4B3;', desc: 'User funds insurance protection',              baseCost: 40000,  baseProfit: 700,  maxLevel: 10 },
  ],
  specials: [
    { id: 'hamsterwheel',  name: 'Hamster wheel',           icon: '&#x1F439;', desc: 'Golden hamster wheel for maximum profit',       baseCost: 100000, baseProfit: 1500, maxLevel: 10 },
    { id: 'cryptovault',   name: 'Crypto vault',            icon: '&#x1F3E6;', desc: 'Secure cryptocurrency cold storage vault',      baseCost: 80000,  baseProfit: 1200, maxLevel: 10 },
    { id: 'tradingbot',    name: 'Trading bot',             icon: '&#x1F916;', desc: 'AI-powered automated trading bot',              baseCost: 60000,  baseProfit: 1000, maxLevel: 12 },
    { id: 'launchpad',     name: 'Token launchpad',         icon: '&#x1F680;', desc: 'New token launch platform with IDO',            baseCost: 120000, baseProfit: 2000, maxLevel: 8 },
    { id: 'stakingpool',   name: 'Staking pool',            icon: '&#x26CF;',  desc: 'High-yield staking pool for validators',        baseCost: 200000, baseProfit: 3000, maxLevel: 8 },
  ],
};

const DAILY_COMBO_IDS = ['licence_jp', 'qateam', 'memecoins'];

const TASKS = {
  youtube: [
    { id: 'yt1', title: 'How to earn in crypto',        reward: 100000, icon: '&#x1F4F9;' },
    { id: 'yt2', title: 'Top 10 trading strategies',    reward: 100000, icon: '&#x1F4F9;' },
    { id: 'yt3', title: 'Hamster Kombat explained',      reward: 100000, icon: '&#x1F4F9;' },
  ],
  daily: [
    { id: 'd1', title: 'Daily reward',                  reward: 50000,  icon: '&#x1F381;' },
    { id: 'd2', title: 'Watch an ad',                   reward: 10000,  icon: '&#x1F4FA;' },
  ],
  tasks: [
    { id: 't1', title: 'Join Telegram channel',         reward: 25000,  icon: '&#x2708;' },
    { id: 't2', title: 'Follow on Twitter',             reward: 25000,  icon: '&#x1F426;' },
    { id: 't3', title: 'Invite 3 friends',              reward: 100000, icon: '&#x1F46B;' },
    { id: 't4', title: 'Reach Silver level',            reward: 50000,  icon: '&#x1F3C6;' },
    { id: 't5', title: 'Upgrade 5 cards',               reward: 75000,  icon: '&#x2B06;' },
  ],
};
