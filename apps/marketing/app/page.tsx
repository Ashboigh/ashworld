import { Hero } from "@/components/hero";
import { FeaturesSection } from "@/components/features-section";
import { Stats } from "@/components/stats";
import { Testimonials } from "@/components/testimonials";
import { CTA } from "@/components/cta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Stats />
      <FeaturesSection />
      <Testimonials />
      <CTA />
    </>
  );
}
