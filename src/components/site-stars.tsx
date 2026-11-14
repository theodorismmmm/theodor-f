import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  r: number;
  base: number;
  twinkle: number;
  phase: number;
};

function fadeAt(y: number, height: number) {
  const t = height <= 0 ? 0 : y / height;
  // Full through the hero, still present in skills, clean falloff to zero at the foot.
  if (t <= 0.55) return 1;
  if (t >= 0.94) return 0;
  const u = (t - 0.55) / (0.94 - 0.55);
  const smooth = u * u * (3 - 2 * u);
  return 1 - smooth;
}

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export function SiteStars() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stars: Star[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let running = true;

    const rebuild = () => {
      const nextW = Math.max(1, host.clientWidth);
      const nextH = Math.max(1, host.scrollHeight || host.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = nextW;
      height = nextH;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.round((width * height) / 5200);
      stars = Array.from({ length: count }, (_, i) => {
        const y = hash(i * 3.1 + 1) * height;
        const fade = fadeAt(y, height);
        // Skip seeding stars that would already be invisible.
        if (fade < 0.04 && hash(i + 9) > 0.2) {
          return {
            x: hash(i * 7.7) * width,
            y,
            r: 0,
            base: 0,
            twinkle: 0,
            phase: 0,
          };
        }
        const roll = hash(i * 11.3 + 4);
        return {
          x: hash(i * 7.7) * width,
          y,
          r: roll > 0.92 ? 1.35 : roll > 0.7 ? 0.9 : 0.55,
          base: 0.35 + hash(i * 2.4 + 8) * 0.65,
          twinkle: 0.35 + hash(i * 5.1 + 2) * 0.9,
          phase: hash(i * 13.9) * Math.PI * 2,
        };
      }).filter((star) => star.r > 0);
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      const t = now * 0.001;
      for (const star of stars) {
        const vertical = fadeAt(star.y, height);
        if (vertical <= 0.01) continue;
        const pulse = reduced
          ? 1
          : 0.72 + 0.28 * Math.sin(t * star.twinkle + star.phase);
        const alpha = star.base * pulse * vertical;
        if (alpha < 0.02) continue;
        ctx.beginPath();
        ctx.fillStyle = `rgba(235, 240, 255, ${alpha})`;
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
        if (star.r > 1) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(255, 248, 230, ${alpha * 0.35})`;
          ctx.arc(star.x, star.y, star.r * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const tick = (now: number) => {
      if (!running) return;
      draw(now);
      if (!reduced) frame = requestAnimationFrame(tick);
    };

    rebuild();
    draw(performance.now());
    if (!reduced) frame = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => {
      rebuild();
      draw(performance.now());
    });
    ro.observe(host);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-full w-full"
    />
  );
}
