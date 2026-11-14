import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FadeIn } from "@/components/fade-in";

function PythonLogo() {
  return (
    <svg viewBox="0.21 -0.077 110 110" className="skill-logo h-16 w-16" aria-hidden>
      <defs>
        <linearGradient id="py-blue" x1="10" y1="0" x2="70" y2="70">
          <stop offset="0" stopColor="#5ba3d9" />
          <stop offset="1" stopColor="#366994" />
        </linearGradient>
        <linearGradient id="py-gold" x1="40" y1="40" x2="110" y2="110">
          <stop offset="0" stopColor="#ffe052" />
          <stop offset="1" stopColor="#ffc331" />
        </linearGradient>
      </defs>
      <path
        fill="url(#py-blue)"
        d="M55.023-0.077c-25.971,0-26.25,10.081-26.25,12.156c0,3.148,0,12.594,0,12.594h26.75v3.781 c0,0-27.852,0-37.375,0c-7.949,0-17.938,4.833-17.938,26.25c0,19.673,7.792,27.281,15.656,27.281c2.335,0,9.344,0,9.344,0 s0-9.765,0-13.125c0-5.491,2.721-15.656,15.406-15.656c15.91,0,19.971,0,26.531,0c3.902,0,14.906-1.696,14.906-14.406 c0-13.452,0-17.89,0-24.219C82.054,11.426,81.515-0.077,55.023-0.077z M40.273,8.392c2.662,0,4.813,2.15,4.813,4.813 c0,2.661-2.151,4.813-4.813,4.813s-4.813-2.151-4.813-4.813C35.46,10.542,37.611,8.392,40.273,8.392z"
      />
      <path
        fill="url(#py-gold)"
        d="M55.397,109.923c25.959,0,26.282-10.271,26.282-12.156c0-3.148,0-12.594,0-12.594H54.897v-3.781 c0,0,28.032,0,37.375,0c8.009,0,17.938-4.954,17.938-26.25c0-23.322-10.538-27.281-15.656-27.281c-2.336,0-9.344,0-9.344,0 s0,10.216,0,13.125c0,5.491-2.631,15.656-15.406,15.656c-15.91,0-19.476,0-26.532,0c-3.892,0-14.906,1.896-14.906,14.406 c0,14.475,0,18.265,0,24.219C28.366,100.497,31.562,109.923,55.397,109.923z M70.148,101.454c-2.662,0-4.813-2.151-4.813-4.813 s2.15-4.813,4.813-4.813c2.661,0,4.813,2.151,4.813,4.813S72.809,101.454,70.148,101.454z"
      />
    </svg>
  );
}

function N8nLogo() {
  return (
    <svg viewBox="0 0 24 24" className="skill-logo h-16 w-16" aria-hidden>
      <path
        fill="#EA4B71"
        d="M21.4737 5.6842c-1.1772 0-2.1663.8051-2.4468 1.8947h-2.8955c-1.235 0-2.289.893-2.492 2.111l-.1038.623a1.263 1.263 0 0 1-1.246 1.0555H11.289c-.2805-1.0896-1.2696-1.8947-2.4468-1.8947s-2.1663.8051-2.4467 1.8947H4.973c-.2805-1.0896-1.2696-1.8947-2.4468-1.8947C1.1311 9.4737 0 10.6047 0 12s1.131 2.5263 2.5263 2.5263c1.1772 0 2.1663-.8051 2.4468-1.8947h1.4223c.2804 1.0896 1.2696 1.8947 2.4467 1.8947 1.1772 0 2.1663-.8051 2.4468-1.8947h1.0008a1.263 1.263 0 0 1 1.2459 1.0555l.1038.623c.203 1.218 1.257 2.111 2.492 2.111h.3692c.2804 1.0895 1.2696 1.8947 2.4468 1.8947 1.3952 0 2.5263-1.131 2.5263-2.5263s-1.131-2.5263-2.5263-2.5263c-1.1772 0-2.1664.805-2.4468 1.8947h-.3692a1.263 1.263 0 0 1-1.246-1.0555l-.1037-.623A2.52 2.52 0 0 0 13.9607 12a2.52 2.52 0 0 0 .821-1.4794l.1038-.623a1.263 1.263 0 0 1 1.2459-1.0555h2.8955c.2805 1.0896 1.2696 1.8947 2.4468 1.8947 1.3952 0 2.5263-1.131 2.5263-2.5263s-1.131-2.5263-2.5263-2.5263m0 1.2632a1.263 1.263 0 0 1 1.2631 1.2631 1.263 1.263 0 0 1-1.2631 1.2632 1.263 1.263 0 0 1-1.2632-1.2632 1.263 1.263 0 0 1 1.2632-1.2631M2.5263 10.7368A1.263 1.263 0 0 1 3.7895 12a1.263 1.263 0 0 1-1.2632 1.2632A1.263 1.263 0 0 1 1.2632 12a1.263 1.263 0 0 1 1.2631-1.2632m6.3158 0A1.263 1.263 0 0 1 10.1053 12a1.263 1.263 0 0 1-1.2632 1.2632A1.263 1.263 0 0 1 7.579 12a1.263 1.263 0 0 1 1.2632-1.2632m10.1053 3.7895a1.263 1.263 0 0 1 1.2631 1.2632 1.263 1.263 0 0 1-1.2631 1.2631 1.263 1.263 0 0 1-1.2632-1.2631 1.263 1.263 0 0 1 1.2632-1.2632"
      />
    </svg>
  );
}

function RubyLogo() {
  return (
    <img
      src="/skills/ruby.svg"
      alt=""
      width={64}
      height={64}
      className="skill-logo h-16 w-16 object-contain"
      decoding="async"
    />
  );
}

function KiCadLogo() {
  return (
    <svg viewBox="0 0 64 64" className="skill-logo h-16 w-16" aria-hidden>
      <rect width="64" height="64" fill="#2f4bb7" />
      <path
        d="M8 32h16l6-14 8 28 6-14h12"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinejoin="miter"
      />
      <circle cx="8" cy="32" r="2.4" fill="#fff" />
      <circle cx="50" cy="32" r="3.4" fill="#ff6d00" />
      <path d="M14 16h8M14 48h8M46 16h8M46 48h8" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

function EasyEDALogo() {
  return (
    <svg viewBox="0 0 24 24" className="skill-logo h-16 w-16" aria-hidden>
      <path
        fill="#1765F6"
        d="M13.31 3.108a7.67 7.67 0 0 0-3.015.545 7.67 7.67 0 0 0-1.73.951 7.865 7.865 0 0 0-1.59 1.567 6.308 6.308 0 0 0-.764-.047C2.78 6.124 0 8.91 0 12.35a6.217 6.217 0 0 0 4.146 5.868 3.759 3.759 0 0 0 7.326-1.574l5.3-2.673-.04-.078.499-.257-1.021-2.027-.499.25-.047-.086-5.291 2.658a3.727 3.727 0 0 0-2.627-1.076 3.77 3.77 0 0 0-3.42 2.198 3.723 3.723 0 0 1-1.7-4.146 3.71 3.71 0 0 1 5.549-2.214 5.211 5.211 0 0 1 6.585-3.32 5.24 5.24 0 0 1 3.538 4.373 2.913 2.913 0 0 1 3.188 2.899 2.909 2.909 0 0 1-2.65 2.899h-2.135v2.517h2.244l.11-.016a5.407 5.407 0 0 0 4.925-5.852 5.459 5.459 0 0 0-1.574-3.375A5.355 5.355 0 0 0 20.3 8.01a7.725 7.725 0 0 0-6.99-4.901ZM7.748 15.367c.965 0 1.753.791 1.753 1.761a1.748 1.748 0 0 1-1.753 1.753 1.748 1.748 0 0 1-1.754-1.753 1.756 1.756 0 0 1 1.754-1.753Z"
      />
    </svg>
  );
}

const CODE_SKILLS = [
  {
    name: "Python",
    logo: <PythonLogo />,
  },
  {
    name: "Ruby",
    logo: <RubyLogo />,
  },
  {
    name: "n8n",
    logo: <N8nLogo />,
  },
];

const HARDWARE_SKILLS = [
  {
    name: "KiCad",
    logo: <KiCadLogo />,
  },
  {
    name: "EasyEDA",
    logo: <EasyEDALogo />,
  },
];

const TABS = ["Code", "Hardware"] as const;

export function Skills() {
  const sectionRef = useRef<HTMLElement>(null);
  const tablistRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [tab, setTab] = useState<(typeof TABS)[number]>("Code");
  const [entered, setEntered] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    if (reduced) {
      setEntered(true);
      setPanelVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setEntered(true);
        setPanelVisible(true);
        observer.disconnect();
      },
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced]);

  useLayoutEffect(() => {
    const active = tabRefs.current[tab];
    const list = tablistRef.current;
    if (!active || !list) return;
    const listBox = list.getBoundingClientRect();
    const tabBox = active.getBoundingClientRect();
    setIndicator({
      left: tabBox.left - listBox.left,
      width: tabBox.width,
    });
  }, [tab, entered]);

  const selectTab = (name: (typeof TABS)[number]) => {
    if (name === tab) return;
    if (reduced) {
      setTab(name);
      setPanelVisible(true);
      return;
    }
    setPanelVisible(false);
    window.setTimeout(() => {
      setTab(name);
      requestAnimationFrame(() => setPanelVisible(true));
    }, 220);
  };

  const skills = tab === "Code" ? CODE_SKILLS : HARDWARE_SKILLS;
  const showPanel = entered && panelVisible;

  return (
    <section ref={sectionRef} id="skills" className="px-6 py-24 text-fg sm:py-32">
      <div className="mx-auto w-full max-w-5xl">
        <FadeIn>
          <p className="text-xs tracking-widest text-muted uppercase">Skills</p>
        </FadeIn>
        <FadeIn delayMs={90}>
          <div
            ref={tablistRef}
            role="tablist"
            aria-label="Skills"
            className="relative mt-6 flex gap-6"
          >
            {TABS.map((name) => {
              const selected = tab === name;
              return (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  id={`tab-${name}`}
                  ref={(node) => {
                    tabRefs.current[name] = node;
                  }}
                  aria-selected={selected}
                  aria-controls={`panel-${name}`}
                  onClick={() => selectTab(name)}
                  className={`pb-2 text-xs tracking-widest uppercase transition-colors duration-300 ${selected ? "text-fg" : "text-muted hover:text-fg/80"}`}
                >
                  {name}
                </button>
              );
            })}
            <span
              aria-hidden
              className="tab-indicator"
              style={{ left: indicator.left, width: indicator.width }}
            />
          </div>
        </FadeIn>
        <ul
          id={`panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          className={`mt-10 grid max-w-3xl gap-4 sm:grid-cols-2 tab-fade ${showPanel ? "is-visible" : ""}`}
        >
          {skills.map((skill, index) => (
            <li
              key={`${tab}-${skill.name}`}
              className="skill-card flex flex-col items-start border border-line bg-bg/80 px-6 py-8 backdrop-blur-sm"
              style={{ transitionDelay: showPanel ? `${index * 80}ms` : "0ms" }}
            >
              {skill.logo}
              <h2 className="mt-8 text-lg font-medium tracking-wide">{skill.name}</h2>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
