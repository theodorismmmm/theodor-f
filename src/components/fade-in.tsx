import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type FadeInProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  once?: boolean;
};

export function FadeIn({ children, className = "", delayMs = 0, once = true }: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduced) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        if (once) observer.disconnect();
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [once, reduced]);

  const style = {
    "--fade-delay": `${delayMs}ms`,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      style={style}
      className={`fade-rise ${visible ? "is-visible" : ""} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
