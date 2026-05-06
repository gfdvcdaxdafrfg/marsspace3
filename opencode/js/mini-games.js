// ===== Mini Games: Fortune Wheel, Coin Flip, Number Guess, Speed Tap =====

const MiniGames = (() => {
  // Wheel segments: [label, coins, color, weight]
  const WHEEL_SEGMENTS = [
    ['1K', 1000, '#F0B90B', 30],
    ['5K', 5000, '#e6a800', 25],
    ['10K', 10000, '#4CAF50', 18],
    ['25K', 25000, '#2196F3', 12],
    ['50K', 50000, '#9C27B0', 8],
    ['100K', 100000, '#FF5722', 4],
    ['500K', 500000, '#E91E63', 2],
    ['1M', 1000000, '#FFD700', 1],
  ];
  const SEG_COUNT = WHEEL_SEGMENTS.length;
  const SEG_ANGLE = (2 * Math.PI) / SEG_COUNT;
  const WHEEL_COOLDOWN = 4 * 60 * 60 * 1000; // 4 hours

  let wheelAngle = 0;
  let spinning = false;
  let lastSpinTime = 0;

  // Speed Tap state
  let speedTapActive = false;
  let speedTapCount = 0;
  let speedTapTimer = null;
  let speedTapStartTime = 0;
  let speedTapDuration = 10000; // 10 seconds
  let speedTapOnEnd = null;
  const SPEED_TAP_COOLDOWN = 2 * 60 * 60 * 1000; // 2 hours
  let lastSpeedTapTime = 0;

  // Number Guess state
  let numberGuessTarget = null;
  let numberGuessAttempts = 0;
  let numberGuessMaxAttempts = 5;
  let numberGuessRange = 100;
  let numberGuessActive = false;
  const NUMBER_GUESS_COOLDOWN = 1 * 60 * 60 * 1000; // 1 hour
  let lastNumberGuessTime = 0;

  function weightedRandom() {
    const totalWeight = WHEEL_SEGMENTS.reduce((s, seg) => s + seg[3], 0);
    let r = Math.random() * totalWeight;
    for (let i = 0; i < SEG_COUNT; i++) {
      r -= WHEEL_SEGMENTS[i][3];
      if (r <= 0) return i;
    }
    return SEG_COUNT - 1;
  }

  function drawWheel(canvas) {
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = Math.min(cx, cy) - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(wheelAngle);

    for (let i = 0; i < SEG_COUNT; i++) {
      const startAngle = i * SEG_ANGLE;
      const endAngle = startAngle + SEG_ANGLE;

      // Segment fill with gradient
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, startAngle, endAngle);
      ctx.closePath();
      const grad = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r);
      grad.addColorStop(0, WHEEL_SEGMENTS[i][2] + 'cc');
      grad.addColorStop(1, WHEEL_SEGMENTS[i][2]);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.rotate(startAngle + SEG_ANGLE / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(WHEEL_SEGMENTS[i][0], r * 0.65, 0);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Center circle
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, 2 * Math.PI);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
    ctx.strokeStyle = '#F0B90B';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#F0B90B';
    ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐹', 0, 0);

    ctx.restore();
  }

  function spinWheel(canvas, onResult) {
    if (spinning) return;
    spinning = true;

    // Pick weighted random segment
    const winIndex = weightedRandom();
    const targetSegCenter = winIndex * SEG_ANGLE + SEG_ANGLE / 2;
    const targetAngle = -(targetSegCenter + Math.PI / 2);
    const fullRotations = 5 + Math.floor(Math.random() * 3);
    const totalAngle = fullRotations * 2 * Math.PI + targetAngle;

    const startAngle = wheelAngle;
    const duration = 4000;
    const startTime = performance.now();

    function animate(now) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      wheelAngle = startAngle + totalAngle * ease;
      drawWheel(canvas);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        spinning = false;
        lastSpinTime = Date.now();
        const prize = WHEEL_SEGMENTS[winIndex][1];
        if (onResult) onResult(prize, WHEEL_SEGMENTS[winIndex][0]);
      }
    }
    requestAnimationFrame(animate);
  }

  function canSpin() {
    return Date.now() - lastSpinTime >= WHEEL_COOLDOWN;
  }

  function getWheelCooldownMs() {
    const remaining = WHEEL_COOLDOWN - (Date.now() - lastSpinTime);
    return Math.max(0, remaining);
  }

  function formatCooldown(ms) {
    if (ms <= 0) return 'Ready!';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  }

  function setLastSpinTime(t) {
    lastSpinTime = t || 0;
  }

  // ===== Coin Flip =====
  function flipCoin(bet, choice) {
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = result === choice;
    const winMult = 1.8;
    const loseMult = 1.1;
    const payout = won ? Math.floor(bet * winMult) : -Math.floor(bet * loseMult);
    return { result, won, payout, winMult, loseMult };
  }

  // ===== Number Guess =====
  function startNumberGuess(range = 100, maxAttempts = 5) {
    numberGuessTarget = Math.floor(Math.random() * range) + 1;
    numberGuessAttempts = 0;
    numberGuessMaxAttempts = maxAttempts;
    numberGuessRange = range;
    numberGuessActive = true;
    return { range, maxAttempts };
  }

  function guessNumber(guess) {
    if (!numberGuessActive) return { error: 'No active game' };
    numberGuessAttempts++;
    const remaining = numberGuessMaxAttempts - numberGuessAttempts;

    if (guess === numberGuessTarget) {
      numberGuessActive = false;
      lastNumberGuessTime = Date.now();
      // Reward based on attempts used: fewer attempts = more coins
      const reward = Math.floor(numberGuessRange * 100 * (remaining + 1) / numberGuessMaxAttempts);
      return { correct: true, reward, attempts: numberGuessAttempts, target: numberGuessTarget };
    }

    if (remaining <= 0) {
      numberGuessActive = false;
      lastNumberGuessTime = Date.now();
      return { correct: false, reward: 0, attempts: numberGuessAttempts, target: numberGuessTarget, hint: guess < numberGuessTarget ? 'higher' : 'lower' };
    }

    return { correct: false, hint: guess < numberGuessTarget ? 'higher' : 'lower', remaining, attempts: numberGuessAttempts };
  }

  function canNumberGuess() {
    return !numberGuessActive && Date.now() - lastNumberGuessTime >= NUMBER_GUESS_COOLDOWN;
  }

  function getNumberGuessCooldownMs() {
    if (numberGuessActive) return 0;
    return Math.max(0, NUMBER_GUESS_COOLDOWN - (Date.now() - lastNumberGuessTime));
  }

  function setLastNumberGuessTime(t) {
    lastNumberGuessTime = t || 0;
  }

  // ===== Speed Tap =====
  function startSpeedTap(duration = 10000, onEnd) {
    if (speedTapActive) return false;
    speedTapActive = true;
    speedTapCount = 0;
    speedTapDuration = duration;
    speedTapStartTime = Date.now();
    speedTapOnEnd = onEnd;

    speedTapTimer = setTimeout(() => {
      endSpeedTap();
    }, duration);
    return true;
  }

  function speedTap() {
    if (!speedTapActive) return 0;
    speedTapCount++;
    return speedTapCount;
  }

  function endSpeedTap() {
    if (!speedTapActive) return null;
    speedTapActive = false;
    if (speedTapTimer) { clearTimeout(speedTapTimer); speedTapTimer = null; }
    lastSpeedTapTime = Date.now();
    // Reward: 50 coins per tap
    const reward = speedTapCount * 50;
    if (speedTapOnEnd) speedTapOnEnd({ count: speedTapCount, reward });
    return { count: speedTapCount, reward };
  }

  function getSpeedTapRemaining() {
    if (!speedTapActive) return 0;
    return Math.max(0, speedTapDuration - (Date.now() - speedTapStartTime));
  }

  function canSpeedTap() {
    return !speedTapActive && Date.now() - lastSpeedTapTime >= SPEED_TAP_COOLDOWN;
  }

  function getSpeedTapCooldownMs() {
    if (speedTapActive) return 0;
    return Math.max(0, SPEED_TAP_COOLDOWN - (Date.now() - lastSpeedTapTime));
  }

  function setLastSpeedTapTime(t) {
    lastSpeedTapTime = t || 0;
  }

  function isSpeedTapActive() { return speedTapActive; }
  function getSpeedTapCount() { return speedTapCount; }

  return {
    drawWheel, spinWheel, canSpin, getWheelCooldownMs, formatCooldown, setLastSpinTime,
    flipCoin,
    startNumberGuess, guessNumber, canNumberGuess, getNumberGuessCooldownMs, setLastNumberGuessTime,
    startSpeedTap, speedTap, endSpeedTap, getSpeedTapRemaining, canSpeedTap, getSpeedTapCooldownMs,
    setLastSpeedTapTime, isSpeedTapActive, getSpeedTapCount,
    WHEEL_COOLDOWN, SPEED_TAP_COOLDOWN, NUMBER_GUESS_COOLDOWN,
  };
})();
