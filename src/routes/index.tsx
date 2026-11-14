import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { githubUrl, gmailComposeUrl, mailtoUrl } from "@/lib/links";
import { Skills } from "@/components/skills";

if (typeof window !== "undefined") {
  void import("@/components/solar-system");
}

const SolarSystem = lazy(() =>
  import("@/components/solar-system").then((mod) => ({
    default: mod.SolarSystem,
  })),
);

export const Route = createFileRoute("/")({ component: Home });

const actionClass =
  "inline-flex h-11 min-w-28 items-center justify-center border border-line bg-bg px-6 text-sm font-medium tracking-wide text-fg transition-colors duration-200 hover:bg-fg/10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-fg";

function EmailMe({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {open ? (
        <div
          role="menu"
          aria-label="Email"
          className="absolute bottom-full left-1/2 z-10 mb-3 flex w-max -translate-x-1/2 flex-col border border-line bg-bg"
        >
          <a
            role="menuitem"
            href={gmailComposeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-3 text-sm tracking-wide whitespace-nowrap transition-colors duration-200 hover:bg-fg/10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-fg"
          >
            Open in Gmail
          </a>
          <a
            role="menuitem"
            href={mailtoUrl}
            className="border-t border-line px-4 py-3 text-sm tracking-wide whitespace-nowrap transition-colors duration-200 hover:bg-fg/10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-fg"
          >
            Native email app
          </a>
        </div>
      ) : null}
      <button
        type="button"
        className={actionClass}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        {label}
      </button>
    </div>
  );
}

function SystemLoader({ done }: { done: boolean }) {
  const [pct, setPct] = useState(6);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (done) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setPct((current) => (current >= 88 ? current : Math.min(88, current + dt * 0.11)));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [done]);

  useEffect(() => {
    if (!done) return;
    const hide = window.setTimeout(() => setGone(true), 160);
    return () => window.clearTimeout(hide);
  }, [done]);

  if (gone) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      <div className="w-56">
        <div
          className="h-px bg-white"
          style={{
            width: `${done ? 100 : pct}%`,
            transition: done ? "width 280ms ease-out" : "none",
          }}
        />
      </div>
    </div>
  );
}

function Home() {
  const [ready, setReady] = useState(false);

  return (
    <main className="bg-bg text-fg">
      <section className="relative h-dvh w-full overflow-hidden">
        <ClientOnly fallback={null}>
          <Suspense fallback={null}>
            <SolarSystem onReady={() => setReady(true)} />
          </Suspense>
        </ClientOnly>

        <SystemLoader done={ready} />

        <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center px-6 pt-12 sm:pt-16">
          <h1 className="text-center text-2xl font-normal tracking-brand text-fg sm:text-4xl">
            Theodor F.
          </h1>
        </header>

        <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-center px-6 pb-8 sm:pb-12">
          <nav aria-label="Profiles" className="flex items-center justify-center gap-3">
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={actionClass}
            >
              GitHub
            </a>
            <EmailMe label="Email me" />
          </nav>
        </div>
      </section>
      <Skills />
      <section id="reach" className="bg-bg px-6 pb-28 text-fg">
        <div className="mx-auto w-full max-w-5xl border border-line px-6 py-10 sm:px-10">
          <h2 className="text-lg font-medium tracking-wide">Feel free to reach out</h2>
          <p className="mt-3 max-w-md text-sm text-muted">I can help with projects.</p>
          <div className="mt-8">
            <EmailMe label="Contact me" />
          </div>
        </div>
      </section>
    </main>
  );
}
