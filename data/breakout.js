document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('breakout-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score-value');
  const gameAppEl = document.getElementById('game-app');

  const paddle = { w: 70, h: 10, x: canvas.width / 2 - 35, y: canvas.height - 25, speed: 8 };
  const ball = { x: canvas.width / 2, y: canvas.height - 40, r: 6, dx: 2, dy: -2 };

  const rows = 5, cols = 6, brickW = 50, brickH = 16, pad = 6, top = 40;
  let bricks = [];
  let score = 0;
  let gameOver = false;
  let won = false;
  let started = false;

  function resetBricks() {
    bricks = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        bricks.push({ x: c * (brickW + pad) + 10, y: r * (brickH + pad) + top, alive: true });
  }
  resetBricks();

  function resetGame() {
    score = 0;
    scoreEl.textContent = score;
    ball.x = canvas.width / 2; ball.y = canvas.height - 40; ball.dx = 2; ball.dy = -2;
    resetBricks();
    gameOver = false;
    won = false;
    started = false;
  }

  const keys = { left: false, right: false };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'g' || e.key === 'G') {
      document.querySelectorAll('.app-function > div').forEach(el => el.classList.remove('active'));
      gameAppEl.classList.add('active');
      document.getElementById('active-app-title').textContent = 'Game';
    }

    if (!gameAppEl.classList.contains('active')) return;

    if (!started) {
      if (e.key === 'Enter') started = true;
      return;
    }

    if (gameOver || won) {
      if (e.key === 'Enter') resetGame();
      if (e.key === 'Escape') {
        document.querySelectorAll('.app-function > div').forEach(el => el.classList.remove('active'));
        document.getElementById('game-select-app').classList.add('active');
        document.getElementById('active-app-title').textContent = 'Game';
      }
      return;
    }

    if (e.key === 'ArrowLeft')  keys.left = true;
    if (e.key === 'ArrowRight') keys.right = true;
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft')  keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
  });

  const joystickHold = { left: 0, right: 0 };

  window.ws?.addEventListener("message", (event) => {
    if (!gameAppEl.classList.contains('active')) return;
    const msg = JSON.parse(event.data);

    if (!started) {
      if (msg.type === "sel") started = true;
      return;
    }

    if (gameOver || won) {
      if (msg.type === "sel") resetGame();
      if (msg.type === "sw") {
        document.querySelectorAll('.app-function > div').forEach(el => el.classList.remove('active'));
        document.getElementById('game-select-app').classList.add('active');
        document.getElementById('active-app-title').textContent = 'Game';
      }
      return;
    }

    // mark the direction as "recently held" so movement stays smooth
    // as long as stick messages keep arriving, instead of jumping once per message
    if (msg.type === "stick" && msg.direction === "ArrowLeft")  joystickHold.left = performance.now();
    if (msg.type === "stick" && msg.direction === "ArrowRight") joystickHold.right = performance.now();
  });

  function update() {
    const now = performance.now();
    const HOLD_WINDOW = 200; // ms
    if (keys.left  || now - joystickHold.left  < HOLD_WINDOW) paddle.x -= paddle.speed;
    if (keys.right || now - joystickHold.right < HOLD_WINDOW) paddle.x += paddle.speed;
    paddle.x = Math.max(0, Math.min(canvas.width - paddle.w, paddle.x));

    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.x < ball.r || ball.x > canvas.width - ball.r) ball.dx *= -1;
    if (ball.y < ball.r) ball.dy *= -1;

    const padLeft = paddle.x, padRight = paddle.x + paddle.w;
    const padTop = paddle.y, padBottom = paddle.y + paddle.h;

    const padOverlapX = Math.min(ball.x + ball.r, padRight) - Math.max(ball.x - ball.r, padLeft);
    const padOverlapY = Math.min(ball.y + ball.r, padBottom) - Math.max(ball.y - ball.r, padTop);

    if (padOverlapX > 0 && padOverlapY > 0 && ball.dy > 0) {
      if (padOverlapX < padOverlapY) {
        ball.dx *= -1;
      } else {
        ball.dy *= -1;
        const hitPos = (ball.x - (padLeft + paddle.w / 2)) / (paddle.w / 2);
        ball.dx = hitPos * 4;
      }
    } else if (ball.dy > 0 && ball.y - ball.r > padBottom) {
      gameOver = true;
      return;
    }

    const SPEED_INCREMENT = 1.02;
    const MAX_SPEED = 6;

    for (const b of bricks) {
      if (!b.alive) continue;

      const overlapX = Math.min(ball.x + ball.r, b.x + brickW) - Math.max(ball.x - ball.r, b.x);
      const overlapY = Math.min(ball.y + ball.r, b.y + brickH) - Math.max(ball.y - ball.r, b.y);

      if (overlapX > 0 && overlapY > 0) {
        b.alive = false;
        score += 10;
        scoreEl.textContent = score;

        if (overlapX < overlapY) {
          ball.dx *= -1;
        } else {
          ball.dy *= -1;
        }

        ball.dx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, ball.dx * SPEED_INCREMENT));
        ball.dy = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, ball.dy * SPEED_INCREMENT));

        break;
      }
    }

    if (ball.y > canvas.height + 20) gameOver = true;
    if (bricks.every(b => !b.alive)) won = true;
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

  function drawInstructions() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#c9b608';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BRICK BREAKER', canvas.width / 2, canvas.height / 2 - 60);

    ctx.fillStyle = '#fff';
    ctx.font = '13px monospace';
    ctx.fillText('MOVE JOYSTICK', canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillText('LEFT / RIGHT TO MOVE PADDLE', canvas.width / 2, canvas.height / 2 + 12);

    ctx.fillStyle = '#c9b608';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('PRESS SELECT TO START', canvas.width / 2, canvas.height / 2 + 60);
  }

  function drawHintBar() {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
    ctx.fillStyle = '#c9b608';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('JOYSTICK: MOVE PADDLE', canvas.width / 2, canvas.height - 10);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!started) {
      drawInstructions();
      return;
    }

    ctx.fillStyle = '#c9b608';
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    bricks.forEach(b => {
      if (b.alive) {
        ctx.fillStyle = '#541B21';
        ctx.fillRect(b.x, b.y, brickW, brickH);
      }
    });

    if (!gameOver && !won) drawHintBar();

    if (gameOver || won) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#fff';
      ctx.font = '18px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(won ? 'YOU WON!' : 'GAME OVER', canvas.width / 2, canvas.height / 2 - 20);

      drawButton(restartBtn, 'RESTART');
      drawButton(exitBtn, 'EXIT');
    }
  }

  function loop() {
    if (gameAppEl.classList.contains('active') && started && !gameOver && !won) update();
    if (gameAppEl.classList.contains('active')) draw();
    requestAnimationFrame(loop);
  }
  loop();

  function pointInBtn(x, y, btn) {
    return x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h;
  }

  canvas.addEventListener('click', (e) => {
    if (!started) { started = true; return; }
    if (!gameOver && !won) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    if (pointInBtn(clickX, clickY, restartBtn)) {
      resetGame();
    } else if (pointInBtn(clickX, clickY, exitBtn)) {
      document.querySelectorAll('.app-function > div').forEach(el => el.classList.remove('active'));
      document.getElementById('game-select-app').classList.add('active');
      document.getElementById('active-app-title').textContent = 'Game';
    }
  });
});
