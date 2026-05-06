// ===== Hamster Sprite Renderer (Canvas 2D) =====

class HamsterSprite {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.size = this.canvas.width;
    this.animFrame = 0;
    this.blinkTimer = 0;
    this.isBlinking = false;
    this.breathPhase = 0;
    this.isTapped = false;
    this.tapScale = 1;
    this.sparkles = [];
    // Mouse tracking for eyes
    this.mouseX = 0.5;
    this.mouseY = 0.5;
    this.eyeX = 0;
    this.eyeY = 0;
    this._onMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - rect.left) / rect.width;
      this.mouseY = (e.clientY - rect.top) / rect.height;
    };
    window.addEventListener('mousemove', this._onMouseMove, { passive: true });
    this.draw();
    this.animate();
  }

  animate() {
    this.animFrame++;
    this.breathPhase += 0.03;
    this.blinkTimer++;

    if (this.blinkTimer > 180 && !this.isBlinking) {
      this.isBlinking = true;
      this.blinkTimer = 0;
    }
    if (this.isBlinking && this.blinkTimer > 8) {
      this.isBlinking = false;
      this.blinkTimer = 0;
    }

    if (this.isTapped) {
      this.tapScale = Math.max(0.92, this.tapScale - 0.02);
    } else {
      this.tapScale = Math.min(1, this.tapScale + 0.02);
    }

    this.updateSparkles();
    // Lerp eye tracking
    const targetEyeX = (this.mouseX - 0.5) * 6;
    const targetEyeY = (this.mouseY - 0.5) * 4;
    this.eyeX += (targetEyeX - this.eyeX) * 0.08;
    this.eyeY += (targetEyeY - this.eyeY) * 0.08;
    this.draw();
    requestAnimationFrame(() => this.animate());
  }

  tap() {
    this.isTapped = true;
    setTimeout(() => { this.isTapped = false; }, 120);
    for (let i = 0; i < 5; i++) {
      this.sparkles.push({
        x: this.size / 2 + (Math.random() - 0.5) * 140,
        y: this.size / 2 + (Math.random() - 0.5) * 140,
        vx: (Math.random() - 0.5) * 5,
        vy: -2 - Math.random() * 4,
        life: 35 + Math.random() * 25,
        maxLife: 35 + Math.random() * 25,
        size: 2 + Math.random() * 5,
        color: ['#FFD700','#F0B90B','#FFF5CC','#FFC107'][Math.floor(Math.random()*4)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
      });
    }
  }

  updateSparkles() {
    this.sparkles = this.sparkles.filter(s => {
      s.x += s.vx;
      s.y += s.vy;
      s.life--;
      return s.life > 0;
    });
  }

  draw() {
    const ctx = this.ctx;
    const s = this.size;
    const cx = s / 2;
    const cy = s / 2;
    const breathOffset = Math.sin(this.breathPhase) * 2;

    ctx.clearRect(0, 0, s, s);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.tapScale, this.tapScale);
    ctx.translate(-cx, -cy);

    // Background circle
    const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, s / 2);
    bgGrad.addColorStop(0, '#2a1f0e');
    bgGrad.addColorStop(0.7, '#1a1408');
    bgGrad.addColorStop(1, '#0f0e08');
    ctx.beginPath();
    ctx.arc(cx, cy, s / 2 - 4, 0, Math.PI * 2);
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // Coin ring
    ctx.beginPath();
    ctx.arc(cx, cy, s / 2 - 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#F0B90B';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#F0B90B';
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Body (suit jacket)
    ctx.fillStyle = '#1a3a6b';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 65 + breathOffset, 55, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shirt
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy + 30 + breathOffset);
    ctx.lineTo(cx + 15, cy + 30 + breathOffset);
    ctx.lineTo(cx + 10, cy + 75 + breathOffset);
    ctx.lineTo(cx - 10, cy + 75 + breathOffset);
    ctx.fill();

    // Tie
    ctx.fillStyle = '#c62828';
    ctx.beginPath();
    ctx.moveTo(cx, cy + 30 + breathOffset);
    ctx.lineTo(cx + 6, cy + 45 + breathOffset);
    ctx.lineTo(cx, cy + 60 + breathOffset);
    ctx.lineTo(cx - 6, cy + 45 + breathOffset);
    ctx.fill();

    // Arms (crossed)
    ctx.fillStyle = '#1a3a6b';
    // Left arm
    ctx.beginPath();
    ctx.ellipse(cx - 40, cy + 55 + breathOffset, 22, 14, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Right arm
    ctx.beginPath();
    ctx.ellipse(cx + 40, cy + 55 + breathOffset, 22, 14, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Paws on arms
    ctx.fillStyle = '#f5c07a';
    ctx.beginPath();
    ctx.arc(cx - 55, cy + 50 + breathOffset, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 55, cy + 50 + breathOffset, 10, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#e8a74a';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 15, 48, 44, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lighter face area
    ctx.fillStyle = '#f5d0a0';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8, 35, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = '#e8a74a';
    ctx.beginPath();
    ctx.ellipse(cx - 38, cy - 45, 14, 16, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 38, cy - 45, 14, 16, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Inner ears
    ctx.fillStyle = '#f5b0b0';
    ctx.beginPath();
    ctx.ellipse(cx - 38, cy - 44, 8, 10, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 38, cy - 44, 8, 10, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eyes — follow mouse
    const eyeH = this.isBlinking ? 1 : 7;
    ctx.fillStyle = '#2c1810';
    ctx.beginPath();
    ctx.ellipse(cx - 16, cy - 20, 7, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 16, cy - 20, 7, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils — follow mouse
    if (!this.isBlinking) {
      ctx.fillStyle = '#1a0e08';
      ctx.beginPath();
      ctx.arc(cx - 16 + this.eyeX, cy - 20 + this.eyeY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 16 + this.eyeX, cy - 20 + this.eyeY, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eye highlights
    if (!this.isBlinking) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(cx - 14, cy - 22, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 18, cy - 22, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyebrows
    ctx.strokeStyle = '#6b4226';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy - 30);
    ctx.quadraticCurveTo(cx - 16, cy - 34, cx - 8, cy - 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy - 30);
    ctx.quadraticCurveTo(cx + 16, cy - 34, cx + 24, cy - 30);
    ctx.stroke();

    // Nose
    ctx.fillStyle = '#d4845a';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mouth (smirk)
    ctx.strokeStyle = '#8b5a3a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy);
    ctx.quadraticCurveTo(cx, cy + 8, cx + 12, cy);
    ctx.stroke();

    // Cheeks
    ctx.fillStyle = 'rgba(255, 150, 150, 0.25)';
    ctx.beginPath();
    ctx.ellipse(cx - 30, cy - 5, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 30, cy - 5, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Whiskers
    ctx.strokeStyle = 'rgba(139, 90, 58, 0.4)';
    ctx.lineWidth = 1;
    // Left
    ctx.beginPath(); ctx.moveTo(cx - 20, cy - 4); ctx.lineTo(cx - 50, cy - 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 20, cy); ctx.lineTo(cx - 50, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 20, cy + 4); ctx.lineTo(cx - 50, cy + 12); ctx.stroke();
    // Right
    ctx.beginPath(); ctx.moveTo(cx + 20, cy - 4); ctx.lineTo(cx + 50, cy - 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 20, cy); ctx.lineTo(cx + 50, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 20, cy + 4); ctx.lineTo(cx + 50, cy + 12); ctx.stroke();

    ctx.restore();

    // Draw sparkles — diamond shape with rotation
    this.sparkles.forEach(sp => {
      const alpha = sp.life / sp.maxLife;
      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(sp.rotation);
      ctx.fillStyle = sp.color;
      ctx.globalAlpha = alpha;
      // Diamond shape
      const s = sp.size;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.6, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.6, 0);
      ctx.closePath();
      ctx.fill();
      sp.rotation += sp.rotSpeed;
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }
}
