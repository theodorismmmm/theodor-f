import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

const SKIP_KEY = "leave-site-skip";

type LeaveSiteContextValue = {
  requestLeave: (href: string) => void;
};

const LeaveSiteContext = createContext<LeaveSiteContextValue | null>(null);

function readSkip() {
  try {
    return window.localStorage.getItem(SKIP_KEY) === "1";
  } catch {
    return false;
  }
}

function writeSkip() {
  try {
    window.localStorage.setItem(SKIP_KEY, "1");
  } catch {
    // Ignore private-mode / blocked storage.
  }
}

function openDestination(href: string) {
  if (href.startsWith("mailto:")) {
    window.location.href = href;
    return;
  }
  window.open(href, "_blank", "noopener,noreferrer");
}

export function LeaveSiteProvider({ children }: { children: ReactNode }) {
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    setSkip(readSkip());
  }, []);

  const requestLeave = useCallback(
    (href: string) => {
      if (skip || readSkip()) {
        openDestination(href);
        return;
      }
      setPendingHref(href);
    },
    [skip],
  );

  const close = useCallback(() => setPendingHref(null), []);

  const continueLeave = useCallback(() => {
    if (!pendingHref) return;
    const href = pendingHref;
    setPendingHref(null);
    openDestination(href);
  }, [pendingHref]);

  const neverAgain = useCallback(() => {
    if (!pendingHref) return;
    const href = pendingHref;
    writeSkip();
    setSkip(true);
    setPendingHref(null);
    openDestination(href);
  }, [pendingHref]);

  useEffect(() => {
    if (!pendingHref) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingHref, close]);

  const value = useMemo(() => ({ requestLeave }), [requestLeave]);

  return (
    <LeaveSiteContext.Provider value={value}>
      {children}
      {pendingHref ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-bg/70 px-6 py-10 backdrop-blur-sm sm:items-center"
          role="presentation"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-site-title"
            className="w-full max-w-md border border-line bg-bg p-6 shadow-none"
            onClick={(event) => event.stopPropagation()}
          >
            <p id="leave-site-title" className="text-xs tracking-widest text-muted uppercase">
              Leaving this site
            </p>
            <p className="mt-3 text-sm leading-relaxed text-fg">
              You are being redirected to:
            </p>
            <p className="mt-3 break-all border border-line bg-bg px-3 py-3 font-mono text-xs text-muted">
              {pendingHref}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={continueLeave}
                className="inline-flex h-11 items-center justify-center border border-line bg-fg px-4 text-sm tracking-wide text-bg transition-colors duration-200 hover:bg-fg/90 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-fg"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={neverAgain}
                className="inline-flex h-11 items-center justify-center border border-line px-4 text-sm tracking-wide text-fg transition-colors duration-200 hover:bg-fg/10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-fg"
              >
                Don&apos;t show again
              </button>
              <button
                type="button"
                onClick={close}
                className="inline-flex h-11 items-center justify-center border border-transparent px-4 text-sm tracking-wide text-muted transition-colors duration-200 hover:text-fg focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-fg"
              >
                Stay
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </LeaveSiteContext.Provider>
  );
}

export function useLeaveSite() {
  const ctx = useContext(LeaveSiteContext);
  if (!ctx) {
    throw new Error("useLeaveSite must be used within LeaveSiteProvider");
  }
  return ctx;
}

type ExternalLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
};

export function ExternalLink({ href, className, children, ...rest }: ExternalLinkProps) {
  const { requestLeave } = useLeaveSite();

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.button !== 0) return;
    event.preventDefault();
    requestLeave(href);
  };

  return (
    <a href={href} className={className} onClick={onClick} {...rest}>
      {children}
    </a>
  );
}
