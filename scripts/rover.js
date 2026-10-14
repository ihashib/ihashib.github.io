// Rover Run: drive Mongol Tori across Mars to collect three samples and
// return to base, dropping radio relays to stay in range. One canvas, a
// 1600 x 900 world scaled to whatever size the canvas is.
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
  const ACCEL = 900;
  const FRICTION = 4; // ground drag, per second
  const CRATER_FRICTION = 10;
  const NO_LINK = 0.35; // drive power with no radio link
  const BASE_RANGE = 400;
  const RELAY_RANGE = 340;
  const RELAYS = 3;
  const RADIUS = 26; // rover collision radius

  const colors = {
    ground1: "#4a2418",
    ground2: "#2b130c",
    rock: "#6e4a3c",
    rockEdge: "#8f6a58",
    text: "#f3ece8",
    dim: "#d1b8ad",
    signal: "#f0663d",
    ok: "#4ade80",
    radio: "91, 140, 255",
  };

  const base = { x: 150, y: 760 };
  const sampleSpots = [
    { x: 640, y: 230 },
    { x: 1090, y: 640 },
    { x: 1400, y: 210 },
  ];
  const rocks = [
    { x: 420, y: 640, r: 38 }, { x: 330, y: 330, r: 30 }, { x: 760, y: 470, r: 46 },
    { x: 900, y: 220, r: 34 }, { x: 980, y: 800, r: 30 }, { x: 1240, y: 420, r: 44 },
    { x: 1330, y: 690, r: 32 }, { x: 560, y: 820, r: 26 }, { x: 1180, y: 120, r: 26 },
  ];
  const craters = [
    { x: 600, y: 600, rx: 120, ry: 70 },
    { x: 1150, y: 300, rx: 110, ry: 64 },
    { x: 300, y: 160, rx: 90, ry: 50 },
  ];

  let state = "ready";
  let rover, samples, relays, time, bumps, bumpCooldown, message, messageTime, dust;
  let last = 0;
  const keys = new Set();

  const readBest = () => {
    try {
      return parseFloat(localStorage.getItem("rover-best")) || null;
    } catch {
      return null;
    }
  };
  const writeBest = (v) => {
    try {
      localStorage.setItem("rover-best", String(v));
    } catch {}
  };
  const showBest = () => {
    const best = readBest();
    bestLabel.textContent = best ? `Your best: ${best.toFixed(1)}s` : "";
  };

  function reset() {
    rover = { x: base.x + 70, y: base.y - 60, vx: 0, vy: 0, heading: -Math.PI / 4 };
    samples = sampleSpots.map((s) => ({ ...s, got: false }));
    relays = [];
    time = 0;
    bumps = 0;
    bumpCooldown = 0;
    message = "";
    messageTime = 0;
    dust = [];
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
    const score = time + bumps * 2;
    const best = readBest();
    const isBest = !best || score < best;
    if (isBest) writeBest(score);
    result.textContent =
      `${score.toFixed(1)}s` +
      (bumps ? ` (${time.toFixed(1)}s driving + ${bumps * 2}s for ${bumps} rock hit${bumps > 1 ? "s" : ""})` : ", no rock hits") +
      `, ${relays.length} relay${relays.length === 1 ? "" : "s"} used.` +
      (isBest ? " New best!" : ` Your best is ${best.toFixed(1)}s.`);
    screens.done.hidden = false;
    showBest();
  }

  function flash(text) {
    message = text;
    messageTime = 1.8;
  }

  // Signal from 0 (no link) to 1 (next to a node)
  const nodes = () => [{ ...base, range: BASE_RANGE }, ...relays.map((r) => ({ ...r, range: RELAY_RANGE }))];
  function signalAt(x, y) {
    let best = 0;
    for (const n of nodes()) best = Math.max(best, 1 - Math.hypot(x - n.x, y - n.y) / n.range);
    return best;
  }

  function dropRelay() {
    if (state !== "play") return;
    if (relays.length >= RELAYS) return flash("No relays left");
    if (signalAt(rover.x, rover.y) <= 0) return flash("Out of range: drive back into coverage to drop one");
    if (nodes().some((n) => Math.hypot(rover.x - n.x, rover.y - n.y) < 120)) return flash("Too close to another antenna");
    relays.push({ x: rover.x, y: rover.y });
    flash(`Relay placed. ${RELAYS - relays.length} left`);
  }

  function update(dt) {
    const link = signalAt(rover.x, rover.y) > 0;
    let ax = 0;
    let ay = 0;
    if (keys.has("left")) ax -= 1;
    if (keys.has("right")) ax += 1;
    if (keys.has("up")) ay -= 1;
    if (keys.has("down")) ay += 1;
    const len = Math.hypot(ax, ay) || 1;
    const power = ACCEL * (link ? 1 : NO_LINK);
    rover.vx += (ax / len) * power * dt;
    rover.vy += (ay / len) * power * dt;

    const inCrater = craters.some((c) => ((rover.x - c.x) / c.rx) ** 2 + ((rover.y - c.y) / c.ry) ** 2 < 1);
    const drag = Math.max(0, 1 - (inCrater ? CRATER_FRICTION : FRICTION) * dt);
    rover.vx *= drag;
    rover.vy *= drag;
    rover.x += rover.vx * dt;
    rover.y += rover.vy * dt;

    const speed = Math.hypot(rover.vx, rover.vy);
    if (speed > 20) {
      // Turn smoothly towards the direction of travel
      const target = Math.atan2(rover.vy, rover.vx);
      let diff = target - rover.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      rover.heading += diff * Math.min(1, dt * 8);
      if (Math.random() < speed / 400) {
        dust.push({ x: rover.x - Math.cos(rover.heading) * 30, y: rover.y - Math.sin(rover.heading) * 30, life: 0.7 });
      }
    }
    dust.forEach((d) => (d.life -= dt));
    dust = dust.filter((d) => d.life > 0);

    // Edges of the map
    rover.x = Math.max(RADIUS, Math.min(W - RADIUS, rover.x));
    rover.y = Math.max(RADIUS, Math.min(H - RADIUS, rover.y));

    // Rocks: push out and bounce
    bumpCooldown -= dt;
    for (const r of rocks) {
      const dx = rover.x - r.x;
      const dy = rover.y - r.y;
      const d = Math.hypot(dx, dy);
      const min = r.r + RADIUS;
      if (d >= min || d === 0) continue;
      const nx = dx / d;
      const ny = dy / d;
      rover.x = r.x + nx * min;
      rover.y = r.y + ny * min;
      const along = rover.vx * nx + rover.vy * ny;
      if (along < 0) {
        rover.vx -= 1.4 * along * nx;
        rover.vy -= 1.4 * along * ny;
        if (-along > 60 && bumpCooldown <= 0) {
          bumps += 1;
          bumpCooldown = 0.6;
          flash("Hit a rock: +2s");
        }
      }
    }

    // Samples: drive over them to pick them up with the arm
    for (const s of samples) {
      if (!s.got && Math.hypot(rover.x - s.x, rover.y - s.y) < 46) {
        s.got = true;
        const left = samples.filter((t) => !t.got).length;
        flash(left ? `Sample collected. ${left} to go` : "All samples in. Head back to base");
      }
    }
    if (samples.every((s) => s.got) && Math.hypot(rover.x - base.x, rover.y - base.y) < 80) {
      finish();
      return;
    }

    time += dt;
    messageTime -= dt;
  }

  // Drawing
  function draw() {
    const s = canvas.width / W;
    ctx.setTransform(s, 0, 0, s, 0, 0);

    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, colors.ground1);
    g.addColorStop(1, colors.ground2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Dune lines
    ctx.strokeStyle = "rgba(255, 210, 190, 0.06)";
    ctx.lineWidth = 2;
    for (let y = 60; y < H; y += 70) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 40) ctx.lineTo(x, y + Math.sin(x / 140 + y) * 14);
      ctx.stroke();
    }

    // Craters (slow you down)
    for (const c of craters) {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(20, 8, 4, 0.35)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 200, 170, 0.14)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Radio coverage
    const signal = rover ? signalAt(rover.x, rover.y) : 1;
    for (const n of nodes()) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.range, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${colors.radio}, 0.07)`;
      ctx.fill();
      ctx.setLineDash([8, 10]);
      ctx.strokeStyle = `rgba(${colors.radio}, 0.45)`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Rocks
    for (const r of rocks) {
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const k = 0.82 + ((i * 37 + r.x) % 7) / 30;
        ctx.lineTo(r.x + Math.cos(a) * r.r * k, r.y + Math.sin(a) * r.r * k);
      }
      ctx.closePath();
      ctx.fillStyle = colors.rock;
      ctx.fill();
      ctx.strokeStyle = colors.rockEdge;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Samples
    const pulse = (Math.sin(performance.now() / 300) + 1) / 2;
    for (const sm of samples || []) {
      if (sm.got) continue;
      ctx.beginPath();
      ctx.arc(sm.x, sm.y, 30 + pulse * 10, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(240, 102, 61, ${0.5 - pulse * 0.3})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.save();
      ctx.translate(sm.x, sm.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = colors.signal;
      ctx.fillRect(-11, -11, 22, 22);
      ctx.restore();
    }

    // Base station: a dish on a mast
    ctx.save();
    ctx.translate(base.x, base.y);
    ctx.fillStyle = "#1c2742";
    ctx.beginPath();
    ctx.roundRect(-46, -30, 92, 60, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -4, 20, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(0, 18);
    ctx.stroke();
    ctx.fillStyle = colors.dim;
    ctx.font = "600 18px Figtree, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BASE", 0, 52);
    ctx.restore();

    // Relays: a small tower with a blinking light
    const blink = Math.floor(performance.now() / 500) % 2;
    for (const r of relays || []) {
      ctx.strokeStyle = "#dbe3f1";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(r.x - 12, r.y + 16);
      ctx.lineTo(r.x, r.y - 18);
      ctx.lineTo(r.x + 12, r.y + 16);
      ctx.stroke();
      ctx.fillStyle = blink ? colors.ok : "rgba(74, 222, 128, 0.3)";
      ctx.beginPath();
      ctx.arc(r.x, r.y - 22, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dust behind the wheels
    for (const d of dust) {
      ctx.globalAlpha = d.life * 0.5;
      ctx.fillStyle = "#c79a85";
      ctx.beginPath();
      ctx.arc(d.x, d.y, 6 + (0.7 - d.life) * 14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // The rover, top down: chassis, six wheels, mast and arm
    if (rover) {
      ctx.save();
      ctx.translate(rover.x, rover.y);
      ctx.rotate(rover.heading);
      ctx.fillStyle = "#1a1f2b";
      for (const wx of [-20, 0, 20]) for (const wy of [-22, 22]) ctx.fillRect(wx - 8, wy - 6, 16, 12);
      ctx.fillStyle = "#e7ebf2";
      ctx.beginPath();
      ctx.roundRect(-28, -16, 56, 32, 6);
      ctx.fill();
      ctx.fillStyle = colors.signal;
      ctx.fillRect(-28, -16, 10, 32);
      ctx.strokeStyle = "#9aa8be";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(18, 6);
      ctx.lineTo(40, 10);
      ctx.stroke();
      ctx.fillStyle = "#2a3654";
      ctx.beginPath();
      ctx.arc(-4, -2, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Static on the camera feed with no link
    if (state === "play" && signal <= 0) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      for (let i = 0; i < 90; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 40 + Math.random() * 120, 2);
      ctx.fillStyle = "rgba(10, 6, 4, 0.25)";
      ctx.fillRect(0, 0, W, H);
    }

    // HUD
    ctx.fillStyle = "rgba(10, 6, 4, 0.45)";
    ctx.beginPath();
    ctx.roundRect(24, 22, 640, 52, 12);
    ctx.fill();
    ctx.textAlign = "left";
    ctx.fillStyle = colors.text;
    ctx.font = "600 24px 'JetBrains Mono', monospace";
    ctx.fillText(`${time.toFixed(1)}s`, 44, 57);
    ctx.font = "500 20px 'JetBrains Mono', monospace";
    ctx.fillStyle = colors.dim;
    const got = samples ? samples.filter((t) => t.got).length : 0;
    ctx.fillText(`samples ${got}/3   relays ${RELAYS - relays.length}   hits ${bumps}`, 150, 56);
    // Signal bars
    const bars = signal <= 0 ? 0 : Math.ceil(signal * 4);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i < bars ? (bars > 1 ? colors.ok : colors.signal) : "rgba(255, 255, 255, 0.18)";
      ctx.fillRect(560 + i * 18, 62 - (i + 1) * 8, 12, (i + 1) * 8);
    }
    if (state === "play" && signal <= 0) {
      ctx.fillStyle = colors.signal;
      ctx.font = "700 22px Figtree, sans-serif";
      ctx.fillText("NO LINK", 650, 57);
    }

    if (state === "play" && messageTime > 0) {
      ctx.globalAlpha = Math.min(1, messageTime * 2);
      ctx.textAlign = "center";
      ctx.fillStyle = colors.text;
      ctx.font = "600 28px Figtree, sans-serif";
      ctx.fillText(message, W / 2, H - 50);
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
    if (state !== "play") return;
    if (e.code === "Space") {
      e.preventDefault();
      if (!e.repeat) dropRelay();
      return;
    }
    const dir = keyMap[e.code];
    if (!dir) return;
    e.preventDefault();
    keys.add(dir);
  });
  window.addEventListener("keyup", (e) => {
    const dir = keyMap[e.code];
    if (dir) keys.delete(dir);
  });
  window.addEventListener("blur", () => keys.clear());

  document.querySelectorAll(".game-pad [data-dir]").forEach((btn) => {
    const dir = btn.dataset.dir;
    const on = (e) => {
      e.preventDefault();
      keys.add(dir);
      btn.classList.add("is-down");
    };
    const off = () => {
      keys.delete(dir);
      btn.classList.remove("is-down");
    };
    btn.addEventListener("pointerdown", on);
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => btn.addEventListener(ev, off));
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  });
  const relayBtn = document.querySelector('.game-pad [data-action="relay"]');
  if (relayBtn) relayBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    dropRelay();
  });

  root.querySelectorAll(".game-start").forEach((b) => b.addEventListener("click", start));
  canvas.tabIndex = 0;

  reset();
  showBest();
  resize();
  requestAnimationFrame(frame);
})();
