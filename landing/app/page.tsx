import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/hero"
import { MetricsBar } from "@/components/metrics-bar"
import { VisionSection } from "@/components/vision-section"
import { StatementBand } from "@/components/statement-band"
import { FeatureGrid } from "@/components/feature-grid"
import { TechStack } from "@/components/tech-stack"
import { CtaSection } from "@/components/cta-section"
import { SiteFooter } from "@/components/site-footer"

export default function Page() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <MetricsBar />
      <VisionSection />
      <StatementBand />
      <FeatureGrid />
      <TechStack />
      <CtaSection />
      <SiteFooter />
    </main>
  )
}
