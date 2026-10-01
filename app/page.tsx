import { Hero } from "@/components/hero/Hero";
import { Marquee } from "@/components/marquee/Marquee";
import { Projects } from "@/components/projects/Projects";
import { About } from "@/components/about/About";
import { GameSection } from "@/components/game/GameSection";
import { SystemSection } from "@/components/three/SystemSection";
import { Contact } from "@/components/contact/Contact";
import { Footer } from "@/components/contact/Footer";
import { site, socials } from "@/content/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: site.name,
  url: site.url,
  jobTitle: site.role,
  email: `mailto:${site.email}`,
  address: { "@type": "PostalAddress", addressLocality: "Addis Ababa", addressCountry: "ET" },
  sameAs: socials.map((s) => s.href).filter((href) => !href.includes("[")),
};

export default function Home() {
  return (
    <>
      <main id="main">
        <Hero />
        <Marquee />
        <Projects />
        <About />
        <SystemSection />
        <GameSection />
        <Contact />
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
