import Hero from './Hero'
import StickyVText from './sections/StickyVText'
import StickyJoinCTA from './sections/StickyJoinCTA'

export default function Page() {
  return (
    <main>
      <StickyVText />
      <StickyJoinCTA />

      {/* data-section="hero" masque le CTA sticky + data-theme="light" pour le vtext */}
      <div data-section="hero" data-theme="light">
        <Hero />
      </div>

      {/* Placeholder — sera remplacé par <Anxiete /> */}
      <section id="anxiete" data-section="anxiete" data-theme="dark" />

      {/* Placeholder — sera remplacé par <Waitlist /> */}
      <section id="waitlist" data-section="waitlist" data-theme="light" />
    </main>
  )
}
