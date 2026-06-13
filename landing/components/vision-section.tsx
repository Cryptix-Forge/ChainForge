import { ParallaxImage } from "@/components/parallax-image"
import { Reveal } from "@/components/reveal"

export function VisionSection() {
  return (
    <section id="vision" className="relative overflow-hidden bg-background">
      <div className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-36">
        <div className="grid items-center gap-12 md:grid-cols-12">
          {/* Copy column */}
          <Reveal className="md:col-span-6 md:pr-8">
            <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
              The Thesis
            </p>
            <h2 className="text-balance font-serif text-4xl font-bold leading-[1.08] tracking-tight text-foreground md:text-5xl">
              Value moves at the speed of trust. We rebuilt the rails.
            </h2>
            <p className="mt-7 max-w-md text-pretty leading-relaxed text-muted-foreground">
              For a century, capital flowed through marble halls and closed ledgers
              guarded by intermediaries. ChainForge replaces that machinery with
              cryptographic certainty — a distributed ledger where every transaction
              is verifiable, immutable, and final.
            </p>
            <p className="mt-4 max-w-md text-pretty leading-relaxed text-muted-foreground">
              No custodians. No counterparties. No permission required. Just
              mathematics, consensus, and the open network.
            </p>

            <dl className="mt-10 grid grid-cols-2 gap-y-8 gap-x-6 border-t border-border pt-8">
              {[
                { v: "100%", l: "On-chain settlement" },
                { v: "0", l: "Trusted intermediaries" },
                { v: "24/7", l: "Global availability" },
                { v: "<1s", l: "Block propagation" },
              ].map((s) => (
                <div key={s.l}>
                  <dt className="font-serif text-3xl font-bold tracking-tight text-foreground">
                    {s.v}
                  </dt>
                  <dd className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {s.l}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>

          {/* Image column — overlaps the copy on large screens */}
          <Reveal delay={120} className="md:col-span-6">
            <div className="relative md:-ml-16">
              <ParallaxImage
                src="/images/skyscrapers-up.png"
                alt="Towering Manhattan skyscrapers converging toward the sky"
                strength={90}
                className="aspect-[4/5] w-full border border-border shadow-[0_30px_80px_-40px_rgba(0,0,0,0.45)]"
                overlayClassName="bg-gradient-to-t from-background/30 via-transparent to-transparent"
              />
              {/* Floating caption card intersecting the image */}
              <div className="absolute -bottom-6 left-6 right-6 border border-border bg-card/95 p-5 backdrop-blur-sm md:-left-10 md:right-auto md:max-w-xs">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                  Block #1 · Genesis
                </p>
                <p className="mt-2 text-pretty text-sm leading-relaxed text-foreground">
                  The first block was mined on a single laptop. The network it
                  started can never be stopped.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
