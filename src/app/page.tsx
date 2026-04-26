import Hero from './Hero'
import StickyVText from './sections/StickyVText'
import StickyJoinCTA from './sections/StickyJoinCTA'
import Anxiete from './sections/Anxiete'

export default function Page() {
  return (
    <main>
      <StickyVText />
      <StickyJoinCTA />

      <div data-section="hero" data-theme="light">
        <Hero />
      </div>

      <Anxiete />

      {/* Placeholder — sera remplacé par <Waitlist /> */}
      <section id="waitlist" data-section="waitlist" data-theme="light" />
    </main>
  )
}
