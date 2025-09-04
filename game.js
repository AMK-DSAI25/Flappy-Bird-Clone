(() => {
  // ----- Canvas setup -----
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const W = 400, H = 600;
  canvas.width = W; canvas.height = H;

  // ----- Game constants -----
  const GRAVITY = 0.25;
  const FLAP_VELOCITY = -5.5;
  const MAX_FALL = 13;
  const PIPE_GAP = 160;
  const PIPE_WIDTH = 45;
  const PIPE_SPEED = 3;   // ✅ smooth playable speed
  const SPAWN_INTERVAL = 1500;
  const GROUND_HEIGHT = 70;

  // ----- Game state -----
  let state = "ready";
  let score = 0, best = Number(localStorage.getItem("fb_best") || 0);
  let lastSpawn = 0;
  let pipes = [];

  const bird = {
    x: 80,
    y: H / 2,
    w: 34,
    h: 24,
    vy: 0,
    rot: 0
  };

  // ----- Utilities -----
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function reset() {
    state = "ready";
    score = 0;
    pipes = [];
    bird.x = 80;
    bird.y = H / 2;
    bird.vy = 0;
    bird.rot = 0;
    lastSpawn = 0;
  }

  function startGame() {
    if (state === "playing") return;
    state = "playing";
    score = 0;
    pipes = [];
    bird.y = H / 2;
    bird.vy = FLAP_VELOCITY;
    lastSpawn = 0;
  }

  function gameOver() {
    state = "over";
    best = Math.max(best, score);
    localStorage.setItem("fb_best", String(best));
  }

  function flap() {
    if (state === "ready") startGame();
    if (state !== "playing") return;
    bird.vy = FLAP_VELOCITY;
  }

  function spawnPipe() {
    const minTop = 40;
    const maxTop = H - GROUND_HEIGHT - PIPE_GAP - 40;
    const top = Math.floor(minTop + Math.random() * (maxTop - minTop));
    pipes.push({
      x: W + 10,
      top,
      gap: PIPE_GAP,
      w: PIPE_WIDTH,
      scored: false
    });
  }

  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  // ----- Drawing -----
  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#87CEEB");
    g.addColorStop(1, "#BFEFFF");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#7ec850";
    ctx.beginPath();
    ctx.moveTo(0, H - GROUND_HEIGHT - 30);
    for (let x = 0; x <= W; x += 10) {
      const y = H - GROUND_HEIGHT - 30 + Math.sin(x * 0.02) * 6;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#d2b48c";
    ctx.fillRect(0, H - GROUND_HEIGHT, W, GROUND_HEIGHT);
    ctx.fillStyle = "rgba(0,0,0,0.07)";
    for (let x = 0; x < W; x += 20) {
      ctx.fillRect(x, H - GROUND_HEIGHT, 10, GROUND_HEIGHT);
    }
  }

  function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rot);

    ctx.fillStyle = "#ffd166";
    ctx.strokeStyle = "#a66f00";
    ctx.lineWidth = 2;
    roundRect(ctx, -bird.w/2, -bird.h/2, bird.w, bird.h, 6, true, true);

    ctx.fillStyle = "#ffb703";
    roundRect(ctx, -8, -4, 16, 8, 4, true, false);

    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.arc(6, -6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#222";
    ctx.arc(7, -6, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = "#ff6b6b";
    ctx.moveTo(bird.w/2 - 2, 0);
    ctx.lineTo(bird.w/2 + 8, -4);
    ctx.lineTo(bird.w/2 + 8, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y,     x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x,     y + h, rr);
    ctx.arcTo(x,     y + h, x,     y,     rr);
    ctx.arcTo(x,     y,     x + w, y,     rr);
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function drawPipes() {
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2;
    for (const p of pipes) {
      ctx.fillStyle = "#1e7e34";
      ctx.fillRect(p.x, 0, p.w, p.top);
      ctx.strokeRect(p.x, 0, p.w, p.top);

      const bottomY = p.top + p.gap;
      const bottomH = H - GROUND_HEIGHT - bottomY;
      ctx.fillRect(p.x, bottomY, p.w, bottomH);
      ctx.strokeRect(p.x, bottomY, p.w, bottomH);

      ctx.fillStyle = "#145523";
      ctx.fillRect(p.x - 4, p.top - 10, p.w + 8, 10);
      ctx.fillRect(p.x - 4, p.top + p.gap, p.w + 8, 10);
    }
  }

  function drawHUD() {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.font = "bold 24px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${score}`, 14, 32);
    ctx.textAlign = "right";
    ctx.fillText(`Best: ${best}`, W - 14, 32);

    if (state === "ready") {
      centerText("Tap/Space to start", H * 0.38);
      centerText("Fly through the gaps!", H * 0.44, 18);
    } else if (state === "over") {
      centerText("Game Over", H * 0.38, 36);
      centerText(`Score: ${score}  •  Best: ${best}`, H * 0.46, 20);
      centerText("Press R to restart", H * 0.54, 18);
    }
  }

  function centerText(msg, y, size = 24) {
    ctx.save();
    ctx.font = `bold ${size}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.textAlign = "center";
    ctx.fillText(msg, W / 2, y);
    ctx.restore();
  }

  // ----- Update / loop -----
  let last = performance.now();

  function loop(now) {
    const dt = Math.min(40, now - last);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    if (state === "playing") {
      bird.vy = clamp(bird.vy + GRAVITY, -999, MAX_FALL);
      bird.y += bird.vy;

      bird.rot = clamp(bird.vy / 20, -0.4, 0.9);

      lastSpawn += dt;
      if (lastSpawn >= SPAWN_INTERVAL) {
        lastSpawn = 0;
        spawnPipe();
      }

      const speed = PIPE_SPEED * (dt / 16.67); // ✅ normalized
      for (const p of pipes) {
        p.x -= speed;
        if (!p.scored && p.x + p.w < bird.x) {
          p.scored = true;
          score++;
        }
      }
      pipes = pipes.filter(p => p.x + p.w > -10);

      const bx = bird.x - bird.w / 2, by = bird.y - bird.h / 2;
      for (const p of pipes) {
        const topCollide = rectsOverlap(bx, by, bird.w, bird.h, p.x, 0, p.w, p.top);
        const bottomY = p.top + p.gap;
        const bottomCollide = rectsOverlap(bx, by, bird.w, bird.h, p.x, bottomY, p.w, H - GROUND_HEIGHT - bottomY);
        if (topCollide || bottomCollide) {
          gameOver();
          break;
        }
      }

      if (bird.y + bird.h/2 >= H - GROUND_HEIGHT || bird.y - bird.h/2 <= 0) {
        gameOver();
      }
    } else {
      const t = performance.now() / 400;
      bird.y = clamp(H / 2 + Math.sin(t) * 12, 60, H - GROUND_HEIGHT - 60);
      bird.rot = Math.sin(t) * 0.15;
    }
  }

  function render() {
    drawBackground();
    drawPipes();
    drawBird();
    drawHUD();
  }

  // ----- Input -----
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") { e.preventDefault(); flap(); }
    if (e.code === "KeyR" && state === "over") { reset(); }
  });

  canvas.addEventListener("mousedown", flap);
  canvas.addEventListener("touchstart", (e) => { e.preventDefault(); flap(); }, { passive: false });

  // ----- Start -----
  reset();
  requestAnimationFrame(loop);
})();
