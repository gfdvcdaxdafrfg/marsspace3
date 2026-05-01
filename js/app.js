// ===== Main App Controller =====

(function() {
  const game = new HamsterGame();
  const hamster = new HamsterSprite('hamster-canvas');

  // DOM refs
  const coinCountEl = document.getElementById('coin-count');
  const earnPerTapEl = document.getElementById('earn-per-tap');
  const profitPerHourEl = document.getElementById('profit-per-hour');
  const energyCurrentEl = document.getElementById('energy-current');
  const energyMaxEl = document.getElementById('energy-max');
  const levelNameEl = document.getElementById('level-name');
  const levelProgressTextEl = document.getElementById('level-progress-text');
  const levelProgressEl = document.getElementById('level-progress');
  const tapArea = document.getElementById('hamster-tap-area');
  const tapParticles = document.getElementById('tap-particles');
  const mineCardsEl = document.getElementById('mine-cards');
  const cardModal = document.getElementById('card-modal');
  const boostModal = document.getElementById('boost-modal');
  const app = document.getElementById('app');

  let currentCategory = 'markets';
  let selectedCard = null;
  let saveInterval;

  // ===== Number Formatting =====
  function formatNumber(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return n.toLocaleString('en-US');
    return String(n);
  }

  // ===== UI Updates =====
  function updateUI() {
    coinCountEl.textContent = formatNumber(game.coins);
    earnPerTapEl.textContent = game.earnPerTap;
    profitPerHourEl.textContent = formatNumber(game.profitPerHour);
    energyCurrentEl.textContent = formatNumber(game.energy);
    energyMaxEl.textContent = formatNumber(game.maxEnergy);

    const level = game.getLevel();
    levelNameEl.textContent = level.name;
    levelProgressTextEl.textContent = `${level.index + 1}/${LEVELS.length}`;
    levelProgressEl.style.width = game.getLevelProgress() + '%';

    document.getElementById('multitap-level').textContent = game.multitapLevel;
    document.getElementById('energy-limit-level').textContent = game.energyLimitLevel;

    if (game.isTurbo) {
      app.classList.add('turbo-active');
    } else {
      app.classList.remove('turbo-active');
    }
  }

  // ===== Tap Handling =====
  function handleTap(e) {
    e.preventDefault();
    const touches = e.changedTouches || [{ clientX: e.clientX, clientY: e.clientY }];

    for (let i = 0; i < touches.length; i++) {
      const earned = game.tap(1);
      if (earned <= 0) continue;

      hamster.tap();

      // Create floating coin
      const rect = tapArea.getBoundingClientRect();
      const x = (touches[i].clientX || touches[i].pageX) - rect.left;
      const y = (touches[i].clientY || touches[i].pageY) - rect.top;

      const particle = document.createElement('div');
      particle.className = 'tap-coin';
      particle.textContent = `+${earned}`;
      particle.style.left = x + 'px';
      particle.style.top = y + 'px';
      tapParticles.appendChild(particle);
      setTimeout(() => particle.remove(), 1000);
    }

    updateUI();
  }

  tapArea.addEventListener('touchstart', handleTap, { passive: false });
  tapArea.addEventListener('mousedown', handleTap);

  // ===== Navigation =====
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.getElementById(`page-${page}`).classList.add('active');
      btn.classList.add('active');

      if (page === 'mine') renderMineCards();
      if (page === 'earn') renderTasks();
    });
  });

  // ===== Mine Cards =====
  document.querySelectorAll('.mine-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mine-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategory = tab.dataset.category;
      renderMineCards();
    });
  });

  function renderMineCards() {
    const cards = MINE_CARDS[currentCategory] || [];
    mineCardsEl.innerHTML = cards.map(card => {
      const level = game.cardLevels[card.id] || 0;
      const cost = game.getCardCost(card, level);
      const profit = level > 0 ? game.getCardProfit(card, level) : card.baseProfit;
      const maxed = level >= card.maxLevel;
      return `
        <div class="mine-card" data-card-id="${card.id}" ${maxed ? 'style="opacity:0.5"' : ''}>
          <div class="mine-card-header">
            <div class="mine-card-icon">${card.icon}</div>
            <div class="mine-card-name">${card.name}</div>
          </div>
          <div class="mine-card-footer">
            <span class="mine-card-profit">${formatNumber(profit)}/h</span>
            <span class="mine-card-level">lvl ${level}</span>
          </div>
          <div class="mine-card-cost">
            ${maxed ? '<span style="color:#F0B90B">MAX</span>' : `<span class="coin-mini">&#x1FA99;</span> ${formatNumber(cost)}`}
          </div>
        </div>
      `;
    }).join('');

    mineCardsEl.querySelectorAll('.mine-card').forEach(el => {
      el.addEventListener('click', () => openCardModal(el.dataset.cardId));
    });

    renderComboSlots();
  }

  function renderComboSlots() {
    const slots = document.querySelectorAll('.combo-slot');
    DAILY_COMBO_IDS.forEach((id, i) => {
      if (i >= slots.length) return;
      const found = game.comboFound.includes(id);
      let card = null;
      for (const cat of Object.values(MINE_CARDS)) {
        card = cat.find(c => c.id === id);
        if (card) break;
      }
      const cardEl = slots[i].querySelector('.combo-card');
      const labelEl = slots[i].querySelector('span');
      if (found && card) {
        cardEl.className = 'combo-card filled';
        cardEl.innerHTML = card.icon;
        labelEl.textContent = card.name;
      } else {
        cardEl.className = 'combo-card empty';
        cardEl.textContent = '?';
        labelEl.textContent = `Slot ${i + 1}`;
      }
    });
  }

  // ===== Card Modal =====
  function openCardModal(cardId) {
    let card = null;
    for (const cat of Object.values(MINE_CARDS)) {
      card = cat.find(c => c.id === cardId);
      if (card) break;
    }
    if (!card) return;

    selectedCard = card;
    const level = game.cardLevels[card.id] || 0;
    const cost = game.getCardCost(card, level);
    const profit = level > 0 ? game.getCardProfit(card, level) : card.baseProfit;
    const nextProfit = game.getCardProfit(card, level + 1);
    const maxed = level >= card.maxLevel;

    document.getElementById('modal-icon').innerHTML = card.icon;
    document.getElementById('modal-title').textContent = card.name;
    document.getElementById('modal-desc').textContent = card.desc;
    document.getElementById('modal-profit').textContent = maxed ? formatNumber(profit) : `${formatNumber(profit)} → ${formatNumber(nextProfit)}`;
    document.getElementById('modal-cost').textContent = maxed ? 'MAX LEVEL' : formatNumber(cost);

    const buyBtn = document.getElementById('modal-buy-btn');
    buyBtn.disabled = maxed || game.coins < cost;
    buyBtn.textContent = maxed ? 'Maxed out' : 'Go ahead';

    cardModal.classList.add('active');
  }

  document.getElementById('modal-close').addEventListener('click', () => {
    cardModal.classList.remove('active');
    selectedCard = null;
  });
  cardModal.addEventListener('click', (e) => {
    if (e.target === cardModal) {
      cardModal.classList.remove('active');
      selectedCard = null;
    }
  });

  document.getElementById('modal-buy-btn').addEventListener('click', () => {
    if (!selectedCard) return;
    const success = game.buyCard(selectedCard.id);
    if (success) {
      showToast(`${selectedCard.name} upgraded!`);
      cardModal.classList.remove('active');
      renderMineCards();
      updateUI();
    }
  });

  // ===== Boost Modal =====
  document.getElementById('boost-btn').addEventListener('click', () => {
    boostModal.classList.add('active');
  });
  document.getElementById('boost-modal-close').addEventListener('click', () => {
    boostModal.classList.remove('active');
  });
  boostModal.addEventListener('click', (e) => {
    if (e.target === boostModal) boostModal.classList.remove('active');
  });

  document.querySelectorAll('.boost-item').forEach(item => {
    item.addEventListener('click', () => {
      const type = item.dataset.boost;
      const success = game.buyBoost(type);
      if (success) {
        if (type === 'turbo') showToast('Turbo mode activated! 20s');
        if (type === 'fullEnergy') showToast('Energy fully restored!');
        if (type === 'multiTap') showToast(`Multitap upgraded to lvl ${game.multitapLevel}!`);
        if (type === 'energyLimit') showToast(`Energy limit upgraded!`);
        boostModal.classList.remove('active');
        updateUI();
      } else {
        showToast('Not enough coins or boosts!');
      }
    });
  });

  // ===== Tasks =====
  function renderTasks() {
    renderTaskList('youtube-tasks', TASKS.youtube);
    renderTaskList('daily-tasks', TASKS.daily);
    renderTaskList('tasks-list', TASKS.tasks);
  }

  function renderTaskList(containerId, tasks) {
    const container = document.getElementById(containerId);
    container.innerHTML = tasks.map(task => {
      const completed = game.completedTasks[task.id];
      return `
        <div class="task-item ${completed ? 'completed' : ''}" data-task-id="${task.id}">
          <div class="task-item-icon">${task.icon}</div>
          <div class="task-item-info">
            <strong>${task.title}</strong>
            <span>${completed ? 'Completed' : `&#x1FA99; +${formatNumber(task.reward)}`}</span>
          </div>
          <div class="task-arrow">${completed ? '&#x2714;' : '&#x276F;'}</div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.task-item:not(.completed)').forEach(el => {
      el.addEventListener('click', () => {
        const taskId = el.dataset.taskId;
        const reward = game.completeTask(taskId);
        if (reward > 0) {
          showToast(`+${formatNumber(reward)} coins earned!`);
          renderTasks();
          updateUI();
        }
      });
    });
  }

  // ===== Toast =====
  function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  // ===== Game Loop =====
  function gameLoop() {
    game.regenEnergy();
    game.tickProfit();
    updateUI();
    requestAnimationFrame(gameLoop);
  }

  // ===== Init =====
  updateUI();
  renderMineCards();
  renderTasks();
  gameLoop();

  // Auto-save every 5 seconds
  saveInterval = setInterval(() => game.save(), 5000);

  // Save on close
  window.addEventListener('beforeunload', () => game.save());

  // Expose for debugging
  window.hamsterGame = game;
})();
