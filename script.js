(() => {
  const canvas = document.getElementById("fx");
  const ctx = canvas.getContext("2d");

  const intro = document.getElementById("intro");
  const countNum = document.getElementById("countNum");
  const envelopeWrap = document.getElementById("envelopeWrap");
  const envelopeBtn = document.getElementById("envelope");
  const cardWrap = document.getElementById("cardWrap");

  const pop = document.getElementById("pop");
  const msgEl = document.getElementById("msg");
  const fromEl = document.getElementById("from");
  const hint = document.getElementById("hint");

  // URL personalization: ?msg=...&from=...&title=...
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

  // ===== Canvas resize =====
  let W = 0, H = 0;
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

  // ===== FX Engine: confetti + sparkles =====
  const particles = [];
  let raf = 0;

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  function addConfettiBurst(side) {
    const count = Math.floor(rand(120, 180));
    const x = side === "left" ? -10 : W + 10;
    const dir = side === "left" ? 1 : -1;
    for (let i = 0; i < count; i++) {
      particles.push({
        kind: "confetti",
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
        color: pick(["#ff4d6d","#ffd166","#06d6a0","#118ab2","#9b5de5","#f15bb5","#00bbf9","#fee440"])
      });
    }
  }

  function addSparkleBurst(cx, cy) {
    const count = Math.floor(rand(90, 140));
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(2.2, 7.2);
      particles.push({
        kind: "sparkle",
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - rand(1.5, 3.0),
        g: rand(0.05, 0.10),
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.25, 0.25),
        size: rand(2, 5),
        life: 0,
        max: rand(45, 80),
        color: pick(["rgba(255,255,255,.95)","rgba(255,240,200,.95)","rgba(255,220,160,.95)"])
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
      if (alpha <= 0 || p.y > H + 120 || p.x < -160 || p.x > W + 160) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);

      if (p.kind === "confetti") {
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
      } else {
        // sparkle (tiny star-ish)
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.55, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.55, 0);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    if (particles.length === 0) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function ensureTick() {
    if (!raf) tick();
  }

  async function playPop() {
    try {
      pop.currentTime = 0;
      await pop.play();
    } catch (e) {}
  }

  // ===== FLOW =====
  // 1) countdown 5 → 0 while flames flicker (CSS)
  // 2) at 0: blow out (CSS class), sparkle burst, then show envelope
  let seconds = 5;
  let openedEnvelope = false;

  function setHint(text) { hint.textContent = text; }

  function startCountdown() {
    countNum.textContent = String(seconds);

    const timer = setInterval(() => {
      seconds -= 1;
      if (seconds < 0) {
        clearInterval(timer);
        return;
      }
      countNum.textContent = String(seconds);

      if (seconds === 0) {
        clearInterval(timer);
        blowOut();
      }
    }, 1000);
  }

  function blowOut() {
    // Flames off + smoke on
    intro.classList.add("blown");
    setHint("✨ Blow… and watch the sparkle magic!");

    // sparkle burst near candle area (upper center)
    addSparkleBurst(W * 0.5, H * 0.28);
    addSparkleBurst(W * 0.5, H * 0.30);
    ensureTick();

    // After a moment, reveal envelope
    setTimeout(() => {
      envelopeWrap.classList.add("show");
      envelopeWrap.setAttribute("aria-hidden", "false");
      setHint("Tap the envelope 💌");
    }, 900);
  }

  envelopeBtn.addEventListener("click", async () => {
    if (openedEnvelope) {
      // Replay confetti
      await playPop();
      addConfettiBurst("left");
      addConfettiBurst("right");
      ensureTick();
      return;
    }

    openedEnvelope = true;

    // Confetti + sound
    await playPop();
    addConfettiBurst("left");
    addConfettiBurst("right");
    ensureTick();

    // Show card
    cardWrap.classList.add("show");
    cardWrap.setAttribute("aria-hidden", "false");
    setHint("Tap the card to replay ✨");

    // Envelope vanishes completely
    envelopeWrap.classList.add("vanish");
    setTimeout(() => {
      envelopeWrap.style.display = "none";
    }, 560);
  }, { passive: true });

  // Replay on card click
  cardWrap.addEventListener("click", async () => {
    if (!openedEnvelope) return;
    await playPop();
    addConfettiBurst("left");
    addConfettiBurst("right");
    ensureTick();
  }, { passive: true });

  // Optional: skip countdown if ?skip=1
  if (params.get("skip") === "1") {
    seconds = 0;
    countNum.textContent = "0";
    blowOut();
  } else {
    startCountdown();
  }
})();
