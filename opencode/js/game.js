// ===== Game Engine =====

class HamsterGame {
  constructor() {
    this.coins = 0;
    this.totalCoins = 0;
    this.earnPerTap = 1;
    this.energy = 6500;
    this.maxEnergy = 6500;
    this.energyRegenRate = 3;
    this.profitPerHour = 0;
    this.cardLevels = {};
    this.completedTasks = {};
    this.multitapLevel = 1;
    this.energyLimitLevel = 1;
    this.turboBoosts = 3;
    this.fullEnergyBoosts = 3;
    this.isTurbo = false;
    this.lastSaveTime = Date.now();
    this.lastEnergyRegen = Date.now();
    this.lastProfitTick = Date.now();
    this.comboFound = [];
    this.autoTapLevel = 0; // 0 = off, 1-5 levels
    this.bpXP = 0;
    this.bpLevel = 1;
    this.bpClaimed = []; // levels already claimed
    this.inventory = []; // [{type, potionType, potency, name}]
    this.chests = { rare: 0, super_rare: 0, epic: 0, mythic: 0, legendary: 0 };
    this.questProgress = { taps: 0, cards: 0, tasks: 0, coins: 0, spin: 0, flip: 0 };
    this.questClaimed = []; // quest ids already claimed

    this.load();
    this.calculateStats();
  }

  save() {
    const data = {
      coins: this.coins,
      totalCoins: this.totalCoins,
      cardLevels: this.cardLevels,
      completedTasks: this.completedTasks,
      multitapLevel: this.multitapLevel,
      energyLimitLevel: this.energyLimitLevel,
      turboBoosts: this.turboBoosts,
      fullEnergyBoosts: this.fullEnergyBoosts,
      energy: this.energy,
      comboFound: this.comboFound,
      autoTapLevel: this.autoTapLevel,
      bpXP: this.bpXP,
      bpLevel: this.bpLevel,
      bpClaimed: this.bpClaimed,
      inventory: this.inventory,
      chests: this.chests,
      questProgress: this.questProgress,
      questClaimed: this.questClaimed,
      lastSaveTime: Date.now(),
    };
    localStorage.setItem('hamsterKombat', JSON.stringify(data));
  }

  load() {
    const raw = localStorage.getItem('hamsterKombat');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      this.coins = data.coins || 0;
      this.totalCoins = data.totalCoins || 0;
      this.cardLevels = data.cardLevels || {};
      this.completedTasks = data.completedTasks || {};
      this.multitapLevel = data.multitapLevel || 1;
      this.energyLimitLevel = data.energyLimitLevel || 1;
      this.turboBoosts = data.turboBoosts ?? 3;
      this.fullEnergyBoosts = data.fullEnergyBoosts ?? 3;
      this.energy = data.energy ?? this.maxEnergy;
      this.comboFound = data.comboFound || [];
      this.autoTapLevel = data.autoTapLevel || 0;
      this.bpXP = data.bpXP || 0;
      this.bpLevel = data.bpLevel || 1;
      this.bpClaimed = data.bpClaimed || [];
      this.inventory = data.inventory || [];
      this.chests = data.chests || { rare: 0, super_rare: 0, epic: 0, mythic: 0, legendary: 0 };
      this.questProgress = data.questProgress || { taps: 0, cards: 0, tasks: 0, coins: 0, spin: 0, flip: 0 };
      this.questClaimed = data.questClaimed || [];
      this.lastSaveTime = data.lastSaveTime || Date.now();

      // Calculate offline earnings
      const offlineMs = Date.now() - this.lastSaveTime;
      if (offlineMs > 0) {
        this.calculateStats();
        const offlineHours = offlineMs / 3600000;
        const offlineEarnings = Math.floor(this.profitPerHour * offlineHours * 0.8);
        if (offlineEarnings > 0) {
          this.coins += offlineEarnings;
          this.totalCoins += offlineEarnings;
        }
      }
    } catch (e) {
      console.warn('Failed to load save data');
    }
  }

  calculateStats() {
    this.earnPerTap = this.multitapLevel;
    this.maxEnergy = 6500 + (this.energyLimitLevel - 1) * 500;

    let totalProfit = 0;
    for (const category of Object.values(MINE_CARDS)) {
      for (const card of category) {
        const level = this.cardLevels[card.id] || 0;
        if (level > 0) {
          totalProfit += this.getCardProfit(card, level);
        }
      }
    }
    this.profitPerHour = totalProfit;
  }

  getCardCost(card, level) {
    if (level === 0) return card.baseCost;
    return Math.floor(card.baseCost * Math.pow(1.4, level));
  }

  getCardProfit(card, level) {
    if (level === 0) return card.baseProfit;
    return Math.floor(card.baseProfit * Math.pow(1.15, level - 1));
  }

  tap(count = 1) {
    if (this.energy <= 0) return 0;
    const tapsAllowed = Math.min(count, this.energy);
    const coinMult = Potions.getCoinMultiplier();
    const extraTaps = Potions.getMultiTap();
    const totalTaps = tapsAllowed + Math.min(extraTaps, this.energy - tapsAllowed + extraTaps);
    const actualTaps = Math.max(tapsAllowed, Math.min(totalTaps, this.energy));
    const earned = actualTaps * this.earnPerTap * coinMult * (this.isTurbo ? 5 : 1);
    this.coins += earned;
    this.totalCoins += earned;
    this.energy -= actualTaps;
    // Energy shield: 50% chance to not lose energy
    if (Potions.hasEnergyShield() && Math.random() < 0.5) {
      this.energy = Math.min(this.maxEnergy, this.energy + actualTaps);
    }
    this.addBPXP(actualTaps); // 1 XP per tap
    this.questProgress.taps += actualTaps;
    this.questProgress.coins += earned;
    return earned;
  }

  buyCard(cardId) {
    let card = null;
    for (const category of Object.values(MINE_CARDS)) {
      card = category.find(c => c.id === cardId);
      if (card) break;
    }
    if (!card) return false;

    const currentLevel = this.cardLevels[cardId] || 0;
    if (currentLevel >= card.maxLevel) return false;

    const cost = this.getCardCost(card, currentLevel);
    if (this.coins < cost) return false;

    this.coins -= cost;
    this.cardLevels[cardId] = currentLevel + 1;

    // Check daily combo
    if (DAILY_COMBO_IDS.includes(cardId) && !this.comboFound.includes(cardId)) {
      this.comboFound.push(cardId);
      if (this.comboFound.length === 3) {
        this.coins += 5000000;
        this.totalCoins += 5000000;
      }
    }

    this.calculateStats();
    this.addBPXP(20); // 20 XP per card upgrade
    this.questProgress.cards++;
    this.save();
    return true;
  }

  completeTask(taskId) {
    if (this.completedTasks[taskId]) return 0;
    let reward = 0;
    for (const list of Object.values(TASKS)) {
      const task = list.find(t => t.id === taskId);
      if (task) {
        reward = task.reward;
        break;
      }
    }
    if (reward > 0) {
      this.coins += reward;
      this.totalCoins += reward;
      this.completedTasks[taskId] = true;
      this.addBPXP(50); // 50 XP per task
      this.questProgress.tasks++;
      this.save();
    }
    return reward;
  }

  buyBoost(type) {
    if (type === 'multiTap') {
      const cost = 2000 * Math.pow(2, this.multitapLevel - 1);
      if (this.coins < cost) return false;
      this.coins -= cost;
      this.multitapLevel++;
      this.calculateStats();
      this.save();
      return true;
    }
    if (type === 'energyLimit') {
      const cost = 2000 * Math.pow(2, this.energyLimitLevel - 1);
      if (this.coins < cost) return false;
      this.coins -= cost;
      this.energyLimitLevel++;
      this.calculateStats();
      this.save();
      return true;
    }
    if (type === 'turbo') {
      if (this.turboBoosts <= 0) return false;
      this.turboBoosts--;
      this.isTurbo = true;
      setTimeout(() => { this.isTurbo = false; }, 20000);
      this.save();
      return true;
    }
    if (type === 'fullEnergy') {
      if (this.fullEnergyBoosts <= 0) return false;
      this.fullEnergyBoosts--;
      this.energy = this.maxEnergy;
      this.save();
      return true;
    }
    if (type === 'autoTap') {
      return this.buyAutoTap();
    }
    return false;
  }

  buyAutoTap() {
    if (this.autoTapLevel >= 5) return false;
    const cost = this.getAutoTapCost();
    if (this.coins < cost) return false;
    this.coins -= cost;
    this.autoTapLevel++;
    this.save();
    return true;
  }

  getAutoTapCost() {
    return [100000, 500000, 2000000, 10000000, 50000000][this.autoTapLevel] || 100000;
  }

  getAutoTapInterval() {
    // ms between auto-taps: lvl1=3000, lvl2=2000, lvl3=1500, lvl4=1000, lvl5=500
    return [0, 3000, 2000, 1500, 1000, 500][this.autoTapLevel] || 0;
  }

  startAutoTap(callback) {
    if (this._autoTapTimer) clearInterval(this._autoTapTimer);
    if (this.autoTapLevel <= 0) return;
    const ms = this.getAutoTapInterval();
    if (ms <= 0) return;
    this._autoTapTimer = setInterval(() => {
      if (this.energy > 0) {
        const earned = this.tap(1);
        if (earned > 0 && callback) callback(earned);
      }
    }, ms);
  }

  stopAutoTap() {
    if (this._autoTapTimer) {
      clearInterval(this._autoTapTimer);
      this._autoTapTimer = null;
    }
  }

  addBPXP(amount) {
    this.bpXP += amount;
    // Check level ups
    while (this.bpLevel < BattlePass.MAX_LEVEL) {
      const needed = BattlePass.getXpForLevel(this.bpLevel);
      if (this.bpXP >= needed) {
        this.bpXP -= needed;
        this.bpLevel++;
      } else break;
    }
    this.save();
  }

  claimQuest(questId) {
    if (this.questClaimed.includes(questId)) return null;
    const quest = BattlePass.QUESTS.find(q => q.id === questId);
    if (!quest) return null;
    const progress = this.questProgress[quest.tracker] || 0;
    if (progress < quest.target) return null;
    this.questClaimed.push(questId);
    this.addBPXP(quest.xpReward);
    return quest;
  }

  claimBPReward(level) {
    if (this.bpClaimed.includes(level)) return null;
    if (level > this.bpLevel) return null;
    const reward = BattlePass.REWARDS[level - 1];
    if (!reward) return null;
    this.bpClaimed.push(level);
    const val = reward.val;
    const coins = BattlePass.getRewardCoins(level - 1);
    if (coins > 0) { this.coins += coins; this.totalCoins += coins; }
    if (val === 'Energy') this.energy = Math.min(this.maxEnergy, this.energy + 2000);
    if (val === 'AutoTap' && this.autoTapLevel < 5) this.autoTapLevel++;
    if (val === 'Chest:Rare') this.chests.rare++;
    if (val === 'Chest:Super') this.chests.super_rare++;
    if (val === 'Chest:Epic') this.chests.epic++;
    if (val === 'Chest:Mythic') this.chests.mythic++;
    if (val === 'Chest:Legend') this.chests.legendary++;
    if (val === 'Potion') {
      const types = [
        { potionType: 'coinx', potency: 2, name: 'x2 Coin Boost' },
        { potionType: 'coinx', potency: 3, name: 'x3 Coin Boost' },
        { potionType: 'multitap', potency: 25, name: 'Multi-Tap x25' },
        { potionType: 'multitap', potency: 50, name: 'Multi-Tap x50' },
        { potionType: 'energy_shield', potency: 1, name: 'Energy Shield' },
        { potionType: 'lucky', potency: 1, name: 'Lucky Charm' },
      ];
      const p = types[Math.floor(Math.random() * types.length)];
      this.inventory.push({ type: 'potion', potionType: p.potionType, potency: p.potency, name: p.name });
    }
    this.save();
    return reward;
  }

  regenEnergy() {
    const now = Date.now();
    const elapsed = (now - this.lastEnergyRegen) / 1000;
    if (elapsed >= 1) {
      const regen = Math.floor(elapsed * this.energyRegenRate);
      this.energy = Math.min(this.maxEnergy, this.energy + regen);
      this.lastEnergyRegen = now;
    }
  }

  tickProfit() {
    const now = Date.now();
    const elapsed = (now - this.lastProfitTick) / 1000;
    if (elapsed >= 1 && this.profitPerHour > 0) {
      const earned = Math.floor((this.profitPerHour / 3600) * elapsed);
      if (earned > 0) {
        this.coins += earned;
        this.totalCoins += earned;
      }
      this.lastProfitTick = now;
    }
  }

  getLevel() {
    let levelIndex = 0;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (this.totalCoins >= LEVELS[i].coinsNeeded) {
        levelIndex = i;
        break;
      }
    }
    return { index: levelIndex, ...LEVELS[levelIndex] };
  }

  getLevelProgress() {
    const level = this.getLevel();
    const nextLevel = LEVELS[level.index + 1];
    if (!nextLevel) return 100;
    const progress = (this.totalCoins - level.coinsNeeded) / (nextLevel.coinsNeeded - level.coinsNeeded);
    return Math.min(100, Math.max(0, progress * 100));
  }
}
