// On-screen joystick for the mini-games. Drag the knob; the games read
// window.joystick.x and .y, each from -1 to 1 (0 when released).
(() => {
  const base = document.querySelector(".joystick");
  window.joystick = { x: 0, y: 0 };
  if (!base) return;

  const knob = base.querySelector(".joystick-knob");
  const DEAD = 0.12;
  let id = null;

  function move(e) {
    const r = base.getBoundingClientRect();
    const max = (r.width - knob.offsetWidth) / 2;
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const x = dx / max;
    const y = dy / max;
    const amount = Math.hypot(x, y);
    window.joystick.x = amount < DEAD ? 0 : x;
    window.joystick.y = amount < DEAD ? 0 : y;
  }

  function release() {
    id = null;
    window.joystick.x = 0;
    window.joystick.y = 0;
    knob.style.transform = "";
    base.classList.remove("is-active");
  }

  base.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    id = e.pointerId;
    base.setPointerCapture(id);
    base.classList.add("is-active");
    move(e);
  });
  base.addEventListener("pointermove", (e) => {
    if (e.pointerId === id) move(e);
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((ev) =>
    base.addEventListener(ev, (e) => {
      if (e.pointerId === id) release();
    })
  );
  base.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("blur", release);
})();
