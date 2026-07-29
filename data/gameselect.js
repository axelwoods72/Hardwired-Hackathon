document.addEventListener('DOMContentLoaded', () => {
  const selectAppEl = document.getElementById('game-select-app');
  const options = Array.from(document.querySelectorAll('.select-option'));
  const previewBreakout = document.getElementById('preview-breakout');
  const previewRunner = document.getElementById('preview-runner');
  let sel = 0;

  function updateSelection() {
    options.forEach((opt, i) => opt.classList.toggle('selected', i === sel));
    previewBreakout.style.display = sel === 0 ? 'block' : 'none';
    previewRunner.style.display = sel === 1 ? 'block' : 'none';
  }
  updateSelection();

  function launch(index) {
    const targetId = options[index].dataset.target;
    document.querySelectorAll('.app-function > div').forEach(el => el.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
    document.getElementById('active-app-title').textContent =
      targetId === 'game-app' ? 'Brick Breaker' : 'Alien Invasion';
  }

  document.addEventListener('keydown', (e) => {
    if (!selectAppEl.classList.contains('active')) return;
    if (e.key === 'ArrowUp')   { sel = Math.max(0, sel - 1); updateSelection(); }
    if (e.key === 'ArrowDown') { sel = Math.min(options.length - 1, sel + 1); updateSelection(); }
    if (e.key === 'Enter')     { launch(sel); }
  });

  window.ws?.addEventListener("message", (event) => {
    if (!selectAppEl.classList.contains('active')) return;
    const msg = JSON.parse(event.data);
    if (msg.type === "stick") {
      if (msg.direction === "ArrowUp")   { sel = Math.max(0, sel - 1); updateSelection(); }
      if (msg.direction === "ArrowDown") { sel = Math.min(options.length - 1, sel + 1); updateSelection(); }
    } else if (msg.type === "sel") {
      launch(sel);
    }
  });

  options.forEach((opt, i) => {
    opt.addEventListener('click', () => {
      sel = i;
      updateSelection();
      launch(i);
    });
  });
});
