<script>
  import { untrack } from 'svelte';
  import { formatNumber } from './formatNumber.js';

  let {
    currentCivilizations = 0,
    numberOfStars = 250,
  } = $props();

  let canvas = $state(null);
  let containerEl = $state(null);
  let animationId = null;

  // Galaxy parameters
  const TOTAL_STARS = 600;
  const SPIRAL_ARMS = 2;
  const TILT = 0.35;
  const BASE_ROTATION_SPEED = 0.00008;
  const TARGET_FRAME_MS = 33; // ~30fps – saves battery on mobile

  let stars = $state([]);
  let civilizationStars = $state([]);
  let sunStar = $state(null);

  // --- Pre-rendered sprite caches (avoid per-frame gradient creation) ---
  let civSunSprite = null;
  let civOtherSprite = null;
  let bgLayer = null;       // cached static background
  let bgW = 0;
  let bgH = 0;

  function createCivSprite(isSun) {
    const glowRadius = isSun ? 6 : 5;
    const coreSize = isSun ? 1.5 : 1.2;
    const dim = Math.ceil((glowRadius + 2) * 2);
    const c = document.createElement('canvas');
    c.width = dim;
    c.height = dim;
    const g = c.getContext('2d');
    const mid = dim / 2;

    const grad = g.createRadialGradient(mid, mid, 0, mid, mid, glowRadius);
    if (isSun) {
      grad.addColorStop(0, 'rgba(255, 230, 100, 1)');
      grad.addColorStop(0.3, 'rgba(180, 255, 80, 0.7)');
      grad.addColorStop(1, 'rgba(80, 200, 50, 0)');
    } else {
      grad.addColorStop(0, 'rgba(150, 255, 100, 1)');
      grad.addColorStop(0.3, 'rgba(100, 220, 60, 0.6)');
      grad.addColorStop(1, 'rgba(60, 180, 40, 0)');
    }
    g.beginPath();
    g.arc(mid, mid, glowRadius, 0, Math.PI * 2);
    g.fillStyle = grad;
    g.fill();

    g.beginPath();
    g.arc(mid, mid, coreSize, 0, Math.PI * 2);
    g.fillStyle = isSun ? 'rgba(255, 255, 180, 1)' : 'rgba(180, 255, 140, 1)';
    g.fill();

    return { canvas: c, half: mid };
  }

  function initSprites() {
    civSunSprite = createCivSprite(true);
    civOtherSprite = createCivSprite(false);
  }

  function renderBackground(w, h) {
    if (!bgLayer) {
      bgLayer = document.createElement('canvas');
    }
    bgLayer.width = w;
    bgLayer.height = h;
    const b = bgLayer.getContext('2d');
    const cx = w / 2;
    const cy = h / 2;

    // Center glow
    const cg = b.createRadialGradient(cx, cy, 0, cx, cy, w * 0.08);
    cg.addColorStop(0, 'rgba(255, 240, 200, 0.12)');
    cg.addColorStop(0.5, 'rgba(200, 180, 150, 0.04)');
    cg.addColorStop(1, 'rgba(100, 100, 150, 0)');
    b.beginPath();
    b.arc(cx, cy, w * 0.08, 0, Math.PI * 2);
    b.fillStyle = cg;
    b.fill();

    // Dust band
    b.globalAlpha = 0.025;
    const dg = b.createLinearGradient(cx - w * 0.4, cy, cx + w * 0.4, cy);
    dg.addColorStop(0, 'transparent');
    dg.addColorStop(0.3, 'rgba(100, 120, 180, 1)');
    dg.addColorStop(0.5, 'rgba(150, 140, 180, 1)');
    dg.addColorStop(0.7, 'rgba(100, 120, 180, 1)');
    dg.addColorStop(1, 'transparent');
    b.beginPath();
    b.ellipse(cx, cy, w * 0.43, h * 0.43 * TILT * 0.5, 0, 0, Math.PI * 2);
    b.fillStyle = dg;
    b.fill();
    b.globalAlpha = 1;

    bgW = w;
    bgH = h;
  }

  function generateStars() {
    const result = [];
    for (let i = 0; i < TOTAL_STARS; i++) {
      const arm = i % SPIRAL_ARMS;
      const armOffset = (arm / SPIRAL_ARMS) * Math.PI * 2;
      const t = Math.random();
      const r = 0.05 + Math.sqrt(t) * 0.9;
      const spiralAngle = r * 3.5 + armOffset;
      const spread = (1 - r * 0.5) * 0.6;
      const angle = spiralAngle + (Math.random() - 0.5) * spread;
      const isBulge = Math.random() < 0.15;
      const finalR = isBulge ? Math.random() * 0.2 : r;
      const finalAngle = isBulge ? Math.random() * Math.PI * 2 : angle;

      const sizeFactor = Math.random();
      const size = sizeFactor < 0.7 ? 0.5 + Math.random() * 0.8
                 : sizeFactor < 0.95 ? 1.0 + Math.random() * 0.8
                 : 1.8 + Math.random() * 1.0;

      const brightness = 0.3 + Math.random() * 0.7;

      const colorTemp = Math.random();
      let r_c, g_c, b_c;
      if (colorTemp < 0.1) {
        r_c = 180 + Math.random() * 40; g_c = 190 + Math.random() * 40; b_c = 255;
      } else if (colorTemp < 0.2) {
        r_c = 255; g_c = 240 + Math.random() * 15; b_c = 180 + Math.random() * 40;
      } else if (colorTemp < 0.3) {
        r_c = 255; g_c = 180 + Math.random() * 50; b_c = 160 + Math.random() * 40;
      } else {
        const w = 200 + Math.random() * 55; r_c = w; g_c = w; b_c = w;
      }

      const orbitalSpeed = BASE_ROTATION_SPEED * (1 + 1.5 / (finalR + 0.3));
      const z = (Math.random() - 0.5) * 0.06;

      // Pre-compute the CSS color string once (avoid 600 template-literal allocs/frame)
      const colorStr = `rgb(${Math.round(r_c)},${Math.round(g_c)},${Math.round(b_c)})`;

      result.push({
        r: finalR,
        angle: finalAngle,
        size,
        brightness,
        colorStr,
        orbitalSpeed,
        z,
        twinkleOffset: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 2,
        hasGlow: size > 1.2,
        // Pre-compute derived draw sizes
        coreSize: size * 0.6,
        glowSize: size * 2.5,
      });
    }
    stars = result;
  }

  function placeCivilizations(count) {
    civilizationStars = [];
    sunStar = null;
    const civCount = Math.max(0, Math.round(count));
    if (civCount === 0) return;

    const sunR = 0.54;
    const sunAngle = Math.random() * Math.PI * 2;
    sunStar = {
      r: sunR,
      angle: sunAngle,
      size: 1.5,
      brightness: 1.0,
      orbitalSpeed: BASE_ROTATION_SPEED * (1 + 1.5 / (sunR + 0.3)),
      z: 0,
      isSun: true,
      twinkleOffset: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.8 + Math.random() * 1.5,
    };
    civilizationStars.push(sunStar);

    // Scale green dots proportionally to the galaxy, same as regular stars.
    // Each regular dot represents (numberOfStars * 1e9 / TOTAL_STARS) real stars,
    // so green dots = civs / that same ratio. For small counts we still show
    // at least 1 dot per civilization (up to 50) so they remain visible.
    const others = civCount - 1;
    const proportional = numberOfStars > 0
      ? Math.round(others * TOTAL_STARS / (numberOfStars * 1e9))
      : others;
    const otherCount = Math.min(TOTAL_STARS, Math.max(Math.min(others, 50), proportional));
    for (let i = 0; i < otherCount; i++) {
      const r = 0.25 + Math.random() * 0.55;
      const angle = Math.random() * Math.PI * 2;
      civilizationStars.push({
        r,
        angle,
        size: 1.2,
        brightness: 1.0,
        orbitalSpeed: BASE_ROTATION_SPEED * (1 + 1.5 / (r + 0.3)),
        z: 0,
        isSun: false,
        twinkleOffset: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.8 + Math.random() * 1.5,
      });
    }
  }

  let scaleRatio = $derived(
    numberOfStars > 0 ? (numberOfStars * 1e9) / TOTAL_STARS : 1
  );
  let civCountDisplay = $derived(Math.round(currentCivilizations));
  let displayedCivDots = $derived(civilizationStars.length);

  generateStars();
  initSprites();

  $effect(() => {
    const count = currentCivilizations;
    untrack(() => placeCivilizations(count));
  });

  // Animation loop
  $effect(() => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let time = 0;
    let lastFrameTime = 0;

    function resize() {
      if (!canvas || !containerEl) return;
      const rect = containerEl.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bgW = 0; // force background re-render
    }

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(containerEl);

    function animate(timestamp) {
      if (!canvas) return;

      // Throttle to ~30fps for battery savings
      if (timestamp - lastFrameTime < TARGET_FRAME_MS) {
        animationId = requestAnimationFrame(animate);
        return;
      }
      lastFrameTime = timestamp;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const cx = w / 2;
      const cy = h / 2;
      const w045 = w * 0.45;
      const h045t = h * 0.45 * TILT;
      const hz045 = h * 0.45;

      ctx.clearRect(0, 0, w, h);

      // Draw cached static background (center glow + dust band)
      if (bgW !== w || bgH !== h) {
        renderBackground(w, h);
      }
      ctx.drawImage(bgLayer, 0, 0);

      // --- Draw regular stars (optimised: fillRect, no arc/gradient per frame) ---
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const ca = s.angle + time * s.orbitalSpeed;
        const x = cx + Math.cos(ca) * s.r * w045;
        const y = cy + Math.sin(ca) * s.r * h045t + s.z * hz045;

        const alpha = s.brightness * (0.7 + 0.3 * Math.sin(time * s.twinkleSpeed + s.twinkleOffset));

        ctx.fillStyle = s.colorStr;

        if (s.hasGlow) {
          // ~30% of stars: soft square glow + core (fillRect, no gradient)
          ctx.globalAlpha = alpha * 0.15;
          const gs = s.glowSize;
          ctx.fillRect(x - gs, y - gs, gs * 2, gs * 2);
          ctx.globalAlpha = alpha;
          const cs = s.coreSize;
          ctx.fillRect(x - cs * 0.5, y - cs * 0.5, cs, cs);
        } else {
          // ~70% of stars: single tiny fillRect (fastest path)
          ctx.globalAlpha = alpha;
          const cs = s.coreSize;
          ctx.fillRect(x - cs * 0.5, y - cs * 0.5, cs, cs);
        }
      }
      ctx.globalAlpha = 1;

      // --- Draw civilization stars using pre-rendered sprites ---
      // Scale down sprites when many are displayed so they don't overwhelm
      const civLen = civilizationStars.length;
      const civScale = civLen <= 50 ? 1.0 : Math.max(0.35, 50 / civLen);

      let sunX = 0, sunY = 0, hasSun = false;
      for (let i = 0; i < civLen; i++) {
        const civ = civilizationStars[i];
        const ca = civ.angle + time * civ.orbitalSpeed;
        const x = cx + Math.cos(ca) * civ.r * w045;
        const y = cy + Math.sin(ca) * civ.r * h045t + civ.z * hz045;

        const twinkle = 0.7 + 0.3 * Math.sin(time * civ.twinkleSpeed + civ.twinkleOffset);
        const sprite = civ.isSun ? civSunSprite : civOtherSprite;
        const s = civ.isSun ? Math.max(civScale, 0.6) : civScale;
        const dim = sprite.half * 2 * s;
        const off = dim / 2;

        ctx.globalAlpha = twinkle;
        ctx.drawImage(sprite.canvas, x - off, y - off, dim, dim);

        if (civ.isSun) {
          sunX = x;
          sunY = y;
          hasSun = true;
        }
      }
      ctx.globalAlpha = 1;

      // Only label Our Sun
      if (hasSun) {
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 245, 180, 0.9)';
        ctx.fillText('Our Sun', sunX, sunY - 14);
      }

      time += 1;
      animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  });
</script>

<section class="milky-way-card">
  <h2>The Milky Way</h2>
  <p class="section-subtitle">
    A visualization of our galaxy with
    <strong class="civ-count">
      {civCountDisplay === 0 ? 'no' : formatNumber(civCountDisplay)}
    </strong>
    {civCountDisplay === 1 ? 'civilization' : 'civilizations'} present
  </p>

  <div class="galaxy-container" bind:this={containerEl}>
    <canvas bind:this={canvas}></canvas>
  </div>

  <div class="galaxy-legend">
    <div class="legend-item">
      <span class="legend-dot gray"></span>
      <span>Stars without known life</span>
    </div>
    <div class="legend-item">
      <span class="legend-dot green"></span>
      <span>Star system with a civilization</span>
    </div>
    {#if sunStar}
      <div class="legend-item">
        <span class="legend-dot sun"></span>
        <span>Our Sun</span>
      </div>
    {/if}
    <div class="legend-note">
      Each dot represents ~{formatNumber(scaleRatio)} stars.
      {#if civCountDisplay > 0 && displayedCivDots < civCountDisplay}
        Showing {displayedCivDots} of {formatNumber(civCountDisplay)} civilizations.
      {/if}
    </div>
  </div>
</section>

<style>
  .milky-way-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  h2 {
    font-size: 1.4rem;
    color: var(--heading);
    margin-bottom: 0.15rem;
  }

  .section-subtitle {
    font-size: 0.85rem;
    color: var(--text-muted);
    font-style: italic;
    margin-bottom: 1rem;
  }

  .civ-count {
    color: var(--gold);
    font-style: normal;
  }

  .galaxy-container {
    width: 100%;
    height: 400px;
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    background: radial-gradient(ellipse at center, rgba(15, 15, 40, 0.8) 0%, rgba(5, 5, 15, 0.95) 100%);
  }

  canvas {
    width: 100%;
    height: 100%;
    display: block;
  }

  .galaxy-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .legend-dot.gray {
    background: #ccc;
    box-shadow: 0 0 3px rgba(200, 200, 200, 0.4);
  }

  .legend-dot.green {
    background: #8f6;
    box-shadow: 0 0 5px rgba(136, 255, 102, 0.5);
  }

  .legend-dot.sun {
    background: #ffe064;
    box-shadow: 0 0 5px rgba(255, 224, 100, 0.6);
  }

  .legend-note {
    font-size: 0.75rem;
    color: var(--text-muted);
    opacity: 0.7;
    width: 100%;
  }

  @media (max-width: 600px) {
    .galaxy-container {
      height: 280px;
    }
  }
</style>
