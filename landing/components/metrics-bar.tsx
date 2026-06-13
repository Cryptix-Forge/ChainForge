const metrics = [
  { value: "SHA-256", label: "Proof of Work" },
  { value: "P-256", label: "ECDSA Wallets" },
  { value: "UTXO", label: "Transaction Model" },
  { value: "TCP", label: "P2P Networking" },
]

export function MetricsBar() {
  return (
    <section
      id="metrics"
      className="border-y border-accent bg-cream"
      aria-label="Core specifications"
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <dl className="grid grid-cols-2 divide-border md:grid-cols-4 md:divide-x">
          {metrics.map((m, i) => (
            <div
              key={m.value}
              className={`flex flex-col items-center justify-center gap-1.5 py-7 text-center md:py-8 ${
                i < 2 ? "border-b border-border md:border-b-0" : ""
              } ${i % 2 === 1 ? "border-l border-border md:border-l-0" : ""}`}
            >
              <dt className="font-mono text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                {m.value}
              </dt>
              <dd className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {m.label}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
