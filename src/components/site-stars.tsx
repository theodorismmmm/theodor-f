import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  r: number;
  base: number;
  twinkle: number;
  phase: number;
};

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Soft inset so glows never clip against the viewport edges. */
function edgeFade(x: number, y: number, width: number, height: number) {
  const padX = Math.max(18, width * 0.035);
  const padY = Math.max(18, height * 0.04);
  const fx = smoothstep(0, padX, x) * smoothstep(0, padX, width - x);
  const fy = smoothstep(0, padY, y) * smoothstep(0, padY, height - y);
  return fx * fy;
}

export function SiteStars() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stars: Star[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let running = true;
    let pageFade = 1;

    const measurePageFade = () => {
      const doc = document.documentElement;
      const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
      const progress = window.scrollY / maxScroll;
      // Hold through hero + skills, then ease out cleanly toward the foot.
      if (progress <= 0.42) pageFade = 1;
      else if (progress >= 0.92) pageFade = 0;
      else pageFade = 1 - smoothstep(0.42, 0.92, progress);
    };

    const rebuild = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const padX = Math.max(18, width * 0.035);
      const padY = Math.max(18, height * 0.04);
      const count = Math.round((width * height) / 4800);

      stars = Array.from({ length: count }, (_, i) => {
        const x = padX + hash(i * 7.7) * (width - padX * 2);
        const y = padY + hash(i * 3.1 + 1) * (height - padY * 2);
        const roll = hash(i * 11.3 + 4);
        return {
          x,
          y,
          r: roll > 0.93 ? 1.4 : roll > 0.72 ? 0.95 : 0.55,
          base: 0.32 + hash(i * 2.4 + 8) * 0.62,
          twinkle: 0.32 + hash(i * 5.1 + 2) * 0.85,
          phase: hash(i * 13.9) * Math.PI * 2,
        };
      });

      measurePageFade();
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      if (pageFade <= 0.01) return;

      const t = now * 0.001;
      for (const star of stars) {
        const edge = edgeFade(star.x, star.y, width, height);
        if (edge <= 0.02) continue;
        const pulse = reduced
          ? 1
          : 0.74 + 0.26 * Math.sin(t * star.twinkle + star.phase);
        const alpha = star.base * pulse * edge * pageFade;
        if (alpha < 0.02) continue;

        ctx.beginPath();
        ctx.fillStyle = `rgba(235, 240, 255, ${alpha})`;
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();

        if (star.r > 1) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(255, 248, 230, ${alpha * 0.32})`;
          ctx.arc(star.x, star.y, star.r * 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const tick = (now: number) => {
      if (!running) return;
      draw(now);
      if (!reduced) frame = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      measurePageFade();
      if (reduced) draw(performance.now());
    };

    const onResize = () => {
      rebuild();
      draw(performance.now());
    };

    rebuild();
    draw(performance.now());
    if (!reduced) frame = requestAnimationFrame(tick);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 h-dvh w-screen"
    />
  );
}
