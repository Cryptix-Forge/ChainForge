import { ParallaxImage } from "@/components/parallax-image"
import { Reveal } from "@/components/reveal"

export function StatementBand() {
  return (
    <ParallaxImage
      src="/images/wall-street-columns.png"
      alt="Grand neoclassical stock exchange facade with towering columns"
      strength={160}
      className="min-h-[70vh] w-full border-y border-accent"
      overlayClassName="bg-foreground/55"
    >
      <div className="flex min-h-[70vh] items-center">
        <div className="mx-auto max-w-4xl px-6 py-28 text-center md:px-10">
          <Reveal>
            <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.24em] text-background/70">
              An Institution Without Walls
            </p>
            <blockquote className="text-balance font-serif text-3xl font-bold leading-[1.15] tracking-tight text-background md:text-5xl">
              &ldquo;The old guard built fortunes behind closed doors. We wrote the
              vault open — in pure Go, line by line.&rdquo;
            </blockquote>
            <p className="mt-8 font-mono text-xs uppercase tracking-[0.18em] text-background/60">
              ChainForge · Forged in Go · Shaurya Sharma
            </p>
          </Reveal>
        </div>
      </div>
    </ParallaxImage>
  )
}
