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
    const earned = tapsAllowed * this.earnPerTap * (this.isTurbo ? 5 : 1);
    this.coins += earned;
    this.totalCoins += earned;
    this.energy -= tapsAllowed;
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
    return false;
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
