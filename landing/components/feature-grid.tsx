import { Reveal } from "@/components/reveal"
import { ShieldCheck, Network, Lock, Gauge, GitBranch, Coins } from "lucide-react"

const features = [
  {
    icon: ShieldCheck,
    title: "Trust through transparency, not promises",
    copy: "Every block is chained by SHA-256 hashes. Tamper with one record and the entire chain rejects it — security guaranteed by computation, not policy.",
  },
  {
    icon: Network,
    title: "Decentralized network",
    copy: "Nodes gossip over raw TCP, syncing the ledger peer-to-peer. No central server, no single point of failure, no off switch.",
  },
  {
    icon: Lock,
    title: "Cryptographic ownership",
    copy: "Funds are controlled by P-256 private keys alone. Your signature is your authority — no account, no custodian, no recovery desk.",
  },
  {
    icon: Gauge,
    title: "Verifiable settlement",
    copy: "Transactions clear the moment a block is mined. Finality is mathematical and irreversible, settling in seconds rather than days.",
  },
  {
    icon: GitBranch,
    title: "Open & auditable",
    copy: "The full protocol is readable Go source. Audit the consensus, fork the chain, or run a node — the rules are transparent to everyone.",
  },
  {
    icon: Coins,
    title: "Sound monetary policy",
    copy: "A fixed issuance schedule and UTXO accounting make supply predictable and provable. Scarcity enforced by code, not committee.",
  },
]

export function FeatureGrid() {
  return (
    <section id="platform" className="bg-cream">
      <div className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32">
        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
            Built for the Long Game
          </p>
          <h2 className="text-balance font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            The infrastructure of trustless finance
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty leading-relaxed text-muted-foreground">
            ChainForge delivers the guarantees institutions demand and the openness
            the next century of capital requires.
          </p>
        </Reveal>

        <div className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <Reveal
                key={f.title}
                as="article"
                delay={(i % 3) * 90}
                className="group flex flex-col bg-card p-8 transition-colors hover:bg-background"
              >
                <span className="grid size-11 place-items-center border border-border text-accent transition-colors group-hover:border-accent">
                  <Icon className="size-5" strokeWidth={1.5} />
                </span>
                <h3 className="mt-6 font-serif text-xl font-bold tracking-tight text-foreground">
                  {f.title}
                </h3>
                <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
                  {f.copy}
                </p>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
