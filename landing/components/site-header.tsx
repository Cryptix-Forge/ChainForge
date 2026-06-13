"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"

const navLinks = [
  { label: "Thesis", href: "#vision" },
  { label: "Platform", href: "#platform" },
  { label: "Technology", href: "#technology" },
  { label: "Network", href: "#metrics" },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <a href="#top" className="flex items-center gap-2.5" aria-label="ChainForge home">
          <span className="grid size-7 place-items-center border border-accent">
            <span className="size-2.5 rotate-45 bg-accent" />
          </span>
          <span className="font-serif text-xl font-bold tracking-tight text-foreground">
            ChainForge
          </span>
        </a>

        <nav className="hidden items-center gap-9 md:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-foreground bg-foreground px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-background transition-colors hover:bg-transparent hover:text-foreground"
          >
            Create Blockchain
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="grid size-9 place-items-center border border-border text-foreground md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-6 py-2" aria-label="Mobile">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-border py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
              >
                {link.label}
              </a>
            ))}
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="mt-3 mb-2 bg-foreground px-5 py-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-background"
            >
              Create Blockchain
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
