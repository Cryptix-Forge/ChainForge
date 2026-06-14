import { Reveal } from "@/components/reveal"

const cards = [
  {
    title: "Proof of Work",
    file: "proofofwork.go",
    copy: "A SHA-256 mining loop with targetBits=16. Every block is sealed by real computation — nonces hashed until the proof clears the difficulty target.",
  },
  {
    title: "UTXO Ledger",
    file: "transaction.go",
    copy: "Bitcoin-style unspent transaction outputs. No account balances — value flows as discrete, verifiable outputs that are spent and recreated with each transfer.",
  },
  {
    title: "ECDSA Wallets",
    file: "wallet.go",
    copy: "Keys generated on the P-256 curve with Base58Check addresses. Every transaction is cryptographically signed and verified before it enters the chain.",
  },
]

export function TechStack() {
  return (
    <section id="technology" className="bg-background">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
            The Technology Stack
          </p>
          <h2 className="text-balance font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Engineered to the metal
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty leading-relaxed text-muted-foreground">
            Three foundational systems, each written by hand in Go. The product shows the backend code so that
                    you can understand and trace every line from genesis block to signed transaction.
          </p>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((card, i) => (
            <Reveal
              key={card.title}
              as="article"
              delay={i * 110}
              className="group relative flex flex-col border border-[#E0DDD8] bg-card p-8 transition-shadow hover:shadow-[0_1px_24px_rgba(0,0,0,0.06)]"
            >
              <span className="absolute inset-x-0 top-0 h-px bg-accent" aria-hidden="true" />
              <h3 className="font-serif text-2xl font-bold tracking-tight text-foreground">
                {card.title}
              </h3>
              <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {card.file}
              </p>
              <p className="mt-6 text-pretty leading-relaxed text-muted-foreground">
                {card.copy}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
