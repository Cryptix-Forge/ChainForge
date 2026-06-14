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
            Click "Create Blockchain" and Experience Blockchain for yourself along with backend code by side for learning.
            If you like what you see, star the repo and follow Shaurya Sharma. Feel free to contribute !!! 
          </p>
          <div className="mt-11 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="https://github.com/ShauryaaSharma/ChainForge-Blockchain-in-Go"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 w-full border border-foreground bg-foreground px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-background transition-colors hover:bg-transparent hover:text-foreground sm:w-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.605-2.665-.3-5.467-1.334-5.467-5.931 0-1.31.468-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.3 1.23a11.52 11.52 0 0 1 3.003-.404c1.02.005 2.047.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.655 1.653.243 2.874.12 3.176.77.84 1.235 1.911 1.235 3.221 0 4.61-2.807 5.628-5.479 5.922.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 21.796 24 17.299 24 12c0-6.627-5.373-12-12-12z"/></svg>
              View Repo on GitHub
            </a>
            <a
              href="https://github.com/ShauryaaSharma"
              className="inline-flex w-full items-center justify-center gap-2 w-full border border-background/60 px-8 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-background transition-colors hover:bg-background hover:text-foreground sm:w-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.605-2.665-.3-5.467-1.334-5.467-5.931 0-1.31.468-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.3 1.23a11.52 11.52 0 0 1 3.003-.404c1.02.005 2.047.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.655 1.653.243 2.874.12 3.176.77.84 1.235 1.911 1.235 3.221 0 4.61-2.807 5.628-5.479 5.922.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 21.796 24 17.299 24 12c0-6.627-5.373-12-12-12z"/></svg>
              Follow me on Github
            </a>
          </div>
        </Reveal>
      </div>
    </ParallaxImage>
  )
}
