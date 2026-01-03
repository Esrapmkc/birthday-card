(() => {
  const envelopeWrap = document.getElementById("envelopeWrap");
  const envelopeBtn = document.getElementById("envelope");
  const cardWrap = document.getElementById("cardWrap");
  const canvas = document.getElementById("confetti");
  const ctx = canvas.getContext("2d");
  const pop = document.getElementById("pop");
  const msgEl = document.getElementById("msg");
  const fromEl = document.getElementById("from");
  const hint = document.getElementById("hint");

  // URL personalization:
  // ?msg=...&from=...&title=...
  const params = new URLSearchParams(location.search);
  const msg = params.get("msg");
  const from = params.get("from");
  const title = params.get("title");

  function safeText(s) {
    return String(s).replace(/[\u0000-\u001F\u007F]/g, "").trim();
  }

  if (title) document.title = safeText(title);
  if (msg) msgEl.textContent = safeText(msg);
  if (from) fromEl.textContent = "— " + safeText(from);

  // ===== Confetti engine =====
  let W = 0, H = 0;
  const particles = [];
  let raf = 0;

  function resize() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    W = Math.floor(window.innerWidth);
    H = Math.floor(window.innerHeight);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize, { passive: true });
  resize();

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  function addBurst(side) {
    const count = Math.floor(rand(110, 170));
    const x = side === "left" ? -10 : W + 10;
    const dir = side === "left" ? 1 : -1;

    for (let i = 0; i < count; i++) {
      particles.push({
        x,
        y: rand(H * 0.25, H * 0.75),
        vx: rand(5.2, 13.2) * dir,
        vy: rand(-9.5, 6.5),
        g: rand(0.18, 0.34),
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.18, 0.18),
        size: rand(4, 10),
        life: 0,
        max: rand(75, 135),
        shape: Math.random() < 0.7 ? "rect" : "circle",
        color: pick([
          "#ff4d6d", "#ffd166", "#06d6a0", "#118ab2",
          "#9b5de5", "#f15bb5", "#00bbf9", "#fee440"
        ])
      });
    }
  }

  function tick() {
    raf = requestAnimationFrame(tick);
    ctx.clearRect(0, 0, W, H);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += 1;

      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;

      const alpha = 1 - (p.life / p.max);
      if (alpha <= 0 || p.y > H + 80 || p.x < -140 || p.x > W + 140) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;

      if (p.shape === "rect") {
        ctx.fillRect(-p.size * 0.5, -p.size * 0.35, p.size, p.size * 0.7);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (particles.length === 0) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function blastConfetti() {
    addBurst("left");
    addBurst("right");
    if (!raf) tick();
  }

  async function playPop() {
    try {
      pop.currentTime = 0;
      await pop.play();
    } catch (e) {}
  }

  // ===== Open flow (envelope disappears, card stays) =====
  let opened = false;

  envelopeBtn.addEventListener("click", async () => {
    if (!opened) {
      opened = true;

      hint.textContent = "Click the card to replay ✨";
      cardWrap.classList.add("show");
      cardWrap.setAttribute("aria-hidden", "false");

      envelopeWrap.classList.add("vanish");

      await playPop();
      blastConfetti();

      // IMPORTANT: remove envelope completely so it never covers the card
      setTimeout(() => {
        envelopeWrap.style.display = "none";
      }, 560);
    } else {
      // if somehow clicked again
      await playPop();
      blastConfetti();
    }
  }, { passive: true });

  // Replay on card click (optional)
  cardWrap.addEventListener("click", async () => {
    if (!opened) return;
    await playPop();
    blastConfetti();
  }, { passive: true });

  // Optional auto-open (sound still needs click)
  if (params.get("open") === "1") {
    opened = true;
    hint.textContent = "Click the card to play sound + confetti ✨";
    cardWrap.classList.add("show");
    envelopeWrap.style.display = "none";
  }
})();
