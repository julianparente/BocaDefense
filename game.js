// ============================================================
//  BOCA DEFENSE — game.js
//  Juego de disparos cenital con defensa de torre
// ============================================================

// ============================================================
// SECCIÓN 1: CONSTANTES DE BALANCE
// ============================================================
const BALANCE = {
  // Jugador
  PLAYER_SPEED: 220,
  PLAYER_RADIUS: 14,
  PLAYER_FIRE_RATE: 0.18,
  BULLET_SPEED: 520,
  BULLET_DAMAGE: 18,
  BULLET_RADIUS: 5,
  // Torre
  TOWER_RADIUS: 38,
  TOWER_HP_MAX: 300,
  TOWER_DAMAGE_RATE: 12,
  // Enemigos
  ENEMY_NORMAL_HP: 50, ENEMY_NORMAL_SPEED: 70, ENEMY_NORMAL_DAMAGE: 10, ENEMY_NORMAL_COINS: 5, ENEMY_NORMAL_SCORE: 50,
  ENEMY_FAST_HP: 28, ENEMY_FAST_SPEED: 145, ENEMY_FAST_DAMAGE: 6, ENEMY_FAST_COINS: 7, ENEMY_FAST_SCORE: 80,
  ENEMY_TANK_HP: 220, ENEMY_TANK_SPEED: 38, ENEMY_TANK_DAMAGE: 22, ENEMY_TANK_COINS: 18, ENEMY_TANK_SCORE: 200,
  ENEMY_BOSS_HP_BASE: 800, ENEMY_BOSS_SPEED: 28, ENEMY_BOSS_DAMAGE: 35, ENEMY_BOSS_COINS: 80, ENEMY_BOSS_SCORE: 1000,
  // Oleadas
  WAVE_BASE_COUNT: 8,
  WAVE_COUNT_INC: 4,
  WAVE_SPAWN_RATE: 1.2,
  WAVE_SPAWN_DEC: 0.04,
  WAVE_MIN_SPAWN: 0.3,
  WAVE_ANNOUNCE_TIME: 900,   // ms
  INTER_WAVE_PAUSE: 200,     // ms
  // Tienda
  SHOP_DAMAGE_COST: 30,
  SHOP_FIRERATE_COST: 35,
  SHOP_SPEED_COST: 25,
  SHOP_REPAIR_COST: 40,
  SHOP_TOWERMAX_COST: 60,
  SHOP_TURRET_COST: 90,
  SHOP_PRICE_SCALE: 1.45,
  MAX_SHOP_LEVEL: 6,
  // Torreta
  TURRET_DAMAGE: 10,
  TURRET_FIRE_RATE: 0.8,
  TURRET_RANGE: 260,
  TURRET_BULLET_SPEED: 420,
  TURRET_MAX: 3,
  // Partículas
  PARTICLES_NORMAL: 10,
  PARTICLES_BOSS: 30,
  // Screen shake
  SHAKE_TOWER: 6,
  SHAKE_BOMB: 12,
  // Power-ups
  POWERUP_TRIPLE_DUR: 8,
  POWERUP_SHIELD_DUR: 6,
  POWERUP_DROP_CHANCE: 0.18,
  // Super disparo (tecla Q)
  SUPER_COOLDOWN: 8,     // segundos de cooldown
  SUPER_BULLETS: 12,    // balas en abanico
  SUPER_DAMAGE: 60,    // daño por bala
  SUPER_SPEED: 600,   // velocidad de bala
  SUPER_RADIUS: 8,     // radio de bala
  // Tiro pesado (tecla E)
  HEAVY_COOLDOWN: 10,   // segundos de cooldown (un poco más que Q)
  HEAVY_DAMAGE: 180,   // daño único alto
  HEAVY_SPEED: 480,    // velocidad (más lenta que bala normal)
  HEAVY_RADIUS: 22,    // radio grande
  // Radar
  RADAR_SIZE: 160,   // diámetro del radar
  RADAR_MARGIN: 18,    // margen desde el borde
  RADAR_DOT_SIZE: 4      // tamaño de los puntos de enemigos
};

// ============================================================
// SECCIÓN 2: UTILIDADES
// ============================================================
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));
const randRange = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(randRange(a, b + 1));
const ang = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);

// ============================================================
// SECCIÓN 3: AUDIO (Web Audio API — sin archivos externos)
// ============================================================
class AudioManager {
  constructor() {
    this.muted = false;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { this.ctx = null; }
  }

  _resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  _tone(freq, type, dur, vol = 0.25, atk = 0.005, rel = 0.08) {
    if (this.muted || !this.ctx) return;
    this._resume();
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + atk);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur - rel);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }

  _noise(dur, vol = 0.2) {
    if (this.muted || !this.ctx) return;
    this._resume();
    const rate = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, rate * dur, rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    src.connect(g); g.connect(this.ctx.destination);
    src.start();
  }

  shoot() { this._tone(900, 'square', 0.08, 0.14); }
  impact() { this._noise(0.06, 0.22); }
  enemyDie() { this._tone(300, 'sawtooth', 0.15, 0.18); this._tone(200, 'square', 0.1, 0.1); }
  bossDie() { this._tone(100, 'sawtooth', 0.5, 0.35); this._noise(0.3, 0.3); }
  towerHit() { this._tone(80, 'sawtooth', 0.25, 0.3); this._noise(0.1, 0.25); }
  buy() { this._tone(660, 'sine', 0.12, 0.2); this._tone(880, 'sine', 0.18, 0.15); }
  powerup() { this._tone(523, 'sine', 0.1, 0.2); this._tone(659, 'sine', 0.15, 0.2); this._tone(784, 'sine', 0.2, 0.18); }
  bomb() { this._noise(0.4, 0.45); this._tone(55, 'sawtooth', 0.4, 0.35); }
  wave() { this._tone(440, 'square', 0.18, 0.2); this._tone(550, 'square', 0.24, 0.18); }
  superShoot() {
    this._noise(0.12, 0.35);
    this._tone(180, 'sawtooth', 0.25, 0.4);
    this._tone(260, 'square', 0.2, 0.3);
    this._tone(340, 'sine', 0.18, 0.25);
  }
  // Sonido del tiro pesado: grave, impactante
  heavyShoot() {
    this._noise(0.18, 0.5);
    this._tone(80, 'sawtooth', 0.35, 0.45);
    this._tone(120, 'square', 0.28, 0.35);
  }

  toggleMute() { this.muted = !this.muted; return this.muted; }
}

// ============================================================
// SECCIÓN 4: BALA
// ============================================================
class Bullet {
  constructor(x, y, vx, vy, dmg, radius, color) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.damage = dmg; this.radius = radius; this.color = color;
    this.dead = false; this.trail = [];
  }
  update(dt) {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 7) this.trail.shift();
    this.x += this.vx * dt; this.y += this.vy * dt;
  }
  isOffScreen(w, h) { return this.x < -60 || this.x > w + 60 || this.y < -60 || this.y > h + 60; }
  draw(ctx) {
    // Estela
    for (let i = 0; i < this.trail.length; i++) {
      const t = i / this.trail.length;
      ctx.globalAlpha = t * 0.35;
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, this.radius * t, 0, Math.PI * 2);
      ctx.fillStyle = this.color; ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.shadowBlur = 12; ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ============================================================
// SECCIÓN 5: PARTÍCULA
// ============================================================
class Particle {
  constructor(x, y, color) {
    this.x = x; this.y = y;
    const spd = randRange(50, 220), a = randRange(0, Math.PI * 2);
    this.vx = Math.cos(a) * spd; this.vy = Math.sin(a) * spd;
    this.life = randRange(0.35, 0.85); this.maxLife = this.life;
    this.radius = randRange(2, 6); this.color = color;
  }
  update(dt) {
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vx *= 0.93; this.vy *= 0.93;
    this.life -= dt;
  }
  draw(ctx) {
    const t = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = t;
    ctx.shadowBlur = 8; ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * t, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ============================================================
// SECCIÓN 6: POWER-UP
// ============================================================
const POWERUP_CFG = {
  triple: { icon: '⚡', color: '#ffe600' },
  shield: { icon: '🛡️', color: '#00f5ff' },
  bomb: { icon: '💣', color: '#ff2d78' }
};
class PowerUp {
  constructor(x, y, type) {
    this.x = x; this.y = y; this.type = type;
    // Mismo radio que el enemigo normal (14)
    this.radius = 14; this.life = 10; this.t = 0; this.dead = false;
  }
  update(dt) { this.t += dt; this.life -= dt; if (this.life <= 0) this.dead = true; }
  draw(ctx) {
    const bob = Math.sin(this.t * 3) * 3;
    const c = POWERUP_CFG[this.type].color;
    const py = this.y + bob;
    const r = this.radius;
    const img = G.powerupImgs && G.powerupImgs[this.type];

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      // Clip circular para que la imagen quede perfecta y centrada
      ctx.beginPath();
      ctx.arc(this.x, py, r, 0, Math.PI * 2);
      ctx.clip();

      const d = r * 2;
      ctx.drawImage(img, this.x - r, py - r, d, d);
      ctx.restore();

      // Borde circular brillante con glow
      ctx.save();
      ctx.shadowBlur = 18;
      ctx.shadowColor = c;
      ctx.strokeStyle = c;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(this.x, py, r + 1, 0, Math.PI * 2);
      ctx.stroke();

      // Halo pulsante exterior
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(this.t * 4);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.x, py, r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      const ic = POWERUP_CFG[this.type].icon;
      ctx.save();
      ctx.shadowBlur = 16; ctx.shadowColor = c;
      ctx.fillStyle = c + '33'; ctx.strokeStyle = c; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.x, py, this.radius, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.font = '13px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ic, this.x, py);
      ctx.restore();
    }
  }
}

// ============================================================
// SECCIÓN 7: ENEMIGO
// ============================================================
const ENEMY_CFG = {
  normal: { fillColor: '#ff2d78', glowColor: '#ff2d78', radius: 14, shape: 'circle' },
  fast: { fillColor: '#ffe600', glowColor: '#ffe600', radius: 10, shape: 'diamond' },
  tank: { fillColor: '#bf5fff', glowColor: '#bf5fff', radius: 22, shape: 'hex' },
  boss: { fillColor: '#ff6600', glowColor: '#ff6600', radius: 40, shape: 'star' }
};

class Enemy {
  constructor(x, y, type, wave) {
    this.x = x; this.y = y; this.type = type; this.wave = wave;
    this.dead = false; this.flashTimer = 0; this.damageTimer = 0; this.wob = 0;
    const sc = 1 + (wave - 1) * 0.08;
    const B = BALANCE;
    const stats = {
      normal: { hp: B.ENEMY_NORMAL_HP, spd: B.ENEMY_NORMAL_SPEED, dmg: B.ENEMY_NORMAL_DAMAGE, coins: B.ENEMY_NORMAL_COINS, score: B.ENEMY_NORMAL_SCORE },
      fast: { hp: B.ENEMY_FAST_HP, spd: B.ENEMY_FAST_SPEED, dmg: B.ENEMY_FAST_DAMAGE, coins: B.ENEMY_FAST_COINS, score: B.ENEMY_FAST_SCORE },
      tank: { hp: B.ENEMY_TANK_HP, spd: B.ENEMY_TANK_SPEED, dmg: B.ENEMY_TANK_DAMAGE, coins: B.ENEMY_TANK_COINS, score: B.ENEMY_TANK_SCORE },
      boss: { hp: B.ENEMY_BOSS_HP_BASE, spd: B.ENEMY_BOSS_SPEED, dmg: B.ENEMY_BOSS_DAMAGE, coins: B.ENEMY_BOSS_COINS, score: B.ENEMY_BOSS_SCORE }
    }[type];
    this.maxHp = stats.hp * sc; this.hp = this.maxHp;
    this.speed = stats.spd; this.damage = stats.dmg * sc;
    this.coins = stats.coins; this.score = stats.score;
    const cfg = ENEMY_CFG[type];
    this.color = cfg.fillColor; this.glow = cfg.glowColor;
    this.radius = type === 'boss' ? 40 + Math.floor(wave / 5) * 4 : cfg.radius;
    this.shape = cfg.shape;
  }
  takeDamage(dmg) {
    this.hp -= dmg; this.flashTimer = 0.1;
    if (this.hp <= 0) { this.dead = true; return true; } return false;
  }
  update(dt, tx, ty) {
    const a = ang(this.x, this.y, tx, ty);
    this.x += Math.cos(a) * this.speed * dt;
    this.y += Math.sin(a) * this.speed * dt;
    this.wob += dt * 3;
    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.damageTimer > 0) this.damageTimer -= dt;
  }
  draw(ctx) {
    const r = this.radius;
    const img = G.enemyImgs[this.type];
    ctx.save();

    if (img && img.complete && img.naturalWidth > 0) {
      // --- Clip circular ---
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
      ctx.clip();

      // Glow exterior
      ctx.shadowBlur = 20;
      ctx.shadowColor = this.glow;

      // Rotación suave hacia la torre (wob usado como ángulo incremental suave)
      ctx.translate(this.x, this.y);
      ctx.rotate(this.wob * 0.15);

      // Dibujar imagen cuadrada centrada, escalada al diámetro
      const d = r * 2;
      ctx.drawImage(img, -r, -r, d, d);

      // Flash blanco al recibir daño: overlay semitransparente
      if (this.flashTimer > 0) {
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-r, -r, d, d);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
      ctx.save();

      // Anillo de glow alrededor del sprite
      ctx.shadowBlur = 18; ctx.shadowColor = this.glow;
      ctx.strokeStyle = this.flashTimer > 0 ? '#ffffff' : this.glow;
      ctx.lineWidth = this.type === 'boss' ? 3 : 2;
      ctx.beginPath(); ctx.arc(this.x, this.y, r + 1, 0, Math.PI * 2); ctx.stroke();

      // Anillo extra pulsante para el jefe
      if (this.type === 'boss') {
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.wob * 2);
        ctx.strokeStyle = this.glow;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(this.x, this.y, r + 10, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }

    } else {
      // Fallback geométrico si la imagen no cargó
      ctx.shadowBlur = 18; ctx.shadowColor = this.glow;
      ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : this.color;
      ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.fill();
    }

    // Barra de vida
    const bw = r * 2.2, bh = 4, bx = this.x - bw / 2, by = this.y - r - 10;
    const pct = this.hp / this.maxHp;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#111'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = pct > 0.5 ? '#39ff14' : pct > 0.25 ? '#ffe600' : '#ff2d78';
    ctx.fillRect(bx, by, bw * pct, bh);
    ctx.restore();
  }
}

// ============================================================
// SECCIÓN 8: TORRETA AUTOMÁTICA
// ============================================================
class AutoTurret {
  constructor(cx, cy, towerR, index) {
    this.cx = cx; this.cy = cy;
    this.angle = index * (Math.PI * 2 / BALANCE.TURRET_MAX);
    this.orbitR = towerR + 30;
    this.x = cx + Math.cos(this.angle) * this.orbitR;
    this.y = cy + Math.sin(this.angle) * this.orbitR;
    this.aimAngle = 0; this.fireTimer = 0;
  }
  update(dt, enemies, bullets) {
    let nearest = null, nearD = BALANCE.TURRET_RANGE * BALANCE.TURRET_RANGE;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = dist2(this.x, this.y, e.x, e.y);
      if (d < nearD) { nearD = d; nearest = e; }
    }
    if (nearest) {
      const target = ang(this.x, this.y, nearest.x, nearest.y);
      let diff = target - this.aimAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.aimAngle += diff * Math.min(1, 5 * dt);
      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        this.fireTimer = BALANCE.TURRET_FIRE_RATE;
        const s = BALANCE.TURRET_BULLET_SPEED;
        bullets.push(new Bullet(
          this.x, this.y,
          Math.cos(this.aimAngle) * s, Math.sin(this.aimAngle) * s,
          BALANCE.TURRET_DAMAGE, 4, '#00f5ff'
        ));
      }
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.shadowBlur = 10; ctx.shadowColor = '#00f5ff';
    ctx.fillStyle = '#112244'; ctx.strokeStyle = '#00f5ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(this.x, this.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#00f5ff'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + Math.cos(this.aimAngle) * 14, this.y + Math.sin(this.aimAngle) * 14);
    ctx.stroke();
    ctx.restore();
  }
}

// ============================================================
// SECCIÓN 9: TORRE
// ============================================================
class Tower {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.maxHp = BALANCE.TOWER_HP_MAX; this.hp = this.maxHp;
    this.radius = BALANCE.TOWER_RADIUS;
    this.rot = 0; this.hitTimer = 0;
  }
  takeDamage(dmg) { this.hp = Math.max(0, this.hp - dmg); this.hitTimer = 0.35; }
  heal(amt) { this.hp = Math.min(this.maxHp, this.hp + amt); }
  isAlive() { return this.hp > 0; }
  update(dt) { this.rot += dt * 0.5; if (this.hitTimer > 0) this.hitTimer -= dt; }
  draw(ctx) {
    const r = this.radius;
    const hit = this.hitTimer > 0;
    const t = Date.now();
    // Colores del escudo Boca: azul electrico y dorado neon
    const blue = hit ? '#ff2d78' : '#003f9e';  // azul Boca (rojo si recibe daño)
    const gold = hit ? '#ff6600' : '#f5c518';  // dorado Boca
    const glow = hit ? '#ff2d78' : '#00aaff';  // color del glow exterior

    ctx.save();
    ctx.translate(this.x, this.y);

    // ---- CAPA 1: halo de energía exterior (pulsa) ----
    const halo = 0.4 + Math.sin(t * 0.003) * 0.25;
    ctx.save();
    ctx.globalAlpha = hit ? 0.85 : halo;
    ctx.shadowBlur = hit ? 55 : 35;
    ctx.shadowColor = glow;
    ctx.strokeStyle = glow;
    ctx.lineWidth = hit ? 4 : 2.5;
    ctx.beginPath(); ctx.arc(0, 0, r + 22, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();

    // ---- CAPA 2: anillos hexagonales giratorios (dorados) ----
    ctx.save();
    ctx.rotate(this.rot);
    ctx.strokeStyle = gold;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 12; ctx.shadowColor = gold;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      const seg = Math.PI / 6;
      ctx.beginPath();
      ctx.arc(0, 0, r + 13, a, a + seg); ctx.stroke();
    }
    ctx.restore();

    // ---- CAPA 3: anillo interno giratorio (azul, sentido contrario) ----
    ctx.save();
    ctx.rotate(-this.rot * 1.3);
    ctx.strokeStyle = blue === '#ff2d78' ? '#ff2d78' : '#1a6eff';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8; ctx.shadowColor = blue;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const seg = Math.PI / 10;
      ctx.beginPath();
      ctx.arc(0, 0, r + 5, a, a + seg); ctx.stroke();
    }
    ctx.restore();

    // ---- CAPA 4: chispas orbitales ----
    ctx.save();
    ctx.shadowBlur = 14; ctx.shadowColor = gold;
    ctx.fillStyle = gold;
    const sparks = 6;
    for (let i = 0; i < sparks; i++) {
      const angle = this.rot * 2.2 + i / sparks * Math.PI * 2;
      const sr = r + 14 + Math.sin(t * 0.006 + i) * 4;
      const sx = Math.cos(angle) * sr;
      const sy = Math.sin(angle) * sr;
      const ss = 2 + Math.sin(t * 0.008 + i * 1.5) * 1.5;
      ctx.beginPath(); ctx.arc(sx, sy, ss, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // ---- CAPA 5: base circular sólida ----
    ctx.save();
    ctx.shadowBlur = hit ? 30 : 18;
    ctx.shadowColor = glow;
    // Fondo del círculo: degradado azul oscuro / negro
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    grad.addColorStop(0, hit ? '#220010' : '#001433');
    grad.addColorStop(0.7, hit ? '#330010' : '#000d26');
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
    ctx.strokeStyle = hit ? '#ff2d78' : gold;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.restore();

    // ---- CAPA 6: imagen del escudo (clip circular) ----
    const img = G.towerImg;
    if (img) {
      const imgR = r * 0.85; // la imagen es un poco más pequeña que la base
      ctx.save();
      // Clip circular para que la imagen quede perfecta dentro
      ctx.beginPath(); ctx.arc(0, 0, imgR, 0, Math.PI * 2); ctx.clip();
      // Imagen centrada, sin rotación (el escudo siempre mira arriba)
      ctx.drawImage(img, -imgR, -imgR, imgR * 2, imgR * 2);
      // Overlay de color: tinte azul suave para mezclar con el estilo neon
      ctx.globalAlpha = hit ? 0.0 : 0.18;
      ctx.fillStyle = '#003f9e';
      ctx.fillRect(-imgR, -imgR, imgR * 2, imgR * 2);
      ctx.restore();

      // Borde brillante sobre la imagen
      ctx.save();
      ctx.shadowBlur = hit ? 22 : 14;
      ctx.shadowColor = hit ? '#ff2d78' : gold;
      ctx.strokeStyle = hit ? '#ff2d78' : gold;
      ctx.lineWidth = hit ? 3 : 2;
      ctx.beginPath(); ctx.arc(0, 0, imgR, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    } else {
      // Fallback: texto si la imagen no cargó aún
      ctx.save();
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = gold;
      ctx.fillText('🏆', 0, 0);
      ctx.restore();
    }

    // ---- CAPA 7: destello de impacto ----
    if (hit) {
      ctx.save();
      const hpct = this.hitTimer / 0.35;
      ctx.globalAlpha = hpct * 0.45;
      const hitGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r + 10);
      hitGrad.addColorStop(0, '#ff2d78');
      hitGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = hitGrad;
      ctx.beginPath(); ctx.arc(0, 0, r + 10, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }
}

// ============================================================
// SECCIÓN 10: JUGADOR
// ============================================================
class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.radius = BALANCE.PLAYER_RADIUS;
    this.speed = BALANCE.PLAYER_SPEED;
    this.fireRate = BALANCE.PLAYER_FIRE_RATE;
    this.damage = BALANCE.BULLET_DAMAGE;
    this.aimAngle = 0; this.fireTimer = 0;
    this.tripleTimer = 0; this.shieldTimer = 0;
    this.hasShield = false; this.flashTimer = 0;
    this.thruster = [];
    // Super disparo (Q)
    this.superCooldown = 0;
    this.superFlash = 0;
    // Tiro pesado (E)
    this.heavyCooldown = 0;
    this.heavyFlash = 0;
  }
  activateTriple(d) { this.tripleTimer = d; }
  activateShield(d) { this.shieldTimer = d; this.hasShield = true; }
  update(dt, keys, mx, my, bullets, audio, cw, ch) {
    let dx = 0, dy = 0;
    if (keys['a'] || keys['A'] || keys['ArrowLeft']) dx -= 1;
    if (keys['d'] || keys['D'] || keys['ArrowRight']) dx += 1;
    if (keys['w'] || keys['W'] || keys['ArrowUp']) dy -= 1;
    if (keys['s'] || keys['S'] || keys['ArrowDown']) dy += 1;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 0) {
      dx /= mag; dy /= mag;
      this.x += dx * this.speed * dt; this.y += dy * this.speed * dt;
      this.thruster.push({
        x: this.x - dx * 10, y: this.y - dy * 10,
        vx: (-dx + randRange(-0.4, 0.4)) * 55, vy: (-dy + randRange(-0.4, 0.4)) * 55,
        life: 0.22, ml: 0.22
      });
    }
    this.x = clamp(this.x, this.radius, cw - this.radius);
    this.y = clamp(this.y, this.radius, ch - this.radius);
    this.aimAngle = ang(this.x, this.y, mx, my);
    if (this.tripleTimer > 0) { this.tripleTimer -= dt; }
    if (this.shieldTimer > 0) { this.shieldTimer -= dt; if (this.shieldTimer <= 0) this.hasShield = false; }
    if (this.flashTimer > 0) this.flashTimer -= dt;
    this.fireTimer -= dt;
    if ((keys['mouse'] || keys[' ']) && this.fireTimer <= 0) {
      this.fireTimer = this.fireRate;
      this._fire(bullets); audio.shoot();
      this.flashTimer = 0.05;
    }
    // Super disparo — tecla Q
    if (this.superCooldown > 0) this.superCooldown -= dt;
    if (this.superFlash > 0) this.superFlash -= dt;
    if (keys['super_trigger']) {
      keys['super_trigger'] = false;
      if (this.superCooldown <= 0) {
        this.superCooldown = BALANCE.SUPER_COOLDOWN;
        this._superFire(bullets);
        audio.superShoot();
        this.superFlash = 0.18;
      }
    }
    // Tiro pesado — tecla E
    if (this.heavyCooldown > 0) this.heavyCooldown -= dt;
    if (this.heavyFlash > 0) this.heavyFlash -= dt;
    if (keys['heavy_trigger']) {
      keys['heavy_trigger'] = false;
      if (this.heavyCooldown <= 0) {
        this.heavyCooldown = BALANCE.HEAVY_COOLDOWN;
        this._heavyFire(bullets);
        audio.heavyShoot();
        this.heavyFlash = 0.25;
      }
    }
    this.thruster = this.thruster.filter(p => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; return p.life > 0;
    });
  }
  _fire(bullets) {
    const s = BALANCE.BULLET_SPEED, a = this.aimAngle;
    const bx = this.x + Math.cos(a) * this.radius, by = this.y + Math.sin(a) * this.radius;
    bullets.push(new Bullet(bx, by, Math.cos(a) * s, Math.sin(a) * s, this.damage, BALANCE.BULLET_RADIUS, '#ffe600'));
    if (this.tripleTimer > 0) {
      [0.22, -0.22].forEach(off => {
        bullets.push(new Bullet(bx, by, Math.cos(a + off) * s, Math.sin(a + off) * s, this.damage * 0.7, BALANCE.BULLET_RADIUS - 1, '#ff9900'));
      });
    }
  }
  // Super disparo: abanico de balas en 360° centrado en la dirección de apuntado
  _superFire(bullets) {
    const n = BALANCE.SUPER_BULLETS;
    const s = BALANCE.SUPER_SPEED;
    const spread = Math.PI * 2;
    const startAng = this.aimAngle - spread / 2;
    for (let i = 0; i < n; i++) {
      const a = startAng + (spread / (n - 1)) * i;
      const bx = this.x + Math.cos(a) * this.radius;
      const by = this.y + Math.sin(a) * this.radius;
      bullets.push(new Bullet(bx, by, Math.cos(a) * s, Math.sin(a) * s,
        BALANCE.SUPER_DAMAGE, BALANCE.SUPER_RADIUS, '#ff2d78'));
    }
  }
  // Tiro pesado: UNA bala enorme hacia donde apunta el jugador
  _heavyFire(bullets) {
    const a = this.aimAngle;
    const s = BALANCE.HEAVY_SPEED;
    const bx = this.x + Math.cos(a) * this.radius;
    const by = this.y + Math.sin(a) * this.radius;
    bullets.push(new Bullet(bx, by, Math.cos(a) * s, Math.sin(a) * s,
      BALANCE.HEAVY_DAMAGE, BALANCE.HEAVY_RADIUS, '#bf5fff'));
  }
  draw(ctx) {
    // Thruster
    this.thruster.forEach(p => {
      const t = p.life / p.ml;
      ctx.save(); ctx.globalAlpha = t * 0.65;
      ctx.shadowBlur = 5; ctx.shadowColor = '#00f5ff'; ctx.fillStyle = '#00f5ff';
      ctx.beginPath(); ctx.arc(p.x, p.y, 3 * t, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
    // Escudo
    if (this.hasShield) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.008) * 0.15;
      ctx.shadowBlur = 18; ctx.shadowColor = '#00f5ff';
      ctx.strokeStyle = '#00f5ff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    // Flash de super disparo (Q)
    if (this.superFlash > 0) {
      ctx.save();
      const sf = this.superFlash / 0.18;
      ctx.globalAlpha = sf * 0.45;
      ctx.shadowBlur = 40; ctx.shadowColor = '#ff2d78';
      ctx.strokeStyle = '#ff2d78'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * 2.5, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    // Flash de tiro pesado (E): anillo morado grande
    if (this.heavyFlash > 0) {
      ctx.save();
      const hf = this.heavyFlash / 0.25;
      ctx.globalAlpha = hf * 0.55;
      ctx.shadowBlur = 55; ctx.shadowColor = '#bf5fff';
      ctx.strokeStyle = '#bf5fff'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * 3.5, 0, Math.PI * 2); ctx.stroke();
      // Segundo anillo interior
      ctx.globalAlpha = hf * 0.3;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.aimAngle + Math.PI / 2);
    const flash = this.flashTimer > 0 || this.superFlash > 0 || this.heavyFlash > 0;
    const col = this.heavyFlash > 0 ? '#bf5fff' : this.superFlash > 0 ? '#ff2d78' : flash ? '#ffffff' : '#39ff14';
    ctx.shadowBlur = (this.heavyFlash > 0 || this.superFlash > 0) ? 30 : 16;
    ctx.shadowColor = col; ctx.fillStyle = col;
    const r = this.radius;
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.65, r * 0.65); ctx.lineTo(0, r * 0.35); ctx.lineTo(-r * 0.65, r * 0.65);
    ctx.closePath(); ctx.fill();
    if (this.tripleTimer > 0) {
      ctx.fillStyle = '#ffe600'; ctx.shadowColor = '#ffe600';
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

// ============================================================
// SECCIÓN 11: GESTOR DE OLEADAS
// ============================================================
class WaveManager {
  constructor() { this.queue = []; this.spawnTimer = 0; this.spawnRate = BALANCE.WAVE_SPAWN_RATE; }
  start(wave) {
    this.queue = this._build(wave);
    this.spawnRate = Math.max(BALANCE.WAVE_MIN_SPAWN, BALANCE.WAVE_SPAWN_RATE - (wave - 1) * BALANCE.WAVE_SPAWN_DEC);
    this.spawnTimer = 0;
  }
  _build(wave) {
    // El boss siempre aparece al FINAL de cada oleada
    const count = BALANCE.WAVE_BASE_COUNT + (wave - 1) * BALANCE.WAVE_COUNT_INC;
    const q = [];
    // Primero spawneamos los enemigos normales/rápidos/tanques
    for (let i = 0; i < count; i++) q.push({ type: this._rnd(wave), wave });
    // El boss siempre al final, como jefe de ronda
    q.push({ type: 'boss', wave });
    return q;
  }
  _rnd(wave) {
    const r = Math.random();
    if (wave < 3) return r < 0.7 ? 'normal' : 'fast';
    if (wave < 6) return r < 0.5 ? 'normal' : r < 0.8 ? 'fast' : 'tank';
    return r < 0.4 ? 'normal' : r < 0.65 ? 'fast' : 'tank';
  }
  update(dt, enemies, cw, ch) {
    if (!this.queue.length) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.spawnRate;
      const spec = this.queue.shift();
      if (spec) enemies.push(this._spawn(spec, cw, ch));
    }
  }
  _spawn({ type, wave }, cw, ch) {
    const side = randInt(0, 3), m = 40;
    let x, y;
    switch (side) {
      case 0: x = randRange(0, cw); y = -m; break;
      case 1: x = cw + m; y = randRange(0, ch); break;
      case 2: x = randRange(0, cw); y = ch + m; break;
      default: x = -m; y = randRange(0, ch);
    }
    return new Enemy(x, y, type, wave);
  }
  isDone(enemies) { return !this.queue.length && !enemies.some(e => !e.dead); }
}

// ============================================================
// SECCIÓN 12: TIENDA
// ============================================================
class Shop {
  constructor(audio) { this.audio = audio; this.levels = {}; this.reset(); }
  reset() { this.levels = { damage: 0, firerate: 0, speed: 0, repair: 0, towermax: 0 }; }
  _price(base, lv) { return Math.floor(base * Math.pow(BALANCE.SHOP_PRICE_SCALE, lv)); }
  getItems(coins, turretCount) {
    const B = BALANCE, L = this.levels, MX = B.MAX_SHOP_LEVEL;
    return [
      { id: 'damage', name: '⚔️ Daño', desc: `+6 daño por bala. Niv ${L.damage}/${MX}`, cost: L.damage < MX ? this._price(B.SHOP_DAMAGE_COST, L.damage) : null, maxed: L.damage >= MX },
      { id: 'firerate', name: '🔫 Cadencia', desc: `Dispara más rápido. Niv ${L.firerate}/${MX}`, cost: L.firerate < MX ? this._price(B.SHOP_FIRERATE_COST, L.firerate) : null, maxed: L.firerate >= MX },
      { id: 'speed', name: '💨 Velocidad', desc: `+30 velocidad. Niv ${L.speed}/${MX}`, cost: L.speed < MX ? this._price(B.SHOP_SPEED_COST, L.speed) : null, maxed: L.speed >= MX },
      { id: 'repair', name: '🔧 Reparar Torre', desc: `Restaura 80 HP a la torre.`, cost: this._price(B.SHOP_REPAIR_COST, L.repair), maxed: false },
      { id: 'towermax', name: '🏯 Torre Mejorada', desc: `+80 HP máximo. Niv ${L.towermax}/${MX}`, cost: L.towermax < MX ? this._price(B.SHOP_TOWERMAX_COST, L.towermax) : null, maxed: L.towermax >= MX },
      { id: 'turret', name: '🤖 Torreta Auto', desc: `Torretas: ${turretCount}/${B.TURRET_MAX}`, cost: turretCount < B.TURRET_MAX ? this._price(B.SHOP_TURRET_COST, turretCount) : null, maxed: turretCount >= B.TURRET_MAX }
    ];
  }
  apply(id, player, tower, turrets) {
    const L = this.levels, B = BALANCE;
    switch (id) {
      case 'damage': player.damage += 6; L.damage++; break;
      case 'firerate': player.fireRate = Math.max(0.06, player.fireRate - 0.025); L.firerate++; break;
      case 'speed': player.speed += 30; L.speed++; break;
      case 'repair': tower.heal(80); L.repair++; break;
      case 'towermax':
        if (L.towermax < B.MAX_SHOP_LEVEL) { tower.maxHp += 80; tower.heal(40); L.towermax++; } break;
      case 'turret':
        if (turrets.length < B.TURRET_MAX)
          turrets.push(new AutoTurret(tower.x, tower.y, tower.radius, turrets.length));
        break;
    }
    this.audio.buy();
  }
}

// ============================================================
// SECCIÓN 13: ESTADO GLOBAL & CANVAS
// ============================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const G = {
  state: 'start',
  wave: 0, score: 0, coins: 0,
  best: parseInt(localStorage.getItem('bocadefense_best') || '0'),
  enemies: [], bullets: [], particles: [], powerups: [], turrets: [],
  hitTexts: [],
  player: null, tower: null, waveManager: null, shop: null,
  audio: new AudioManager(),
  keys: {}, mouseX: 0, mouseY: 0,
  shakeX: 0, shakeY: 0, shakeAmt: 0, shakeDur: 0, shakeT: 0,
  flashAlpha: 0,
  stars: [],
  lastTime: 0, animId: null,
  towerImg: null,        // imagen del escudo (torre.png)
  bgImg: null,           // imagen de fondo (boca.jpg)
  enemyImgs: {},         // sprites de enemigos por tipo
  powerupImgs: {},       // sprites de power-ups por tipo
  daleBocaTimer: 0,      // contador para la celebración entre oleadas
  daleBocaParticles: []  // partículas de confetti Boca
};

// ============================================================
// SECCIÓN 14: INICIALIZACIÓN DEL JUEGO
// ============================================================
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  G.mouseX = canvas.width / 2; G.mouseY = canvas.height / 2;
}
window.addEventListener('resize', resizeCanvas);

// Precarga la imagen de la torre (se usa en Tower.draw)
(function loadTowerImage() {
  const img = new Image();
  img.src = 'img/torre.png';
  img.onload = () => { G.towerImg = img; };
})();

// Precarga la imagen de fondo
(function loadBgImage() {
  const img = new Image();
  img.src = 'img/boca.jpg';
  img.onload = () => { G.bgImg = img; };
})();

// Precarga los sprites de enemigos
(function loadEnemyImages() {
  const srcs = {
    normal: 'img/river.png',
    fast: 'img/racing.webp',
    tank: 'img/independiente.webp',
    boss: 'img/chiqui.jfif'
  };
  for (const [type, src] of Object.entries(srcs)) {
    const img = new Image();
    img.src = src;
    img.onload = () => { G.enemyImgs[type] = img; };
  }
})();

// Precarga los sprites de power-ups
(function loadPowerupImages() {
  const img = new Image();
  img.src = 'img/speed.png';
  img.onerror = () => { img.src = 'img/speed.jfif'; };
  img.onload = () => { G.powerupImgs.triple = img; };
})();

function initStars() {
  G.stars = Array.from({ length: 130 }, () => ({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    r: Math.random() * 1.4 + 0.3, a: Math.random() * 0.5 + 0.08
  }));
}

function startGame() {
  resizeCanvas();
  const cx = canvas.width / 2, cy = canvas.height / 2;
  G.state = 'playing';
  G.wave = 0; G.score = 0; G.coins = 0;
  G.enemies = []; G.bullets = []; G.particles = []; G.powerups = [];
  G.turrets = []; G.hitTexts = [];
  G.shakeX = 0; G.shakeY = 0; G.shakeAmt = 0; G.shakeDur = 0; G.shakeT = 0;
  G.flashAlpha = 0;
  G.tower = new Tower(cx, cy);
  G.player = new Player(cx, cy + 130);
  G.waveManager = new WaveManager();
  G.shop = new Shop(G.audio);
  initStars();
  document.getElementById('hud').classList.remove('hidden');
  showScreen('none');
  updateHUD();
  launchWave();
}

// ============================================================
// SECCIÓN 15: FLUJO DE OLEADAS Y TIENDA
// ============================================================
function launchWave() {
  G.wave++;
  G.waveManager.start(G.wave);
  G.audio.wave();
  const isBoss = G.wave % 5 === 0;
  const ann = document.getElementById('wave-announce');
  const sub = document.getElementById('wave-sub');
  ann.textContent = isBoss ? `⚠️ OLEADA JEFE — ${G.wave}` : `OLEADA ${G.wave}`;
  // Colores Boca: dorado para normal, rojo para boss
  ann.style.color = isBoss ? '#ff2d78' : '#f5c518';
  ann.style.textShadow = isBoss
    ? '0 0 20px #ff2d78, 0 0 60px #ff2d7866'
    : '0 0 20px #f5c518, 0 0 60px #f5c51866';
  sub.textContent = isBoss ? '¡Preparáte para el jefe!' : '';
  document.getElementById('wave-num').textContent = G.wave;
  showScreen('wave');
  G.state = 'wave-announce';
  setTimeout(() => { if (G.state === 'wave-announce') { showScreen('none'); G.state = 'playing'; } },
    BALANCE.WAVE_ANNOUNCE_TIME);
}

function openShop() {
  G.state = 'shop';
  renderShop();
  showScreen('shop');
}

function renderShop() {
  document.getElementById('shop-coins').textContent = G.coins;
  const container = document.getElementById('shop-items');
  container.innerHTML = '';
  const items = G.shop.getItems(G.coins, G.turrets.length);
  items.forEach(item => {
    const canBuy = item.cost !== null && G.coins >= item.cost && !item.maxed;
    const div = document.createElement('div');
    div.className = 'shop-item' + (canBuy ? '' : ' disabled');
    div.innerHTML = `
      <div class="item-name">${item.name}</div>
      <div class="item-desc">${item.desc}</div>
      <div class="item-cost">${item.maxed ? '✅ Máximo' : item.cost === null ? '✅ Máximo' : '💰 ' + item.cost}</div>`;
    if (canBuy) div.addEventListener('click', () => {
      G.coins -= item.cost;
      G.shop.apply(item.id, G.player, G.tower, G.turrets);
      renderShop(); updateHUD();
    });
    container.appendChild(div);
  });
}

// ============================================================
// SECCIÓN 16: GAME LOOP
// ============================================================
function gameLoop(ts) {
  const dt = Math.min((ts - G.lastTime) / 1000, 0.05);
  G.lastTime = ts;
  update(dt);
  draw();
  G.animId = requestAnimationFrame(gameLoop);
}

// ============================================================
// SECCIÓN 17: UPDATE
// ============================================================
function update(dt) {
  // La celebración Boca se actualiza siempre que esté activa
  updateDaleBoca(dt);
  if (G.state !== 'playing') return;
  const T = G.tower, P = G.player;

  // Screen shake
  if (G.shakeT > 0) {
    G.shakeT -= dt;
    const f = G.shakeT / G.shakeDur;
    G.shakeX = randRange(-1, 1) * G.shakeAmt * f;
    G.shakeY = randRange(-1, 1) * G.shakeAmt * f;
    if (G.shakeT <= 0) { G.shakeX = 0; G.shakeY = 0; }
  }
  if (G.flashAlpha > 0) G.flashAlpha = Math.max(0, G.flashAlpha - dt * 5);

  // Entidades
  T.update(dt);
  P.update(dt, G.keys, G.mouseX - G.shakeX, G.mouseY - G.shakeY, G.bullets, G.audio, canvas.width, canvas.height);
  G.turrets.forEach(t => t.update(dt, G.enemies, G.bullets));
  G.waveManager.update(dt, G.enemies, canvas.width, canvas.height);

  // Balas
  G.bullets = G.bullets.filter(b => {
    b.update(dt);
    if (b.dead || b.isOffScreen(canvas.width, canvas.height)) return false;
    // Colisión con enemigos
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (dist2(b.x, b.y, e.x, e.y) < (b.radius + e.radius) ** 2) {
        b.dead = true; G.audio.impact();
        const killed = e.takeDamage(b.damage);
        pushText(e.x, e.y - e.radius - 8, `-${Math.round(b.damage)}`, '#ffffff');
        if (killed) onEnemyKill(e);
        else spawnParticles(e.x, e.y, e.color, 3);
        break;
      }
    }
    return !b.dead;
  });

  // Enemigos vs Torre
  G.enemies.forEach(e => {
    if (e.dead) return;
    e.update(dt, T.x, T.y);
    if (dist(e.x, e.y, T.x, T.y) < e.radius + T.radius) {
      if (e.damageTimer <= 0) {
        e.damageTimer = 0.5;
        T.takeDamage(e.damage);
        G.audio.towerHit();
        shake(BALANCE.SHAKE_TOWER, 0.3);
        pushText(T.x + randRange(-20, 20), T.y - T.radius - 12, `-${Math.round(e.damage)}`, '#ff2d78');
      }
    }
  });

  // Separación suave entre enemigos vivos (flocking)
  const living = G.enemies.filter(e => !e.dead);
  for (let i = 0; i < living.length; i++) {
    for (let j = i + 1; j < living.length; j++) {
      const a = living[i], b = living[j];
      const minDist = (a.radius + b.radius) * 0.8;
      const dx = a.x - b.x, dy = a.y - b.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
      if (d < minDist) {
        const overlap = (minDist - d) / d;
        const force = overlap * 60 * dt;
        a.x += dx * force; a.y += dy * force;
        b.x -= dx * force; b.y -= dy * force;
      }
    }
  }

  // Power-ups
  G.powerups = G.powerups.filter(pu => {
    if (pu.dead) return false;
    pu.update(dt);
    if (dist(pu.x, pu.y, P.x, P.y) < pu.radius + P.radius) {
      applyPowerup(pu.type); pu.dead = true; G.audio.powerup();
    }
    return !pu.dead;
  });

  // Textos flotantes
  G.hitTexts = G.hitTexts.filter(t => { t.y -= 40 * dt; t.life -= dt; return t.life > 0; });

  // Partículas
  G.particles = G.particles.filter(p => { p.update(dt); return p.life > 0; });

  // ¿Oleada terminada?
  if (G.waveManager.isDone(G.enemies)) {
    G.enemies = G.enemies.filter(e => !e.dead);
    G.state = 'between';
    // Mostrar celebración Boca antes de abrir la tienda
    setTimeout(() => {
      if (G.state === 'between') startDaleBoca();
    }, BALANCE.INTER_WAVE_PAUSE);
  }

  // ¿Torre destruida?
  if (!T.isAlive()) gameOver();

  updateHUD();
}

// ============================================================
// SECCIÓN 18: HELPERS DE GAMEPLAY
// ============================================================
function onEnemyKill(e) {
  e.dead = true; G.audio.enemyDie();
  if (e.type === 'boss') G.audio.bossDie();
  G.score += e.score; G.coins += e.coins;
  const count = e.type === 'boss' ? BALANCE.PARTICLES_BOSS : BALANCE.PARTICLES_NORMAL;
  spawnParticles(e.x, e.y, e.color, count);
  pushText(e.x, e.y - e.radius, `+${e.score}`, '#ffe600');
  if (Math.random() < BALANCE.POWERUP_DROP_CHANCE) {
    const types = ['triple', 'shield', 'bomb'];
    G.powerups.push(new PowerUp(e.x, e.y, types[randInt(0, 2)]));
  }
}

function applyPowerup(type) {
  const P = G.player;
  if (type === 'triple') {
    P.activateTriple(BALANCE.POWERUP_TRIPLE_DUR);
    pushText(P.x, P.y - 35, '⚡ DISPARO TRIPLE', '#ffe600');
  } else if (type === 'shield') {
    P.activateShield(BALANCE.POWERUP_SHIELD_DUR);
    pushText(P.x, P.y - 35, '🛡️ ESCUDO', '#00f5ff');
    const si = document.getElementById('shield-indicator');
    si.classList.remove('hidden');
    setTimeout(() => si.classList.add('hidden'), BALANCE.POWERUP_SHIELD_DUR * 1000);
  } else if (type === 'bomb') {
    G.enemies.forEach(e => { if (!e.dead) onEnemyKill(e); });
    shake(BALANCE.SHAKE_BOMB, 0.5);
    G.flashAlpha = 0.55;
    G.audio.bomb();
    pushText(canvas.width / 2, canvas.height / 2 - 50, '💣 ¡BOMBA!', '#ff2d78');
  }
}

function spawnParticles(x, y, color, n) {
  for (let i = 0; i < n; i++) G.particles.push(new Particle(x, y, color));
}
function shake(amt, dur) { G.shakeAmt = amt; G.shakeDur = dur; G.shakeT = dur; }
function pushText(x, y, text, color) { G.hitTexts.push({ x, y, text, color, life: 1.0, ml: 1.0 }); }

function gameOver() {
  G.state = 'gameover';
  if (G.score > G.best) { G.best = G.score; localStorage.setItem('bocadefense_best', G.best); }
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('go-wave-num').textContent = G.wave;
  document.getElementById('go-score-val').textContent = G.score;
  document.getElementById('go-best-val').textContent = G.best;
  showScreen('gameover');
}

// ============================================================
// SECCIÓN 18b: CELEBRACIÓN "DALE BOOOOO"
// ============================================================
const DALE_DURATION = 1.4; // segundos que dura la celebración

function startDaleBoca() {
  G.state = 'dale-boca';
  G.daleBocaTimer = 0;
  // Lanzar confetti Boca (azul y dorado)
  G.daleBocaParticles = [];
  const cx = canvas.width / 2, cy = canvas.height / 2;
  const BOCA_COLORS = ['#f5c518', '#003f9e', '#ffffff', '#f5c518', '#f5c518', '#003f9e'];
  for (let i = 0; i < 120; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randRange(180, 520);
    const color = BOCA_COLORS[Math.floor(Math.random() * BOCA_COLORS.length)];
    G.daleBocaParticles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - randRange(50, 200), // impulso hacia arriba
      life: randRange(1.8, DALE_DURATION),
      maxLife: DALE_DURATION,
      color,
      size: randRange(4, 11),
      rot: Math.random() * Math.PI * 2,
      rotSpeed: randRange(-4, 4),
      shape: Math.random() < 0.5 ? 'rect' : 'circle'
    });
  }
  // Sonido de celebración (fanfarria)
  G.audio._tone(523, 'sine', 0.12, 0.4);
  G.audio._tone(659, 'sine', 0.18, 0.4);
  G.audio._tone(784, 'sine', 0.22, 0.38);
  G.audio._tone(1047, 'sine', 0.3, 0.5);
  G.audio._noise(0.2, 0.15);
}

function updateDaleBoca(dt) {
  if (G.state !== 'dale-boca') return;
  G.daleBocaTimer += dt;
  // Actualizar partículas
  G.daleBocaParticles = G.daleBocaParticles.filter(p => {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += 400 * dt; // gravedad
    p.vx *= 0.98;
    p.life -= dt;
    p.rot += p.rotSpeed * dt;
    return p.life > 0;
  });
  // Terminar celebración y arrancar la siguiente oleada automáticamente
  if (G.daleBocaTimer >= DALE_DURATION) {
    G.daleBocaParticles = [];
    launchWave();
  }
}

function drawDaleBoca() {
  if (G.state !== 'dale-boca') return;
  const t = G.daleBocaTimer;
  const cx = canvas.width / 2, cy = canvas.height / 2;

  // Overlay oscuro suave
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,10,0.55)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ---- Partículas confetti ----
  G.daleBocaParticles.forEach(p => {
    const alpha = Math.min(1, p.life / 0.5); // fade out en los últimos 0.5s
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 8; ctx.shadowColor = p.color;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.shape === 'rect') {
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else {
      ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  });

  // ---- Texto "DALE" ----
  // Entra con scale desde 0 en los primeros 0.3s, luego sacude levemente
  const scaleIn = Math.min(1, t / 0.28);
  const shake1 = t > 0.3 ? Math.sin(t * 28) * 3 * Math.max(0, 1 - t / 1.5) : 0;
  const daleSize = Math.min(canvas.width * 0.22, 180);

  ctx.save();
  ctx.translate(cx + shake1, cy - daleSize * 0.55);
  ctx.scale(scaleIn, scaleIn);
  ctx.font = `900 ${daleSize}px 'Orbitron', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Borde dorado grueso
  ctx.strokeStyle = '#003f9e';
  ctx.lineWidth = daleSize * 0.12;
  ctx.lineJoin = 'round';
  ctx.strokeText('DALE', 0, 0);
  // Relleno dorado
  ctx.fillStyle = '#f5c518';
  ctx.shadowBlur = 60; ctx.shadowColor = '#f5c518';
  ctx.fillText('DALE', 0, 0);
  ctx.restore();

  // ---- Texto "BOOOOO" ----
  // Aparece 0.2s después, más grande y azul
  const bocaDelay = 0.22;
  const scaleInB = t > bocaDelay ? Math.min(1, (t - bocaDelay) / 0.32) : 0;
  const shake2 = t > 0.5 ? Math.sin(t * 22 + 1.5) * 4 * Math.max(0, 1 - t / 1.8) : 0;
  const bocaSize = Math.min(canvas.width * 0.19, 155);

  if (scaleInB > 0) {
    ctx.save();
    ctx.translate(cx + shake2, cy + bocaSize * 0.62);
    ctx.scale(scaleInB, scaleInB);
    ctx.font = `900 ${bocaSize}px 'Orbitron', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Borde dorado
    ctx.strokeStyle = '#f5c518';
    ctx.lineWidth = bocaSize * 0.10;
    ctx.lineJoin = 'round';
    ctx.strokeText('BOOOOO', 0, 0);
    // Relleno azul
    ctx.fillStyle = '#1a6eff';
    ctx.shadowBlur = 70; ctx.shadowColor = '#003f9e';
    ctx.fillText('BOOOOO', 0, 0);
    ctx.restore();
  }

  // ---- Subtítulo con oleada completada ----
  if (t > 0.6) {
    const subAlpha = Math.min(1, (t - 0.6) / 0.3);
    ctx.save();
    ctx.globalAlpha = subAlpha;
    ctx.font = `bold 16px 'Orbitron', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f5c518';
    ctx.shadowBlur = 10; ctx.shadowColor = '#f5c518';
    ctx.fillText(`✅ OLEADA ${G.wave} COMPLETADA`, cx, cy + bocaSize * 1.38);
    ctx.restore();
  }

  ctx.restore();
}

// ============================================================
// SECCIÓN 19: RENDER
// ============================================================
function draw() {
  ctx.save();
  ctx.translate(G.shakeX, G.shakeY);

  // Fondo: imagen boca.jpg + overlay oscuro para legibilidad
  if (G.bgImg && G.bgImg.complete && G.bgImg.naturalWidth > 0) {
    ctx.save();
    // Escalar la imagen para cubrir toda la pantalla (cover)
    const iw = G.bgImg.naturalWidth, ih = G.bgImg.naturalHeight;
    const scale = Math.max((canvas.width + 40) / iw, (canvas.height + 40) / ih);
    const sw = iw * scale, sh = ih * scale;
    const sx = -20 + (canvas.width + 40 - sw) / 2;
    const sy = -20 + (canvas.height + 40 - sh) / 2;
    ctx.globalAlpha = 0.55;  // imagen al 55% para que se vea pero no distraiga
    ctx.drawImage(G.bgImg, sx, sy, sw, sh);
    ctx.globalAlpha = 1;
    ctx.restore();
  } else {
    // Fallback color sólido si la imagen no cargó
    ctx.fillStyle = '#07070f';
    ctx.fillRect(-20, -20, canvas.width + 40, canvas.height + 40);
  }

  // Overlay oscuro para desaturar el fondo y asegurar legibilidad de enemigos
  ctx.fillStyle = 'rgba(0, 0, 15, 0.60)';
  ctx.fillRect(-20, -20, canvas.width + 40, canvas.height + 40);

  // Grid sutil encima del fondo
  ctx.strokeStyle = 'rgba(0,180,255,0.04)'; ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
  for (let y = 0; y < canvas.height; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

  // Estrellas
  G.stars.forEach(s => {
    ctx.globalAlpha = s.a; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Rango torreta
  if (G.turrets.length > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0,245,255,0.07)'; ctx.lineWidth = 1; ctx.setLineDash([4, 10]);
    ctx.beginPath(); ctx.arc(G.tower.x, G.tower.y, BALANCE.TURRET_RANGE, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
  }

  G.tower.draw(ctx);
  G.turrets.forEach(t => t.draw(ctx));
  G.powerups.forEach(p => { if (!p.dead) p.draw(ctx); });
  G.enemies.forEach(e => { if (!e.dead) e.draw(ctx); });
  G.bullets.forEach(b => b.draw(ctx));
  G.player.draw(ctx);
  G.particles.forEach(p => p.draw(ctx));

  // Textos flotantes
  G.hitTexts.forEach(t => {
    ctx.save();
    ctx.globalAlpha = t.life / t.ml;
    ctx.font = "bold 14px 'Orbitron',monospace";
    ctx.fillStyle = t.color; ctx.shadowBlur = 8; ctx.shadowColor = t.color;
    ctx.textAlign = 'center'; ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  });

  // Flash pantalla
  if (G.flashAlpha > 0) {
    ctx.fillStyle = `rgba(255,255,255,${G.flashAlpha * 0.12})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.restore();

  // HUD de habilidades, radar y celebración (fuera del ctx.save de shake)
  if (G.state === 'playing' || G.state === 'wave-announce' || G.state === 'dale-boca') {
    drawRadar();
    drawAbilitiesHUD();
  }
  // Celebración DALE BOOOOO (encima de todo)
  drawDaleBoca();
}

// ============================================================
// SECCIÓN 19b: RADAR DE ENEMIGOS
// ============================================================
function drawRadar() {
  if (!G.tower) return;
  const B = BALANCE;
  const size = B.RADAR_SIZE;
  const margin = B.RADAR_MARGIN;
  const r = size / 2;
  const cx = canvas.width - margin - r;
  const cy = canvas.height - margin - r;

  // --- Fondo del radar ---
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,5,20,0.82)';
  ctx.fill();
  ctx.strokeStyle = '#00f5ff44';
  ctx.lineWidth = 2;
  ctx.shadowBlur = 12; ctx.shadowColor = '#00f5ff';
  ctx.stroke();

  // Anillos concéntricos del radar
  ctx.shadowBlur = 0;
  [0.33, 0.66, 1.0].forEach(f => {
    ctx.beginPath();
    ctx.arc(cx, cy, r * f, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,245,255,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Líneas de cruz
  ctx.strokeStyle = 'rgba(0,245,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();

  // Barrido giratorio
  const sweepAngle = (Date.now() * 0.0012) % (Math.PI * 2);
  const grad = ctx.createConicalGradient
    ? null  // no disponible en todos los navegadores
    : null;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, sweepAngle, sweepAngle + Math.PI * 0.4);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,245,255,0.07)';
  ctx.fill();
  // Línea del barrido
  ctx.strokeStyle = 'rgba(0,245,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(sweepAngle) * r, cy + Math.sin(sweepAngle) * r);
  ctx.stroke();
  ctx.restore();

  // Clip al círculo del radar para los puntos
  ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, Math.PI * 2); ctx.clip();

  // Escala: mapear coordenadas de pantalla al radar
  const worldW = canvas.width, worldH = canvas.height;
  const towerScreenX = G.tower.x, towerScreenY = G.tower.y;

  // Radio del mundo que abarca el radar (un poco más grande que la pantalla)
  const worldRange = Math.max(worldW, worldH) * 0.72;

  // Colores y formas de cada tipo de enemigo en el radar
  const RADAR_ENEMY = {
    normal: { color: '#ff2d78', shape: 'circle' },
    fast: { color: '#ffe600', shape: 'diamond' },
    tank: { color: '#bf5fff', shape: 'square' },
    boss: { color: '#ff6600', shape: 'star' }
  };

  G.enemies.forEach(e => {
    if (e.dead) return;
    // Posición relativa a la torre, normalizada
    const dx = (e.x - towerScreenX) / worldRange;
    const dy = (e.y - towerScreenY) / worldRange;
    const ex = cx + dx * r;
    const ey = cy + dy * r;
    // Clampear al círculo
    const dd = Math.sqrt(dx * dx + dy * dy);
    const rx = dd > 1 ? (cx + (dx / dd) * r * 0.97) : ex;
    const ry = dd > 1 ? (cy + (dy / dd) * r * 0.97) : ey;

    const cfg = RADAR_ENEMY[e.type] || RADAR_ENEMY.normal;
    const ds = e.type === 'boss' ? B.RADAR_DOT_SIZE * 2.2 : B.RADAR_DOT_SIZE;
    const pulse = 0.8 + Math.sin(Date.now() * 0.006 + e.x) * 0.2;

    ctx.save();
    ctx.shadowBlur = 8; ctx.shadowColor = cfg.color;
    ctx.fillStyle = cfg.color;
    ctx.globalAlpha = pulse;

    switch (cfg.shape) {
      case 'circle':
        ctx.beginPath(); ctx.arc(rx, ry, ds, 0, Math.PI * 2); ctx.fill(); break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(rx, ry - ds); ctx.lineTo(rx + ds, ry);
        ctx.lineTo(rx, ry + ds); ctx.lineTo(rx - ds, ry);
        ctx.closePath(); ctx.fill(); break;
      case 'square':
        ctx.fillRect(rx - ds, ry - ds, ds * 2, ds * 2); break;
      case 'star':
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * Math.PI * 2;
          const rr = i % 2 === 0 ? ds * 1.8 : ds * 0.8;
          ctx.lineTo(rx + Math.cos(a) * rr, ry + Math.sin(a) * rr);
        }
        ctx.closePath(); ctx.fill(); break;
    }
    ctx.restore();
  });

  // Punto central (torre)
  ctx.save();
  ctx.shadowBlur = 12; ctx.shadowColor = '#00f5ff';
  ctx.fillStyle = '#00f5ff';
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Punto del jugador
  if (G.player) {
    const pdx = (G.player.x - towerScreenX) / worldRange;
    const pdy = (G.player.y - towerScreenY) / worldRange;
    const px = cx + pdx * r, py = cy + pdy * r;
    ctx.save();
    ctx.shadowBlur = 10; ctx.shadowColor = '#39ff14';
    ctx.fillStyle = '#39ff14';
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  ctx.restore(); // fin del save() inicial del radar

  // Etiqueta del radar (fuera del clip)
  ctx.save();
  ctx.font = "bold 9px 'Orbitron',monospace";
  ctx.fillStyle = '#00f5ff66';
  ctx.textAlign = 'center';
  ctx.fillText('RADAR', cx, cy - r + 13);

  // Leyenda de colores (esquina inferior del radar)
  const legend = [
    { label: 'Normal', color: '#ff2d78' },
    { label: 'Rápido', color: '#ffe600' },
    { label: 'Tanque', color: '#bf5fff' },
    { label: 'Jefe', color: '#ff6600' }
  ];
  ctx.font = "9px 'Share Tech Mono',monospace";
  legend.forEach((l, i) => {
    const lx = cx - r + 10;
    const ly = cy + r - 12 - i * 14;
    ctx.fillStyle = l.color;
    ctx.shadowBlur = 4; ctx.shadowColor = l.color;
    ctx.fillRect(lx, ly - 6, 7, 7);
    ctx.fillStyle = '#aabbcc';
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
    ctx.fillText(l.label, lx + 10, ly);
  });
  ctx.restore();
}

// ============================================================
// SECCIÓN 19c: HUD DE HABILIDADES (esquina inferior izquierda)
// Muestra Q (Super Disparo) y E (Tiro Pesado)
// ============================================================
function drawAbilitiesHUD() {
  if (!G.player) return;
  const B = BALANCE;
  const margin = 18;
  const barW = 170;   // ancho de cada barra
  const barH = 16;
  const gap = 38;     // separación entre habilidades
  const iconSize = 28;
  // Posición base: esquina inferior izquierda
  const baseX = margin;
  const baseY = canvas.height - margin;

  // Definición de las dos habilidades
  const abilities = [
    {
      key: 'E',
      icon: '🟣',
      label: 'TIRO PESADO',
      cd: G.player.heavyCooldown,
      maxCd: B.HEAVY_COOLDOWN,
      color: '#bf5fff',
      dimColor: '#553377'
    },
    {
      key: 'Q',
      icon: '💥',
      label: 'SUPER DISPARO',
      cd: G.player.superCooldown,
      maxCd: B.SUPER_COOLDOWN,
      color: '#ff2d78',
      dimColor: '#882244'
    }
  ];

  ctx.save();

  abilities.forEach((ab, i) => {
    const ready = ab.cd <= 0;
    const pct = ready ? 1 : 1 - (ab.cd / ab.maxCd);
    const rowY = baseY - i * (barH + gap + 6);
    const bR = 8;

    // --- Icono de tecla ---
    const keyBoxSize = 22;
    const keyX = baseX;
    const keyY = rowY - keyBoxSize - 4;

    // Caja de la tecla
    ctx.fillStyle = ready ? ab.color + '33' : 'rgba(20,20,40,0.8)';
    ctx.strokeStyle = ready ? ab.color : '#334466';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = ready ? 10 : 0;
    ctx.shadowColor = ab.color;
    ctx.beginPath();
    ctx.roundRect(keyX, keyY, keyBoxSize, keyBoxSize, 5);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    // Letra de la tecla
    ctx.font = `bold 11px 'Orbitron',monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ready ? '#ffffff' : '#667799';
    ctx.fillText(ab.key, keyX + keyBoxSize / 2, keyY + keyBoxSize / 2);

    // --- Nombre de la habilidad ---
    ctx.font = `bold 8px 'Orbitron',monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = ready ? ab.color : '#445566';
    ctx.shadowBlur = ready ? 6 : 0;
    ctx.shadowColor = ab.color;
    ctx.fillText(ab.label, keyX + keyBoxSize + 8, keyY + 14);
    ctx.shadowBlur = 0;

    // --- Barra de cooldown ---
    const bx = keyX;
    const by = rowY - barH;

    // Fondo
    ctx.fillStyle = 'rgba(0,5,20,0.82)';
    ctx.strokeStyle = '#223344';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, barW, barH, bR);
    ctx.fill(); ctx.stroke();

    // Relleno de progreso
    if (pct > 0) {
      ctx.fillStyle = ready ? ab.color : ab.dimColor;
      ctx.shadowBlur = ready ? 14 : 3;
      ctx.shadowColor = ab.color;
      ctx.beginPath();
      ctx.roundRect(bx, by, barW * pct, barH, bR);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Texto encima de la barra
    ctx.font = `bold 8px 'Orbitron',monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ready ? '#ffffff' : '#556677';
    ctx.fillText(
      ready ? `LISTO` : `${ab.cd.toFixed(1)}s`,
      bx + barW / 2, by + barH / 2
    );

    // Pulso si está listo
    if (ready) {
      const pulse = 0.65 + Math.sin(Date.now() * 0.009 + i * 1.5) * 0.35;
      ctx.globalAlpha = pulse;
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.fillText(ab.icon, bx + barW + 14, by + barH / 2);
      ctx.globalAlpha = 1;
    }
  });

  ctx.restore();
}

// ============================================================
// SECCIÓN 20: HUD
// ============================================================
function updateHUD() {
  if (!G.tower) return;
  const pct = G.tower.hp / G.tower.maxHp;
  const bar = document.getElementById('tower-hp-bar');
  const txt = document.getElementById('tower-hp-text');
  bar.style.width = (pct * 100) + '%';
  bar.style.background = pct > 0.5
    ? 'linear-gradient(90deg,#00f5ff,#39ff14)'
    : pct > 0.25 ? 'linear-gradient(90deg,#ffe600,#ff9900)' : 'linear-gradient(90deg,#ff2d78,#ff6600)';
  txt.textContent = `${Math.ceil(G.tower.hp)} / ${G.tower.maxHp}`;
  document.getElementById('score-val').textContent = G.score;
  document.getElementById('coins-val').textContent = G.coins;
  document.getElementById('wave-num').textContent = G.wave;
  const pi = document.getElementById('powerup-indicators');
  pi.innerHTML = '';
  if (G.player && G.player.tripleTimer > 0) {
    const s = document.createElement('span');
    s.style.color = '#ffe600'; s.textContent = `⚡ ${G.player.tripleTimer.toFixed(1)}s`; pi.appendChild(s);
  }
  if (G.player && G.player.hasShield) {
    const s = document.createElement('span');
    s.style.color = '#00f5ff'; s.textContent = `🛡️ ${G.player.shieldTimer.toFixed(1)}s`; pi.appendChild(s);
  }
}

// ============================================================
// SECCIÓN 21: PANTALLAS
// ============================================================
function showScreen(name) {
  ['start', 'pause', 'wave', 'shop', 'gameover'].forEach(s => {
    const el = document.getElementById('screen-' + s);
    if (!el) return;
    if (s === name) { el.classList.remove('hidden'); el.classList.add('active'); }
    else { el.classList.add('hidden'); el.classList.remove('active'); }
  });
}

// ============================================================
// SECCIÓN 22: INPUT
// ============================================================
window.addEventListener('keydown', e => {
  G.keys[e.key] = true;
  if ((e.key === 'p' || e.key === 'P' || e.key === 'Escape')) {
    if (G.state === 'playing') { G.state = 'paused'; showScreen('pause'); }
    else if (G.state === 'paused') { showScreen('none'); G.state = 'playing'; G.lastTime = performance.now(); }
  }
  // Tecla Q — activa super disparo en abanico
  if ((e.key === 'q' || e.key === 'Q') && G.state === 'playing') {
    G.keys['super_trigger'] = true;
  }
  // Tecla E — activa tiro pesado (bala grande y lenta)
  if ((e.key === 'e' || e.key === 'E') && G.state === 'playing') {
    G.keys['heavy_trigger'] = true;
  }
  if (e.key === ' ') e.preventDefault();
});
window.addEventListener('keyup', e => { G.keys[e.key] = false; });
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  G.mouseX = (e.clientX - r.left) * (canvas.width / r.width);
  G.mouseY = (e.clientY - r.top) * (canvas.height / r.height);
});
canvas.addEventListener('mousedown', e => { if (e.button === 0) { G.keys['mouse'] = true; G.audio._resume(); } });
canvas.addEventListener('mouseup', e => { if (e.button === 0) G.keys['mouse'] = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('blur', () => { G.keys = {}; });

// ============================================================
// SECCIÓN 23: UI BUTTONS
// ============================================================
function setupUI() {
  document.getElementById('btn-play').addEventListener('click', () => {
    G.audio._resume(); startGame();
    G.lastTime = performance.now();
    if (G.animId) cancelAnimationFrame(G.animId);
    G.animId = requestAnimationFrame(gameLoop);
  });
  document.getElementById('btn-resume').addEventListener('click', () => {
    showScreen('none'); G.state = 'playing'; G.lastTime = performance.now();
  });
  document.getElementById('btn-next-wave').addEventListener('click', () => {
    G.enemies = G.enemies.filter(e => !e.dead);
    showScreen('none');
    launchWave();
  });
  document.getElementById('btn-retry').addEventListener('click', () => {
    if (G.animId) cancelAnimationFrame(G.animId);
    startGame();
    G.lastTime = performance.now();
    G.animId = requestAnimationFrame(gameLoop);
  });
  document.getElementById('btn-start-menu').addEventListener('click', () => {
    G.state = 'start';
    document.getElementById('hud').classList.add('hidden');
    showScreen('start');
  });

  // Mute
  ['btn-mute-start', 'btn-mute-hud', 'btn-mute-pause'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      G.audio._resume();
      const m = G.audio.toggleMute();
      document.querySelectorAll('#btn-mute-start,#btn-mute-pause').forEach(b => b.textContent = m ? '🔇 Silenciado' : '🔊 Sonido');
      document.getElementById('btn-mute-hud').textContent = m ? '🔇' : '🔊';
    });
  });

  // Récord en inicio
  if (G.best > 0) document.getElementById('best-score-start').textContent = `🏆 Récord: ${G.best} pts`;
}

// ============================================================
// SECCIÓN 24: ARRANQUE
// ============================================================
resizeCanvas();
initStars();
setupUI();
showScreen('start');

// Loop de fondo para el menú (animación de estrellas mientras no hay juego)
(function menuLoop(ts) {
  if (G.state === 'start' || G.state === 'gameover') {
    ctx.fillStyle = '#07070f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const t = ts * 0.0003;
    for (let i = 0; i < 110; i++) {
      const x = ((Math.sin(i * 97.1 + t) + 1) / 2) * canvas.width;
      const y = ((Math.cos(i * 61.7 + t * 0.6) + 1) / 2) * canvas.height;
      const a = (Math.sin(i + t * 1.8) + 1) / 2 * 0.45 + 0.08;
      ctx.globalAlpha = a; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, i % 15 === 0 ? 1.8 : 0.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  requestAnimationFrame(menuLoop);
})(0);
