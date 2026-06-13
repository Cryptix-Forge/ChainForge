import { ParallaxImage } from "@/components/parallax-image"
import { Reveal } from "@/components/reveal"

export function CtaSection() {
  return (
    <ParallaxImage
      src="/images/nyc-skyline.png"
      alt="Manhattan skyline at golden hour"
      strength={140}
      className="w-full border-t border-accent"
      overlayClassName="bg-foreground/60"
    >
      <div className="mx-auto max-w-4xl px-6 py-32 text-center md:px-10 md:py-44">
        <Reveal>
          <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.24em] text-background/70">
            Join the Network
          </p>
          <h2 className="text-balance font-serif text-4xl font-bold leading-[1.1] tracking-tight text-background md:text-6xl">
            Own a piece of the new financial order
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-pretty leading-relaxed text-background/80">
            Clone the repository, spin up a node, and mine the next block. The
            protocol is open, the ledger is live, and the future is permissionless.
          </p>
          <div className="mt-11 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#top"
              className="w-full bg-accent px-8 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-accent-foreground transition-transform hover:-translate-y-0.5 sm:w-auto"
            >
              Run a Node
            </a>
            <a
              href="#technology"
              className="w-full border border-background/60 px-8 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-background transition-colors hover:bg-background hover:text-foreground sm:w-auto"
            >
              Read the Whitepaper
            </a>
          </div>
        </Reveal>
      </div>
    </ParallaxImage>
  )
}
