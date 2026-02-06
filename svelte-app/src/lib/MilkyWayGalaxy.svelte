<script>
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
  const TILT = 0.35; // vertical compression for the oval appearance
  const BASE_ROTATION_SPEED = 0.00008;

  // Generate stars once
  let stars = $state([]);
  let civilizationStars = $state([]);
  let sunStar = $state(null);

  function generateStars() {
    stars = [];
    for (let i = 0; i < TOTAL_STARS; i++) {
      // Distribute along spiral arms with some spread
      const arm = i % SPIRAL_ARMS;
      const armOffset = (arm / SPIRAL_ARMS) * Math.PI * 2;

      // Distance from center: use sqrt for more uniform distribution in disk
      const t = Math.random();
      const r = 0.05 + Math.sqrt(t) * 0.9;

      // Spiral angle based on distance
      const spiralAngle = r * 3.5 + armOffset;
      const spread = (1 - r * 0.5) * 0.6;
      const angle = spiralAngle + (Math.random() - 0.5) * spread;

      // Some scatter for galactic bulge
      const isBulge = Math.random() < 0.15;
      const finalR = isBulge ? Math.random() * 0.2 : r;
      const finalAngle = isBulge ? Math.random() * Math.PI * 2 : angle;

      // Size: smaller stars further from center, occasional bright ones
      const sizeFactor = Math.random();
      const size = sizeFactor < 0.7 ? 0.5 + Math.random() * 0.8
                 : sizeFactor < 0.95 ? 1.0 + Math.random() * 0.8
                 : 1.8 + Math.random() * 1.0;

      // Brightness variation
      const brightness = 0.3 + Math.random() * 0.7;

      // Slight color variation for white/gray stars
      const colorTemp = Math.random();
      let r_c, g_c, b_c;
      if (colorTemp < 0.1) {
        // Blueish
        r_c = 180 + Math.random() * 40;
        g_c = 190 + Math.random() * 40;
        b_c = 255;
      } else if (colorTemp < 0.2) {
        // Yellowish
        r_c = 255;
        g_c = 240 + Math.random() * 15;
        b_c = 180 + Math.random() * 40;
      } else if (colorTemp < 0.3) {
        // Reddish tint
        r_c = 255;
        g_c = 180 + Math.random() * 50;
        b_c = 160 + Math.random() * 40;
      } else {
        // White/gray
        const w = 200 + Math.random() * 55;
        r_c = w;
        g_c = w;
        b_c = w;
      }

      // Orbital speed: inner stars orbit faster (Keplerian-ish)
      const orbitalSpeed = BASE_ROTATION_SPEED * (1 + 1.5 / (finalR + 0.3));

      // Add a slight z-offset for depth variation
      const z = (Math.random() - 0.5) * 0.06;

      stars.push({
        r: finalR,
        angle: finalAngle,
        size,
        brightness,
        color: { r: r_c, g: g_c, b: b_c },
        orbitalSpeed,
        z,
        twinkleOffset: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 2,
      });
    }
  }

  // Place civilization stars including our Sun
  function placeCivilizations(count) {
    civilizationStars = [];
    sunStar = null;

    const civCount = Math.max(0, Math.round(count));

    if (civCount === 0) return;

    // Our Sun: place at roughly 2/3 from center (Sun is ~27,000 ly from center in a ~50,000 ly radius galaxy)
    const sunR = 0.54;
    const sunAngle = Math.random() * Math.PI * 2;
    sunStar = {
      r: sunR,
      angle: sunAngle,
      size: 2.5,
      brightness: 1.0,
      orbitalSpeed: BASE_ROTATION_SPEED * (1 + 1.5 / (sunR + 0.3)),
      z: 0,
      label: 'Our Sun',
      isSun: true,
    };
    civilizationStars.push(sunStar);

    // Other civilizations: spread across the habitable zone of the galaxy
    const otherCount = Math.min(civCount - 1, 20); // Cap visual representation at 20
    for (let i = 0; i < otherCount; i++) {
      const r = 0.25 + Math.random() * 0.55; // habitable zone of galaxy
      const angle = Math.random() * Math.PI * 2;
      civilizationStars.push({
        r,
        angle,
        size: 2.2,
        brightness: 1.0,
        orbitalSpeed: BASE_ROTATION_SPEED * (1 + 1.5 / (r + 0.3)),
        z: 0,
        label: i < 5 ? `Civilization ${i + 2}` : null,
        isSun: false,
      });
    }
  }

  // Scale info for legend
  let scaleRatio = $derived(
    numberOfStars > 0
      ? (numberOfStars * 1e9) / TOTAL_STARS
      : 1
  );

  let civCountDisplay = $derived(Math.round(currentCivilizations));

  // Initialize stars
  generateStars();

  // Re-place civilizations reactively
  $effect(() => {
    placeCivilizations(currentCivilizations);
  });

  // Animation loop
  $effect(() => {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let time = 0;

    function resize() {
      if (!canvas || !containerEl) return;
      const rect = containerEl.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(containerEl);

    function drawStar(cx, cy, star, currentAngle, w, h, isLife, isSun) {
      const x = cx + Math.cos(currentAngle) * star.r * w * 0.45;
      const rawY = Math.sin(currentAngle) * star.r * h * 0.45 * TILT;
      const y = cy + rawY + star.z * h * 0.45;

      // Twinkle
      const twinkle = 0.7 + 0.3 * Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
      const alpha = star.brightness * twinkle;

      if (isLife) {
        // Warm green glow for civilization stars
        const glowRadius = isSun ? 12 : 9;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
        if (isSun) {
          gradient.addColorStop(0, `rgba(255, 230, 100, ${alpha})`);
          gradient.addColorStop(0.3, `rgba(180, 255, 80, ${alpha * 0.7})`);
          gradient.addColorStop(1, `rgba(80, 200, 50, 0)`);
        } else {
          gradient.addColorStop(0, `rgba(150, 255, 100, ${alpha})`);
          gradient.addColorStop(0.3, `rgba(100, 220, 60, ${alpha * 0.6})`);
          gradient.addColorStop(1, `rgba(60, 180, 40, 0)`);
        }
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(x, y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = isSun
          ? `rgba(255, 255, 180, ${alpha})`
          : `rgba(180, 255, 140, ${alpha})`;
        ctx.fill();
      } else {
        // Normal star
        const { r: rc, g: gc, b: bc } = star.color;

        // Subtle glow for larger stars
        if (star.size > 1.2) {
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, star.size * 3);
          gradient.addColorStop(0, `rgba(${rc}, ${gc}, ${bc}, ${alpha * 0.3})`);
          gradient.addColorStop(1, `rgba(${rc}, ${gc}, ${bc}, 0)`);
          ctx.beginPath();
          ctx.arc(x, y, star.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(x, y, star.size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rc}, ${gc}, ${bc}, ${alpha})`;
        ctx.fill();
      }

      return { x, y };
    }

    function drawLabel(x, y, text, isSun) {
      ctx.font = `${isSun ? '11px' : '10px'} -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = isSun
        ? 'rgba(255, 245, 180, 0.9)'
        : 'rgba(180, 255, 150, 0.8)';
      ctx.fillText(text, x, y - 14);
    }

    function animate() {
      if (!canvas) return;
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Draw galactic center glow
      const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.08);
      centerGlow.addColorStop(0, 'rgba(255, 240, 200, 0.12)');
      centerGlow.addColorStop(0.5, 'rgba(200, 180, 150, 0.04)');
      centerGlow.addColorStop(1, 'rgba(100, 100, 150, 0)');
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = centerGlow;
      ctx.fill();

      // Faint dust/nebula band through the disk
      ctx.save();
      ctx.globalAlpha = 0.025;
      const dustGrad = ctx.createLinearGradient(cx - w * 0.4, cy, cx + w * 0.4, cy);
      dustGrad.addColorStop(0, 'transparent');
      dustGrad.addColorStop(0.3, 'rgba(100, 120, 180, 1)');
      dustGrad.addColorStop(0.5, 'rgba(150, 140, 180, 1)');
      dustGrad.addColorStop(0.7, 'rgba(100, 120, 180, 1)');
      dustGrad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.ellipse(cx, cy, w * 0.43, h * 0.43 * TILT * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = dustGrad;
      ctx.fill();
      ctx.restore();

      // Draw regular stars
      for (const star of stars) {
        const currentAngle = star.angle + time * star.orbitalSpeed;
        drawStar(cx, cy, star, currentAngle, w, h, false, false);
      }

      // Draw civilization stars on top
      const labelPositions = [];
      for (const civ of civilizationStars) {
        const currentAngle = civ.angle + time * civ.orbitalSpeed;
        const pos = drawStar(cx, cy, civ, currentAngle, w, h, true, civ.isSun);
        if (civ.label && pos) {
          labelPositions.push({ ...pos, label: civ.label, isSun: civ.isSun });
        }
      }

      // Draw labels
      for (const lp of labelPositions) {
        drawLabel(lp.x, lp.y, lp.label, lp.isSun);
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
      {#if civCountDisplay > 20}
        Showing 20 of {formatNumber(civCountDisplay)} civilizations.
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
