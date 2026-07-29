document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('runner-canvas');
  const ctx = canvas.getContext('2d');
  const runnerAppEl = document.getElementById('runner-app');

  const groundY = canvas.height - 40;
  const CHAR_X = 90, CHAR_W = 34, CHAR_H = 50;
  const GRAVITY = 0.9;
  const JUMP_VELOCITY = -15;
  const WIN_SCORE = 500;

  let charY, charVY, isGrounded;
  let obstacles, aliens, fireballs;
  let gameSpeed, score, gameOver, won;
  let lastObstacleTime, lastAlienTime, lastShotTime;
  let elapsed;

  // ---- background scenery ----
  const stars = [];
  for (let i = 0; i < 60; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * (groundY - 10),
      r: Math.random() * 1.5 + 0.5,
      twinkleSpeed: 0.5 + Math.random() * 1.5,
      twinklePhase: Math.random() * Math.PI * 2,
    });
  }

  const ships = [
    { x: 150, y: 60, w: 34, h: 12, speed: 0.15 },
    { x: 600, y: 100, w: 26, h: 10, speed: 0.25 },
  ];

  function updateBackground(dt) {
    ships.forEach(s => {
      s.x -= s.speed * (dt / 16.6);
      if (s.x < -40) s.x = canvas.width + 40;
    });
  }

  function drawBackground(t) {
    // navy gradient sky
    const grad = ctx.createLinearGradient(0, 0, 0, groundY);
    grad.addColorStop(0, '#0a0e2a');
    grad.addColorStop(1, '#1a2350');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, groundY);

    // moon
    ctx.fillStyle = '#f5f0dc';
    ctx.beginPath();
    ctx.arc(canvas.width - 90, 60, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200, 195, 170, 0.4)';
    ctx.beginPath(); ctx.arc(canvas.width - 100, 50, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(canvas.width - 78, 68, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(canvas.width - 95, 72, 3, 0, Math.PI * 2); ctx.fill();

    // stars, twinkling
    stars.forEach(s => {
      const twinkle = 0.5 + 0.5 * Math.sin(t / 300 * s.twinkleSpeed + s.twinklePhase);
      ctx.fillStyle = `rgba(255,255,255,${0.3 + twinkle * 0.6})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // simple spaceship silhouettes
    ships.forEach(s => {
      ctx.fillStyle = '#8899bb';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c9e0ff';
      ctx.beginPath();
      ctx.ellipse(s.x - s.w * 0.15, s.y - s.h * 0.15, s.w * 0.18, s.h * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      // little light trail
      ctx.fillStyle = 'rgba(255, 220, 150, 0.5)';
      ctx.beginPath();
      ctx.moveTo(s.x + s.w / 2, s.y);
      ctx.lineTo(s.x + s.w / 2 + 10, s.y - 3);
      ctx.lineTo(s.x + s.w / 2 + 10, s.y + 3);
      ctx.closePath();
      ctx.fill();
    });
  }

  function resetGame() {
    charY = groundY - CHAR_H;
    charVY = 0;
    isGrounded = true;
    obstacles = [];
    aliens = [];
    fireballs = [];
    gameSpeed = 4;
    score = 0;
    gameOver = false;
    won = false;
    lastObstacleTime = 0;
    lastAlienTime = 0;
    lastShotTime = 0;
    elapsed = 0;
  }
  resetGame();

  function jump() {
    if (isGrounded && !gameOver && !won) {
      charVY = JUMP_VELOCITY;
      isGrounded = false;
    }
  }

  function shoot() {
    if (gameOver || won) return;
    const now = performance.now();
    if (now - lastShotTime < 280) return; // small cooldown so it can't spam
    lastShotTime = now;
    fireballs.push({ x: CHAR_X + CHAR_W, y: charY + CHAR_H * 0.45, w: 12, h: 6 });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); jump(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); shoot(); }

    // TEMP: press R to jump straight to the runner tile for testing tonight
    if (e.key === 'r' || e.key === 'R') {
      document.querySelectorAll('.app-function > div').forEach(el => el.classList.remove('active'));
      runnerAppEl.classList.add('active');
      document.getElementById('active-app-title').textContent = 'Runner';
    }
  });

  window.ws?.addEventListener("message", (event) => {
    if (!runnerAppEl.classList.contains('active')) return;
    const msg = JSON.parse(event.data);
    if (msg.type === "stick" && msg.direction === "ArrowUp") jump();
    if (msg.type === "stick" && msg.direction === "ArrowDown") shoot();
  });

  function spawnObstacle() {
    const h = 30 + Math.random() * 20;
    obstacles.push({ x: canvas.width + 20, y: groundY - h, w: 20, h });
  }

  function spawnAlien() {
    aliens.push({ x: canvas.width + 20, y: groundY - CHAR_H, w: 30, h: CHAR_H, alive: true });
  }

  function update(dt) {
    elapsed += dt;
    score += dt * 0.01;
    updateBackground(dt);

    // difficulty ramp
    gameSpeed = Math.min(11, 4 + elapsed / 4000);

    // character physics
    if (!isGrounded) {
      charVY += GRAVITY;
      charY += charVY;
      if (charY >= groundY - CHAR_H) {
        charY = groundY - CHAR_H;
        charVY = 0;
        isGrounded = true;
      }
    }

    // spawn timers
    if (elapsed - lastObstacleTime > 1400 - Math.min(600, elapsed / 20)) {
      lastObstacleTime = elapsed;
      if (Math.random() < 0.85) spawnObstacle();
    }
    if (elapsed - lastAlienTime > 2200 - Math.min(1000, elapsed / 15)) {
      lastAlienTime = elapsed;
      spawnAlien();
    }

    // move + collide obstacles
    for (const o of obstacles) {
      o.x -= gameSpeed;
      const hitX = CHAR_X + CHAR_W > o.x && CHAR_X < o.x + o.w;
      const hitY = charY + CHAR_H > o.y;
      if (hitX && hitY) gameOver = true;
    }
    obstacles = obstacles.filter(o => o.x + o.w > -10);

    // move fireballs
    fireballs.forEach(f => f.x += 11);
    fireballs = fireballs.filter(f => f.x < canvas.width + 20);

    // move aliens + collide with player / fireballs
    for (const a of aliens) {
      if (!a.alive) continue;
      a.x -= gameSpeed;

      for (const f of fireballs) {
        if (f.x < a.x + a.w && f.x + f.w > a.x && f.y < a.y + a.h && f.y + f.h > a.y) {
          a.alive = false;
          f.x = canvas.width + 999; // mark fireball spent
          score += 20;
        }
      }

      const hitX = CHAR_X + CHAR_W > a.x && CHAR_X < a.x + a.w;
      const hitY = charY + CHAR_H > a.y && charY < a.y + a.h;
      if (a.alive && hitX && hitY) gameOver = true;
    }
    aliens = aliens.filter(a => a.alive && a.x + a.w > -10);

    if (score >= WIN_SCORE) won = true;
  }

  const restartBtn = { x: canvas.width / 2 - 90, y: canvas.height / 2 + 20, w: 80, h: 34 };
  const exitBtn    = { x: canvas.width / 2 + 10, y: canvas.height / 2 + 20, w: 80, h: 34 };

  function drawButton(btn, label) {
    ctx.fillStyle = '#c9b608';
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    ctx.strokeStyle = 'darkgoldenrod';
    ctx.lineWidth = 2;
    ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
    ctx.fillStyle = '#541B21';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, btn.x + btn.w / 2, btn.y + btn.h / 2);
  }

  function drawCharacter() {
    const x = CHAR_X, y = charY;
    const cx = x + CHAR_W / 2;

    // tail
    ctx.strokeStyle = '#d97a2b';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 2, y + CHAR_H - 6);
    ctx.quadraticCurveTo(x - 14, y + CHAR_H - 20, x - 6, y + CHAR_H - 34);
    ctx.stroke();

    // body
    ctx.fillStyle = '#e08a34';
    ctx.beginPath();
    ctx.ellipse(cx, y + CHAR_H - 16, CHAR_W / 2 - 2, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // tabby stripes on body
    ctx.strokeStyle = '#b8631c';
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 7, y + CHAR_H - 30);
      ctx.lineTo(cx + i * 7, y + CHAR_H - 4);
      ctx.stroke();
    }

    // head
    ctx.fillStyle = '#e08a34';
    ctx.beginPath();
    ctx.arc(cx, y + 15, 13, 0, Math.PI * 2);
    ctx.fill();

    // ears
    ctx.beginPath();
    ctx.moveTo(cx - 12, y + 8);
    ctx.lineTo(cx - 16, y - 4);
    ctx.lineTo(cx - 4, y + 3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 12, y + 8);
    ctx.lineTo(cx + 16, y - 4);
    ctx.lineTo(cx + 4, y + 3);
    ctx.closePath();
    ctx.fill();

    // ski mask band across the eyes
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(cx - 13, y + 9, 26, 9);

    // eye holes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - 6, y + 13, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 6, y + 13, 2.5, 0, Math.PI * 2); ctx.fill();

    // little pink nose peeking below mask
    ctx.fillStyle = '#f2a6b0';
    ctx.beginPath();
    ctx.arc(cx, y + 21, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(performance.now());

    // ground below the sky — solid dark strip so it reads as distinct terrain
    ctx.fillStyle = '#12162e';
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

    // ground line
    ctx.strokeStyle = 'darkgoldenrod';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();

    drawCharacter();

    obstacles.forEach(o => {
      const cx = o.x + o.w / 2;
      const cy = o.y + o.h / 2;
      const grad = ctx.createLinearGradient(o.x, o.y, o.x, o.y + o.h);
      grad.addColorStop(0, '#d8d8d8');
      grad.addColorStop(1, '#9a9a9a');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(o.x + 4, o.y);
      ctx.lineTo(o.x + o.w - 3, o.y + 3);
      ctx.lineTo(o.x + o.w, o.y + o.h);
      ctx.lineTo(o.x + 2, o.y + o.h - 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#6e6e6e';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    aliens.forEach((a, i) => {
      const headR = a.w / 2;
      const headCX = a.x + a.w / 2;
      const headCY = a.y + headR * 0.9;
      const bodyColor = i % 2 === 0 ? '#c9d94a' : '#5fbf6b';

      // elongated tapering body, feet at ground level
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.moveTo(a.x + a.w * 0.25, headCY + headR * 0.5);
      ctx.lineTo(a.x + a.w * 0.75, headCY + headR * 0.5);
      ctx.lineTo(a.x + a.w * 0.65, a.y + a.h);
      ctx.lineTo(a.x + a.w * 0.35, a.y + a.h);
      ctx.closePath();
      ctx.fill();

      // bulbous head
      ctx.beginPath();
      ctx.ellipse(headCX, headCY, headR, headR * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();

      // big almond eyes
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.ellipse(headCX - headR * 0.4, headCY - headR * 0.1, headR * 0.28, headR * 0.4, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(headCX + headR * 0.4, headCY - headR * 0.1, headR * 0.28, headR * 0.4, 0.3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#ffb300';
    fireballs.forEach(f => {
      ctx.beginPath();
      ctx.ellipse(f.x + f.w / 2, f.y + f.h / 2, f.w / 2, f.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#c9b608';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('SCORE: ' + Math.floor(score), 14, 14);

    if (gameOver || won) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(won ? 'YOU WON!' : 'GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
      drawButton(restartBtn, 'RESTART');
      drawButton(exitBtn, 'EXIT');
    }
  }

  let lastTime = null;
  function loop(timestamp) {
    if (runnerAppEl.classList.contains('active')) {
      if (lastTime === null) lastTime = timestamp;
      const dt = timestamp - lastTime;
      lastTime = timestamp;
      if (!gameOver && !won) update(dt);
      draw();
    } else {
      lastTime = null;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  function pointInBtn(x, y, btn) {
    return x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h;
  }

  canvas.addEventListener('click', (e) => {
    if (!gameOver && !won) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    if (pointInBtn(clickX, clickY, restartBtn)) {
      resetGame();
    } else if (pointInBtn(clickX, clickY, exitBtn)) {
      resetGame();
      document.querySelectorAll('.app-function > div').forEach(el => el.classList.remove('active'));
      document.getElementById('game-select-app').classList.add('active');
      document.getElementById('active-app-title').textContent = 'Game';
    }
  });
});
