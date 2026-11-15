import { FadeIn } from "@/components/fade-in";
import { ExternalLink } from "@/components/leave-site-gate";
import { openLightsUrl } from "@/lib/links";

const PROJECTS = [
  {
    name: "OpenLights",
    href: openLightsUrl,
    preview: "/projects/openlights.png",
    tag: "Govee Open API",
    description:
      "A professional browser dashboard for your Govee lights — color, brightness, presets, and schedules, powered by your own API key.",
  },
] as const;

const openClass =
  "action-press inline-flex h-11 items-center justify-center border border-line bg-bg px-6 text-sm font-medium tracking-wide text-fg hover:bg-fg/10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-fg";

export function Projects() {
  return (
    <section id="projects" className="px-6 py-24 text-fg sm:py-32">
      <div className="mx-auto w-full max-w-5xl">
        <FadeIn>
          <p className="text-xs tracking-widest text-muted uppercase">Projects</p>
        </FadeIn>
        <ul className="mt-10 grid gap-8">
          {PROJECTS.map((project, index) => (
            <li key={project.name}>
              <FadeIn delayMs={index * 100} variant="scale">
                <article className="project-card overflow-hidden border border-line bg-bg/80 backdrop-blur-sm">
                  <ExternalLink
                    href={project.href}
                    className="group block focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-fg"
                    aria-label={`Open ${project.name}`}
                  >
                    <div className="relative overflow-hidden border-b border-line bg-bg">
                      <img
                        src={project.preview}
                        alt={`${project.name} preview`}
                        width={1440}
                        height={900}
                        className="project-preview h-auto w-full object-cover object-top"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  </ExternalLink>
                  <div className="px-6 py-8 sm:px-10">
                    <p className="text-[11px] tracking-[0.22em] text-muted uppercase">{project.tag}</p>
                    <h2 className="mt-3 text-xl font-medium tracking-wide sm:text-2xl">{project.name}</h2>
                    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{project.description}</p>
                    <div className="mt-8">
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
