import { FadeIn } from "@/components/fade-in";
import { ExternalLink } from "@/components/leave-site-gate";
import { openLightsUrl, praktikumsRadarUrl, twoBallUrl } from "@/lib/links";

const PROJECTS = [
  {
    name: "OpenLights",
    href: openLightsUrl,
    preview: "/projects/openlights.png",
    tag: "Govee Open API",
    description:
      "A professional browser dashboard for your Govee lights — color, brightness, presets, and schedules, powered by your own API key.",
  },
  {
    name: "PraktikumsRadar",
    href: praktikumsRadarUrl,
    preview: "/projects/praktikumsradar.png",
    tag: "Schülerpraktikum",
    description:
      "Ort wählen, suchen, fertig — findet offene Schülerpraktika und Betriebe in der Nähe über Arbeitsagentur und OpenStreetMap, ohne extra Map-Keys.",
  },
  {
    name: "Two Ball Classic",
    href: twoBallUrl,
    preview: "/projects/two-ball.png",
    tag: "Arcade",
    description:
      "Einfach spielen — wähle ein Spiel, klick in den Player und starte deine nächste Runde. Mehr Platz im Vollbild, ohne künstliche Limits.",
  },
] as const;

const openClass =
  "action-press inline-flex h-10 items-center justify-center border border-line bg-bg px-5 text-sm font-medium tracking-wide text-fg hover:bg-fg/10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-fg";

export function Projects() {
  return (
    <section id="projects" className="px-6 py-20 text-fg sm:py-24">
      <div className="mx-auto w-full max-w-5xl">
        <FadeIn>
          <p className="text-xs tracking-widest text-muted uppercase">Projects</p>
        </FadeIn>
        <ul className="mt-8 grid gap-5">
          {PROJECTS.map((project, index) => (
            <li key={project.name}>
              <FadeIn delayMs={index * 80}>
                <article className="project-card flex flex-col gap-5 border border-line bg-bg/80 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:gap-6 sm:p-5">
                  <ExternalLink
                    href={project.href}
                    className="block w-full shrink-0 overflow-hidden border border-line focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-fg sm:w-44 md:w-52"
                    aria-label={`Open ${project.name}`}
                  >
                    <img
                      src={project.preview}
                      alt={`${project.name} preview`}
                      width={1440}
                      height={900}
                      className="project-preview aspect-[16/10] h-auto w-full object-cover object-top"
                      loading="lazy"
                      decoding="async"
                    />
                  </ExternalLink>
                  <div className="min-w-0 flex-1 sm:py-1">
                    <p className="text-[11px] tracking-[0.22em] text-muted uppercase">{project.tag}</p>
                    <h2 className="mt-2 text-lg font-medium tracking-wide">{project.name}</h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{project.description}</p>
                    <div className="mt-5">
                      <ExternalLink href={project.href} className={openClass}>
                        Open project
                      </ExternalLink>
                    </div>
                  </div>
                </article>
              </FadeIn>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
