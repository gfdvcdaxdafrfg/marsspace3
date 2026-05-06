// ===== Main App Controller =====

// Simple QR Code generator (no external deps)
function generateQR(canvas, text, size) {
  const ctx = canvas.getContext('2d');
  const modules = qrEncode(text);
  if (!modules) return;
  const count = modules.length;
  const cellSize = size / count;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (modules[r][c]) {
        ctx.fillRect(c * cellSize, r * cellSize, cellSize + 0.5, cellSize + 0.5);
      }
    }
  }
}

// Minimal QR encoder (supports short URLs)
function qrEncode(text) {
  // Use a simplified encoding for short strings
  const data = new TextEncoder().encode(text);
  const len = data.length;
  // Choose version: 1-4 for short URLs
  let version = 1;
  const caps = [17, 32, 53, 78]; // byte capacity per version
  while (version < 4 && caps[version - 1] < len) version++;
  if (version > 4) return null; // too long for this simple encoder
  const size = 17 + version * 4;
  const matrix = Array.from({ length: size }, () => Array(size).fill(-1));
  const reserved = Array.from({ length: size }, () => Array(size).fill(false));

  // Place finder patterns
  function placeFinder(row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r, cc = col + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const isBlack = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                        (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                        (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        matrix[rr][cc] = isBlack ? 1 : 0;
        reserved[rr][cc] = true;
      }
    }
  }
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!reserved[6][i]) { matrix[6][i] = i % 2 === 0 ? 1 : 0; reserved[6][i] = true; }
    if (!reserved[i][6]) { matrix[i][6] = i % 2 === 0 ? 1 : 0; reserved[i][6] = true; }
  }

  // Dark module
  matrix[size - 8][8] = 1;
  reserved[size - 8][8] = true;

  // Place data (simplified - just fill unreserved with data bits)
  const bits = [];
  // Mode: byte = 0100
  bits.push(0, 1, 0, 0);
  // Character count (8 bits for version 1-9)
  for (let i = 7; i >= 0; i--) bits.push((len >> i) & 1);
  // Data
  for (const byte of data) {
    for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
  }
  // Terminator
  for (let i = 0; i < 4 && bits.length < caps[version - 1] * 8; i++) bits.push(0);
  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);
  // Pad bytes
  const padBytes = [0xEC, 0x11];
  let pi = 0;
  while (bits.length < caps[version - 1] * 8) {
    for (let i = 7; i >= 0; i--) bits.push((padBytes[pi] >> i) & 1);
    pi = (pi + 1) % 2;
  }

  // Place bits in zigzag pattern
  let bitIdx = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const col = right - j;
        const upward = ((Math.floor((size - right) / 2)) % 2) === 0;
        const row = upward ? size - 1 - vert : vert;
        if (reserved[row][col]) continue;
        if (bitIdx < bits.length) {
          matrix[row][col] = bits[bitIdx] ? 1 : 0;
        } else {
          matrix[row][col] = 0;
        }
        bitIdx++;
      }
    }
  }

  // Apply mask (mask 0: (row+col)%2==0)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!reserved[r][c] && (r + c) % 2 === 0) {
        matrix[r][c] = matrix[r][c] ? 0 : 1;
      }
    }
  }

  // Fill any remaining -1 with 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] === -1) matrix[r][c] = 0;
    }
  }

  // Add quiet zone
  const qz = 2;
  const fullSize = size + qz * 2;
  const result = Array.from({ length: fullSize }, () => Array(fullSize).fill(0));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      result[r + qz][c + qz] = matrix[r][c];
    }
  }
  return result;
}

(function() {
  let game = null;
  let hamster = null;
  let saveInterval = null;
  let syncInterval = null;
  let authToken = localStorage.getItem('hamsterToken');
  let currentUser = localStorage.getItem('hamsterUser');
  let currentCategory = 'markets';
  let selectedCard = null;
  let ws = null;

  function connectWS() {
    if (!authToken) return;
    const p = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${p}//${location.host}/ws`);
    ws.onopen = () => { ws.send(JSON.stringify({ type: 'auth', token: authToken })); };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'sync' && msg.gameData && game) applyServerData(msg.gameData);
        if (msg.type === 'purchase' && msg.gameData && game) applyServerData(msg.gameData);
        if (msg.type === 'tap' && msg.gameData && game) applyServerData(msg.gameData);
        if (msg.type === 'daily_reward' && msg.gameData && game) { applyServerData(msg.gameData); SFX.daily(); showToast(`🎁 Daily reward: +${formatNum(msg.reward)} coins!`); }
        if (msg.type === 'referral_bonus') { SFX.referral(); showToast(`🤝 ${msg.from} joined via your link! +50K`); }
        if (msg.type === 'referral_earning') { SFX.coinRain(); showToast(`💰 Referral earning from ${msg.from}: +${formatNum(msg.amount)}`); }
        if (msg.type === 'achievements' && msg.new) { SFX.achievement(); msg.new.forEach(a => showToast(`🏆 Achievement: ${a.name}!`)); if (msg.gameData) applyServerData(msg.gameData); }
      } catch(_){}
    };
    ws.onclose = () => { setTimeout(connectWS, 3000); };
  }

  function formatNum(n) { if (n>=1e9) return (n/1e9).toFixed(2)+'B'; if (n>=1e6) return (n/1e6).toFixed(2)+'M'; if (n>=1e3) return n.toLocaleString('en-US'); return String(n); }

  function showOfflineBanner(earnings, offlineMs) {
    if (!earnings || earnings <= 0) return;
    const banner = document.createElement('div');
    banner.className = 'offline-banner';
    let timeStr = '';
    if (offlineMs && offlineMs > 0) {
      const totalMin = Math.floor(offlineMs / 60000);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      if (h > 0) timeStr = `Вы отсутствовали ${h}ч ${m}м`;
      else timeStr = `Вы отсутствовали ${m}м`;
    } else {
      timeStr = 'Ваш хомяк работал, пока вас не было';
    }
    banner.innerHTML = `
      <div class="offline-icon">💤</div>
      <h3>Offline Earnings</h3>
      <div class="offline-amount">+${formatNum(earnings)}</div>
      <div class="offline-time">${timeStr}</div>
      <button onclick="this.parentElement.remove()">Collect</button>
    `;
    document.body.appendChild(banner);
  }

  function applyServerData(gd) {
    if (!game) return;
    game.coins = gd.coins; game.totalCoins = gd.totalCoins; game.energy = gd.energy;
    game.maxEnergy = gd.maxEnergy; game.profitPerHour = gd.profitPerHour;
    game.earnPerTap = gd.earnPerTap; game.cardLevels = gd.cardLevels;
    game.completedTasks = gd.completedTasks; game.multitapLevel = gd.multitapLevel;
    game.energyLimitLevel = gd.energyLimitLevel; game.turboBoosts = gd.turboBoosts;
    game.fullEnergyBoosts = gd.fullEnergyBoosts; game.comboFound = gd.comboFound;
    game.calculateStats();
    if (document.getElementById('coin-count')) {
      document.getElementById('coin-count').textContent = formatNum(game.coins);
      document.getElementById('profit-per-hour').textContent = formatNum(game.profitPerHour);
      document.getElementById('energy-current').textContent = formatNum(game.energy);
      document.getElementById('energy-max').textContent = formatNum(game.maxEnergy);
      const lv = game.getLevel();
      document.getElementById('level-name').textContent = lv.name;
      document.getElementById('level-progress').style.width = game.getLevelProgress() + '%';
    }
  }

  // DOM refs (auth)
  const authScreen = document.getElementById('auth-screen');
  const appEl = document.getElementById('app');
  const loginForm = document.getElementById('auth-login');
  const registerForm = document.getElementById('auth-register');

  // ===== API Helper =====
  async function api(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`/api${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // ===== Auth Logic =====
  function showAuth() {
    authScreen.style.display = 'flex';
    appEl.style.display = 'none';
  }

  function showApp() {
    authScreen.style.display = 'none';
    appEl.style.display = 'flex';
  }

  document.getElementById('show-register').addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  });

  document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
  });

  document.getElementById('login-btn').addEventListener('click', async () => {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';

    if (!username || !password) {
      errorEl.textContent = 'Enter username and password';
      return;
    }

    try {
      document.getElementById('login-btn').disabled = true;
      const data = await api('POST', '/login', { username, password });
      authToken = data.token;
      currentUser = data.username;
      localStorage.setItem('hamsterToken', authToken);
      localStorage.setItem('hamsterUser', currentUser);
      connectWS();
      initGame(data.gameData);
      if (data.offlineEarnings > 0) {
        setTimeout(() => showOfflineBanner(data.offlineEarnings, data.offlineMs), 500);
      }
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      document.getElementById('login-btn').disabled = false;
    }
  });

  document.getElementById('register-btn').addEventListener('click', async () => {
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const refCode = (document.getElementById('reg-refcode') || {}).value || '';
    const errorEl = document.getElementById('reg-error');
    errorEl.textContent = '';

    if (!username || !password) {
      errorEl.textContent = 'Enter username and password';
      return;
    }

    try {
      document.getElementById('register-btn').disabled = true;
      const data = await api('POST', '/register', { username, password, refCode });
      authToken = data.token;
      currentUser = data.username;
      localStorage.setItem('hamsterToken', authToken);
      localStorage.setItem('hamsterUser', currentUser);
      if (data.refCode) showToast(`🔗 Your referral code: ${data.refCode}`);
      connectWS();
      initGame(data.gameData);
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      document.getElementById('register-btn').disabled = false;
    }
  });

  // Enter key support for login/register
  document.getElementById('login-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('login-btn').click();
  });
  document.getElementById('reg-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('register-btn').click();
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    if (game) game.save();
    syncToServer();
    authToken = null;
    currentUser = null;
    localStorage.removeItem('hamsterToken');
    localStorage.removeItem('hamsterUser');
    if (saveInterval) clearInterval(saveInterval);
    if (syncInterval) clearInterval(syncInterval);
    showAuth();
  });

  // ===== Init Game =====
  function initGame(serverGameData) {
    // Load game from server data
    game = new HamsterGame();

    if (serverGameData) {
      game.coins = serverGameData.coins || 0;
      game.totalCoins = serverGameData.totalCoins || 0;
      game.energy = serverGameData.energy ?? 6500;
      game.maxEnergy = serverGameData.maxEnergy ?? 6500;
      game.cardLevels = serverGameData.cardLevels || {};
      game.completedTasks = serverGameData.completedTasks || {};
      game.multitapLevel = serverGameData.multitapLevel || 1;
      game.energyLimitLevel = serverGameData.energyLimitLevel || 1;
      game.turboBoosts = serverGameData.turboBoosts ?? 3;
      game.fullEnergyBoosts = serverGameData.fullEnergyBoosts ?? 3;
      game.comboFound = serverGameData.comboFound || [];
      game.autoTapLevel = serverGameData.autoTapLevel || 0;
      game.bpXP = serverGameData.bpXP ?? 0;
      game.bpLevel = serverGameData.bpLevel ?? 1;
      game.bpClaimed = serverGameData.bpClaimed ?? [];
      game.inventory = serverGameData.inventory ?? [];
      game.chests = serverGameData.chests ?? { rare: 0, super_rare: 0, epic: 0, mythic: 0, legendary: 0 };
      game.questProgress = serverGameData.questProgress ?? { taps: 0, cards: 0, tasks: 0, coins: 0, spin: 0, flip: 0 };
      game.questClaimed = serverGameData.questClaimed ?? [];
      game.calculateStats();
    }

    if (!hamster) {
      hamster = new HamsterSprite('hamster-canvas');
    }

    // Start auto-tap bot if purchased
    if (game.autoTapLevel > 0) {
      game.startAutoTap(() => updateUI());
    }

    document.getElementById('display-username').textContent = currentUser;

    // Sound toggle
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
      soundToggle.textContent = SFX.isMuted() ? '🔇' : '🔊';
      soundToggle.addEventListener('click', () => {
        const muted = SFX.toggleMute();
        soundToggle.textContent = muted ? '🔇' : '🔊';
      });
    }

    showApp();

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

    function formatNumber(n) {
      if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
      if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
      if (n >= 1e3) return n.toLocaleString('en-US');
      return String(n);
    }

    // Animated coin counter
    let displayedCoins = game.coins;
    let coinAnimFrame = null;
    function animateCoinCount(targetCoins) {
      if (coinAnimFrame) cancelAnimationFrame(coinAnimFrame);
      const startCoins = displayedCoins;
      const diff = targetCoins - startCoins;
      if (diff === 0) { coinCountEl.textContent = formatNumber(targetCoins); return; }
      const duration = Math.min(600, Math.max(150, Math.abs(diff) / 50));
      const startTime = performance.now();
      function step(now) {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        const ease = 1 - Math.pow(1 - t, 3);
        displayedCoins = startCoins + diff * ease;
        coinCountEl.textContent = formatNumber(Math.round(displayedCoins));
        if (t < 1) {
          coinAnimFrame = requestAnimationFrame(step);
        } else {
          displayedCoins = targetCoins;
          coinCountEl.textContent = formatNumber(targetCoins);
        }
      }
      coinAnimFrame = requestAnimationFrame(step);
    }

    function updateUI() {
      animateCoinCount(game.coins);
      earnPerTapEl.textContent = game.earnPerTap;
      profitPerHourEl.textContent = formatNumber(game.profitPerHour);
      const profitIndicator = document.getElementById('profit-indicator-value');
      if (profitIndicator) profitIndicator.textContent = formatNumber(game.profitPerHour);
      energyCurrentEl.textContent = formatNumber(game.energy);
      energyMaxEl.textContent = formatNumber(game.maxEnergy);

      const level = game.getLevel();
      if (window._prevLevelIndex !== undefined && window._prevLevelIndex !== level.index && level.index > window._prevLevelIndex) {
        launchConfetti(true);
        showToast(`🎉 Level up: ${LEVELS[level.index]?.name || level.name}!`);
      }
      window._prevLevelIndex = level.index;
      levelNameEl.textContent = level.name;
      levelProgressTextEl.textContent = `${level.index + 1}/${LEVELS.length}`;
      levelProgressEl.style.width = game.getLevelProgress() + '%';

      document.getElementById('multitap-level').textContent = game.multitapLevel;
      document.getElementById('energy-limit-level').textContent = game.energyLimitLevel;
      const autotapLevel = document.getElementById('autotap-level');
      const autotapCost = document.getElementById('autotap-cost');
      if (autotapLevel) autotapLevel.textContent = game.autoTapLevel;
      if (autotapCost) {
        if (game.autoTapLevel >= 5) autotapCost.textContent = 'MAX';
        else autotapCost.textContent = formatNumber(game.getAutoTapCost());
      }

      // Energy fill bar
      const energyFill = document.getElementById('energy-fill');
      if (energyFill) {
        const pct = Math.max(0, Math.min(100, (game.energy / game.maxEnergy) * 100));
        energyFill.style.width = pct + '%';
      }

      // Energy timer
      const energyTimerEl = document.getElementById('energy-timer');
      if (energyTimerEl) {
        if (game.energy >= game.maxEnergy) {
          energyTimerEl.textContent = '⚡ Максимум!';
          energyTimerEl.classList.add('full');
          energyTimerEl.classList.remove('regen');
        } else {
          const energyNeeded = game.maxEnergy - game.energy;
          const secondsToFull = Math.ceil(energyNeeded / game.energyRegenRate);
          const m = Math.floor(secondsToFull / 60);
          const s = secondsToFull % 60;
          energyTimerEl.textContent = `Полная через ${m}м ${String(s).padStart(2, '0')}с`;
          energyTimerEl.classList.remove('full');
          energyTimerEl.classList.add('regen');
        }
      }

      if (game.isTurbo) {
        appEl.classList.add('turbo-active');
      } else {
        appEl.classList.remove('turbo-active');
      }
    }

    // Tap
    function handleTap(e) {
      e.preventDefault();
      const touches = e.changedTouches || [{ clientX: e.clientX, clientY: e.clientY }];
      for (let i = 0; i < touches.length; i++) {
        const earned = game.tap(1);
        if (earned <= 0) continue;
        hamster.tap();
        SFX.tap();
        SFX.vibrate();
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

    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`page-${page}`).classList.add('active');
        btn.classList.add('active');
        if (page === 'mine') renderMineCards();
        if (page === 'earn') renderTasks();
        if (page === 'friends') loadReferralData();
        if (page === 'airdrop') renderPassPage();
      });
    });

    // Mine tabs
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
        SFX.purchase();
        showToast(`${selectedCard.name} upgraded!`);
        cardModal.classList.remove('active');
        renderMineCards();
        updateUI();
      }
    });

    // Boosts
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
          SFX.boost();
          if (type === 'turbo') showToast('Turbo mode activated! 20s');
          if (type === 'fullEnergy') showToast('Energy fully restored!');
          if (type === 'multiTap') showToast(`Multitap upgraded to lvl ${game.multitapLevel}!`);
          if (type === 'energyLimit') showToast(`Energy limit upgraded!`);
          if (type === 'autoTap') {
            showToast(`Auto-Tap Bot lvl ${game.autoTapLevel}! Taps every ${game.getAutoTapInterval()/1000}s`);
            game.startAutoTap((earned) => {
              updateUI();
            });
          }
          boostModal.classList.remove('active');
          updateUI();
        } else {
          SFX.error();
          showToast('Not enough coins or boosts!');
        }
      });
    });

    // Tasks
    function renderTasks() {
      renderTaskList('youtube-tasks', TASKS.youtube);
      renderTaskList('daily-tasks', TASKS.daily);
      renderTaskList('tasks-list', TASKS.tasks);
    }

    // Battle Pass
    function renderBattlePass() {
      if (!game) return;
      const bpLevel = document.getElementById('bp-level');
      const bpXP = document.getElementById('bp-xp');
      const bpXPNeed = document.getElementById('bp-xp-need');
      const bpFill = document.getElementById('bp-progress-fill');
      const bpRewards = document.getElementById('bp-rewards');

      if (!bpLevel) return;
      bpLevel.textContent = game.bpLevel;
      const needed = BattlePass.getXpForLevel(game.bpLevel);
      bpXP.textContent = game.bpXP;
      bpXPNeed.textContent = needed;
      const pct = Math.min(100, (game.bpXP / needed) * 100);
      bpFill.style.width = pct + '%';

      // Render reward items (show current + nearby)
      const showStart = Math.max(0, game.bpLevel - 3);
      const showEnd = Math.min(BattlePass.MAX_LEVEL, game.bpLevel + 6);
      let html = '';
      for (let i = showStart; i < showEnd; i++) {
        const r = BattlePass.REWARDS[i];
        const lvl = i + 1;
        const claimed = game.bpClaimed.includes(lvl);
        const unlocked = lvl <= game.bpLevel;
        const current = lvl === game.bpLevel;
        const cls = claimed ? 'claimed' : (current ? 'current' : (!unlocked ? 'locked' : ''));
        html += `<div class="bp-reward-item ${cls}" data-bp-level="${lvl}">
          <div class="bp-reward-icon">${r.icon}</div>
          <div class="bp-reward-val">${r.val}</div>
          <div class="bp-reward-lvl">Lvl ${lvl}</div>
        </div>`;
      }
      bpRewards.innerHTML = html;

      // Click to claim
      bpRewards.querySelectorAll('.bp-reward-item:not(.claimed):not(.locked)').forEach(el => {
        el.addEventListener('click', () => {
          const lvl = parseInt(el.dataset.bpLevel);
          const reward = game.claimBPReward(lvl);
          if (reward) {
            SFX.achievement();
            showToast(`🎁 Claimed: ${reward.icon} ${reward.val}!`);
            renderBattlePass();
            updateUI();
          }
        });
      });

      // Scroll current into view
      const currentEl = bpRewards.querySelector('.current');
      if (currentEl) currentEl.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    }

    // ===== Pass Page =====
    function renderPassPage() {
      if (!game) return;
      // BP header
      const bpPageLevel = document.getElementById('bp-page-level');
      const bpPageXP = document.getElementById('bp-page-xp');
      const bpPageXPNeed = document.getElementById('bp-page-xp-need');
      const bpPageFill = document.getElementById('bp-page-fill');
      if (bpPageLevel) bpPageLevel.textContent = game.bpLevel;
      if (bpPageXP) bpPageXP.textContent = game.bpXP;
      const needed = BattlePass.getXpForLevel(game.bpLevel);
      if (bpPageXPNeed) bpPageXPNeed.textContent = needed;
      if (bpPageFill) bpPageFill.style.width = Math.min(100, (game.bpXP / needed) * 100) + '%';

      // BP rewards grid
      const bpPageRewards = document.getElementById('bp-page-rewards');
      if (bpPageRewards) {
        let html = '';
        for (let i = 0; i < BattlePass.MAX_LEVEL; i++) {
          const r = BattlePass.REWARDS[i];
          const lvl = i + 1;
          const claimed = game.bpClaimed.includes(lvl);
          const unlocked = lvl <= game.bpLevel;
          const current = lvl === game.bpLevel;
          const cls = claimed ? 'claimed' : (current ? 'current' : (!unlocked ? 'locked' : ''));
          html += `<div class="bp-page-reward-item ${cls}" data-bp-level="${lvl}">
            <div class="bp-page-reward-icon">${r.icon}</div>
            <div class="bp-page-reward-val">${r.val}</div>
            <div class="bp-page-reward-lvl">${lvl}</div>
          </div>`;
        }
        bpPageRewards.innerHTML = html;
        bpPageRewards.querySelectorAll('.bp-page-reward-item:not(.claimed):not(.locked)').forEach(el => {
          el.addEventListener('click', () => {
            const lvl = parseInt(el.dataset.bpLevel);
            const reward = game.claimBPReward(lvl);
            if (reward) {
              SFX.achievement();
              showToast(`🎁 Claimed: ${reward.icon} ${reward.val}!`);
              renderPassPage();
              updateUI();
            }
          });
        });
      }

      // Quests
      const questList = document.getElementById('bp-quest-list');
      if (questList) {
        let html = '';
        for (const q of BattlePass.QUESTS) {
          const progress = game.questProgress[q.tracker] || 0;
          const pct = Math.min(100, (progress / q.target) * 100);
          const done = progress >= q.target;
          const claimed = game.questClaimed.includes(q.id);
          const cls = claimed ? 'completed' : '';
          html += `<div class="bp-quest-item ${cls}">
            <div class="bp-quest-icon">${q.icon}</div>
            <div class="bp-quest-info">
              <strong>${q.name}</strong>
              <span>${q.desc} (${Math.min(progress, q.target)}/${q.target})</span>
              <div class="bp-quest-progress-track"><div class="bp-quest-progress-fill" style="width:${pct}%"></div></div>
            </div>
            <div class="bp-quest-reward">+${q.xpReward} XP</div>
            ${claimed ? '<span style="color:#4CAF50;font-size:12px">✓</span>' :
              (done ? `<button class="bp-quest-claim" data-quest="${q.id}">Claim</button>` : '')}
          </div>`;
        }
        questList.innerHTML = html;
        questList.querySelectorAll('.bp-quest-claim').forEach(btn => {
          btn.addEventListener('click', () => {
            const quest = game.claimQuest(btn.dataset.quest);
            if (quest) {
              SFX.achievement();
              showToast(`✨ Quest complete: +${quest.xpReward} XP!`);
              renderPassPage();
              updateUI();
            }
          });
        });
      }

      // Inventory — Chests
      const invChests = document.getElementById('inv-chests');
      if (invChests) {
        const chestTypes = [
          { key: 'rare', name: 'Rare', icon: '📦' },
          { key: 'super_rare', name: 'Super Rare', icon: '💎' },
          { key: 'epic', name: 'Epic', icon: '🔮' },
          { key: 'mythic', name: 'Mythic', icon: '🌀' },
          { key: 'legendary', name: 'Legendary', icon: '👑' },
        ];
        let html = '';
        for (const ct of chestTypes) {
          const count = game.chests[ct.key] || 0;
          const cls = count <= 0 ? 'empty' : '';
          html += `<div class="inv-chest-item ${cls}" data-chest="${ct.key}">
            <div class="inv-chest-icon">${ct.icon}</div>
            <div><div class="inv-chest-count">x${count}</div><div class="inv-chest-name">${ct.name}</div></div>
          </div>`;
        }
        invChests.innerHTML = html;
        invChests.querySelectorAll('.inv-chest-item:not(.empty)').forEach(el => {
          el.addEventListener('click', () => openChestModal(el.dataset.chest));
        });
      }

      // Inventory — Potions
      const invPotions = document.getElementById('inv-potions');
      if (invPotions) {
        if (game.inventory.length === 0) {
          invPotions.innerHTML = `<div class="empty-state-illustrated small">
            <div class="empty-text">Нет зелий</div>
            <div class="empty-sub">Открывайте сундуки, чтобы получить зелья!</div>
          </div>`;
        } else {
          let html = '';
          game.inventory.forEach((item, idx) => {
            if (item.type !== 'potion') return;
            const icon = Chests.getPotionIcon(item.potionType);
            html += `<div class="inv-potion-item">
              <div class="inv-potion-icon">${icon}</div>
              <div class="inv-potion-name">${item.name}</div>
              <button class="inv-potion-use" data-potion-idx="${idx}">Use</button>
            </div>`;
          });
          invPotions.innerHTML = html;
          invPotions.querySelectorAll('.inv-potion-use').forEach(btn => {
            btn.addEventListener('click', () => {
              const idx = parseInt(btn.dataset.potionIdx);
              const item = game.inventory[idx];
              if (!item) return;
              Potions.activate(item.potionType, item.potency);
              game.inventory.splice(idx, 1);
              game.save();
              SFX.boost();
              showToast(`🧪 ${item.name} activated!`);
              renderPassPage();
              updateUI();
            });
          });
        }
      }

      // Active effects
      const activeEl = document.getElementById('active-effects');
      if (activeEl) {
        const effects = Potions.getActiveList();
        if (effects.length === 0) {
          activeEl.innerHTML = '';
        } else {
          const icons = { coinx: '🪙', multitap: '👆', energy_shield: '🛡️', lucky: '🍀' };
          activeEl.innerHTML = effects.map(e =>
            `<div class="active-effect-pill"><span class="active-effect-icon">${icons[e.type] || '🧪'}</span> ${e.potency}x <span class="active-effect-timer">${e.remaining}s</span></div>`
          ).join('');
        }
      }
    }

    // ===== Chest Opening =====

    // Confetti effect
    function launchConfetti(isLegendary = false) {
      const canvas = document.getElementById('confetti-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const colors = isLegendary
        ? ['#FFD700', '#FFC107', '#FF9800', '#F0B90B', '#FFE082']
        : ['#F0B90B', '#4CAF50', '#2196F3', '#9C27B0', '#FF5722', '#E040FB'];
      const particles = [];
      for (let i = 0; i < (isLegendary ? 60 : 35); i++) {
        particles.push({
          x: w / 2 + (Math.random() - 0.5) * 40,
          y: h / 2,
          vx: (Math.random() - 0.5) * 12,
          vy: -4 - Math.random() * 8,
          size: 3 + Math.random() * 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.3,
          life: 60 + Math.random() * 40,
          maxLife: 60 + Math.random() * 40,
        });
      }
      let frame = 0;
      function animate() {
        ctx.clearRect(0, 0, w, h);
        let alive = false;
        for (const p of particles) {
          if (p.life <= 0) continue;
          alive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.2;
          p.vx *= 0.99;
          p.rotation += p.rotSpeed;
          p.life--;
          const alpha = p.life / p.maxLife;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
        frame++;
        if (alive && frame < 120) requestAnimationFrame(animate);
        else ctx.clearRect(0, 0, w, h);
      }
      animate();
    }

    function openChestModal(chestType) {
      const chest = Chests.TYPES[chestType];
      if (!chest || (game.chests[chestType] || 0) <= 0) return;
      game.chests[chestType]--;
      game.save();

      const modal = document.getElementById('chest-modal');
      const stageClosed = document.getElementById('chest-stage-closed');
      const stageOpening = document.getElementById('chest-stage-opening');
      const stageResult = document.getElementById('chest-stage-result');
      const chestIcon = document.getElementById('chest-icon');
      const chestIconOpening = document.getElementById('chest-icon-opening');
      const chestName = document.getElementById('chest-name');
      const chestBox = document.getElementById('chest-box');
      const chestBoxOpening = document.getElementById('chest-box-opening');

      // Set chest appearance
      chestIcon.textContent = chest.icon;
      chestIconOpening.textContent = chest.icon;
      chestName.textContent = chest.name;
      chestBox.style.borderColor = chest.color + '66';
      chestBox.style.background = `linear-gradient(135deg, ${chest.color}22, rgba(255,255,255,0.05))`;
      chestBoxOpening.style.borderColor = chest.color + '66';
      chestBoxOpening.style.background = `linear-gradient(135deg, ${chest.color}22, rgba(255,255,255,0.05))`;

      // Show closed stage
      stageClosed.classList.remove('hidden');
      stageOpening.classList.add('hidden');
      stageResult.classList.add('hidden');
      modal.classList.add('active');

      document.getElementById('chest-open-btn').onclick = () => {
        stageClosed.classList.add('hidden');
        stageOpening.classList.remove('hidden');
        SFX.boost();

        // Roll items
        const items = Chests.openChest(chestType);
        const progressEl = document.getElementById('chest-progress');
        let revealed = 0;

        // Reveal items one by one
        function revealNext() {
          if (revealed >= items.length) {
            // Show results
            setTimeout(() => {
              stageOpening.classList.add('hidden');
              stageResult.classList.remove('hidden');
              const listEl = document.getElementById('chest-items-list');
              listEl.innerHTML = items.map((item, i) =>
                `<div class="chest-item-row" style="animation-delay:${i * 0.1}s">
                  <div class="chest-item-icon">${Chests.getItemIcon(item)}</div>
                  <div class="chest-item-text">${Chests.getItemDisplay(item)}</div>
                </div>`
              ).join('');
              SFX.achievement();
              SFX.vibrateWin();
              launchConfetti(chestType === 'legendary');

              // Apply items to game
              for (const item of items) {
                if (item.type === 'coins') { game.coins += item.value; game.totalCoins += item.value; }
                if (item.type === 'energy') { game.energy = Math.min(game.maxEnergy, game.energy + item.value); }
                if (item.type === 'potion') { game.inventory.push({ type: 'potion', potionType: item.potionType, potency: item.potency, name: item.name }); }
              }
              game.save();
              updateUI();
            }, 500);
            return;
          }
          revealed++;
          progressEl.textContent = `Opening ${revealed}/${items.length}`;
          SFX.tap();
          setTimeout(revealNext, 400);
        }
        setTimeout(revealNext, 1500);
      };

      // Click anywhere on result to close
      document.getElementById('chest-stage-result').onclick = () => {
        modal.classList.remove('active');
        renderPassPage();
      };
    }

    async function loadReferralData() {
      try {
        const data = await api('GET', '/referral');
        const codeEl = document.getElementById('my-ref-code');
        const earningsEl = document.getElementById('referral-earnings');
        const countEl = document.getElementById('friends-count');
        const listEl = document.getElementById('friends-list-content');
        if (codeEl) codeEl.textContent = data.refCode || '—';
        const linkEl = document.getElementById('my-ref-link');
        let refLink = '';
        if (linkEl && data.refCode) {
          const base = window.location.origin + window.location.pathname;
          refLink = `${base}?ref=${data.refCode}`;
          linkEl.textContent = refLink;
        }

        // Generate QR code
        const qrContainer = document.getElementById('qr-container');
        if (qrContainer && refLink) {
          qrContainer.innerHTML = '';
          const qrCanvas = document.createElement('canvas');
          qrCanvas.width = 120;
          qrCanvas.height = 120;
          qrCanvas.style.borderRadius = '8px';
          qrCanvas.style.background = '#fff';
          generateQR(qrCanvas, refLink, 120);
          qrContainer.appendChild(qrCanvas);
        }

        // Copy button
        const copyBtn = document.getElementById('copy-link-btn');
        if (copyBtn) {
          copyBtn.onclick = async () => {
            if (refLink && navigator.clipboard) {
              await navigator.clipboard.writeText(refLink);
              showToast('📋 Ссылка скопирована!');
            }
          };
        }

        // Share button (Web Share API)
        const shareBtn = document.getElementById('share-link-btn');
        if (shareBtn) {
          shareBtn.onclick = async () => {
            if (navigator.share && refLink) {
              try {
                await navigator.share({ title: 'Hamster Kombat', text: 'Играй в Hamster Kombat!', url: refLink });
              } catch (_) {}
            } else if (refLink && navigator.clipboard) {
              await navigator.clipboard.writeText(refLink);
              showToast('📋 Ссылка скопирована!');
            }
          };
        }

        if (earningsEl) earningsEl.textContent = formatNum(data.referralEarnings || 0);
        if (countEl) countEl.textContent = data.referrals.length;
        if (listEl) {
          if (data.referrals.length === 0) {
            listEl.innerHTML = `<div class="empty-state-illustrated">
              <div class="empty-hamster">🐹</div>
              <div class="empty-text">У вас нет друзей</div>
              <div class="empty-sub">Пригласите друзей и получите бонусы!</div>
              <button class="empty-action-btn" onclick="document.getElementById('invite-btn').click()">Пригласить</button>
            </div>`;
          } else {
            listEl.innerHTML = data.referrals.map(r => `
              <div class="friend-item" style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                <span>${r.username}</span>
                <span style="color:#F0B90B;font-size:12px;">${r.level} · ${formatNum(r.totalCoins)}</span>
              </div>
            `).join('');
          }
        }
      } catch (_) {}
    }

    document.getElementById('invite-btn').addEventListener('click', async () => {
      try {
        const data = await api('GET', '/referral');
        if (data.refCode && navigator.clipboard) {
          const base = window.location.origin + window.location.pathname;
          const link = `${base}?ref=${data.refCode}`;
          await navigator.clipboard.writeText(link);
          showToast('� Referral link copied!');
        } else if (data.refCode) {
          const base = window.location.origin + window.location.pathname;
          showToast(`🔗 Link: ${base}?ref=${data.refCode}`);
        }
      } catch (_) { showToast('Failed to load referral code'); }
    });

    // ===== Daily Bonus Modal =====
    const dailyModal = document.getElementById('daily-modal');
    const dailyCalendar = document.getElementById('daily-calendar');
    const dailyStreakNum = document.getElementById('daily-streak-num');
    const dailyRewardPreview = document.getElementById('daily-reward-preview');
    const dailyClaimBtn = document.getElementById('daily-claim-btn');

    const DAILY_ICONS = ['💰', '💰', '💰', '💰', '💰', '💰', '👑'];

    function openDailyModal() {
      // Fetch current streak from server
      api('GET', '/gamedata').then(data => {
        const gd = data.gameData || {};
        const streak = gd.dailyStreak || 0;
        const lastClaim = gd.lastDailyClaim;
        const today = new Date().toISOString().split('T')[0];
        const alreadyClaimed = lastClaim === today;

        if (dailyStreakNum) dailyStreakNum.textContent = streak;

        // Render 7-day calendar
        let html = '';
        for (let i = 1; i <= 7; i++) {
          const isPast = i <= streak;
          const isToday = i === streak + 1 && !alreadyClaimed;
          const isSpecial = i === 7;
          const cls = isPast ? 'past' : (isToday ? 'today' : '') + (isSpecial ? ' special' : '');
          const icon = isPast ? '✅' : (isSpecial ? '👑' : DAILY_ICONS[i - 1]);
          const reward = Math.min(i * 10000, 100000);
          html += `<div class="daily-day ${cls}">
            <div class="daily-day-num">День ${i}</div>
            <div class="daily-day-icon">${icon}</div>
            <div style="font-size:9px;color:${isSpecial ? '#FFD700' : 'var(--text-dim)'}">${isSpecial ? 'Сундук' : formatNumber(reward)}</div>
          </div>`;
        }
        if (dailyCalendar) dailyCalendar.innerHTML = html;

        // Preview reward
        const nextDay = streak + 1;
        const nextReward = Math.min(nextDay * 10000, 100000);
        if (dailyRewardPreview) {
          if (alreadyClaimed) {
            dailyRewardPreview.textContent = 'Уже забрали сегодня! Заходите завтра 🐹';
            dailyClaimBtn.disabled = true;
            dailyClaimBtn.textContent = 'Забрали ✅';
          } else if (nextDay <= 7) {
            dailyRewardPreview.textContent = `Награда: +${formatNumber(nextReward)} монет${nextDay === 7 ? ' + Бонусный сундук!' : ''}`;
            dailyClaimBtn.disabled = false;
            dailyClaimBtn.textContent = 'Забрать!';
          }
        }

        dailyModal.classList.add('active');
      }).catch(() => {
        showToast('Ошибка загрузки бонуса');
      });
    }

    document.getElementById('daily-close').addEventListener('click', () => dailyModal.classList.remove('active'));
    dailyModal.addEventListener('click', (e) => { if (e.target === dailyModal) dailyModal.classList.remove('active'); });

    dailyClaimBtn.addEventListener('click', async () => {
      try {
        const data = await api('POST', '/daily');
        SFX.daily();
        SFX.vibrateWin();
        showToast(`🎁 +${formatNumber(data.reward)} монет! Серия: ${data.streak} дней`);
        if (data.gameData) applyServerData(data.gameData);
        updateUI();
        dailyModal.classList.remove('active');
        renderTasks();
      } catch (err) {
        showToast(err.message || 'Ошибка');
      }
    });

    function renderTaskList(containerId, tasks) {
      const container = document.getElementById(containerId);
      container.innerHTML = tasks.map(task => {
        const completed = game.completedTasks[task.id];
        const isDailyReward = task.id === 'd1';
        return `
          <div class="task-item ${completed ? 'completed' : ''}" data-task-id="${task.id}" ${isDailyReward ? 'data-daily-reward="true"' : ''}>
            <div class="task-item-icon">${task.icon}</div>
            <div class="task-item-info">
              <strong>${task.title}</strong>
              <span>${completed ? '✅ Completed' : `🪙 +${formatNumber(task.reward)}`}</span>
              <div class="task-progress-track"><div class="task-progress-fill ${completed ? 'done' : ''}" style="width:${completed ? '100' : '0'}%"></div></div>
            </div>
            <div class="task-arrow">${completed ? '✅' : '❯'}</div>
          </div>
        `;
      }).join('');

      container.querySelectorAll('.task-item:not(.completed)').forEach(el => {
        el.addEventListener('click', () => {
          // Daily reward opens modal
          if (el.dataset.dailyReward) {
            openDailyModal();
            return;
          }
          const taskId = el.dataset.taskId;
          const reward = game.completeTask(taskId);
          if (reward > 0) {
            SFX.purchase();
            showToast(`+${formatNumber(reward)} coins earned!`);
            renderTasks();
            updateUI();
          }
        });
      });
    }

    // Game loop
    function gameLoop() {
      game.regenEnergy();
      game.tickProfit();
      updateUI();
      // Refresh active effects display if on pass page
      const passPage = document.getElementById('page-airdrop');
      if (passPage && passPage.classList.contains('active')) {
        const activeEl = document.getElementById('active-effects');
        if (activeEl) {
          const effects = Potions.getActiveList();
          if (effects.length > 0) {
            const icons = { coinx: '🪙', multitap: '👆', energy_shield: '🛡️', lucky: '🍀' };
            activeEl.innerHTML = effects.map(e =>
              `<div class="active-effect-pill"><span class="active-effect-icon">${icons[e.type] || '🧪'}</span> ${e.potency}x <span class="active-effect-timer">${e.remaining}s</span></div>`
            ).join('');
          } else {
            activeEl.innerHTML = '';
          }
        }
      }
      requestAnimationFrame(gameLoop);
    }

    updateUI();
    renderMineCards();
    renderTasks();
    gameLoop();

    // ===== Mini Games =====
    // Fortune Wheel
    const wheelModal = document.getElementById('wheel-modal');
    const wheelCanvas = document.getElementById('wheel-canvas');
    const wheelResult = document.getElementById('wheel-result');
    const wheelTimer = document.getElementById('wheel-timer');
    const wheelSpinBtn = document.getElementById('wheel-spin-btn');
    const spinBtn = document.getElementById('spin-btn');

    // Load last spin time from localStorage
    MiniGames.setLastSpinTime(parseInt(localStorage.getItem('hamsterLastSpin') || '0'));

    function updateWheelTimer() {
      const cd = MiniGames.getWheelCooldownMs();
      wheelTimer.textContent = MiniGames.formatCooldown(cd);
      const canSpin = MiniGames.canSpin();
      wheelSpinBtn.disabled = !canSpin;
      if (spinBtn) spinBtn.disabled = !canSpin;
    }

    MiniGames.drawWheel(wheelCanvas);
    updateWheelTimer();
    setInterval(updateWheelTimer, 1000);

    spinBtn.addEventListener('click', () => {
      wheelModal.classList.add('active');
      updateWheelTimer();
      MiniGames.drawWheel(wheelCanvas);
    });
    document.getElementById('wheel-close').addEventListener('click', () => wheelModal.classList.remove('active'));
    wheelModal.addEventListener('click', (e) => { if (e.target === wheelModal) wheelModal.classList.remove('active'); });

    wheelSpinBtn.addEventListener('click', () => {
      if (!MiniGames.canSpin() || !game) return;
      wheelResult.textContent = 'Spinning...';
      SFX.boost();
      MiniGames.spinWheel(wheelCanvas, (prize, label) => {
        game.coins += prize;
        game.totalCoins += prize;
        game.save();
        updateUI();
        localStorage.setItem('hamsterLastSpin', String(Date.now()));
        game.questProgress.spin++;
        wheelResult.textContent = `🎉 You won ${label} coins!`;
        SFX.achievement();
        SFX.vibrateWin();
        updateWheelTimer();
      });
    });

    // Coin Flip
    const flipModal = document.getElementById('flip-modal');
    const flipCoin = document.getElementById('flip-coin');
    const flipResult = document.getElementById('flip-result');
    const flipBetInput = document.getElementById('flip-bet-input');
    const flipBtn = document.getElementById('flip-btn');
    let flipBusy = false;

    flipBtn.addEventListener('click', () => {
      flipModal.classList.add('active');
      flipResult.textContent = '';
      flipCoin.classList.remove('flipping');
    });
    document.getElementById('flip-close').addEventListener('click', () => flipModal.classList.remove('active'));
    flipModal.addEventListener('click', (e) => { if (e.target === flipModal) flipModal.classList.remove('active'); });

    document.querySelectorAll('.flip-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (flipBusy || !game) return;
        const choice = btn.dataset.choice;
        const bet = parseInt(flipBetInput.value) || 1000;
        if (bet < 100) { showToast('Min bet is 100'); return; }
        if (game.coins < bet) { SFX.error(); showToast('Not enough coins!'); return; }

        flipBusy = true;
        flipResult.textContent = 'Flipping...';
        flipCoin.classList.remove('flipping');
        // Force reflow
        void flipCoin.offsetWidth;
        flipCoin.classList.add('flipping');
        SFX.tap();

        setTimeout(() => {
          const outcome = MiniGames.flipCoin(bet, choice);
          game.coins += outcome.payout;
          if (outcome.won) {
            game.totalCoins += outcome.payout;
            flipResult.textContent = `🎉 ${outcome.result.toUpperCase()}! You won +${formatNumber(outcome.payout)} (${outcome.winMult}x)!`;
            flipResult.style.color = 'var(--gold)';
            SFX.achievement();
            SFX.vibrateWin();
          } else {
            flipResult.textContent = `😢 ${outcome.result.toUpperCase()}! You lost -${formatNumber(-outcome.payout)} (${outcome.loseMult}x)`;
            flipResult.style.color = '#ef4444';
            SFX.error();
          }
          game.save();
          game.questProgress.flip++;
          updateUI();
          flipBusy = false;
        }, 900);
      });
    });

    // ===== Number Guess =====
    const guessModal = document.getElementById('guess-modal');
    const guessBtn = document.getElementById('guess-btn');
    const guessInput = document.getElementById('guess-input');
    const guessSubmit = document.getElementById('guess-submit');
    const guessHint = document.getElementById('guess-hint');
    const guessAttempts = document.getElementById('guess-attempts');
    const guessResult = document.getElementById('guess-result');

    guessBtn.addEventListener('click', () => {
      if (!MiniGames.canNumberGuess() && !MiniGames.getNumberGuessCooldownMs()) {
        showToast('⏳ Number Guess on cooldown');
        return;
      }
      MiniGames.startNumberGuess(100, 5);
      guessHint.textContent = '🤔 Make your first guess!';
      guessAttempts.textContent = '5 attempts remaining';
      guessResult.textContent = '';
      guessInput.value = '';
      guessInput.disabled = false;
      guessSubmit.disabled = false;
      guessModal.classList.add('active');
    });

    guessSubmit.addEventListener('click', () => {
      const val = parseInt(guessInput.value);
      if (isNaN(val) || val < 1 || val > 100) {
        guessHint.textContent = '⚠️ Enter a number 1-100';
        return;
      }
      const result = MiniGames.guessNumber(val);
      if (result.correct) {
        game.coins += result.reward;
        game.totalCoins += result.reward;
        game.save();
        guessHint.textContent = `🎉 Correct! The number was ${result.target}!`;
        guessResult.textContent = `+${formatNumber(result.reward)} coins!`;
        guessResult.style.color = 'var(--gold)';
        guessInput.disabled = true;
        guessSubmit.disabled = true;
        SFX.achievement();
        SFX.vibrateWin();
        updateUI();
      } else if (result.error) {
        guessHint.textContent = result.error;
      } else if (result.remaining <= 0) {
        guessHint.textContent = `😢 The number was ${result.target}!`;
        guessResult.textContent = 'Better luck next time!';
        guessResult.style.color = '#ef4444';
        guessInput.disabled = true;
        guessSubmit.disabled = true;
        SFX.error();
      } else {
        guessHint.textContent = result.hint === 'higher' ? '⬆️ Higher!' : '⬇️ Lower!';
        guessAttempts.textContent = `${result.remaining} attempts remaining`;
        guessInput.value = '';
        SFX.tap();
      }
    });

    guessInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') guessSubmit.click();
    });

    document.getElementById('guess-close').addEventListener('click', () => {
      guessModal.classList.remove('active');
    });

    // ===== Speed Tap =====
    const speedtapModal = document.getElementById('speedtap-modal');
    const speedtapBtn = document.getElementById('speedtap-btn');
    const speedtapTapBtn = document.getElementById('speedtap-tap-btn');
    const speedtapTimer = document.getElementById('speedtap-timer');
    const speedtapCount = document.getElementById('speedtap-count');
    const speedtapResult = document.getElementById('speedtap-result');
    let speedtapInterval = null;

    speedtapBtn.addEventListener('click', () => {
      if (!MiniGames.canSpeedTap()) {
        showToast('⏳ Speed Tap on cooldown');
        return;
      }
      speedtapCount.textContent = '0';
      speedtapTimer.textContent = '10.0s';
      speedtapResult.textContent = '';
      speedtapTapBtn.disabled = false;
      speedtapModal.classList.add('active');

      MiniGames.startSpeedTap(10000, (result) => {
        if (speedtapInterval) { clearInterval(speedtapInterval); speedtapInterval = null; }
        speedtapTimer.textContent = '0.0s';
        speedtapTapBtn.disabled = true;
        game.coins += result.reward;
        game.totalCoins += result.reward;
        game.save();
        speedtapResult.textContent = `🎉 ${result.count} taps = +${formatNumber(result.reward)} coins!`;
        speedtapResult.style.color = 'var(--gold)';
        SFX.achievement();
        SFX.vibrateWin();
        updateUI();
      });

      speedtapInterval = setInterval(() => {
        const remaining = MiniGames.getSpeedTapRemaining();
        speedtapTimer.textContent = (remaining / 1000).toFixed(1) + 's';
        if (remaining <= 0 && speedtapInterval) {
          clearInterval(speedtapInterval);
          speedtapInterval = null;
        }
      }, 100);
    });

    speedtapTapBtn.addEventListener('click', () => {
      if (!MiniGames.isSpeedTapActive()) return;
      const count = MiniGames.speedTap();
      speedtapCount.textContent = count;
      SFX.tap();
    });

    document.getElementById('speedtap-close').addEventListener('click', () => {
      if (MiniGames.isSpeedTapActive()) MiniGames.endSpeedTap();
      if (speedtapInterval) { clearInterval(speedtapInterval); speedtapInterval = null; }
      speedtapModal.classList.remove('active');
    });

    // Auto-save locally every 5 seconds
    if (saveInterval) clearInterval(saveInterval);
    saveInterval = setInterval(() => game.save(), 5000);

    // Sync to server every 10 seconds
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(() => syncToServer(), 10000);

    window.addEventListener('beforeunload', () => {
      game.save();
      syncToServer();
    });

    // Touch ripple effect for buttons
    document.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('.auth-btn, .modal-buy-btn, .boost-btn, .invite-btn, .mine-card, .nav-btn, .task-item, .boost-item');
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      btn.style.setProperty('--rx', x + '%');
      btn.style.setProperty('--ry', y + '%');
    });

    // Keyboard navigation (1-5)
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const pages = ['exchange', 'mine', 'earn', 'friends', 'airdrop'];
      const idx = parseInt(e.key, 10) - 1;
      if (idx >= 0 && idx < pages.length) {
        e.preventDefault();
        const page = pages[idx];
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`page-${page}`)?.classList.add('active');
        document.querySelector(`.nav-btn[data-page="${page}"]`)?.classList.add('active');
        if (page === 'mine') renderMineCards();
        if (page === 'earn') renderTasks();
        if (page === 'friends') loadReferralData();
        if (page === 'airdrop') renderPassPage();
      }
    });

    // Scroll reveal via IntersectionObserver
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' });

    function observeReveals(container) {
      if (!container) return;
      container.querySelectorAll('.mine-card, .task-item, .boost-item, .mini-game-card, .bp-reward-item, .friend-item, .invite-bonus').forEach(el => {
        el.classList.add('reveal');
        revealObserver.observe(el);
      });
    }

    // Auto-observe on page switches
    const pageObserver = new MutationObserver(() => {
      document.querySelectorAll('.page.active').forEach(page => observeReveals(page));
    });
    document.querySelectorAll('.page').forEach(p => pageObserver.observe(p, { attributes: true, attributeFilter: ['class'] }));

    window.hamsterGame = game;

    // Energy UI refresh every second
    if (window._uiInterval) clearInterval(window._uiInterval);
    window._uiInterval = setInterval(updateUI, 1000);

    // ===== Tutorial for new users =====
    const TUTORIAL_STEPS = [
      { target: '#hamster-tap-area', text: '👆 Тапай сюда, чтобы зарабатывать монеты!' },
      { target: '[data-page="mine"]', text: '🏪 Заработал? Идём в Магазин — покупай карты!' },
      { target: '[data-page="earn"]', text: '📈 Улучшай карты для пассивного дохода!' },
    ];

    function startTutorial() {
      if (localStorage.getItem('hamsterTutorialDone')) return;
      const overlay = document.getElementById('tutorial-overlay');
      const spotlight = document.getElementById('tutorial-spotlight');
      const tooltip = document.getElementById('tutorial-tooltip');
      const dotsEl = document.getElementById('tutorial-dots');
      const textEl = document.getElementById('tutorial-text');
      const nextBtn = document.getElementById('tutorial-next');
      const skipBtn = document.getElementById('tutorial-skip');
      let step = 0;

      function showStep() {
        const s = TUTORIAL_STEPS[step];
        const target = document.querySelector(s.target);
        if (!target) { endTutorial(); return; }
        const rect = target.getBoundingClientRect();
        const pad = 10;
        spotlight.style.left = (rect.left - pad) + 'px';
        spotlight.style.top = (rect.top - pad) + 'px';
        spotlight.style.width = (rect.width + pad * 2) + 'px';
        spotlight.style.height = (rect.height + pad * 2) + 'px';

        textEl.textContent = s.text;
        // Dots
        dotsEl.innerHTML = TUTORIAL_STEPS.map((_, i) =>
          `<div class="tutorial-dot ${i === step ? 'active' : ''}"></div>`
        ).join('');

        // Position tooltip below spotlight
        const tooltipTop = rect.bottom + pad + 12;
        const tooltipLeft = Math.max(16, rect.left + rect.width / 2 - 140);
        tooltip.style.left = Math.min(tooltipLeft, window.innerWidth - 300) + 'px';
        tooltip.style.top = Math.min(tooltipTop, window.innerHeight - 160) + 'px';

        nextBtn.textContent = step < TUTORIAL_STEPS.length - 1 ? 'Далее' : 'Понятно!';
      }

      function endTutorial() {
        overlay.style.display = 'none';
        localStorage.setItem('hamsterTutorialDone', 'true');
      }

      nextBtn.addEventListener('click', () => {
        step++;
        if (step >= TUTORIAL_STEPS.length) { endTutorial(); return; }
        showStep();
      });
      skipBtn.addEventListener('click', endTutorial);

      overlay.style.display = 'block';
      showStep();
    }

    // Show tutorial for brand new users (0 totalCoins means fresh)
    if (game.totalCoins === 0) {
      setTimeout(startTutorial, 800);
    }
  }

  // ===== Server Sync =====
  let saveIndicatorTimeout = null;
  function showSaveIndicator(state) {
    const el = document.getElementById('save-indicator');
    if (!el) return;
    if (saveIndicatorTimeout) clearTimeout(saveIndicatorTimeout);
    el.className = 'save-indicator ' + state;
    if (state === 'saved') {
      el.textContent = '✅';
      saveIndicatorTimeout = setTimeout(() => { el.className = 'save-indicator'; }, 2000);
    } else if (state === 'saving') {
      el.textContent = '⚠️ Сохранение...';
    } else if (state === 'error') {
      el.textContent = '⚠️ Ошибка';
      saveIndicatorTimeout = setTimeout(() => { el.className = 'save-indicator'; }, 3000);
    }
  }

  async function syncToServer() {
    if (!authToken || !game) return;
    try {
      showSaveIndicator('saving');
      await api('POST', '/gamedata', {
        coins: game.coins,
        totalCoins: game.totalCoins,
        cardLevels: game.cardLevels,
        completedTasks: game.completedTasks,
        multitapLevel: game.multitapLevel,
        energyLimitLevel: game.energyLimitLevel,
        turboBoosts: game.turboBoosts,
        fullEnergyBoosts: game.fullEnergyBoosts,
        energy: game.energy,
        comboFound: game.comboFound,
        profitPerHour: game.profitPerHour,
        earnPerTap: game.earnPerTap,
        maxEnergy: game.maxEnergy,
        autoTapLevel: game.autoTapLevel,
        bpXP: game.bpXP,
        bpLevel: game.bpLevel,
        bpClaimed: game.bpClaimed,
        inventory: game.inventory,
        chests: game.chests,
        questProgress: game.questProgress,
        questClaimed: game.questClaimed,
      });
      showSaveIndicator('saved');
    } catch (err) {
      console.warn('Sync failed:', err.message);
      showSaveIndicator('error');
    }
  }

  // ===== Toast =====
  function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  // ===== Auto-login =====
  async function tryAutoLogin() {
    // Auto-fill referral code from URL
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    if (refParam) {
      const refInput = document.getElementById('reg-refcode');
      if (refInput) refInput.value = refParam;
      // Show register form
      document.getElementById('auth-login').style.display = 'none';
      document.getElementById('auth-register').style.display = 'block';
    }

    // Init audio on first interaction
    const initAudio = () => { SFX.init(); document.removeEventListener('click', initAudio); document.removeEventListener('touchstart', initAudio); };
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });

    if (authToken && currentUser) {
      try {
        const data = await api('GET', '/gamedata');
        connectWS();
        initGame(data.gameData);
        if (data.offlineEarnings > 0) {
          setTimeout(() => showOfflineBanner(data.offlineEarnings, data.offlineMs), 500);
        }
      } catch {
        localStorage.removeItem('hamsterToken');
        localStorage.removeItem('hamsterUser');
        authToken = null;
        currentUser = null;
        showAuth();
      }
    } else {
      showAuth();
    }
  }

  tryAutoLogin();
})();
