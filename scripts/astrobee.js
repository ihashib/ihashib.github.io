// Astrobee Dock: a small zero-gravity flying game on one canvas.
// The world is 1600 x 900 units, scaled to whatever size the canvas is.
(() => {
  const root = document.getElementById("game");
  if (!root) return;

  const canvas = root.querySelector(".game-canvas");
  const ctx = canvas.getContext("2d");
  const screens = {
    start: root.querySelector('[data-screen="start"]'),
    done: root.querySelector('[data-screen="done"]'),
  };
  const result = root.querySelector(".game-result");
  const bestLabel = document.querySelector(".play-best");

  const W = 1600;
  const H = 900;
  const SIZE = 22; // half the robot's width
  const THRUST = 300; // units per second squared
  const DAMPING = 0.12; // Astrobee holds itself steady a little
  const DOCK_SPEED = 70; // gentle enough to latch
  const M_PER_UNIT = 11 / 1600; // the Kibo module is about 11 m long

  const colors = {
    bg1: "#0d1830",
    bg2: "#070d1b",
    wall: "#16233f",
    edge: "rgba(150, 175, 230, 0.35)",
    text: "#e9edf3",
    dim: "#9aa8be",
    signal: "#f0663d",
    ok: "#4ade80",
    blue: "#5b8cff",
  };

  // Module walls (outer hull plus two equipment racks to fly around)
  const walls = [
    { x: 0, y: 0, w: W, h: 60 },
    { x: 0, y: H - 60, w: W, h: 60 },
    { x: 0, y: 0, w: 60, h: H },
    { x: W - 60, y: 0, w: 60, h: H },
    { x: 480, y: 60, w: 64, h: 470, rack: true },
    { x: 900, y: 370, w: 64, h: 470, rack: true },
  ];
  const tags = [
    { x: 720, y: 210 },
    { x: 1210, y: 690 },
  ];
  const dock = { x: W - 60, y: 450 };

  let state = "ready";
  let ship;
  let time = 0;
  let bumps = 0;
  let bumpCooldown = 0;
  let message = "";
  let messageTime = 0;
  let puffs = [];
  let last = 0;
  const keys = new Set();

  const readBest = () => {
    try {
      return parseFloat(localStorage.getItem("astrobee-best")) || null;
    } catch {
      return null;
    }
  };
  const writeBest = (v) => {
    try {
      localStorage.setItem("astrobee-best", String(v));
    } catch {}
  };
  const showBest = () => {
    const best = readBest();
    bestLabel.textContent = best ? `Your best: ${best.toFixed(1)}s` : "";
  };

  function reset() {
    ship = { x: 170, y: 450, vx: 0, vy: 0 };
    tags.forEach((t) => (t.progress = 0));
    time = 0;
    bumps = 0;
    puffs = [];
    message = "";
  }

  function start() {
    reset();
    state = "play";
    screens.start.hidden = true;
    screens.done.hidden = true;
    canvas.focus({ preventScroll: true });
  }

  function finish() {
    state = "done";
    const speed = Math.hypot(ship.vx, ship.vy) * M_PER_UNIT;
    const score = time + bumps * 2;
    const best = readBest();
    const isBest = !best || score < best;
    if (isBest) writeBest(score);
    result.textContent =
      `${score.toFixed(1)}s` +
      (bumps ? ` (${time.toFixed(1)}s flying + ${bumps * 2}s for ${bumps} bump${bumps > 1 ? "s" : ""})` : ", no bumps") +
      `. Docking speed ${speed.toFixed(2)} m/s.` +
      (isBest ? " New best!" : ` Your best is ${best.toFixed(1)}s.`);
    screens.done.hidden = false;
    showBest();
  }

  const scanned = () => tags.every((t) => t.progress >= 1);

  function flash(text) {
    message = text;
    messageTime = 1.6;
  }

  function update(dt) {
    let ax = 0;
    let ay = 0;
    if (keys.has("left")) ax -= 1;
    if (keys.has("right")) ax += 1;
    if (keys.has("up")) ay -= 1;
    if (keys.has("down")) ay += 1;
    const len = Math.hypot(ax, ay) || 1;
    ax = (ax / len) * THRUST;
    ay = (ay / len) * THRUST;
    // The on-screen joystick is analog: a light push gives a light thrust
    const stick = window.joystick;
    if (stick && (stick.x || stick.y)) {
      ax = stick.x * THRUST;
      ay = stick.y * THRUST;
    }

    ship.vx += ax * dt;
    ship.vy += ay * dt;
    ship.vx *= 1 - DAMPING * dt;
    ship.vy *= 1 - DAMPING * dt;
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;

    // Thruster puffs fire opposite the push
    if (ax || ay) {
      puffs.push({
        x: ship.x - (ax / THRUST) * SIZE,
        y: ship.y - (ay / THRUST) * SIZE,
        vx: -ax * 0.25 + (Math.random() - 0.5) * 30,
        vy: -ay * 0.25 + (Math.random() - 0.5) * 30,
        life: 0.5,
      });
    }
    puffs.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    });
    puffs = puffs.filter((p) => p.life > 0);

    // Walls: push out and bounce softly
    bumpCooldown -= dt;
    for (const r of walls) {
      const dx = ship.x - Math.max(r.x, Math.min(ship.x, r.x + r.w));
      const dy = ship.y - Math.max(r.y, Math.min(ship.y, r.y + r.h));
      if (Math.abs(dx) >= SIZE || Math.abs(dy) >= SIZE) continue;
      const left = ship.x + SIZE - r.x;
      const right = r.x + r.w - (ship.x - SIZE);
      const top = ship.y + SIZE - r.y;
      const bottom = r.y + r.h - (ship.y - SIZE);
      const min = Math.min(left, right, top, bottom);
      const hit = Math.hypot(ship.vx, ship.vy);

      // The dock opening in the right wall
      const atDock = r.x === W - 60 && Math.abs(ship.y - dock.y) < 70 && min === left;
      if (atDock && scanned()) {
        if (hit <= DOCK_SPEED) {
          ship.x = dock.x - SIZE;
          ship.vx = ship.vy = 0;
          finish();
          return;
        }
        flash("Too fast to latch. Ease in");
      } else if (atDock) {
        flash("Scan both targets first");
      }

      if (min === left) { ship.x -= left; ship.vx = -Math.abs(ship.vx) * 0.45; }
      else if (min === right) { ship.x += right; ship.vx = Math.abs(ship.vx) * 0.45; }
      else if (min === top) { ship.y -= top; ship.vy = -Math.abs(ship.vy) * 0.45; }
      else { ship.y += bottom; ship.vy = Math.abs(ship.vy) * 0.45; }

      if (hit > 40 && bumpCooldown <= 0 && !atDock) {
        bumps += 1;
        bumpCooldown = 0.5;
      }
    }

    // Scanning: hover close to a target and slow down
    const speed = Math.hypot(ship.vx, ship.vy);
    for (const t of tags) {
      if (t.progress >= 1) continue;
      const near = Math.hypot(ship.x - t.x, ship.y - t.y) < 80;
      if (near && speed < 140) {
        t.progress = Math.min(1, t.progress + dt / 0.8);
        if (t.progress >= 1) flash(scanned() ? "Both scanned. Dock is open" : "Target scanned");
      } else if (near) {
        flash("Slow down to scan");
      }
    }

    time += dt;
    messageTime -= dt;
  }

  // Drawing
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function draw() {
    const s = canvas.width / W;
    ctx.setTransform(s, 0, 0, s, 0, 0);

    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, colors.bg1);
    g.addColorStop(1, colors.bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Faint dot grid
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    for (let x = 80; x < W - 60; x += 40) for (let y = 80; y < H - 60; y += 40) ctx.fillRect(x, y, 2, 2);

    // A porthole with Earth outside
    ctx.save();
    ctx.beginPath();
    ctx.arc(1290, 150, 58, 0, Math.PI * 2);
    ctx.fillStyle = "#050a16";
    ctx.fill();
    ctx.clip();
    ctx.beginPath();
    ctx.arc(1330, 290, 150, 0, Math.PI * 2);
    ctx.fillStyle = "#1d4ed8";
    ctx.fill();
    ctx.strokeStyle = "rgba(147, 197, 253, 0.8)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(1290, 150, 58, 0, Math.PI * 2);
    ctx.strokeStyle = colors.edge;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Walls and racks
    for (const r of walls) {
      ctx.fillStyle = colors.wall;
      roundRect(r.x, r.y, r.w, r.h, r.rack ? 10 : 0);
      ctx.fill();
      if (r.rack) {
        ctx.strokeStyle = colors.edge;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        for (let y = r.y + 40; y < r.y + r.h - 20; y += 46) {
          ctx.moveTo(r.x + 14, y);
          ctx.lineTo(r.x + r.w - 14, y);
        }
        ctx.stroke();
      }
    }
    // Inner edge of the hull
    ctx.strokeStyle = colors.edge;
    ctx.lineWidth = 2;
    roundRect(60, 60, W - 120, H - 120, 18);
    ctx.stroke();

    // Dock: locked until both targets are scanned
    const open = scanned();
    ctx.strokeStyle = open ? colors.ok : colors.dim;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(dock.x - 26, dock.y - 70);
    ctx.lineTo(dock.x, dock.y - 70);
    ctx.lineTo(dock.x, dock.y + 70);
    ctx.lineTo(dock.x - 26, dock.y + 70);
    ctx.stroke();
    ctx.fillStyle = open ? colors.ok : colors.dim;
    ctx.font = "600 20px Figtree, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(open ? "DOCK OPEN" : "DOCK LOCKED", dock.x - 40, dock.y - 84);

    // AR targets
    for (const t of tags) {
      const done = t.progress >= 1;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.fillStyle = done ? "rgba(74, 222, 128, 0.15)" : "rgba(255, 255, 255, 0.92)";
      ctx.fillRect(-26, -26, 52, 52);
      ctx.fillStyle = done ? colors.ok : "#0b1324";
      [[-18, -18, 14], [4, -18, 14], [-18, 4, 14], [8, 8, 8], [-6, -4, 8]].forEach(([x, y, w]) => ctx.fillRect(x, y, w, w));
      if (!done && t.progress > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, 44, -Math.PI / 2, -Math.PI / 2 + t.progress * Math.PI * 2);
        ctx.strokeStyle = colors.signal;
        ctx.lineWidth = 5;
        ctx.stroke();
      } else if (!done) {
        ctx.beginPath();
        ctx.arc(0, 0, 44, 0, Math.PI * 2);
        ctx.setLineDash([6, 8]);
        ctx.strokeStyle = "rgba(240, 102, 61, 0.6)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    // Thruster puffs
    for (const p of puffs) {
      ctx.globalAlpha = p.life * 1.4;
      ctx.fillStyle = "#cfd8ea";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 + (0.5 - p.life) * 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Astrobee: a small cube with a nozzle grille and a status light
    if (ship) {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.fillStyle = "#e7ebf2";
      roundRect(-SIZE, -SIZE, SIZE * 2, SIZE * 2, 7);
      ctx.fill();
      ctx.fillStyle = colors.signal;
      roundRect(-SIZE, -SIZE, SIZE * 2, 10, [7, 7, 0, 0]);
      ctx.fill();
      ctx.fillStyle = "#2a3654";
      for (let i = -12; i <= 12; i += 8) ctx.fillRect(i - 2, 0, 4, 14);
      ctx.fillStyle = colors.blue;
      ctx.beginPath();
      ctx.arc(-13, -2, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // HUD
    const done = tags.filter((t) => t.progress >= 1).length;
    ctx.textAlign = "left";
    ctx.fillStyle = colors.text;
    ctx.font = "600 24px 'JetBrains Mono', monospace";
    ctx.fillText(`${time.toFixed(1)}s`, 90, 106);
    ctx.fillStyle = colors.dim;
    ctx.font = "500 20px 'JetBrains Mono', monospace";
    ctx.fillText(`targets ${done}/2   bumps ${bumps}`, 200, 104);
    if (ship) {
      const v = Math.hypot(ship.vx, ship.vy) * M_PER_UNIT;
      ctx.fillText(`${v.toFixed(2)} m/s`, 520 + 80, 104);
    }

    if (state === "play" && messageTime > 0) {
      ctx.globalAlpha = Math.min(1, messageTime * 2);
      ctx.textAlign = "center";
      ctx.fillStyle = colors.text;
      ctx.font = "600 28px Figtree, sans-serif";
      ctx.fillText(message, W / 2, H - 100);
      ctx.globalAlpha = 1;
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (state === "play") update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  // Keep the canvas sharp at any size
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.width * dpr * (H / W));
  }
  new ResizeObserver(resize).observe(canvas);

  // Controls
  const keyMap = {
    ArrowLeft: "left", KeyA: "left",
    ArrowRight: "right", KeyD: "right",
    ArrowUp: "up", KeyW: "up",
    ArrowDown: "down", KeyS: "down",
  };
  window.addEventListener("keydown", (e) => {
    const dir = keyMap[e.code];
    if (!dir) return;
    if (state !== "play") {
      if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      if (!screens.start.hidden || !screens.done.hidden) return;
    }
    e.preventDefault();
    keys.add(dir);
  });
  window.addEventListener("keyup", (e) => {
    const dir = keyMap[e.code];
    if (dir) keys.delete(dir);
  });
  window.addEventListener("blur", () => keys.clear());


  root.querySelectorAll(".game-start").forEach((b) => b.addEventListener("click", start));
  canvas.tabIndex = 0;

  reset();
  showBest();
  resize();
  requestAnimationFrame(frame);
})();
