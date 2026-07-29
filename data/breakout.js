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
  }

  const keys = { left: false, right: false };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft')  keys.left = true;
    if (e.key === 'ArrowRight') keys.right = true;

    if (e.key === 'g' || e.key === 'G') {
      document.querySelectorAll('.app-function > div').forEach(el => el.classList.remove('active'));
      gameAppEl.classList.add('active');
      document.getElementById('active-app-title').textContent = 'Game';
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft')  keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
  });

  window.ws?.addEventListener("message", (event) => {
    if (!gameAppEl.classList.contains('active')) return;
    const msg = JSON.parse(event.data);
    if (msg.type === "stick" && msg.direction === "ArrowLeft")  paddle.x -= 30;
    if (msg.type === "stick" && msg.direction === "ArrowRight") paddle.x += 30;
  });

  function update() {
    if (keys.left)  paddle.x -= paddle.speed;
    if (keys.right) paddle.x += paddle.speed;
    paddle.x = Math.max(0, Math.min(canvas.width - paddle.w, paddle.x));

    const prevBallY = ball.y;

    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.x < ball.r || ball.x > canvas.width - ball.r) ball.dx *= -1;
    if (ball.y < ball.r) ball.dy *= -1;

    // paddle collision: full rectangle (top + sides), same axis-based
    // approach as the brick collision — so a side clip bounces correctly
    // instead of silently sliding past
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
      // ball has fully passed below the paddle without ever touching it — instant miss
      gameOver = true;
      return;
    }

    const SPEED_INCREMENT = 1.02;
    const MAX_SPEED = 6;

    for (const b of bricks) {
      if (!b.alive) continue;

      // AABB overlap test between the ball's bounding box and the brick
      const overlapX = Math.min(ball.x + ball.r, b.x + brickW) - Math.max(ball.x - ball.r, b.x);
      const overlapY = Math.min(ball.y + ball.r, b.y + brickH) - Math.max(ball.y - ball.r, b.y);

      if (overlapX > 0 && overlapY > 0) {
        b.alive = false;
        score += 10;
        scoreEl.textContent = score;

        // bounce along whichever axis had the smaller overlap —
        // that's the side the ball actually hit (top/bottom vs left/right)
        if (overlapX < overlapY) {
          ball.dx *= -1;
        } else {
          ball.dy *= -1;
        }

        ball.dx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, ball.dx * SPEED_INCREMENT));
        ball.dy = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, ball.dy * SPEED_INCREMENT));

        break; // only one brick can break per frame — stops multi-brick tunneling
      }
    }

    // safety net, in case the ball somehow still gets past the line check
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

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    if (gameAppEl.classList.contains('active') && !gameOver && !won) update();
    if (gameAppEl.classList.contains('active')) draw();
    requestAnimationFrame(loop);
  }
  loop();

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
