"use client"

import { useEffect, useState } from "react"
import { ParallaxImage } from "@/components/parallax-image"

function MiningTicker() {
  const [nonce, setNonce] = useState(48213)
  const [hash, setHash] = useState("0000a3f9c1")

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) return

    const id = setInterval(() => {
      setNonce((n) => n + Math.floor(Math.random() * 37) + 1)
      const chars = "0123456789abcdef"
      let h = "0000"
      for (let i = 0; i < 6; i++) h += chars[Math.floor(Math.random() * 16)]
      setHash(h)
    }, 120)
    return () => clearInterval(id)
  }, [])

  return (
    <span className="tabular-nums">
      nonce={nonce.toLocaleString()} · hash={hash}…
    </span>
  )
}

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden border-b border-border">
      {/* Parallax architectural backdrop */}
      <ParallaxImage
        src="/images/bank-interior.png"
        alt=""
        strength={110}
        className="absolute inset-0 h-full w-full"
        overlayClassName="bg-background/82"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-36">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-8 inline-flex items-center gap-3 border border-border bg-cream/90 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur-sm">
            <span className="size-1.5 animate-pulse bg-accent" aria-hidden="true" />
            Built from scratch · Pure Go · No dependencies
          </p>

          <h1 className="text-balance font-serif text-5xl font-bold leading-[1.05] tracking-tight text-foreground md:text-7xl">
            A blockchain forged
            <br />
            with <span className="italic text-accent">institutional</span> precision
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            ChainForge is a full blockchain implemented from first principles in Go —
            Proof of Work consensus, a Bitcoin-style UTXO ledger, and ECDSA wallets.
            No frameworks. No shortcuts. Just engineering.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="https://github.com/ShauryaDusht/ChainForge-Blockchain-in-Go"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 w-full border border-foreground bg-foreground px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-background transition-colors hover:bg-transparent hover:text-foreground sm:w-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.605-2.665-.3-5.467-1.334-5.467-5.931 0-1.31.468-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.3 1.23a11.52 11.52 0 0 1 3.003-.404c1.02.005 2.047.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.655 1.653.243 2.874.12 3.176.77.84 1.235 1.911 1.235 3.221 0 4.61-2.807 5.628-5.479 5.922.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 21.796 24 17.299 24 12c0-6.627-5.373-12-12-12z"/></svg>
              View Repo on GitHub
            </a>
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full border border-border bg-background/70 px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-foreground backdrop-blur-sm transition-colors hover:border-foreground sm:w-auto"
            >
              Create Blockchain
            </a>
          </div>

          <p className="mt-10 inline-block border border-border bg-foreground px-4 py-2 font-mono text-xs text-background">
            <span className="text-accent">$</span> go run . &mdash; mining&nbsp;
            <MiningTicker />
          </p>
        </div>
      </div>
    </section>
  )
}
