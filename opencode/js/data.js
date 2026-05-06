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
    { id: 'top10cmc',      name: 'Top 10 cmc pairs',      icon: '&#x24C2;',  desc: 'Most traded cryptocurrency pairs by market cap', baseCost: 1000,   baseProfit: 50,   maxLevel: 25 },
    { id: 'memecoins',     name: 'Meme coins',             icon: '&#x1F436;', desc: 'Popular meme coins trading volume',              baseCost: 2000,   baseProfit: 80,   maxLevel: 25 },
    { id: 'futures',       name: 'Futures trading',         icon: '&#x1F4C9;', desc: 'Perpetual futures contracts',                    baseCost: 3000,   baseProfit: 100,  maxLevel: 20 },
    { id: 'marginx10',     name: 'Margin trading x10',     icon: '&#x1F4C8;', desc: 'Margin trading with 10x leverage',               baseCost: 5000,   baseProfit: 150,  maxLevel: 20 },
    { id: 'marginx20',     name: 'Margin trading x20',     icon: '&#x1F4C8;', desc: 'Margin trading with 20x leverage',               baseCost: 10000,  baseProfit: 250,  maxLevel: 20 },
    { id: 'p2pexchange',   name: 'P2P Exchange',            icon: '&#x1F504;', desc: 'Peer-to-peer crypto exchange',                   baseCost: 8000,   baseProfit: 180,  maxLevel: 20 },
    { id: 'nftmarket',     name: 'NFT marketplace',         icon: '&#x1F3A8;', desc: 'Non-fungible token marketplace',                 baseCost: 15000,  baseProfit: 300,  maxLevel: 20 },
    { id: 'marginx30',     name: 'Margin trading x30',     icon: '&#x1F680;', desc: 'Margin trading with 30x leverage',               baseCost: 20000,  baseProfit: 400,  maxLevel: 15 },
    { id: 'otcdesk',       name: 'OTC Desk',               icon: '&#x1F3E6;', desc: 'Over-the-counter trading desk',                  baseCost: 25000,  baseProfit: 450,  maxLevel: 15 },
    { id: 'defi',          name: 'DeFi protocols',          icon: '&#x1F4B0;', desc: 'Decentralized finance protocol revenue',         baseCost: 30000,  baseProfit: 500,  maxLevel: 20 },
    { id: 'iopools',       name: 'IDO Launchpools',         icon: '&#x1F30A;', desc: 'Initial DEX offering launchpools',               baseCost: 40000,  baseProfit: 650,  maxLevel: 15 },
    { id: 'marginx50',     name: 'Margin trading x50',     icon: '&#x1F680;', desc: 'Margin trading with 50x leverage',               baseCost: 50000,  baseProfit: 800,  maxLevel: 15 },
  ],
  prteam: [
    { id: 'qateam',        name: 'QA team',                 icon: '&#x1F41B;', desc: 'Quality assurance team for stability',           baseCost: 5000,   baseProfit: 120,  maxLevel: 20 },
    { id: 'licence_jp',    name: 'Licence Japan',           icon: '&#x1F1EF;&#x1F1F5;', desc: 'Japanese market trading licence',   baseCost: 8000,   baseProfit: 200,  maxLevel: 15 },
    { id: 'support',       name: 'Support team',             icon: '&#x1F4AC;', desc: '24/7 customer support team',                    baseCost: 6000,   baseProfit: 140,  maxLevel: 20 },
    { id: 'marketing',     name: 'Marketing campaign',      icon: '&#x1F4E2;', desc: 'Global marketing and brand awareness',           baseCost: 12000,  baseProfit: 280,  maxLevel: 15 },
    { id: 'community',     name: 'Community managers',       icon: '&#x1F465;', desc: 'Community management and engagement',            baseCost: 15000,  baseProfit: 320,  maxLevel: 15 },
    { id: 'partnership',   name: 'Partnership program',     icon: '&#x1F91D;', desc: 'Strategic partnerships with exchanges',          baseCost: 20000,  baseProfit: 450,  maxLevel: 15 },
    { id: 'influencer',    name: 'Influencer collab',       icon: '&#x1F4F1;', desc: 'Influencer collaboration for growth',            baseCost: 25000,  baseProfit: 500,  maxLevel: 15 },
    { id: 'ambassador',    name: 'Ambassador program',       icon: '&#x1F30D;', desc: 'Global ambassador network',                     baseCost: 35000,  baseProfit: 600,  maxLevel: 12 },
    { id: 'ceo',           name: 'CEO advisor',             icon: '&#x1F454;', desc: 'Top-tier executive advisory services',            baseCost: 50000,  baseProfit: 900,  maxLevel: 10 },
  ],
  legal: [
    { id: 'kyc',           name: 'KYC system',              icon: '&#x1F512;', desc: 'Know Your Customer verification system',          baseCost: 10000,  baseProfit: 250,  maxLevel: 15 },
    { id: 'amlsystem',     name: 'AML compliance',          icon: '&#x1F6E1;', desc: 'Anti-money laundering compliance',               baseCost: 15000,  baseProfit: 350,  maxLevel: 15 },
    { id: 'audit',         name: 'Security audit',           icon: '&#x1F50F;', desc: 'Platform security audit and certification',      baseCost: 20000,  baseProfit: 400,  maxLevel: 15 },
    { id: 'compliance',    name: 'Compliance team',           icon: '&#x2696;',  desc: 'Regulatory compliance team',                    baseCost: 25000,  baseProfit: 480,  maxLevel: 12 },
    { id: 'regapproval',   name: 'Regulatory approval',     icon: '&#x1F4DC;', desc: 'Global regulatory framework approval',           baseCost: 30000,  baseProfit: 600,  maxLevel: 12 },
    { id: 'insurance',     name: 'Insurance fund',           icon: '&#x1F4B3;', desc: 'User funds insurance protection',                baseCost: 40000,  baseProfit: 700,  maxLevel: 10 },
  ],
  specials: [
    { id: 'tradingbot',    name: 'Trading bot',             icon: '&#x1F916;', desc: 'AI-powered automated trading bot',                baseCost: 60000,  baseProfit: 1000, maxLevel: 12 },
    { id: 'cryptovault',   name: 'Crypto vault',            icon: '&#x1F3E6;', desc: 'Secure cryptocurrency cold storage vault',        baseCost: 80000,  baseProfit: 1200, maxLevel: 10 },
    { id: 'hamsterwheel',  name: 'Hamster wheel',           icon: '&#x1F439;', desc: 'Golden hamster wheel for maximum profit',         baseCost: 100000, baseProfit: 1500, maxLevel: 10 },
    { id: 'launchpad',     name: 'Token launchpad',         icon: '&#x1F680;', desc: 'New token launch platform with IDO',              baseCost: 120000, baseProfit: 2000, maxLevel: 8 },
    { id: 'stakingpool',   name: 'Staking pool',            icon: '&#x26CF;',  desc: 'High-yield staking pool for validators',          baseCost: 200000, baseProfit: 3000, maxLevel: 8 },
    { id: 'aifund',        name: 'AI Trading Fund',          icon: '&#x1F9EC;', desc: 'AI-managed diversified trading fund',             baseCost: 300000, baseProfit: 4500, maxLevel: 6 },
    { id: 'darkpool',      name: 'Dark Pool Access',        icon: '&#x1F575;', desc: 'Institutional dark pool trading access',          baseCost: 400000, baseProfit: 5500, maxLevel: 6 },
    { id: 'quantumminer',  name: 'Quantum Miner',           icon: '&#x269B;',  desc: 'Quantum computing mining operation',              baseCost: 500000, baseProfit: 7000, maxLevel: 5 },
    { id: 'metaverse',     name: 'Metaverse Exchange',      icon: '&#x1F3AE;', desc: 'Virtual world asset exchange',                   baseCost: 750000, baseProfit: 9000, maxLevel: 5 },
    { id: 'satoshilab',    name: 'Satoshi Lab',             icon: '&#x26A1;',  desc: 'Legendary Satoshi research laboratory',           baseCost: 1000000,baseProfit: 12000,maxLevel: 3 },
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
