// ===== Battle Pass =====
const BattlePass = (() => {
  const MAX_LEVEL = 30;
  const XP_PER_LEVEL = lvl => 50 + lvl * 30; // 80, 110, 140...
  const REWARDS = [
    { icon: '💰', val: '5K' }, { icon: '📦', val: 'Chest:Rare' }, { icon: '💰', val: '10K' },
    { icon: '🃏', val: 'Card' }, { icon: '💰', val: '25K' }, { icon: '⚡', val: 'Energy' },
    { icon: '�', val: 'Chest:Super' }, { icon: '💰', val: '50K' }, { icon: '💰', val: '75K' },
    { icon: '⚡', val: 'Energy' }, { icon: '💰', val: '100K' }, { icon: '🔮', val: 'Chest:Epic' },
    { icon: '💰', val: '150K' }, { icon: '🧪', val: 'Potion' }, { icon: '💰', val: '200K' },
    { icon: '🤖', val: 'AutoTap' }, { icon: '💰', val: '300K' }, { icon: '�', val: 'Chest:Mythic' },
    { icon: '💰', val: '500K' }, { icon: '⚡', val: 'Energy' }, { icon: '💰', val: '750K' },
    { icon: '🤖', val: 'AutoTap' }, { icon: '💰', val: '1M' }, { icon: '👑', val: 'Chest:Legend' },
    { icon: '💰', val: '2M' }, { icon: '🧪', val: 'Potion' }, { icon: '💰', val: '3M' },
    { icon: '🤖', val: 'AutoTap' }, { icon: '💰', val: '5M' }, { icon: '👑', val: 'Crown' },
  ];

  function getRewardCoins(index) {
    const map = {'5K':5000,'10K':10000,'25K':25000,'50K':50000,'75K':75000,'100K':100000,
      '150K':150000,'200K':200000,'300K':300000,'500K':500000,'750K':750000,
      '1M':1000000,'2M':2000000,'3M':3000000,'5M':5000000};
    return map[REWARDS[index].val] || 0;
  }

  function getXpForLevel(lvl) { return XP_PER_LEVEL(Math.min(lvl, MAX_LEVEL - 1)); }

  // Quests: {id, icon, name, desc, target, xpReward, tracker}
  // tracker: 'taps' | 'cards' | 'tasks' | 'coins' | 'spin' | 'flip'
  const QUESTS = [
    { id: 'q_tap100', icon: '👆', name: 'First Steps', desc: 'Tap 100 times', target: 100, xpReward: 30, tracker: 'taps' },
    { id: 'q_tap1000', icon: '👆', name: 'Tap Master', desc: 'Tap 1,000 times', target: 1000, xpReward: 80, tracker: 'taps' },
    { id: 'q_tap5000', icon: '👆', name: 'Tap Legend', desc: 'Tap 5,000 times', target: 5000, xpReward: 200, tracker: 'taps' },
    { id: 'q_card3', icon: '🃏', name: 'Card Collector', desc: 'Upgrade 3 cards', target: 3, xpReward: 50, tracker: 'cards' },
    { id: 'q_card10', icon: '🃏', name: 'Card Shark', desc: 'Upgrade 10 cards', target: 10, xpReward: 120, tracker: 'cards' },
    { id: 'q_task1', icon: '✅', name: 'Task Starter', desc: 'Complete 1 task', target: 1, xpReward: 40, tracker: 'tasks' },
    { id: 'q_task5', icon: '✅', name: 'Task Pro', desc: 'Complete 5 tasks', target: 5, xpReward: 100, tracker: 'tasks' },
    { id: 'q_earn10k', icon: '💰', name: 'Coin Hunter', desc: 'Earn 10K coins total', target: 10000, xpReward: 60, tracker: 'coins' },
    { id: 'q_earn100k', icon: '💰', name: 'Coin Baron', desc: 'Earn 100K coins total', target: 100000, xpReward: 150, tracker: 'coins' },
    { id: 'q_spin1', icon: '🎰', name: 'Lucky Spin', desc: 'Spin the wheel once', target: 1, xpReward: 50, tracker: 'spin' },
    { id: 'q_flip3', icon: '🪙', name: 'Flip Addict', desc: 'Play Coin Flip 3 times', target: 3, xpReward: 60, tracker: 'flip' },
  ];

  return { MAX_LEVEL, REWARDS, QUESTS, getRewardCoins, getXpForLevel };
})();
