import {
  Hero,
  BrandStrip,
  Statistics,
  Features,
  HowItWorks,
  TaglineReveal,
  Testimonials,
  FAQ,
  FinalCTA,
} from "@/components/sections";

export default function Home() {
  return (
    <>
      <Hero />
      <BrandStrip />
      <Statistics />
      <Features />
      <HowItWorks />
      <TaglineReveal />
      <Testimonials />
      <FAQ />
      <FinalCTA />
    </>
  );
}