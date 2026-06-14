export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-cream">
      <div className="mx-auto max-w-7xl px-6 py-14 md:px-10">
        <div className="flex flex-col items-start justify-between gap-10 md:flex-row md:items-center">
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center border border-accent">
              <span className="size-2.5 rotate-45 bg-accent" />
            </span>
            <span className="font-serif text-xl font-bold tracking-tight text-foreground">
              ChainForge
            </span>
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-3" aria-label="Footer">
            {[
              { label: "Portfolio", href: "https://shauryasharma.vercel.app/" },
              { label: "LinkedIn", href: "https://www.linkedin.com/in/shaurya-sharmaa/" },
              { label: "GitHub", href: "https://github.com/ShauryaaSharma" },
              { label: "Instagram", href: "https://www.instagram.com/shauryacodesharma/" },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>&copy; {new Date().getFullYear()} ChainForge. Forged in Go.</p>
          <p>SHAURYA SHARMA</p>
        </div>
      </div>
    </footer>
  )
}
