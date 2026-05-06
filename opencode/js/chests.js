// ===== Chests & Inventory System =====

const Chests = (() => {
  // Chest types: [name, icon, color, numItems, lootTable]
  // lootTable: [[weight, type, ...params]]
  const TYPES = {
    rare: {
      name: 'Rare Chest', icon: '📦', color: '#2196F3', items: 3,
      loot: [
        [30, 'coins', 5000, 50000],
        [25, 'potion', 'multitap', 5],
        [20, 'potion', 'multitap', 25],
        [15, 'potion', 'coinx', 2],
        [10, 'energy', 500],
      ]
    },
    super_rare: {
      name: 'Super Rare Chest', icon: '💎', color: '#00BCD4', items: 4,
      loot: [
        [25, 'coins', 10000, 100000],
        [20, 'potion', 'multitap', 25],
        [20, 'potion', 'coinx', 2],
        [15, 'potion', 'coinx', 3],
        [10, 'potion', 'multitap', 50],
        [10, 'energy', 1000],
      ]
    },
    epic: {
      name: 'Epic Chest', icon: '🔮', color: '#9C27B0', items: 5,
      loot: [
        [20, 'coins', 50000, 500000],
        [20, 'potion', 'coinx', 3],
        [15, 'potion', 'multitap', 50],
        [15, 'potion', 'coinx', 5],
        [10, 'potion', 'energy_shield', 1],
        [10, 'potion', 'multitap', 100],
        [10, 'energy', 2000],
      ]
    },
    mythic: {
      name: 'Mythic Chest', icon: '🌀', color: '#E040FB', items: 6,
      loot: [
        [20, 'coins', 100000, 1000000],
        [20, 'potion', 'coinx', 5],
        [15, 'potion', 'multitap', 100],
        [15, 'potion', 'energy_shield', 1],
        [10, 'potion', 'lucky', 1],
        [10, 'potion', 'coinx', 3],
        [10, 'energy', 3000],
      ]
    },
    legendary: {
      name: 'Legendary Chest', icon: '👑', color: '#FFD700', items: 7,
      loot: [
        [20, 'coins', 500000, 5000000],
        [20, 'potion', 'coinx', 5],
        [15, 'potion', 'multitap', 100],
        [15, 'potion', 'lucky', 1],
        [10, 'potion', 'energy_shield', 2],
        [10, 'potion', 'coinx', 3],
        [10, 'energy', 5000],
      ]
    }
  };

  function rollItem(lootTable) {
    const totalWeight = lootTable.reduce((s, e) => s + e[0], 0);
    let roll = Math.random() * totalWeight;
    for (const entry of lootTable) {
      roll -= entry[0];
      if (roll <= 0) {
        const [_, type, ...params] = entry;
        if (type === 'coins') {
          const [min, max] = params;
          return { type: 'coins', value: Math.floor(min + Math.random() * (max - min)) };
        }
        if (type === 'potion') {
          const [potionType, potency] = params;
          return { type: 'potion', potionType, potency, name: getPotionName(potionType, potency) };
        }
        if (type === 'energy') {
          const [amount] = params;
          return { type: 'energy', value: amount };
        }
      }
    }
    return { type: 'coins', value: 1000 };
  }

  function openChest(chestType) {
    const chest = TYPES[chestType];
    if (!chest) return [];
    const items = [];
    for (let i = 0; i < chest.items; i++) {
      items.push(rollItem(chest.loot));
    }
    return items;
  }

  function getPotionName(potionType, potency) {
    const names = {
      coinx: `x${potency} Coin Boost`,
      multitap: `Multi-Tap x${potency}`,
      energy_shield: `Energy Shield`,
      lucky: `Lucky Charm`,
    };
    return names[potionType] || 'Unknown Potion';
  }

  function getPotionIcon(potionType) {
    const icons = { coinx: '🪙', multitap: '👆', energy_shield: '🛡️', lucky: '🍀' };
    return icons[potionType] || '🧪';
  }

  function getItemIcon(item) {
    if (item.type === 'coins') return '💰';
    if (item.type === 'energy') return '⚡';
    if (item.type === 'potion') return getPotionIcon(item.potionType);
    return '❓';
  }

  function getItemDisplay(item) {
    if (item.type === 'coins') return `+${formatChestNum(item.value)} coins`;
    if (item.type === 'energy') return `+${item.value} energy`;
    if (item.type === 'potion') return `${getPotionIcon(item.potionType)} ${item.name}`;
    return '???';
  }

  function formatChestNum(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
  }

  return { TYPES, openChest, getItemIcon, getItemDisplay, getPotionIcon, getPotionName, formatChestNum };
})();

// ===== Potions System =====
const Potions = (() => {
  // Active effects: { potionType: { potency, expiresAt } }
  let activeEffects = {};

  function activate(potionType, potency) {
    const duration = 60000; // 60 seconds for all potions
    activeEffects[potionType] = { potency, expiresAt: Date.now() + duration };
  }

  function isActive(potionType) {
    const eff = activeEffects[potionType];
    if (!eff) return false;
    if (Date.now() > eff.expiresAt) { delete activeEffects[potionType]; return false; }
    return true;
  }

  function getPotency(potionType) {
    if (!isActive(potionType)) return 0;
    return activeEffects[potionType].potency;
  }

  function getCoinMultiplier() {
    if (isActive('coinx')) return activeEffects.coinx.potency;
    return 1;
  }

  function getMultiTap() {
    if (isActive('multitap')) return activeEffects.multitap.potency;
    return 0;
  }

  function hasEnergyShield() {
    return isActive('energy_shield');
  }

  function hasLuckyCharm() {
    return isActive('lucky');
  }

  function getActiveList() {
    const list = [];
    for (const [type, eff] of Object.entries(activeEffects)) {
      if (Date.now() < eff.expiresAt) {
        const remaining = Math.ceil((eff.expiresAt - Date.now()) / 1000);
        list.push({ type, potency: eff.potency, remaining });
      } else {
        delete activeEffects[type];
      }
    }
    return list;
  }

  function load(data) { activeEffects = data || {}; }
  function save() {
    // Clean expired
    for (const k of Object.keys(activeEffects)) {
      if (Date.now() > activeEffects[k].expiresAt) delete activeEffects[k];
    }
    return activeEffects;
  }

  return { activate, isActive, getPotency, getCoinMultiplier, getMultiTap, hasEnergyShield, hasLuckyCharm, getActiveList, load, save };
})();
