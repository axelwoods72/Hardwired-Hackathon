document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('breakout-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score-value');
  const gameAppEl = document.getElementById('game-app');

  const paddle = { w: 70, h: 10, x: canvas.width / 2 - 35, y: canvas.height - 25 };
  const ball = { x: canvas.width / 2, y: canvas.height - 40, r: 6, dx: 3, dy: -3 };

  const rows = 5, cols = 6, brickW = 50, brickH = 16, pad = 6, top = 40;
  let bricks = [];
  let score = 0;
  let gameOver = false;

  function resetBricks() {
    bricks = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        bricks.push({ x: c * (brickW + pad) + 10, y: r * (brickH + pad) + top, alive: true });
  }
  resetBricks();

  let joyX = canvas.width / 2;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft')  joyX = Math.max(0, joyX - 30);
    if (e.key === 'ArrowRight') joyX = Math.min(canvas.width, joyX + 30);

    // TEMP: press G to jump straight to the game tile for testing tonight
    // (real navigation happens via ESP32 "nav" WebSocket message — remove this once hardware works)
    if (e.key === 'g' || e.key === 'G') {
      document.querySelectorAll('.app-function > div').forEach(el => el.classList.remove('active'));
      gameAppEl.classList.add('active');
      document.getElementById('active-app-title').textContent = 'Game';
    }
  });

  function update() {
    const targetX = joyX - paddle.w / 2;
    paddle.x += (targetX - paddle.x) * 0.3;
    paddle.x = Math.max(0, Math.min(canvas.width - paddle.w, paddle.x));

    ball.x += ball.dx;
    ball.y += ball.dy;
    if (ball.x < ball.r || ball.x > canvas.width - ball.r) ball.dx *= -1;
    if (ball.y < ball.r) ball.dy *= -1;

    if (ball.y + ball.r > paddle.y && ball.x > paddle.x && ball.x < paddle.x + paddle.w && ball.dy > 0) {
      ball.dy *= -1;
      const hitPos = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      ball.dx = hitPos * 4;
    }

    bricks.forEach(b => {
      if (!b.alive) return;
      if (ball.x > b.x && ball.x < b.x + brickW && ball.y - ball.r < b.y + brickH && ball.y + ball.r > b.y) {
        b.alive = false;
        ball.dy *= -1;
        score += 10;
        scoreEl.textContent = score;
      }
    });

    if (ball.y > canvas.height + 20) gameOver = true;
    if (bricks.every(b => !b.alive)) resetBricks();
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
    if (gameOver) {
      ctx.fillStyle = '#fff';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER — tap to restart', canvas.width / 2, canvas.height / 2);
    }
  }

  function loop() {
    if (gameAppEl.classList.contains('active') && !gameOver) update();
    if (gameAppEl.classList.contains('active')) draw();
    requestAnimationFrame(loop);
  }
  loop();

  canvas.addEventListener('click', () => {
    if (gameOver) {
      score = 0;
      scoreEl.textContent = score;
      ball.x = canvas.width / 2; ball.y = canvas.height - 40; ball.dx = 3; ball.dy = -3;
      resetBricks();
      gameOver = false;
    }
  });
});
